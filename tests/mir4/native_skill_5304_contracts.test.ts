import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import { mir4NativeSkillActivationRanges } from '../../src/sim/mir4/native_skill_activation_range';
import {
  mir4NativeAbsorptionPolicy,
  mir4NativeAbsorptionSourceMatches,
} from '../../src/sim/mir4/native_skill_absorption';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5304 Absorption compiled contracts', () => {
  it('promotes the exact target-centered drain contact', () => {
    const action = mir4NativeSkillActionById(5304);
    const skill = mir4SkillById(5304);
    const authority = mir4RuntimeSkillExecutionAuthority(5304);

    expect(mir4NativeAbsorptionSourceMatches()).toBe(true);
    expect(action?.rows.map((row) => row.attackId)).toEqual([530401]);
    expect(skill).toMatchObject({
      browserRangePx: 112,
      requiresTarget: true,
      hitCount: 0,
      impactOffsetsMs: [950],
      minTargets: null,
      effect: null,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5304));
    expect(authority?.plan).toMatchObject({
      skillId: 5304,
      cooldownMs: 63_000,
      skillCostType: 2,
      skillCost: 2_400,
      attackAnimationMs: 1_260,
      endCutAnimationMs: 1_100,
      sourceHitCount: 0,
      requiredClassLevel: 48,
      requiresTarget: true,
      damageAllocation: 'per-impact',
      range: {
        nativeContactDistanceMax: 800,
        nativeTraceStopPadding: 100,
        nativeTargetHeight: 400,
        blockingCheck: true,
      },
    });
    expect(authority?.plan?.rows[0]).toMatchObject({
      attackId: 530401,
      motion: null,
      target: { targetType: 1, authorialTargetValue: 8, impactType: 2 },
      geometry: { angleDegrees: 360, nativeDistanceMax: 800, nativeHeight: 500 },
      contacts: [
        {
          sourceImpactIndex: 0,
          offsetMs: 950,
          damage: { damageType: 1, coefficient: 11_000, levelUpCoefficient: 200 },
        },
      ],
    });
  });

  it('pins the approach range, area volume and preparation guide', () => {
    expect(mir4NativeImpactType2RuntimeAttack(5304, 530401)).toBe(true);
    expect(
      mir4NativeSkillActivationRanges(5304, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toMatchObject({
      directContactRangeYards: 8.5,
      traceStopRangeYards: 7.5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeGuidePolicy(5304, 530401)).toMatchObject({
      guideShape: 'circle',
      aliveMs: 1_150,
      scalingMs: 950,
      indicatorIndex: 0,
      indicatorNativeRadius: 800,
    });
  });

  it('compiles every rank milestone without interpolating between them', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeAbsorptionPolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        damageRecoveryBasisPoints: 10_000,
        selfChillDurationMs: 5_000,
        damageAmplificationBasisPoints: 0,
        shieldBlockDurationMs: 0,
        characterKillRecoveryBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 5,
        damageRecoveryBasisPoints: 25_000,
        selfChillDurationMs: 10_000,
        damageAmplificationBasisPoints: 2_500,
        shieldBlockDurationMs: 0,
        characterKillRecoveryBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 8,
        damageRecoveryBasisPoints: 50_000,
        selfChillDurationMs: 15_000,
        damageAmplificationBasisPoints: 5_000,
        shieldBlockDurationMs: 30_000,
        magicShieldDispelChanceBasisPoints: 7_000,
        cloakingDispelChanceBasisPoints: 7_000,
        characterKillRecoveryBasisPoints: 1_000,
      }),
      expect.objectContaining({
        skillLevel: 10,
        damageRecoveryBasisPoints: 80_000,
        selfChillDurationMs: 30_000,
        damageAmplificationBasisPoints: 7_500,
        shieldBlockDurationMs: 30_000,
        darknessPoisonChanceBasisPoints: [7_000, 8_500, 10_000],
        darknessPoisonSpellAttackBasisPoints: 2_000,
        characterKillRecoveryBasisPoints: 3_000,
      }),
    ]);
  });
});
