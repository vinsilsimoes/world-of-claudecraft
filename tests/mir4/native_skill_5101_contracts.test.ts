import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import {
  mir4NativeCrescentBladePolicy,
  mir4NativeCrescentBladeSourceMatches,
} from '../../src/sim/mir4/native_skill_crescent_blade';
import { mir4NativeRuntimeCrowdControlReaction } from '../../src/sim/mir4/native_skill_crowd_control';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5101 Crescent Blade compiled contracts', () => {
  it('promotes the exact two-contact action without the old generic effect', () => {
    const action = mir4NativeSkillActionById(5101);
    const skill = mir4SkillById(5101);
    const authority = mir4RuntimeSkillExecutionAuthority(5101);

    expect(mir4NativeCrescentBladeSourceMatches()).toBe(true);
    expect(action?.rows.map((row) => row.attackId)).toEqual([510101, 510102]);
    expect(skill).toMatchObject({
      browserRangePx: 104,
      requiresTarget: true,
      minTargets: null,
      effect: null,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5101));
    expect(authority?.plan).toMatchObject({
      skillId: 5101,
      cooldownMs: 16_000,
      skillCostType: 2,
      skillCost: 2_000,
      attackAnimationMs: 1_967,
      endCutAnimationMs: 1_560,
      sourceHitCount: 3,
      requiredClassLevel: 1,
      requiresTarget: true,
      damageAllocation: 'per-impact',
    });
    expect(
      authority?.plan?.rows.map((row) =>
        row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
        ]),
      ),
    ).toEqual([
      [[400, 13_000, 260]],
      [[1_120, 6_000, 140]],
    ]);
  });

  it('pins both movements, live sectors, guide and final knockdown reaction', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5101);
    expect(plan?.rows.map((row) => row.motion)).toEqual([
      { kind: 'forward', nativeRange: 250, delayMs: 0, durationMs: 300 },
      { kind: 'target', nativeRange: 180, delayMs: 0, durationMs: 300 },
    ]);
    expect(
      [510101, 510102].every((attackId) =>
        mir4NativeImpactType2RuntimeAttack(5101, attackId),
      ),
    ).toBe(true);
    expect(mir4NativeRuntimeGuidePolicy(5101, 510102)).toMatchObject({
      guideShape: 'sector',
      aliveMs: 400,
      scalingMs: 200,
      indicatorNativeAngle: 160,
      indicatorNativeRadius: 700,
      indicatorNativeOffset: -100,
    });
    expect(mir4NativeRuntimeCrowdControlReaction(5101, 510102)).toEqual({
      effectId: 'mir4_5101_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: 2,
      heightYards: 1.5,
      displacementDirection: 'radial',
    });
  });

  it('compiles every rank milestone without interpolating between them', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeCrescentBladePolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        bashDamageBasisPoints: 5_000,
        playerKnockdownChanceBasisPoints: 1_000,
        monsterSkillDamageBasisPoints: 0,
        chilledTwoStackDamageBasisPoints: 0,
        chilledThreeStackDamageBasisPoints: 0,
        failureResistanceDebuff: null,
        persistentBashDamageBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 5,
        bashDamageBasisPoints: 6_500,
        playerKnockdownChanceBasisPoints: 3_000,
        failureResistanceDebuff: {
          buffId: 50505,
          effectId: 'mir4_native_buff_50505_120',
          nativeStatusId: 120,
          magnitudeBasisPoints: -1_000,
          durationMs: 10_000,
        },
      }),
      expect.objectContaining({
        skillLevel: 8,
        bashDamageBasisPoints: 8_000,
        playerKnockdownChanceBasisPoints: 6_000,
        monsterSkillDamageBasisPoints: 5_000,
        chilledTwoStackDamageBasisPoints: 3_500,
        chilledThreeStackDamageBasisPoints: 4_000,
        persistentBashDamageBasisPoints: 1_500,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_500,
          durationMs: 15_000,
        }),
      }),
      expect.objectContaining({
        skillLevel: 10,
        bashDamageBasisPoints: 10_000,
        playerKnockdownChanceBasisPoints: 10_000,
        monsterSkillDamageBasisPoints: 10_000,
        chilledTwoStackDamageBasisPoints: 6_000,
        chilledThreeStackDamageBasisPoints: 7_000,
        persistentBashDamageBasisPoints: 2_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -2_000,
          durationMs: 20_000,
        }),
      }),
    ]);
  });
});
