import {
  DEFAULT_GAME_PROFILE,
  type GameProfile,
  MIR4_GAME_PROFILE,
  parseGameProfile,
} from '../src/game_profile';
import { MIR4_MAX_LEVEL } from '../src/sim/content/mir4';
import type { TalentAllocation } from '../src/sim/content/talents';
import { isClassForGameProfile } from '../src/sim/game_profile_roster';
import { NUM_ACTIONS } from '../src/sim/obs';
import { parseTalentAllocation } from '../src/sim/talent_allocation_input';
import { MAX_LEVEL, type PlayableClass } from '../src/sim/types';

export const MAX_INPUT_LINE_LENGTH = 1024 * 1024;

export function validateAction(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 0 || value >= NUM_ACTIONS) return null;
  return value;
}

export function validatePlayerClass(
  value: unknown,
  gameProfile: GameProfile = DEFAULT_GAME_PROFILE,
): PlayableClass | null {
  return isClassForGameProfile(value, gameProfile) ? value : null;
}

export function validateGameProfile(value: unknown): GameProfile | null {
  return parseGameProfile(value);
}

export function maxLevelForGameProfile(gameProfile: GameProfile): number {
  return gameProfile === MIR4_GAME_PROFILE ? MIR4_MAX_LEVEL : MAX_LEVEL;
}

export function validatePlayerLevel(
  value: unknown,
  gameProfile: GameProfile = DEFAULT_GAME_PROFILE,
): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return null;
  const maxLevel = maxLevelForGameProfile(gameProfile);
  return value >= 1 && value <= maxLevel ? value : null;
}

export type TalentResetRequest =
  | { ok: true; playerLevel: number; talents?: TalentAllocation }
  | { ok: false; error: string };

/** Validate the optional Talent V2 state on a headless reset request. */
export function parseTalentResetRequest(
  value: unknown,
  gameProfile: GameProfile = DEFAULT_GAME_PROFILE,
  _playerClass?: PlayableClass,
): TalentResetRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'invalid reset request: expected object' };
  }
  const request = value as Record<string, unknown>;
  const maxLevel = maxLevelForGameProfile(gameProfile);
  const playerLevel = validatePlayerLevel(request.player_level ?? 1, gameProfile);
  if (playerLevel === null) {
    return { ok: false, error: `invalid player_level: expected integer 1-${maxLevel}` };
  }
  if (!Object.hasOwn(request, 'talents')) return { ok: true, playerLevel };
  if (gameProfile === MIR4_GAME_PROFILE) {
    return { ok: false, error: 'talents are unavailable for mir4-gameplay-port' };
  }
  const talents = parseTalentAllocation(request.talents);
  if (!talents) {
    return { ok: false, error: 'invalid talents: expected canonical spec/rows allocation' };
  }
  return { ok: true, playerLevel, talents };
}
