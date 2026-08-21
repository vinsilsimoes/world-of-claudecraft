// Opt-in PostgreSQL 16 proof for the character lease concurrency contract.
//
// The DB-free suites pin the SQL shape and caller behavior, but mocks cannot
// prove row-lock waits, READ COMMITTED visibility, FK gap protection, or SKIP
// LOCKED. Set TEST_DATABASE_URL to an admin connection for a disposable local
// PostgreSQL server. This file creates and drops only the database named below.

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CharacterState } from '../src/sim/sim';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const REQUIRE_DATABASE = process.env.WOC_REQUIRE_PG_INTEGRATION === '1';
if (REQUIRE_DATABASE && !ADMIN_URL) {
  throw new Error('WOC_REQUIRE_PG_INTEGRATION=1 requires TEST_DATABASE_URL');
}
const VERIFY_DB = `wocc_character_lease_verify_${process.pid}`;
const VERIFY_REALM = 'LeaseVerify';
const PRODUCTION_APP = 'wocc_lease_verify_production';

function verifyUrl(admin: string, applicationName: string): string {
  const url = new URL(admin);
  url.pathname = `/${VERIFY_DB}`;
  url.searchParams.set('application_name', applicationName);
  return url.toString();
}

if (ADMIN_URL) {
  process.env.DATABASE_URL = verifyUrl(ADMIN_URL, PRODUCTION_APP);
  process.env.GAME_PROFILE = 'woc-classic';
  process.env.REALM_NAME = VERIFY_REALM;
}

const describeDb = ADMIN_URL ? describe : describe.skip;

const STATE = (marker: string): CharacterState =>
  ({
    level: 7,
    marker,
    questLog: [],
    questsDone: [],
    inventory: [],
  }) as unknown as CharacterState;

describeDb('character leases (REAL PostgreSQL 16)', () => {
  let admin: Pool;
  let inspector: Pool;
  let db: typeof import('../server/db');
  let sequence = 0;
  let databaseCreated = false;

  async function makeCharacter(): Promise<{ accountId: number; characterId: number }> {
    sequence += 1;
    const account = await inspector.query(
      `INSERT INTO accounts (username, password_hash)
       VALUES ($1, 'x')
       RETURNING id`,
      [`lease_verify_${sequence}`],
    );
    const accountId = Number(account.rows[0]?.id);
    const character = await inspector.query(
      `INSERT INTO characters (account_id, name, class, realm, level, state)
       VALUES ($1, $2, 'warrior', $3, 7, $4::jsonb)
       RETURNING id`,
      [accountId, `LeaseVerify${sequence}`, VERIFY_REALM, JSON.stringify(STATE('initial'))],
    );
    return { accountId, characterId: Number(character.rows[0]?.id) };
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
      connectionString: verifyUrl(ADMIN_URL as string, 'wocc_lease_verify_inspector'),
      max: 8,
    });
    const version = await inspector.query(
      "SELECT current_setting('server_version_num')::int AS num",
    );
    const versionNumber = Number(version.rows[0]?.num);
    expect(versionNumber).toBeGreaterThanOrEqual(160_000);
    expect(versionNumber).toBeLessThan(170_000);
  }, 120_000);

  afterAll(async () => {
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
    if (errors.length > 0) throw new AggregateError(errors, 'character lease cleanup failed');
  }, 30_000);

  it('starts a contended takeover with a fresh full TTL after the row lock wait', async () => {
    const { accountId, characterId } = await makeCharacter();
    await seedLease(characterId, accountId, 'old-holder', 'old-nonce');
    const blocker = await inspector.connect();
    let blockerReleased = false;
    let takeover: Promise<boolean> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT 1 FROM character_leases WHERE character_id = $1 FOR UPDATE', [
        characterId,
      ]);

      takeover = db.acquireCharacterLease(characterId, accountId, 'new-nonce', 'new-holder');
      await waitUntilProductionQueryIsBlocked('INSERT INTO character_leases');
      await blocker.query('SELECT pg_sleep(2)');
      await blocker.query('COMMIT');
      blocker.release();
      blockerReleased = true;

      expect(await takeover).toBe(true);
      const lease = await inspector.query(
        `SELECT holder, nonce,
                extract(epoch FROM expires_at - heartbeat_at)::float8 AS ttl_seconds,
                extract(epoch FROM expires_at - clock_timestamp())::float8 AS remaining
           FROM character_leases
          WHERE character_id = $1`,
        [characterId],
      );
      expect(lease.rows[0]).toMatchObject({ holder: 'new-holder', nonce: 'new-nonce' });
      expect(Number(lease.rows[0]?.ttl_seconds)).toBeGreaterThan(89.99);
      expect(Number(lease.rows[0]?.ttl_seconds)).toBeLessThan(90.01);
      expect(Number(lease.rows[0]?.remaining)).toBeGreaterThan(85);
      expect(Number(lease.rows[0]?.remaining)).toBeLessThanOrEqual(90);
    } finally {
      if (!blockerReleased) await rollbackAndRelease(blocker);
      await takeover?.catch(() => {});
    }
  }, 15_000);

  it('skips one row held by a save while renewing every free lease for the holder', async () => {
    const locked = await makeCharacter();
    const free = await makeCharacter();
    await seedLease(locked.characterId, locked.accountId, 'heartbeat-holder', 'locked', 20);
    await seedLease(free.characterId, free.accountId, 'heartbeat-holder', 'free', 20);
    const blocker = await inspector.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT 1 FROM character_leases WHERE character_id = $1 FOR UPDATE', [
        locked.characterId,
      ]);

      expect(await db.heartbeatCharacterLeases('heartbeat-holder')).toBe(1);
      const leases = await inspector.query(
        `SELECT character_id,
                extract(epoch FROM expires_at - heartbeat_at)::float8 AS ttl_seconds,
                extract(epoch FROM expires_at - clock_timestamp())::float8 AS remaining
           FROM character_leases
          WHERE character_id = ANY($1::bigint[])
          ORDER BY character_id`,
        [[locked.characterId, free.characterId]],
      );
      const remaining = new Map(
        leases.rows.map((row) => [Number(row.character_id), Number(row.remaining)]),
      );
      const ttlSeconds = new Map(
        leases.rows.map((row) => [Number(row.character_id), Number(row.ttl_seconds)]),
      );
      expect(remaining.get(locked.characterId)).toBeLessThan(20);
      expect(ttlSeconds.get(free.characterId)).toBeCloseTo(db.LEASE_TTL_SECONDS, 6);
      expect(remaining.get(free.characterId)).toBeGreaterThan(85);
    } finally {
      await rollbackAndRelease(blocker);
    }
  }, 15_000);

  it('lets delete win the absent-lease race without leaving an orphan lease', async () => {
    const { accountId, characterId } = await makeCharacter();
    const deleter = await inspector.connect();
    let deleterReleased = false;
    let acquire: Promise<boolean> | undefined;
    try {
      await deleter.query('BEGIN');
      const character = await deleter.query(
        `SELECT id
           FROM characters
          WHERE id = $1 AND account_id = $2 AND realm = $3
          FOR UPDATE`,
        [characterId, accountId, VERIFY_REALM],
      );
      expect(character.rowCount).toBe(1);

      acquire = db.acquireCharacterLease(characterId, accountId, 'late-nonce', 'late-holder');
      await waitUntilProductionQueryIsBlocked('INSERT INTO character_leases');
      expect(
        (
          await deleter.query(
            'SELECT expires_at >= clock_timestamp() AS active FROM character_leases WHERE character_id = $1 FOR UPDATE',
            [characterId],
          )
        ).rowCount,
      ).toBe(0);
      expect(
        (
          await deleter.query(
            'DELETE FROM characters WHERE id = $1 AND account_id = $2 AND realm = $3',
            [characterId, accountId, VERIFY_REALM],
          )
        ).rowCount,
      ).toBe(1);
      await deleter.query('COMMIT');
      deleter.release();
      deleterReleased = true;

      expect(await acquire).toBe(false);
      expect(
        (await inspector.query('SELECT 1 FROM characters WHERE id = $1', [characterId])).rowCount,
      ).toBe(0);
      expect(
        (
          await inspector.query('SELECT 1 FROM character_leases WHERE character_id = $1', [
            characterId,
          ])
        ).rowCount,
      ).toBe(0);
    } finally {
      if (!deleterReleased) await rollbackAndRelease(deleter);
      await acquire?.catch(() => {});
    }
  }, 15_000);

  it('lets acquire win the reverse race and makes delete refuse the active lease', async () => {
    const { accountId, characterId } = await makeCharacter();
    expect(
      await db.acquireCharacterLease(characterId, accountId, 'live-nonce', 'live-holder'),
    ).toBe(true);

    expect(await db.deleteCharacter(accountId, characterId)).toBe(false);
    expect(
      (await inspector.query('SELECT 1 FROM characters WHERE id = $1', [characterId])).rowCount,
    ).toBe(1);
    expect(
      (
        await inspector.query('SELECT 1 FROM character_leases WHERE character_id = $1', [
          characterId,
        ])
      ).rowCount,
    ).toBe(1);
  });

  it('rotates the nonce after a prior save and rejects every stale save afterward', async () => {
    const { accountId, characterId } = await makeCharacter();
    await seedLease(
      characterId,
      accountId,
      db.PROCESS_LEASE_HOLDER,
      'old-nonce',
      db.LEASE_TTL_SECONDS,
    );

    expect(await db.saveCharacterState(characterId, 8, STATE('before-takeover'), 'old-nonce')).toBe(
      true,
    );
    expect(await db.acquireCharacterLease(characterId, accountId, 'new-nonce', 'new-holder')).toBe(
      true,
    );
    expect(await db.saveCharacterState(characterId, 99, STATE('stale'), 'old-nonce')).toBe(false);

    const row = await inspector.query('SELECT level, state FROM characters WHERE id = $1', [
      characterId,
    ]);
    expect(Number(row.rows[0]?.level)).toBe(8);
    expect((row.rows[0]?.state as { marker?: unknown })?.marker).toBe('before-takeover');
  });
});
