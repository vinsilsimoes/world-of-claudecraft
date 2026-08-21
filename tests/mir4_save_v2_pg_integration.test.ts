// Opt-in PostgreSQL 16 proof for the MIR4 v1->v2 migration and save envelope.
//
// Set TEST_DATABASE_URL to an admin connection for a disposable local server.
// The ordinary DB-free suite skips these cases. CI sets
// WOC_REQUIRE_PG_INTEGRATION=1 as a fail-closed assertion that the PostgreSQL
// service and connection were actually supplied.

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { runMir4SaveV2Migration } from '../scripts/mir4_save_v2_migration';
import { MIR4_V1_SAVE_NAMESPACE, migrateMir4SaveNamespaceV1ToV2 } from '../server/game_profile_db';
import { gameProfileSaveNamespace } from '../src/sim/game_profile';
import type { CharacterState } from '../src/sim/sim';
import { buildMaxMir4PersistedState } from './helpers/mir4_max_persisted_state';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const REQUIRE_DATABASE = process.env.WOC_REQUIRE_PG_INTEGRATION === '1';
if (REQUIRE_DATABASE && !ADMIN_URL) {
  throw new Error('WOC_REQUIRE_PG_INTEGRATION=1 requires TEST_DATABASE_URL');
}

// Controlled numeric suffix keeps the interpolated SQL identifier valid while
// isolating concurrent local/CI processes from one another.
const VERIFY_DB = `wocc_mir4_save_v2_verify_${process.pid}`;
const VERIFY_REALM = 'Mir4SaveVerify';
const PRODUCTION_APP = 'wocc_mir4_save_verify_production';
// pg_stat_activity.query is truncated to track_activity_query_size. Match the
// save-only second CTE, not the shared opening character-lock CTE or the final
// UPDATE, so the probe cannot mistake a queued lease takeover for the save and
// still works with PostgreSQL's default 1 KiB activity-query budget.
const FENCED_SAVE_QUERY_PREFIX = 'lock_time AS MATERIALIZED';
const AUTOSAVE_CYCLE_SIZE = 1_000;
const AUTOSAVE_CYCLE_CONCURRENCY = 4;
const AUTOSAVE_CYCLE_BUDGET_MS = 30_000;
const MINIMUM_STATE = {
  gameProfile: 'mir4-gameplay-port',
  level: 1,
  questLog: [],
  questsDone: [],
  inventory: [],
} as unknown as CharacterState;

function stateAtLevel(level: number): CharacterState {
  return { ...MINIMUM_STATE, level } as CharacterState;
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) throw new Error('cannot take a percentile of an empty sample');
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  const value = sorted[index];
  if (value === undefined) throw new Error(`missing percentile sample at ${index}`);
  return value;
}

function verifyUrl(admin: string, applicationName: string): string {
  const url = new URL(admin);
  url.pathname = `/${VERIFY_DB}`;
  url.searchParams.set('application_name', applicationName);
  return url.toString();
}

if (ADMIN_URL) {
  process.env.DATABASE_URL = verifyUrl(ADMIN_URL, PRODUCTION_APP);
  process.env.GAME_PROFILE = 'mir4-gameplay-port';
  process.env.REALM_NAME = VERIFY_REALM;
}

const describeDb = ADMIN_URL ? describe : describe.skip;

describeDb('MIR4 save v2 migration (REAL PostgreSQL 16)', () => {
  let admin: Pool;
  let inspector: Pool;
  let db: typeof import('../server/db');
  let sequence = 0;
  let databaseCreated = false;
  let cleaningUp = false;
  const inspectorErrors: unknown[] = [];

  async function makeCharacter(
    classId = 'warrior',
    state: CharacterState = MINIMUM_STATE,
  ): Promise<{ accountId: number; characterId: number }> {
    const ordinal = ++sequence;
    const account = await inspector.query(
      `INSERT INTO accounts (username, password_hash)
       VALUES ($1, 'x')
       RETURNING id`,
      [`mir4_save_verify_${ordinal}`],
    );
    const accountId = Number(account.rows[0]?.id);
    const character = await inspector.query(
      `INSERT INTO characters (account_id, name, class, realm, level, state)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id`,
      [
        accountId,
        `MirSaveVerify${ordinal}`,
        classId,
        VERIFY_REALM,
        state.level,
        JSON.stringify(state),
      ],
    );
    return { accountId, characterId: Number(character.rows[0]?.id) };
  }

  async function makeCharacters(
    count: number,
    state: CharacterState = MINIMUM_STATE,
  ): Promise<Array<{ accountId: number; characterId: number }>> {
    sequence += 1;
    const prefix = `mir4_wave_${sequence}_`;
    const result = await inspector.query(
      `WITH inserted_accounts AS (
         INSERT INTO accounts (username, password_hash)
         SELECT $1::text || ordinal::text, 'x'
           FROM generate_series(1, $2::int) AS ordinal
         RETURNING id, username
       )
       INSERT INTO characters (account_id, name, class, realm, level, state)
       SELECT id, 'M' || username, 'warrior', $3, $4, $5::jsonb
         FROM inserted_accounts
       RETURNING account_id, id`,
      [prefix, count, VERIFY_REALM, state.level, JSON.stringify(state)],
    );
    return result.rows
      .map((row) => ({ accountId: Number(row.account_id), characterId: Number(row.id) }))
      .sort((a, b) => a.characterId - b.characterId);
  }

  async function seedLease(
    characterId: number,
    accountId: number,
    holder: string,
    nonce: string,
    ttlSeconds = 60,
  ): Promise<void> {
    await inspector.query(
      `INSERT INTO character_leases
         (character_id, realm, holder, nonce, account_id, acquired_at, heartbeat_at, expires_at)
       VALUES
         ($1, $2, $3, $4, $5, clock_timestamp(), clock_timestamp(),
          clock_timestamp() + make_interval(secs => $6))`,
      [characterId, VERIFY_REALM, holder, nonce, accountId, ttlSeconds],
    );
  }

  async function guardNamespace(): Promise<string | undefined> {
    const guard = await inspector.query(
      'SELECT save_namespace FROM game_profile_guard WHERE singleton = TRUE',
    );
    const value = guard.rows[0]?.save_namespace;
    return typeof value === 'string' ? value : undefined;
  }

  async function waitUntilProductionQueryIsBlocked(fragment: string): Promise<void> {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const result = await inspector.query(
        `SELECT EXISTS (
           SELECT 1
             FROM pg_stat_activity
            WHERE datname = current_database()
              AND application_name = $1
              AND state = 'active'
              AND position($2 in query) > 0
              AND cardinality(pg_blocking_pids(pid)) > 0
         ) AS blocked`,
        [PRODUCTION_APP, fragment],
      );
      if (result.rows[0]?.blocked === true) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`production query did not block on ${fragment}`);
  }

  async function rollbackAndRelease(client: PoolClient | undefined): Promise<void> {
    if (!client) return;
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }

  beforeAll(async () => {
    admin = new Pool({ connectionString: ADMIN_URL, max: 2 });
    const suppliedDatabase = new URL(ADMIN_URL as string).pathname.replace(/^\//, '');
    expect(suppliedDatabase).not.toBe(VERIFY_DB);
    await admin.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [VERIFY_DB],
    );
    await admin.query(`DROP DATABASE IF EXISTS ${VERIFY_DB}`);
    await admin.query(`CREATE DATABASE ${VERIFY_DB}`);
    databaseCreated = true;

    db = await import('../server/db');
    await db.ensureSchema();
    inspector = new Pool({
      connectionString: verifyUrl(ADMIN_URL as string, 'wocc_mir4_save_verify_inspector'),
      max: 10,
    });
    inspector.on('error', (error: Error & { code?: string }) => {
      if (!(cleaningUp && error.code === '57P01')) inspectorErrors.push(error);
    });
    const version = await inspector.query(
      "SELECT current_setting('server_version_num')::int AS num",
    );
    const versionNumber = Number(version.rows[0]?.num);
    expect(versionNumber).toBeGreaterThanOrEqual(160_000);
    expect(versionNumber).toBeLessThan(170_000);
  }, 120_000);

  beforeEach(async () => {
    await inspector.query('TRUNCATE accounts RESTART IDENTITY CASCADE');
    await inspector.query(
      `UPDATE game_profile_guard
          SET game_profile = 'mir4-gameplay-port', save_namespace = $1
        WHERE singleton = TRUE`,
      [MIR4_V1_SAVE_NAMESPACE],
    );
  });

  afterAll(async () => {
    cleaningUp = true;
    const errors: unknown[] = [];
    try {
      await inspector?.end();
    } catch (error) {
      errors.push(error);
    }
    try {
      await db?.pool?.end();
    } catch (error) {
      errors.push(error);
    }
    if (admin) {
      try {
        if (databaseCreated) {
          await admin.query(
            `SELECT pg_terminate_backend(pid)
               FROM pg_stat_activity
              WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [VERIFY_DB],
          );
          await admin.query(`DROP DATABASE ${VERIFY_DB}`);
        }
      } catch (error) {
        errors.push(error);
      }
      try {
        await admin.end();
      } catch (error) {
        errors.push(error);
      }
    }
    await new Promise((resolve) => setImmediate(resolve));
    errors.push(...inspectorErrors);
    if (errors.length > 0) throw new AggregateError(errors, 'MIR4 PostgreSQL cleanup failed');
  }, 30_000);

  it('rolls a dry run back and applies the exact v2 namespace atomically', async () => {
    await makeCharacter();

    await runMir4SaveV2Migration([]);
    expect(await guardNamespace()).toBe(MIR4_V1_SAVE_NAMESPACE);

    await runMir4SaveV2Migration(['--apply']);
    expect(await guardNamespace()).toBe(gameProfileSaveNamespace('mir4-gameplay-port'));
  }, 30_000);

  it('refuses apply with an active lease or a class outside the native roster', async () => {
    const active = await makeCharacter();
    await inspector.query(
      `INSERT INTO character_leases
         (character_id, realm, holder, nonce, account_id, acquired_at, heartbeat_at, expires_at)
       VALUES
         ($1, $2, 'active-holder', 'active-nonce', $3,
          clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '1 minute')`,
      [active.characterId, VERIFY_REALM, active.accountId],
    );

    await expect(runMir4SaveV2Migration(['--apply'])).rejects.toThrow(
      'requires zero active character leases',
    );
    expect(await guardNamespace()).toBe(MIR4_V1_SAVE_NAMESPACE);

    await inspector.query('TRUNCATE accounts RESTART IDENTITY CASCADE');
    await makeCharacter('paladin');
    await expect(runMir4SaveV2Migration(['--apply'])).rejects.toThrow(
      'classes incompatible with mir4-gameplay-port',
    );
    expect(await guardNamespace()).toBe(MIR4_V1_SAVE_NAMESPACE);
  }, 30_000);

  it('holds the lease-table fence until the migration transaction ends', async () => {
    const { accountId, characterId } = await makeCharacter();
    const migration = await inspector.connect();
    let migrationReleased = false;
    let acquire: Promise<boolean> | undefined;
    try {
      await migration.query('BEGIN');
      await migrateMir4SaveNamespaceV1ToV2(migration);

      acquire = db.acquireCharacterLease(
        characterId,
        accountId,
        'post-migration-nonce',
        db.PROCESS_LEASE_HOLDER,
      );
      await waitUntilProductionQueryIsBlocked('INSERT INTO character_leases');
      await migration.query('ROLLBACK');
      migration.release();
      migrationReleased = true;

      expect(await acquire).toBe(true);
      expect(await guardNamespace()).toBe(MIR4_V1_SAVE_NAMESPACE);
    } finally {
      if (!migrationReleased) await rollbackAndRelease(migration);
      await acquire?.catch(() => {});
    }
  }, 30_000);

  it('serializes a queued save before a same-account takeover without losing the save', async () => {
    const { accountId, characterId } = await makeCharacter();
    await seedLease(
      characterId,
      accountId,
      db.PROCESS_LEASE_HOLDER,
      'save-first-old-nonce',
      db.LEASE_TTL_SECONDS,
    );
    const blocker = await inspector.connect();
    let blockerReleased = false;
    let save: Promise<boolean> | undefined;
    let takeover: Promise<boolean> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM characters WHERE id = $1 FOR UPDATE', [characterId]);

      save = db.saveCharacterState(characterId, 7, stateAtLevel(7), 'save-first-old-nonce');
      await waitUntilProductionQueryIsBlocked(FENCED_SAVE_QUERY_PREFIX);
      takeover = db.acquireCharacterLease(
        characterId,
        accountId,
        'save-first-new-nonce',
        'save-first-new-holder',
      );
      await waitUntilProductionQueryIsBlocked('INSERT INTO character_leases');

      await blocker.query('COMMIT');
      blocker.release();
      blockerReleased = true;

      expect(await save).toBe(true);
      expect(await takeover).toBe(true);
      const row = await inspector.query(
        `SELECT character.level, lease.holder, lease.nonce
           FROM characters AS character
           JOIN character_leases AS lease ON lease.character_id = character.id
          WHERE character.id = $1`,
        [characterId],
      );
      expect(row.rows[0]).toMatchObject({
        level: 7,
        holder: 'save-first-new-holder',
        nonce: 'save-first-new-nonce',
      });
    } finally {
      if (!blockerReleased) await rollbackAndRelease(blocker);
      await save?.catch(() => {});
      await takeover?.catch(() => {});
    }
  }, 20_000);

  it('lets a queued takeover rotate the fence before a stale save can write', async () => {
    const { accountId, characterId } = await makeCharacter();
    await seedLease(
      characterId,
      accountId,
      db.PROCESS_LEASE_HOLDER,
      'takeover-first-old-nonce',
      db.LEASE_TTL_SECONDS,
    );
    const blocker = await inspector.connect();
    let blockerReleased = false;
    let takeover: Promise<boolean> | undefined;
    let save: Promise<boolean> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM characters WHERE id = $1 FOR UPDATE', [characterId]);

      takeover = db.acquireCharacterLease(
        characterId,
        accountId,
        'takeover-first-new-nonce',
        'takeover-first-new-holder',
      );
      await waitUntilProductionQueryIsBlocked('INSERT INTO character_leases');
      save = db.saveCharacterState(characterId, 9, stateAtLevel(9), 'takeover-first-old-nonce');
      await waitUntilProductionQueryIsBlocked(FENCED_SAVE_QUERY_PREFIX);

      await blocker.query('COMMIT');
      blocker.release();
      blockerReleased = true;

      expect(await takeover).toBe(true);
      expect(await save).toBe(false);
      const row = await inspector.query(
        `SELECT character.level, lease.holder, lease.nonce
           FROM characters AS character
           JOIN character_leases AS lease ON lease.character_id = character.id
          WHERE character.id = $1`,
        [characterId],
      );
      expect(row.rows[0]).toMatchObject({
        level: 1,
        holder: 'takeover-first-new-holder',
        nonce: 'takeover-first-new-nonce',
      });
    } finally {
      if (!blockerReleased) await rollbackAndRelease(blocker);
      await takeover?.catch(() => {});
      await save?.catch(() => {});
    }
  }, 20_000);

  it('rejects a save whose lease expires while the character row is blocked', async () => {
    const { accountId, characterId } = await makeCharacter();
    await seedLease(characterId, accountId, db.PROCESS_LEASE_HOLDER, 'expiring-save-nonce', 1);
    const blocker = await inspector.connect();
    let blockerReleased = false;
    let save: Promise<boolean> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM characters WHERE id = $1 FOR UPDATE', [characterId]);
      save = db.saveCharacterState(characterId, 11, stateAtLevel(11), 'expiring-save-nonce');
      await waitUntilProductionQueryIsBlocked(FENCED_SAVE_QUERY_PREFIX);
      await blocker.query('SELECT pg_sleep(2)');
      await blocker.query('COMMIT');
      blocker.release();
      blockerReleased = true;

      expect(await save).toBe(false);
      const row = await inspector.query(
        `SELECT character.level,
                lease.expires_at < clock_timestamp() AS expired
           FROM characters AS character
           JOIN character_leases AS lease ON lease.character_id = character.id
          WHERE character.id = $1`,
        [characterId],
      );
      expect(row.rows[0]).toMatchObject({ level: 1, expired: true });
    } finally {
      if (!blockerReleased) await rollbackAndRelease(blocker);
      await save?.catch(() => {});
    }
  }, 20_000);

  it('persists four maximum MIR4 projections concurrently and reports dedicated-cluster WAL', async () => {
    const { state } = buildMaxMir4PersistedState();
    const characters = await Promise.all(Array.from({ length: 4 }, () => makeCharacter()));
    const nonces = characters.map((_, index) => `maximum-save-${index}`);
    for (const [index, character] of characters.entries()) {
      expect(
        await db.acquireCharacterLease(
          character.characterId,
          character.accountId,
          nonces[index],
          db.PROCESS_LEASE_HOLDER,
        ),
      ).toBe(true);
    }

    const beforeWal = await inspector.query('SELECT pg_current_wal_lsn()::text AS lsn');
    const lsn = beforeWal.rows[0]?.lsn;
    expect(typeof lsn).toBe('string');
    const startedAt = performance.now();
    const outcomes = await Promise.all(
      characters.map((character, index) =>
        db.saveCharacterState(character.characterId, state.level, state, nonces[index]),
      ),
    );
    const durationMs = performance.now() - startedAt;
    expect(outcomes).toEqual([true, true, true, true]);

    const aggregate = await inspector.query(
      `SELECT COUNT(*)::int AS count,
              MIN(octet_length(state::text))::int AS min_bytes,
              MAX(octet_length(state::text))::int AS max_bytes,
              BOOL_AND(
                state ? 'mir4ArcQuests' AND
                state ? 'mir4EquipmentInstances' AND
                state ? 'mir4Mounts' AND
                state ? 'mir4Spirits'
              ) AS complete
         FROM characters
        WHERE id = ANY($1::bigint[])`,
      [characters.map((character) => character.characterId)],
    );
    const wal = await inspector.query(
      'SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), $1::pg_lsn)::float8 AS bytes',
      [lsn],
    );
    const row = aggregate.rows[0];
    const walBytes = Number(wal.rows[0]?.bytes);

    console.info(
      JSON.stringify({
        event: 'mir4_pg_maximum_save_probe',
        concurrentSaves: 4,
        minStateBytes: Number(row?.min_bytes),
        maxStateBytes: Number(row?.max_bytes),
        walBytes,
        durationMs: Math.round(durationMs * 100) / 100,
      }),
    );

    expect(row?.count).toBe(4);
    expect(row?.complete).toBe(true);
    expect(Number(row?.min_bytes)).toBeGreaterThan(0);
    expect(Number(row?.max_bytes)).toBeLessThanOrEqual(128 * 1024);
    // pg_current_wal_lsn is cluster-global. The dedicated CI service makes
    // this diagnostic useful, but it is deliberately not a hard budget whose
    // result unrelated PostgreSQL background work could make flaky.
    expect(Number.isFinite(walBytes)).toBe(true);
    expect(walBytes).toBeGreaterThanOrEqual(0);
    expect(durationMs).toBeLessThan(30_000);
  }, 45_000);

  it('flushes a 1,000-session maximum-state autosave cycle with production concurrency', async () => {
    const { state } = buildMaxMir4PersistedState();
    const characters = await makeCharacters(AUTOSAVE_CYCLE_SIZE);
    expect(characters).toHaveLength(AUTOSAVE_CYCLE_SIZE);
    const nonces = characters.map((character) => `wave-${character.characterId}`);
    await inspector.query(
      `INSERT INTO character_leases
         (character_id, realm, holder, nonce, account_id, acquired_at, heartbeat_at, expires_at)
       SELECT lease.character_id, $4, $5, lease.nonce, lease.account_id,
              clock_timestamp(), clock_timestamp(),
              clock_timestamp() + make_interval(secs => $6)
         FROM unnest($1::int[], $2::int[], $3::text[])
              AS lease(character_id, account_id, nonce)`,
      [
        characters.map((character) => character.characterId),
        characters.map((character) => character.accountId),
        nonces,
        VERIFY_REALM,
        db.PROCESS_LEASE_HOLDER,
        db.LEASE_TTL_SECONDS,
      ],
    );

    const durations = new Array<number>(characters.length);
    const outcomes = new Array<boolean>(characters.length);
    let next = 0;
    const startedAt = performance.now();
    const heartbeatStartedAt = performance.now();
    const heartbeatCount = await db.heartbeatCharacterLeases(db.PROCESS_LEASE_HOLDER);
    const heartbeatDurationMs = performance.now() - heartbeatStartedAt;
    const worker = async (): Promise<void> => {
      for (;;) {
        const index = next++;
        const character = characters[index];
        const nonce = nonces[index];
        if (!character || !nonce) return;
        const saveStartedAt = performance.now();
        outcomes[index] = await db.saveCharacterState(
          character.characterId,
          state.level,
          state,
          nonce,
        );
        durations[index] = performance.now() - saveStartedAt;
      }
    };
    await Promise.all(Array.from({ length: AUTOSAVE_CYCLE_CONCURRENCY }, worker));
    const durationMs = performance.now() - startedAt;

    const aggregate = await inspector.query(
      `SELECT COUNT(*)::int AS count,
              MIN(octet_length(character.state::text))::int AS min_bytes,
              MAX(octet_length(character.state::text))::int AS max_bytes,
              BOOL_AND(
                character.state ? 'mir4ArcQuests' AND
                character.state ? 'mir4EquipmentInstances' AND
                character.state ? 'mir4Mounts' AND
                character.state ? 'mir4Spirits'
              ) AS complete,
              COUNT(*) FILTER (WHERE lease.expires_at < clock_timestamp())::int AS expired_leases
         FROM characters AS character
         JOIN character_leases AS lease ON lease.character_id = character.id
        WHERE character.id = ANY($1::int[])`,
      [characters.map((character) => character.characterId)],
    );
    const row = aggregate.rows[0];
    const p50Ms = percentile(durations, 0.5);
    const p95Ms = percentile(durations, 0.95);
    const p99Ms = percentile(durations, 0.99);

    console.info(
      JSON.stringify({
        event: 'mir4_pg_autosave_cycle_probe',
        sessions: AUTOSAVE_CYCLE_SIZE,
        concurrency: AUTOSAVE_CYCLE_CONCURRENCY,
        heartbeatCount,
        heartbeatDurationMs: Math.round(heartbeatDurationMs * 100) / 100,
        minStateBytes: Number(row?.min_bytes),
        maxStateBytes: Number(row?.max_bytes),
        durationMs: Math.round(durationMs * 100) / 100,
        p50Ms: Math.round(p50Ms * 100) / 100,
        p95Ms: Math.round(p95Ms * 100) / 100,
        p99Ms: Math.round(p99Ms * 100) / 100,
        maxSaveMs: Math.round(Math.max(...durations) * 100) / 100,
      }),
    );

    expect(outcomes).toHaveLength(AUTOSAVE_CYCLE_SIZE);
    expect(heartbeatCount).toBe(AUTOSAVE_CYCLE_SIZE);
    expect(outcomes.every((outcome) => outcome === true)).toBe(true);
    expect(durations).toHaveLength(AUTOSAVE_CYCLE_SIZE);
    expect(durations.every(Number.isFinite)).toBe(true);
    expect(row?.count).toBe(AUTOSAVE_CYCLE_SIZE);
    expect(row?.complete).toBe(true);
    expect(row?.expired_leases).toBe(0);
    expect(Number(row?.min_bytes)).toBeGreaterThan(0);
    expect(Number(row?.max_bytes)).toBeLessThanOrEqual(128 * 1024);
    expect(durationMs).toBeLessThan(AUTOSAVE_CYCLE_BUDGET_MS);
  }, 180_000);
});
