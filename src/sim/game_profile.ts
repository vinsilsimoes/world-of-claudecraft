export const GAME_PROFILES = ['woc-classic', 'mir4-gameplay-port'] as const;

export type GameProfile = (typeof GAME_PROFILES)[number];

export const DEFAULT_GAME_PROFILE: GameProfile = 'woc-classic';
export const MIR4_GAME_PROFILE: GameProfile = 'mir4-gameplay-port';

const GAME_PROFILE_SET: ReadonlySet<string> = new Set(GAME_PROFILES);

export function isGameProfile(value: unknown): value is GameProfile {
  return typeof value === 'string' && GAME_PROFILE_SET.has(value);
}

export function parseGameProfile(value: unknown): GameProfile | null {
  if (value === undefined || value === null || value === '') return DEFAULT_GAME_PROFILE;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return isGameProfile(normalized) ? normalized : null;
}

export function requireGameProfile(value: unknown, source = 'GAME_PROFILE'): GameProfile {
  const profile = parseGameProfile(value);
  if (profile !== null) return profile;
  throw new Error(`${source} must be one of ${GAME_PROFILES.join(', ')}, got ${String(value)}`);
}

export function gameProfileSaveNamespace(profile: GameProfile): string {
  return profile === MIR4_GAME_PROFILE ? 'mir4-gameplay-port-v1' : 'woc-classic-v1';
}

export function gameProfileForCharacterState(state: unknown): GameProfile | null {
  if (state === null || state === undefined) return DEFAULT_GAME_PROFILE;
  if (typeof state !== 'object' || Array.isArray(state)) return null;
  const saved = (state as { gameProfile?: unknown }).gameProfile;
  return saved === undefined ? DEFAULT_GAME_PROFILE : isGameProfile(saved) ? saved : null;
}

export function gameProfileStateMatches(expected: GameProfile, state: unknown): boolean {
  return gameProfileForCharacterState(state) === expected;
}

export function gameProfilesMatch(expected: GameProfile, actual: unknown): boolean {
  return isGameProfile(actual) && actual === expected;
}
