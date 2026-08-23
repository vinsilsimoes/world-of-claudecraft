import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  options: [] as unknown[],
  connect: vi.fn(async () => {}),
  query: vi.fn(async () => ({ rows: [], rowCount: 1 })),
  end: vi.fn(async () => {}),
  migrate: vi.fn(async () => {}),
}));

vi.mock('pg', () => ({
  Client: function Client(options: unknown) {
    mocks.options.push(options);
    return { connect: mocks.connect, query: mocks.query, end: mocks.end };
  },
}));

vi.mock('../server/game_profile_db', () => ({
  SCHEMA_ADVISORY_LOCK_KEY: 0x57_4f_43_01,
  migrateMir4SaveNamespaceV1ToV2: mocks.migrate,
}));

import { runMir4SaveV2Migration } from '../scripts/mir4_save_v2_migration';

const originalDatabaseUrl = process.env.DATABASE_URL;

describe('MIR4 save v2 migration shell', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://migration/test';
    mocks.options.length = 0;
    mocks.connect.mockClear();
    mocks.query.mockClear();
    mocks.end.mockClear();
    mocks.migrate.mockReset();
    mocks.migrate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    vi.restoreAllMocks();
  });

  it('dry-runs under bounded timeouts and the shared advisory lock, then rolls back', async () => {
    await runMir4SaveV2Migration([]);
    expect(mocks.options).toEqual([
      {
        connectionString: 'postgres://migration/test',
        connectionTimeoutMillis: 15_000,
        query_timeout: 330_000,
      },
    ]);
    expect(mocks.query.mock.calls).toEqual([
      ['BEGIN'],
      ["SET LOCAL lock_timeout = '30s'"],
      ["SET LOCAL statement_timeout = '5min'"],
      ["SET LOCAL idle_in_transaction_session_timeout = '6min'"],
      ['SELECT pg_advisory_xact_lock($1)', [0x57_4f_43_01]],
      ['ROLLBACK'],
    ]);
    expect(mocks.migrate).toHaveBeenCalledTimes(1);
    expect(mocks.end).toHaveBeenCalledTimes(1);
  });

  it('commits only with --apply', async () => {
    await runMir4SaveV2Migration(['--apply']);
    expect(mocks.query).toHaveBeenLastCalledWith('COMMIT');
  });

  it('rolls back and closes after a migration failure', async () => {
    mocks.migrate.mockRejectedValueOnce(new Error('invalid roster'));
    await expect(runMir4SaveV2Migration(['--apply'])).rejects.toThrow('invalid roster');
    expect(mocks.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mocks.end).toHaveBeenCalledTimes(1);
  });

  it('rejects bad invocation before opening a connection', async () => {
    await expect(runMir4SaveV2Migration(['--force'])).rejects.toThrow('Unknown argument');
    expect(mocks.options).toEqual([]);

    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {});
    delete process.env.DATABASE_URL;
    await expect(runMir4SaveV2Migration([])).rejects.toThrow('DATABASE_URL is required');
    expect(mocks.options).toEqual([]);
  });
});
