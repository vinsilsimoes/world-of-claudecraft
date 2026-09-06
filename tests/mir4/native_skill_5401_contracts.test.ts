import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import { mir4NativeRuntimeAttackBackReaction } from '../../src/sim/mir4/native_skill_attack_back';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import { mir4NativeSweepingStormPolicy } from '../../src/sim/mir4/native_skill_sweeping_storm';
import {
  mir4NativeRuntimeUninterruptibleBuff,
  mir4NativeSourceUninterruptibleBuffMatchesRow,
} from '../../src/sim/mir4/native_skill_uninterruptible';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5401 Sweeping Storm compiled contracts', () => {
  it('promotes the exact six-contact hybrid action without generic area effects', () => {
    const action = mir4NativeSkillActionById(5401);
    const skill = mir4SkillById(5401);
    const authority = mir4RuntimeSkillExecutionAuthority(5401);

    expect(action?.rows.map((row) => row.attackId)).toEqual([
      540101, 540102, 540103, 540104, 540105, 540106,
    ]);
    expect(skill).toMatchObject({
      requiresTarget: true,
      browserRangePx: 72,
      impactOffsetsMs: [20, 240, 400, 510, 660, 840],
      minTargets: null,
      effect: null,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5401));
    expect(authority?.plan).toMatchObject({
      skillId: 5401,
      cooldownMs: 44_000,
      skillCostType: 2,
      skillCost: 3_400,
      attackAnimationMs: 1_067,
      endCutAnimationMs: 980,
      sourceHitCount: 6,
      requiredClassLevel: 5,
      requiresTarget: true,
      damageAllocation: 'per-impact',
    });
    expect(
      authority?.plan?.rows.map((row) => ({
        attackId: row.attackId,
        motion: row.motion,
        contacts: row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.damageType,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
        ]),
      })),
    ).toEqual([
      {
        attackId: 540101,
        motion: null,
        contacts: [
          [20, 1, 1_000, 20],
          [20, 2, 3_000, 60],
        ],
      },
      {
        attackId: 540102,
        motion: null,
        contacts: [
          [240, 1, 1_000, 30],
          [240, 2, 3_000, 60],
        ],
      },
      {
        attackId: 540103,
        motion: null,
        contacts: [
          [400, 1, 1_000, 30],
          [400, 2, 3_000, 70],
        ],
      },
      {
        attackId: 540104,
        motion: null,
        contacts: [
          [510, 1, 2_000, 40],
          [510, 2, 3_000, 70],
        ],
      },
      {
        attackId: 540105,
        motion: null,
        contacts: [
          [660, 1, 2_000, 40],
          [660, 2, 4_000, 70],
        ],
      },
      {
        attackId: 540106,
        motion: null,
        contacts: [
          [840, 1, 2_000, 40],
          [840, 2, 4_000, 70],
        ],
      },
    ]);
  });

  it('pins both actor-centred radii, the guide, facing updates and alternating reactions', () => {
    expect(
      [540101, 540102, 540103, 540104, 540105, 540106].every((attackId) =>
        mir4NativeImpactType2RuntimeAttack(5401, attackId),
      ),
    ).toBe(true);
    const rows = mir4NativeSkillActionById(5401)?.rows ?? [];
    expect(rows.map((row) => row.geometry.nativeDistanceMax)).toEqual([
      1_200, 550, 550, 550, 550, 550,
    ]);
    expect(rows.map((row) => row.authorialTargetValue)).toEqual([8, 8, 8, 8, 8, 8]);
    expect(rows.map((row) => row.viewTarget)).toEqual([0, 2, 2, 2, 2, 2]);
    expect(mir4NativeRuntimeGuidePolicy(5401, 540102)).toMatchObject({
      guideShape: 'circle',
      aliveMs: 300,
      scalingMs: 100,
      indicatorIndex: 0,
      guideEffectId: 102,
      indicatorNativeRadius: 550,
    });
    for (const attackId of [540101, 540103, 540105]) {
      expect(mir4NativeRuntimeAttackBackReaction(5401, attackId)).toEqual({
        kind: 'attack-back',
        stance: 'hit-01',
        durationMs: 400,
        triggerSourceImpactIndex: 0,
      });
    }
    for (const attackId of [540102, 540104, 540106]) {
      expect(mir4NativeRuntimeKnockbackReaction(5401, attackId)).toEqual({
        kind: 'knock-back',
        stance: 'hit-01',
        durationMs: 400,
        moveDurationMs: 200,
        moveDistanceYards: 0.8,
        heightYards: 0,
        displacementDirection: 'radial',
        triggerSourceImpactIndex: 0,
      });
    }
  });

  it('admits the exact 540101 source immunity for the full cast window', () => {
    const spec = mir4NativeRuntimeUninterruptibleBuff(5401);
    expect(spec).toEqual({
      skillId: 5401,
      attackId: 540101,
      buffId: 51011,
      effectId: 'mir4_native_buff_51011',
      kind: 'control-immunity',
      durationMs: 1_500,
      applyTo: 'source',
      applyPhase: 'action-start',
    });
    const row = mir4NativeSkillActionById(5401)?.rows[0];
    if (!row) throw new Error('Missing Sweeping Storm row 540101');
    expect(mir4NativeSourceUninterruptibleBuffMatchesRow(row)).toBe(true);
  });

  it('seals every rank milestone from the native passive graph', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeSweepingStormPolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        darknessDurationMs: 5_000,
        extraDarknessChanceBasisPoints: [0, 0],
        monsterAttackLoss: 100,
        characterAttackLoss: 0,
        attackLossDurationMs: 5_000,
        cooldownReductionLossByStacks: [0, 0, 0],
        cooldownReductionLossDurationMs: 0,
      }),
      expect.objectContaining({
        skillLevel: 5,
        darknessDurationMs: 8_000,
        extraDarknessChanceBasisPoints: [0, 0],
        monsterAttackLoss: 150,
        characterAttackLoss: 100,
        attackLossDurationMs: 10_000,
        cooldownReductionLossByStacks: [3_000, 3_500, 4_000],
        cooldownReductionLossDurationMs: 10_000,
      }),
      expect.objectContaining({
        skillLevel: 8,
        darknessDurationMs: 10_000,
        extraDarknessChanceBasisPoints: [4_000, 2_000],
        monsterAttackLoss: 200,
        characterAttackLoss: 150,
        attackLossDurationMs: 15_000,
        cooldownReductionLossByStacks: [5_000, 5_500, 6_000],
        cooldownReductionLossDurationMs: 15_000,
      }),
      expect.objectContaining({
        skillLevel: 10,
        darknessDurationMs: 10_000,
        extraDarknessChanceBasisPoints: [7_000, 3_500],
        monsterAttackLoss: 300,
        characterAttackLoss: 200,
        attackLossDurationMs: 20_000,
        cooldownReductionLossByStacks: [8_000, 9_000, 10_000],
        cooldownReductionLossDurationMs: 20_000,
      }),
    ]);
  });
});
