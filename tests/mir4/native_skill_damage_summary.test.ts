import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeDamageSummary } from '../../src/sim/mir4/native_skill_damage_summary';

describe('MIR4 native SKILL damage summaries', () => {
  it('reconciles the SKILL aggregate with the three SKILL_ATTACK damage rows', () => {
    expect(mir4NativeRuntimeDamageSummary(1102)).toEqual({
      damageType: 1,
      coefficient: 250,
      levelUpCoefficient: 5,
      attackCoefficient: 25_000,
      attackLevelUpCoefficient: 500,
      attackIds: [110202, 110203, 110204],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
  });

  it('preserves the native 1103 aggregate divergence while executing only its two damage rows', () => {
    expect(mir4NativeRuntimeDamageSummary(1103)).toEqual({
      damageType: 1,
      coefficient: 280,
      levelUpCoefficient: 6,
      attackCoefficient: 21_000,
      attackLevelUpCoefficient: 450,
      attackIds: [110106, 110107],
      relationship: 'divergent-source-values',
      runtimeAuthority: 'skill-attack-rows',
    });
  });

  it('reconciles Splitting Slash with its single native damage row', () => {
    expect(mir4NativeRuntimeDamageSummary(1104)).toEqual({
      damageType: 1,
      coefficient: 210,
      levelUpCoefficient: 4,
      attackCoefficient: 21_000,
      attackLevelUpCoefficient: 400,
      attackIds: [110402],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
  });

  it('reconciles Body Check with its single native damage row', () => {
    expect(mir4NativeRuntimeDamageSummary(1304)).toEqual({
      damageType: 1,
      coefficient: 220,
      levelUpCoefficient: 4,
      attackCoefficient: 22_000,
      attackLevelUpCoefficient: 400,
      attackIds: [130402],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
  });

  it('reconciles Ground Smash with its single native damage row', () => {
    expect(mir4NativeRuntimeDamageSummary(1401)).toEqual({
      damageType: 1,
      coefficient: 250,
      levelUpCoefficient: 5,
      attackCoefficient: 25_000,
      attackLevelUpCoefficient: 500,
      attackIds: [140102],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
  });

  it('reconciles Gale Slash with five row totals and nine authored contacts', () => {
    expect(mir4NativeRuntimeDamageSummary(1501)).toEqual({
      damageType: 1,
      coefficient: 380,
      levelUpCoefficient: 8,
      attackCoefficient: 38_000,
      attackLevelUpCoefficient: 800,
      attackIds: [150101, 150102, 150103, 150104, 150105],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
  });

  it.each([
    [2101, 187, 4, 18_700, 400, [210102], 'exact-scaled-summary'],
    [2111, 178, 4, 17_800, 400, [211102], 'exact-scaled-summary'],
    [2301, 292, 6, 0, 0, [], 'divergent-source-values'],
    [2203, 255, 5, 3_900, 80, [220302], 'divergent-source-values'],
    [2303, 352, 6, 17_600, 300, [230301], 'divergent-source-values'],
    [2201, 230, 5, 23_000, 500, [220102, 220103], 'exact-scaled-summary'],
    [2103, 400, 8, 40_000, 800, [210301, 210302, 210303, 210304, 210305], 'exact-scaled-summary'],
    [2202, 220, 4, 22_000, 400, [220201, 220202, 220203], 'exact-scaled-summary'],
    [2503, 110, 2, 11_000, 200, [250301, 250302, 250303], 'exact-scaled-summary'],
  ] as const)(
    'reconciles Sorcerer magic summary %i without treating it as a second damage application',
    (skillId, coefficient, levelUpCoefficient, attackCoefficient, attackLevelUpCoefficient, attackIds, relationship) => {
      expect(mir4NativeRuntimeDamageSummary(skillId)).toEqual({
        damageType: skillId === 2503 ? 0 : 1,
        coefficient,
        levelUpCoefficient,
        attackCoefficient,
        attackLevelUpCoefficient,
        attackIds,
        relationship,
        runtimeAuthority: 'skill-attack-rows',
      });
    },
  );

  it('keeps source summaries with unresolved skill damage ownership closed', () => {
    expect(mir4NativeRuntimeDamageSummary(2501)).toBeNull();
    expect(mir4NativeRuntimeDamageSummary(2502)).toBeNull();
    expect(mir4NativeRuntimeDamageSummary(2204)).toBeNull();
  });
});
