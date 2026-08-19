import {
  DEFAULT_GAME_PROFILE,
  type GameProfile,
  gameProfileForCharacterState,
  gameProfileSaveNamespace,
  isGameProfile,
} from '../src/sim/game_profile';

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
