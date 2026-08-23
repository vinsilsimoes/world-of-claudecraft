import { Client } from 'pg';
import {
  migrateMir4SaveNamespaceV1ToV2,
  SCHEMA_ADVISORY_LOCK_KEY,
} from '../server/game_profile_db';

export async function runMir4SaveV2Migration(argv: readonly string[]): Promise<void> {
  const unknown = argv.filter((arg) => arg !== '--apply');
  if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown[0]}`);
  const apply = argv.includes('--apply');
  try {
    process.loadEnvFile?.();
  } catch {
    // .env is optional; production injects DATABASE_URL.
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15_000,
    query_timeout: 330_000,
  });
  let finished = false;
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query("SET LOCAL statement_timeout = '5min'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '6min'");
    await client.query('SELECT pg_advisory_xact_lock($1)', [SCHEMA_ADVISORY_LOCK_KEY]);
    await migrateMir4SaveNamespaceV1ToV2(client);
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    finished = true;
  } catch (error) {
    if (!finished) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the migration error if the connection is already closed.
      }
    }
    throw error;
  } finally {
    await client.end();
  }

  console.log(
    apply
      ? 'MIR4 save namespace migrated from v1 to v2.'
      : 'MIR4 save v1 roster is compatible. Dry run rolled back; re-run with --apply.',
  );
}
