import { describe, expect, it } from 'vitest';
import {
  mir4NativeGreaterHealAmount,
  mir4NativeGreaterHealPolicy,
} from '../../src/sim/mir4/native_skill_greater_heal';

describe('MIR4 Taoist 3504 Greater Heal policy', () => {
  it('pins the extracted action cadence and rank milestones', () => {
    expect(mir4NativeGreaterHealPolicy(1)).toEqual({
      skillId: 3504,
      skillLevel: 1,
      controlAttackId: 350401,
      controlApplyAtMs: 20,
      healAttackId: 350402,
      healApplyAtMs: 740,
      reviveAttackId: null,
      reviveApplyAtMs: null,
      radiusYards: 30,
      heightYards: 4,
      targetCap: 5,
      baseMaxHpBasisPoints: 1_000,
      flatHealing: 120,
      selfBonusMaxHpBasisPoints: 0,
      partyBonusMaxHpBasisPoints: 0,
      stunCleanseChanceBasisPoints: 0,
      invincibleDurationMs: 0,
      reviveTargetCap: 0,
      reviveHpBasisPoints: 0,
      controlImmunityDurationMs: 2_000,
      usableWhileSilenced: false,
      usableWhileStunned: false,
      deathDelayMs: 0,
      deathDelayCooldownMs: 0,
    });
    expect(mir4NativeGreaterHealPolicy(5)).toMatchObject({
      flatHealing: 140,
      selfBonusMaxHpBasisPoints: 1_000,
      partyBonusMaxHpBasisPoints: 2_000,
      stunCleanseChanceBasisPoints: 6_000,
    });
    expect(mir4NativeGreaterHealPolicy(8)).toMatchObject({
      flatHealing: 155,
      reviveAttackId: 350404,
      reviveApplyAtMs: 1_050,
      selfBonusMaxHpBasisPoints: 2_000,
      partyBonusMaxHpBasisPoints: 3_500,
      stunCleanseChanceBasisPoints: 9_000,
      invincibleDurationMs: 2_000,
      reviveTargetCap: 1,
      reviveHpBasisPoints: 2_000,
      usableWhileSilenced: true,
      usableWhileStunned: true,
      deathDelayMs: 5_000,
      deathDelayCooldownMs: 120_000,
    });
    expect(mir4NativeGreaterHealPolicy(10)).toMatchObject({
      flatHealing: 165,
      reviveAttackId: 350403,
      reviveApplyAtMs: 900,
      selfBonusMaxHpBasisPoints: 3_000,
      partyBonusMaxHpBasisPoints: 6_000,
      stunCleanseChanceBasisPoints: 10_000,
      reviveTargetCap: 5,
      reviveHpBasisPoints: 5_000,
      deathDelayMs: 15_000,
    });
    expect(mir4NativeGreaterHealPolicy(15)).toMatchObject({
      skillLevel: 15,
      flatHealing: 190,
      selfBonusMaxHpBasisPoints: 3_000,
      partyBonusMaxHpBasisPoints: 6_000,
    });
  });

  it('combines the base max-HP heal, rank-scaled flat amount, and recipient bonus', () => {
    expect(mir4NativeGreaterHealAmount(10_000, 1, true)).toBe(1_120);
    expect(mir4NativeGreaterHealAmount(10_000, 5, true)).toBe(2_140);
    expect(mir4NativeGreaterHealAmount(10_000, 5, false)).toBe(3_140);
    expect(mir4NativeGreaterHealAmount(10_000, 10, true)).toBe(4_165);
    expect(mir4NativeGreaterHealAmount(10_000, 10, false)).toBe(7_165);
  });
});
