import { describe, expect, it } from 'vitest';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { classesForGameProfile, isClassForGameProfile } from '../../src/sim/game_profile_roster';

describe('game-profile roster', () => {
  it('offers only the five source-backed MIR4 classes', () => {
    expect(classesForGameProfile(MIR4_GAME_PROFILE)).toEqual([
      'warrior',
      'elementalist',
      'taoist',
      'arbalist',
      'lancer',
    ]);
  });

  it('rejects profile-crossing class keys', () => {
    expect(isClassForGameProfile('paladin', MIR4_GAME_PROFILE)).toBe(false);
    expect(isClassForGameProfile('elementalist', 'woc-classic')).toBe(false);
    expect(isClassForGameProfile('elementalist', MIR4_GAME_PROFILE)).toBe(true);
    expect(isClassForGameProfile('paladin', 'woc-classic')).toBe(true);
  });
});
