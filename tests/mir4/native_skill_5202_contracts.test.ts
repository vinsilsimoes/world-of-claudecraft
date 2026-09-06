import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType3RuntimeAttack } from '../../src/sim/mir4/native_impact_type3_targets';
import { mir4NativeSkillActivationRanges } from '../../src/sim/mir4/native_skill_activation_range';
import {
  mir4NativeBlitzStrikePolicy,
  mir4NativeBlitzStrikeSourceMatches,
} from '../../src/sim/mir4/native_skill_blitz_strike';
import { mir4NativeRuntimeCrowdControlReaction } from '../../src/sim/mir4/native_skill_crowd_control';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';
import { PLAYER_BODY_RADIUS } from '../../src/sim/pathfind';

describe('MIR4 Lancer 5202 Blitz Strike compiled contracts', () => {
  it('promotes the exact target rush and one damaging spear contact', () => {
    const action = mir4NativeSkillActionById(5202);
    const skill = mir4SkillById(5202);
    const authority = mir4RuntimeSkillExecutionAuthority(5202);

    expect(mir4NativeBlitzStrikeSourceMatches()).toBe(true);
    expect(action?.rows.map((row) => row.attackId)).toEqual([520201, 520202]);
    expect(skill).toMatchObject({
      requiresTarget: true,
      minTargets: null,
      effect: null,
      impactOffsetsMs: [600],
    });
    expect(skill?.castRangePx).toBeUndefined();
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5202));
    expect(authority?.plan).toMatchObject({
      skillId: 5202,
      cooldownMs: 25_000,
      skillCostType: 2,
      skillCost: 4_440,
      attackAnimationMs: 1_200,
      endCutAnimationMs: 1_080,
      sourceHitCount: 2,
      requiredClassLevel: 56,
      requiresTarget: true,
      damageAllocation: 'per-impact',
    });
    expect(
      authority?.plan?.rows.map((row) => ({
        attackId: row.attackId,
        motion: row.motion,
        contacts: row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
        ]),
      })),
    ).toEqual([
      {
        attackId: 520201,
        motion: { kind: 'target', nativeRange: 120, delayMs: 0, durationMs: 500 },
        contacts: [],
      },
      {
        attackId: 520202,
        motion: null,
        contacts: [[600, 28_000, 600]],
      },
    ]);
  });

  it('pins native approach reach, frontal strip and signed hurl reaction', () => {
    expect(
      mir4NativeSkillActivationRanges(5202, {
        targetBodyRadiusYards: PLAYER_BODY_RADIUS,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 5202,
      firstAttackId: 520201,
      targetDistanceMaxNative: 1_200,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: PLAYER_BODY_RADIUS,
      directContactRangeYards: 12 + PLAYER_BODY_RADIUS,
      traceStopRangeYards: 11 + PLAYER_BODY_RADIUS,
      targetHeightYards: 4,
      blockingCheck: true,
    });
    expect(mir4NativeImpactType3RuntimeAttack(5202, 520202)).toBe(true);
    expect(mir4NativeRuntimeCrowdControlReaction(5202, 520202)).toEqual({
      effectId: 'mir4_5202_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: -11,
      heightYards: 3.5,
      displacementDirection: 'radial',
    });
  });

  it('compiles every rank milestone without interpolation', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeBlitzStrikePolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        playerKnockdownChanceBasisPoints: 1_000,
        failureResistanceDebuff: null,
        concussion: null,
        bleed: null,
        persistentSkillDamageReductionBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 5,
        playerKnockdownChanceBasisPoints: 3_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_000,
          durationMs: 10_000,
        }),
        concussion: { buffId: 50_531, chanceBasisPoints: 2_000, additionalStunMs: 2_000 },
        bleed: { buffId: 50_519, buffLevel: 1, durationMs: 2_000 },
        persistentSkillDamageReductionBasisPoints: 300,
      }),
      expect.objectContaining({
        skillLevel: 8,
        playerKnockdownChanceBasisPoints: 6_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_500,
          durationMs: 15_000,
        }),
        concussion: { buffId: 50_532, chanceBasisPoints: 5_000, additionalStunMs: 3_000 },
        bleed: { buffId: 50_519, buffLevel: 4, durationMs: 2_000 },
        persistentSkillDamageReductionBasisPoints: 600,
      }),
      expect.objectContaining({
        skillLevel: 10,
        playerKnockdownChanceBasisPoints: 10_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -2_000,
          durationMs: 20_000,
        }),
        concussion: { buffId: 50_533, chanceBasisPoints: 7_000, additionalStunMs: 4_000 },
        bleed: { buffId: 50_519, buffLevel: 7, durationMs: 2_000 },
        persistentSkillDamageReductionBasisPoints: 1_000,
      }),
    ]);
  });
});
