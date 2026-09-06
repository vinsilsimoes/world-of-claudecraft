import { describe, expect, it } from 'vitest';
import { mir4NativeHealPerPulse, mir4NativeHealPolicy } from '../../src/sim/mir4/native_skill_heal';

describe('MIR4 Taoist 3503 Heal policy', () => {
  it('pins the extracted timing, party envelope, and Spell ATK scaling', () => {
    expect(mir4NativeHealPolicy(1)).toEqual({
      skillId: 3503,
      skillLevel: 1,
      sourceBuffAttackId: 350301,
      sourceBuffApplyAtMs: 20,
      partyBuffAttackId: 350303,
      partyBuffApplyAtMs: 840,
      specialAttackId: 350302,
      specialApplyAtMs: 590,
      pulseCount: 5,
      pulseIntervalMs: 1_000,
      spellAttackBasisPoints: 3_600,
      flatHealing: 100,
      radiusYards: 30,
      heightYards: 4,
      targetCap: 5,
      controlImmunityDurationMs: 2_000,
      selfBonusMaxHpBasisPoints: 0,
      partyBonusMaxHpBasisPoints: 0,
      debilitationSelfCleanseChanceBasisPoints: 0,
      debilitationPartyCleanseChanceBasisPoints: 0,
      silenceCleanse: false,
      stunPartyCleanse: false,
      bossDamageReductionBasisPoints: 0,
      bossDamageReductionDurationMs: 0,
      usableWhileSilenced: false,
    });
    expect(mir4NativeHealPolicy(5)).toMatchObject({
      spellAttackBasisPoints: 4_400,
      selfBonusMaxHpBasisPoints: 1_000,
      partyBonusMaxHpBasisPoints: 1_500,
    });
    expect(mir4NativeHealPolicy(8)).toMatchObject({
      spellAttackBasisPoints: 5_000,
      selfBonusMaxHpBasisPoints: 2_500,
      partyBonusMaxHpBasisPoints: 3_500,
      debilitationSelfCleanseChanceBasisPoints: 10_000,
      debilitationPartyCleanseChanceBasisPoints: 5_000,
      silenceCleanse: true,
      stunPartyCleanse: false,
      bossDamageReductionBasisPoints: 1_000,
      bossDamageReductionDurationMs: 30_000,
      usableWhileSilenced: true,
    });
    expect(mir4NativeHealPolicy(10)).toMatchObject({
      spellAttackBasisPoints: 5_400,
      selfBonusMaxHpBasisPoints: 4_000,
      partyBonusMaxHpBasisPoints: 5_000,
      debilitationSelfCleanseChanceBasisPoints: 10_000,
      debilitationPartyCleanseChanceBasisPoints: 10_000,
      silenceCleanse: true,
      stunPartyCleanse: true,
      bossDamageReductionBasisPoints: 2_000,
      bossDamageReductionDurationMs: 60_000,
      usableWhileSilenced: true,
    });
    expect(mir4NativeHealPolicy(15)).toMatchObject({
      skillLevel: 15,
      spellAttackBasisPoints: 6_400,
      selfBonusMaxHpBasisPoints: 4_000,
      partyBonusMaxHpBasisPoints: 5_000,
    });
  });

  it('resolves each pulse from current Spell ATK plus the extracted flat amount', () => {
    expect(mir4NativeHealPerPulse(1_000, 1)).toBe(460);
    expect(mir4NativeHealPerPulse(2_000, 1)).toBe(820);
    expect(mir4NativeHealPerPulse(1_000, 5)).toBe(540);
    expect(mir4NativeHealPerPulse(1_000, 10)).toBe(640);
    expect(mir4NativeHealPerPulse(Number.NaN, 1)).toBe(100);
  });
});
