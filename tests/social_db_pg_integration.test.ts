// Opt-in PostgreSQL 16 proof for the social pair-lock protocol, bounded reads,
// planner indexes, and the one-shot privacy repair. The default suite remains
// DB-free; set TEST_DATABASE_URL to run this in an isolated disposable schema.

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const DB_URL = process.env.TEST_DATABASE_URL;
const SCHEMA = 'aeldrune_social_integration_test';
const REALM = 'AeldruneSocialIntegration';
const describeDb = DB_URL ? describe : describe.skip;

function databaseUrlForSchema(base: string, schema: string): string {
  const url = new URL(base);
  url.searchParams.set('options', `-c search_path=${schema}`);
  return url.toString();
}

function planUsesIndex(node: unknown, indexName: string): boolean {
  if (!node || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;
  if (record['Index Name'] === indexName) return true;
  return Object.values(record).some((value) =>
    Array.isArray(value)
      ? value.some((item) => planUsesIndex(item, indexName))
      : planUsesIndex(value, indexName),
  );
}

describeDb('social graph (REAL PostgreSQL 16)', () => {
  let bootstrap: Pool;
  let pool: Pool;
  let socialDb: import('../server/social_db').PgSocialDb;
  let runPrivacyMigration: typeof import('../server/social_privacy_migration').runSocialPrivacyMigration;
  const ids = new Map<string, number>();

  beforeAll(async () => {
    bootstrap = new Pool({ connectionString: DB_URL, max: 2 });
    await bootstrap.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await bootstrap.query(`CREATE SCHEMA ${SCHEMA}`);

    const scopedUrl = databaseUrlForSchema(DB_URL!, SCHEMA);
    process.env.DATABASE_URL = scopedUrl;
    process.env.REALM_NAME = REALM;

    pool = new Pool({ connectionString: scopedUrl, max: 16 });
    await pool.query(`CREATE TABLE characters (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      class TEXT NOT NULL DEFAULT 'warrior',
      level INT NOT NULL DEFAULT 20,
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      force_rename BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE world_state (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const socialModule = await import('../server/social_db');
    const indexModule = await import('../server/social_db_indexes');
    ({ runSocialPrivacyMigration: runPrivacyMigration } = await import(
      '../server/social_privacy_migration'
    ));
    await pool.query(socialModule.SOCIAL_SCHEMA);
    await pool.query(indexModule.BLOCKS_BLOCKED_ID_INDEX_SQL);
    socialDb = new socialModule.PgSocialDb(pool);

    const seeded = await pool.query(
      `INSERT INTO characters (name, realm)
       SELECT 'social_' || n::text, $1 FROM generate_series(1, 70) n
       RETURNING id, name`,
      [REALM],
    );
    for (const row of seeded.rows) ids.set(String(row.name), Number(row.id));
  }, 120_000);

  beforeEach(async () => {
    await pool.query('TRUNCATE friendships, friend_requests, blocks');
    await pool.query("DELETE FROM world_state WHERE key LIKE 'migration:social-%'");
  });

  afterAll(async () => {
    if (pool) await pool.end();
    if (!bootstrap) return;
    await bootstrap.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await bootstrap.end();
  });

  const id = (n: number): number => {
    const found = ids.get(`social_${n}`);
    if (found === undefined) throw new Error(`missing social_${n}`);
    return found;
  };

  it('serializes reciprocal requests without deadlock and creates one mutual friendship', async () => {
    const results = await Promise.all([
      socialDb.requestFriendship(id(1), id(2)),
      socialDb.requestFriendship(id(2), id(1)),
    ]);
    expect([...results].sort()).toEqual(['accepted', 'requested']);
    expect((await pool.query('SELECT character_id, friend_id FROM friendships')).rowCount).toBe(2);
    expect((await pool.query('SELECT 1 FROM friend_requests')).rowCount).toBe(0);
  });

  it('serializes request/block and accept/remove races into safe final states', async () => {
    const requestVsBlock = await Promise.all([
      socialDb.requestFriendship(id(3), id(4)),
      socialDb.addBlock(id(4), id(3)),
    ]);
    expect(requestVsBlock[0] === 'requested' || requestVsBlock[0] === 'blocked').toBe(true);
    expect(requestVsBlock[1]).toBe('added');
    expect((await pool.query('SELECT 1 FROM friend_requests')).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM friendships')).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM blocks')).rowCount).toBe(1);

    await pool.query('TRUNCATE friendships, friend_requests, blocks');
    expect(await socialDb.requestFriendship(id(5), id(6))).toBe('requested');
    const acceptVsRemove = await Promise.all([
      socialDb.acceptFriendRequest(id(6), id(5)),
      socialDb.removeFriendPair(id(5), id(6)),
    ]);
    expect(acceptVsRemove[0] === 'accepted' || acceptVsRemove[0] === 'missing').toBe(true);
    expect((await pool.query('SELECT 1 FROM friend_requests')).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM friendships')).rowCount).toBe(0);
  });

  it('enforces the 50-request recipient cap under contention', async () => {
    const recipientId = id(70);
    const results = await Promise.all(
      Array.from({ length: 51 }, (_, offset) =>
        socialDb.requestFriendship(id(10 + offset), recipientId),
      ),
    );
    expect(results.filter((result) => result === 'requested')).toHaveLength(50);
    expect(results.filter((result) => result === 'recipient_full')).toHaveLength(1);
    expect(
      Number(
        (await pool.query('SELECT count(*)::int AS count FROM friend_requests')).rows[0].count,
      ),
    ).toBe(50);
    expect(await socialDb.listFriendRequests(recipientId)).toHaveLength(50);
  });

  it('uses the recipient and reverse-block indexes and keeps the request read at 50 rows', async () => {
    const recipientId = id(70);
    await pool.query(
      `INSERT INTO friend_requests (requester_id, recipient_id, created_at)
       SELECT id, $1, now() + (id * interval '1 millisecond')
       FROM characters WHERE id <> $1 LIMIT 60`,
      [recipientId],
    );
    await pool.query(
      `INSERT INTO blocks (character_id, blocked_id)
       SELECT id, $1 FROM characters WHERE id <> $1 LIMIT 60`,
      [recipientId],
    );
    const client = await pool.connect();
    try {
      await client.query('SET enable_seqscan = off');
      const requestPlan = await client.query(
        `EXPLAIN (ANALYZE, COSTS OFF, FORMAT JSON)
         SELECT requester_id FROM friend_requests
         WHERE recipient_id = $1
         ORDER BY created_at, requester_id
         LIMIT 50`,
        [recipientId],
      );
      const blockPlan = await client.query(
        `EXPLAIN (ANALYZE, COSTS OFF, FORMAT JSON)
         SELECT character_id FROM blocks WHERE blocked_id = $1`,
        [recipientId],
      );
      expect(
        planUsesIndex(requestPlan.rows[0]['QUERY PLAN'], 'friend_requests_recipient_created'),
      ).toBe(true);
      expect(planUsesIndex(blockPlan.rows[0]['QUERY PLAN'], 'blocks_blocked_id')).toBe(true);
      expect(await socialDb.listFriendRequests(recipientId)).toHaveLength(50);
    } finally {
      client.release();
    }
  });

  it('runs the provisional-edge repair once and later probes only its marker', async () => {
    await pool.query('INSERT INTO friendships (character_id, friend_id) VALUES ($1, $2)', [
      id(1),
      id(2),
    ]);
    await pool.query('INSERT INTO friend_requests (requester_id, recipient_id) VALUES ($1, $2)', [
      id(1),
      id(2),
    ]);

    await expect(runPrivacyMigration(pool)).resolves.toEqual({
      ran: true,
      removedProvisionalEdges: 1,
    });
    expect((await pool.query('SELECT 1 FROM friendships')).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM friend_requests')).rowCount).toBe(1);
    await expect(runPrivacyMigration(pool)).resolves.toEqual({
      ran: false,
      removedProvisionalEdges: 0,
    });
  });
});
