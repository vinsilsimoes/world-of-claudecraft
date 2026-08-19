import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_PROFILE,
  GAME_PROFILES,
  gameProfileForCharacterState,
  gameProfileSaveNamespace,
  gameProfileStateMatches,
  gameProfilesMatch,
  isGameProfile,
  MIR4_GAME_PROFILE,
  parseGameProfile,
  requireGameProfile,
} from '../src/game_profile';
import { browserGameProfile } from '../src/game_profile_runtime';

describe('game profile contract', () => {
  it('declares the two migration profiles in stable order', () => {
    expect(GAME_PROFILES).toEqual(['woc-classic', 'mir4-gameplay-port']);
    expect(DEFAULT_GAME_PROFILE).toBe('woc-classic');
    expect(MIR4_GAME_PROFILE).toBe('mir4-gameplay-port');
  });

  it('uses woc-classic only for an absent or empty local configuration', () => {
    for (const value of [undefined, null, '']) {
      expect(parseGameProfile(value)).toBe(DEFAULT_GAME_PROFILE);
    }
    expect(parseGameProfile('  MIR4-GAMEPLAY-PORT  ')).toBe(MIR4_GAME_PROFILE);
  });

  it('rejects unknown, mistyped, and partial profile names', () => {
    for (const value of ['mir4', 'classic', 'woc_classic', 'mir4-gameplay-port-v1', 1, false, {}]) {
      expect(parseGameProfile(value)).toBeNull();
      expect(isGameProfile(value)).toBe(false);
    }
    expect(() => requireGameProfile('mir4', 'TEST_PROFILE')).toThrow(
      'TEST_PROFILE must be one of woc-classic, mir4-gameplay-port, got mir4',
    );
  });

  it('gives each profile an isolated persistence namespace', () => {
    expect(gameProfileSaveNamespace('woc-classic')).toBe('woc-classic-v1');
    expect(gameProfileSaveNamespace('mir4-gameplay-port')).toBe('mir4-gameplay-port-v1');
    expect(gameProfileSaveNamespace('woc-classic')).not.toBe(
      gameProfileSaveNamespace('mir4-gameplay-port'),
    );
  });

  it('resolves only an absent persisted marker as classic', () => {
    expect(gameProfileForCharacterState({ level: 1 })).toBe(DEFAULT_GAME_PROFILE);
    expect(gameProfileForCharacterState({ gameProfile: MIR4_GAME_PROFILE })).toBe(
      MIR4_GAME_PROFILE,
    );
    expect(gameProfileForCharacterState({ gameProfile: 'future-profile' })).toBeNull();
    expect(gameProfileForCharacterState(null)).toBe(DEFAULT_GAME_PROFILE);
    expect(gameProfileStateMatches(DEFAULT_GAME_PROFILE, {})).toBe(true);
    expect(gameProfileStateMatches(MIR4_GAME_PROFILE, {})).toBe(false);
  });

  it('matches wire values without coercion or defaulting', () => {
    expect(gameProfilesMatch('woc-classic', 'woc-classic')).toBe(true);
    expect(gameProfilesMatch('woc-classic', undefined)).toBe(false);
    expect(gameProfilesMatch('woc-classic', '')).toBe(false);
    expect(gameProfilesMatch('mir4-gameplay-port', 'MIR4-GAMEPLAY-PORT')).toBe(false);
    expect(gameProfilesMatch('mir4-gameplay-port', 'woc-classic')).toBe(false);
  });

  it('resolves browser configuration through the same fail-closed parser', () => {
    expect(browserGameProfile(undefined)).toBe(DEFAULT_GAME_PROFILE);
    expect(browserGameProfile('mir4-gameplay-port')).toBe(MIR4_GAME_PROFILE);
    expect(() => browserGameProfile('future-profile')).toThrow(
      'VITE_GAME_PROFILE must be one of woc-classic, mir4-gameplay-port',
    );
  });
});
