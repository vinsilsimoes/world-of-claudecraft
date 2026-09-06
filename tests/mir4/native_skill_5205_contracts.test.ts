import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType3RuntimeAttack } from '../../src/sim/mir4/native_impact_type3_targets';
import { mir4NativeSkillActivationRanges } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeRuntimeCrowdControlReaction } from '../../src/sim/mir4/native_skill_crowd_control';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import {
  mir4NativePiercingSpearPolicy,
  mir4NativePiercingSpearSourceMatches,
} from '../../src/sim/mir4/native_skill_piercing_spear';
import { mir4NativeRuntimeSkillSourceFacets } from '../../src/sim/mir4/native_skill_source_facets';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5205 Piercing Spear compiled contracts', () => {
  it('promotes the exact conditional two-hit hybrid action', () => {
    const action = mir4NativeSkillActionById(5205);
    const skill = mir4SkillById(5205);
    const authority = mir4RuntimeSkillExecutionAuthority(5205);

    expect(mir4NativePiercingSpearSourceMatches()).toBe(true);
    expect(action?.rows.map((row) => row.attackId)).toEqual([520501, 520502, 520503]);
    expect(skill).toMatchObject({
      browserRangePx: 272,
      requiresTarget: true,
      impactOffsetsMs: [380, 400],
      minTargets: null,
      effect: null,
      damage: {
        aggregateCoefficient: 42_000,
        aggregateLevelUpCoefficient: 800,
        allocationMode: 'per-impact',
      },
    });
    expect(skill?.damage?.components).toEqual([
      {
        attackId: 520502,
        damageType: 1,
        damageAttribute: 0,
        coefficient: 8_000,
        levelUpCoefficient: 200,
        impactCount: 1,
      },
      {
        attackId: 520502,
        damageType: 2,
        damageAttribute: 0,
        coefficient: 13_000,
        levelUpCoefficient: 200,
        impactCount: 1,
      },
      {
        attackId: 520503,
        damageType: 1,
        damageAttribute: 0,
        coefficient: 8_000,
        levelUpCoefficient: 200,
        impactCount: 1,
      },
      {
        attackId: 520503,
        damageType: 2,
        damageAttribute: 0,
        coefficient: 13_000,
        levelUpCoefficient: 200,
        impactCount: 1,
      },
    ]);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5205));
    expect(authority?.plan).toMatchObject({
      skillId: 5205,
      cooldownMs: 37_000,
      skillCostType: 2,
      skillCost: 4_800,
      attackAnimationMs: 1_440,
      endCutAnimationMs: 1_400,
      sourceHitCount: 1,
      requiredClassLevel: 40,
      requiresTarget: true,
      damageAllocation: 'per-impact',
      range: {
        nativeContactDistanceMax: 1_450,
        nativeTraceStopPadding: 100,
        nativeTargetHeight: 400,
        blockingCheck: true,
      },
    });
    expect(
      authority?.plan?.rows.map((row) => ({
        attackId: row.attackId,
        contacts: row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.damageType,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
        ]),
      })),
    ).toEqual([
      { attackId: 520501, contacts: [] },
      {
        attackId: 520502,
        contacts: [
          [380, 1, 8_000, 200],
          [380, 2, 13_000, 200],
        ],
      },
      {
        attackId: 520503,
        contacts: [
          [400, 1, 8_000, 200],
          [400, 2, 13_000, 200],
        ],
      },
    ]);
  });

  it('pins the approach range, line volumes, far band, guide and both knockdowns', () => {
    expect(mir4NativeImpactType3RuntimeAttack(5205, 520502)).toBe(true);
    expect(mir4NativeImpactType3RuntimeAttack(5205, 520503)).toBe(true);
    expect(mir4NativeRuntimeGuidePolicy(5205, 520501)).toMatchObject({
      guideShape: 'direct',
      aliveMs: 760,
      scalingMs: 560,
      indicatorIndex: 103,
      indicatorNativeLength: 850,
      indicatorNativeWidth: 400,
    });
    expect(
      mir4NativeSkillActivationRanges(5205, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toMatchObject({
      directContactRangeYards: 15,
      traceStopRangeYards: 14,
      targetHeightYards: 4,
      blockingCheck: true,
    });
    expect(mir4RuntimeSkillExecutionPlan(5205)?.rows.map((row) => row.geometry)).toEqual([
      expect.objectContaining({ nativeDistanceMin: 0, nativeDistanceMax: 2_000, nativeWidth: 400 }),
      expect.objectContaining({ nativeDistanceMin: 0, nativeDistanceMax: 2_000, nativeWidth: 400 }),
      expect.objectContaining({
        nativeDistanceMin: 1_500,
        nativeDistanceMax: 2_000,
        nativeWidth: 400,
      }),
    ]);
    for (const attackId of [520502, 520503]) {
      expect(mir4NativeRuntimeCrowdControlReaction(5205, attackId)).toEqual({
        effectId: `mir4_5205_${attackId}_knockdown`,
        kind: 'knockdown',
        stance: 'down-02',
        durationMs: 3_000,
        moveDurationMs: 900,
        moveDistanceYards: 2.5,
        heightYards: 0,
        displacementDirection: 'radial',
      });
    }
  });

  it('compiles the exact rank milestones without interpolation', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativePiercingSpearPolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        playerKnockdownChanceBasisPoints: 1_000,
        failureResistanceDebuff: null,
        darknessBlind: null,
      }),
      expect.objectContaining({
        skillLevel: 5,
        playerKnockdownChanceBasisPoints: 3_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_000,
          durationMs: 10_000,
        }),
        darknessBlind: {
          buffId: 50514,
          durationMs: 2_000,
          chancesByStacks: [4_000, 4_500, 5_000],
        },
      }),
      expect.objectContaining({
        skillLevel: 8,
        playerKnockdownChanceBasisPoints: 6_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_500,
          durationMs: 15_000,
        }),
        darknessBlind: {
          buffId: 50514,
          durationMs: 4_000,
          chancesByStacks: [6_000, 6_500, 7_000],
        },
      }),
      expect.objectContaining({
        skillLevel: 10,
        playerKnockdownChanceBasisPoints: 10_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -2_000,
          durationMs: 20_000,
        }),
        darknessBlind: {
          buffId: 50514,
          durationMs: 5_000,
          chancesByStacks: [8_000, 9_000, 10_000],
        },
      }),
    ]);
  });

  it('admits only the extracted non-mechanical source facets', () => {
    expect(mir4NativeRuntimeSkillSourceFacets(5205)).toMatchObject({
      skillId: 5205,
      darkChange: { nativeMode: 1, presentationOnly: true },
      abilities: Array.from({ length: 4 }, (_, slotIndex) => ({
        slotIndex,
        type: 0,
        value: 0,
        levelUpValue: 0,
        time: 0,
        active: false,
        inactiveReason: 'zero-type',
      })),
      smiteBuffIds: [],
      autoLearnPassiveIds: [],
      skillModPassiveIds: [],
    });
  });
});
