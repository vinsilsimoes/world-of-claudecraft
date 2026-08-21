import {
  DEFAULT_GAME_PROFILE,
  type GameProfile,
  gameProfileForCharacterState,
  gameProfileSaveNamespace,
  isGameProfile,
} from '../src/sim/game_profile';
import { isClassForGameProfile } from '../src/sim/game_profile_roster';

export const SCHEMA_ADVISORY_LOCK_KEY = 0x57_4f_43_01; // "WOC\x01"
export const MIR4_V1_SAVE_NAMESPACE = 'mir4-gameplay-port-v1';

export const GAME_PROFILE_GUARD_SCHEMA = `
CREATE TABLE IF NOT EXISTS game_profile_guard (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  game_profile TEXT NOT NULL,
  save_namespace TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

interface GameProfileDatabaseClient {
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
}

interface StoredGameProfile extends Record<string, unknown> {
  game_profile: unknown;
  save_namespace: unknown;
}

export function assertCharacterStateGameProfile(
  state: unknown,
  requestedProfile: GameProfile,
  source = 'character state',
): void {
  const storedProfile = gameProfileForCharacterState(state);
  if (storedProfile === requestedProfile) return;
  throw new Error(
    `${source} belongs to game profile ${storedProfile ?? 'unknown'}, not ${requestedProfile}`,
  );
}

async function storedProfile(client: GameProfileDatabaseClient): Promise<StoredGameProfile | null> {
  const result = await client.query(
    'SELECT game_profile, save_namespace FROM game_profile_guard WHERE singleton = TRUE',
  );
  return (result.rows[0] as StoredGameProfile | undefined) ?? null;
}

async function legacyDatabaseExists(client: GameProfileDatabaseClient): Promise<boolean> {
  const result = await client.query(
    `SELECT (
       to_regclass('accounts') IS NOT NULL OR
       to_regclass('auth_tokens') IS NOT NULL OR
       to_regclass('characters') IS NOT NULL OR
       to_regclass('world_state') IS NOT NULL
     ) AS has_legacy_state`,
  );
  return result.rows[0]?.has_legacy_state === true;
}

export async function ensureGameProfilePersistence(
  client: GameProfileDatabaseClient,
  requestedProfile: GameProfile,
): Promise<void> {
  await client.query(GAME_PROFILE_GUARD_SCHEMA);
  const initialProfile = (await legacyDatabaseExists(client))
    ? DEFAULT_GAME_PROFILE
    : requestedProfile;
  await client.query(
    `INSERT INTO game_profile_guard (singleton, game_profile, save_namespace)
     VALUES (TRUE, $1, $2)
     ON CONFLICT (singleton) DO NOTHING`,
    [initialProfile, gameProfileSaveNamespace(initialProfile)],
  );
  const stored = await storedProfile(client);
  if (
    stored === null ||
    !isGameProfile(stored.game_profile) ||
    typeof stored.save_namespace !== 'string'
  ) {
    throw new Error('game profile persistence guard is missing or invalid');
  }
  const expectedNamespace = gameProfileSaveNamespace(stored.game_profile);
  if (stored.save_namespace !== expectedNamespace) {
    throw new Error(
      `game profile persistence namespace mismatch: ${stored.save_namespace} does not match ${expectedNamespace}`,
    );
  }
  if (stored.game_profile !== requestedProfile) {
    throw new Error(
      `database belongs to game profile ${stored.game_profile}, not ${requestedProfile}; use an isolated DATABASE_URL`,
    );
  }
}

/** Explicit-migration aggregate preflight after the characters table exists. */
export async function assertGameProfileCharacterRoster(
  client: GameProfileDatabaseClient,
  requestedProfile: GameProfile,
): Promise<void> {
  const result = await client.query(
    'SELECT class, COUNT(*)::int AS count FROM characters GROUP BY class ORDER BY class',
  );
  const invalid = result.rows.filter((row) => !isClassForGameProfile(row.class, requestedProfile));
  if (invalid.length === 0) return;
  const counts = invalid.map((row) => `${String(row.class)}=${Number(row.count) || 0}`).join(', ');
  throw new Error(`database contains classes incompatible with ${requestedProfile}: ${counts}`);
}

/**
 * One-shot MIR4 persistence namespace migration. The caller owns a transaction
 * and the shared schema advisory lock; normal server boot deliberately never
 * invokes this path.
 */
export async function migrateMir4SaveNamespaceV1ToV2(
  client: GameProfileDatabaseClient,
): Promise<void> {
  const stored = await storedProfile(client);
  if (
    stored?.game_profile !== 'mir4-gameplay-port' ||
    stored.save_namespace !== MIR4_V1_SAVE_NAMESPACE
  ) {
    throw new Error(
      `expected MIR4 v1 persistence guard, found ${String(stored?.game_profile ?? 'missing')}/${String(stored?.save_namespace ?? 'missing')}`,
    );
  }
  // Fence every lease writer for the rest of this transaction, then refuse an
  // apply/dry-run while any non-expired character session remains active. The
  // advisory schema lock alone cannot block an older game process. Keep this
  // preflight read-only: dry-run must not create WAL or dead lease tuples.
  await client.query('LOCK TABLE character_leases IN SHARE MODE');
  const leases = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM character_leases
       WHERE expires_at >= now()
     ) AS has_active`,
  );
  const hasActiveLeases = leases.rows[0]?.has_active;
  if (typeof hasActiveLeases !== 'boolean') {
    throw new Error('character lease preflight returned an invalid result');
  }
  if (hasActiveLeases) throw new Error('MIR4 save migration requires zero active character leases');
  await assertGameProfileCharacterRoster(client, 'mir4-gameplay-port');
  const result = await client.query(
    `UPDATE game_profile_guard
     SET save_namespace = $1
     WHERE singleton = TRUE AND game_profile = $2 AND save_namespace = $3`,
    [gameProfileSaveNamespace('mir4-gameplay-port'), 'mir4-gameplay-port', MIR4_V1_SAVE_NAMESPACE],
  );
  if (result.rowCount !== 1) {
    throw new Error('MIR4 v1 persistence guard changed during migration');
  }
}
