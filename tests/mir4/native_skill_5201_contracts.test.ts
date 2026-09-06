import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType3RuntimeAttack } from '../../src/sim/mir4/native_impact_type3_targets';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import { mir4NativeRuntimeMultiImpactPolicy } from '../../src/sim/mir4/native_skill_multi_impact';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5201 Ravaging Blow compiled contracts', () => {
  it('promotes all three hybrid rows and six authored contact moments', () => {
    const action = mir4NativeSkillActionById(5201);
    const authority = mir4RuntimeSkillExecutionAuthority(5201);

    expect(action?.rows.map((row) => row.attackId)).toEqual([520101, 520102, 520103]);
    expect(mir4NativeRuntimeMultiImpactPolicy(5201)).toMatchObject({
      skillId: 5201,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 280,
      summaryLevelUpCoefficient: 5,
      totalImpactCount: 6,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5201));
    expect(authority?.plan).toMatchObject({
      skillId: 5201,
      cooldownMs: 24_000,
      skillCostType: 2,
      skillCost: 1_500,
      attackAnimationMs: 1_833,
      endCutAnimationMs: 1_740,
      sourceHitCount: 6,
      requiredClassLevel: 1,
      requiresTarget: true,
      damageAllocation: 'row-total-impact-vector',
    });
    expect(authority?.plan?.rows.map((row) => row.contacts.length)).toEqual([6, 4, 2]);
    expect(
      authority?.plan?.rows.map((row) =>
        row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.damageType,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
          contact.damage.componentImpactCount,
        ]),
      ),
    ).toEqual([
      [
        [480, 1, 4_000, 60, 3],
        [690, 1, 4_000, 60, 3],
        [880, 1, 4_000, 60, 3],
        [480, 2, 6_000, 100, 3],
        [690, 2, 6_000, 100, 3],
        [880, 2, 6_000, 100, 3],
      ],
      [
        [1_000, 1, 4_000, 60, 2],
        [1_150, 1, 4_000, 60, 2],
        [1_000, 2, 5_000, 100, 2],
        [1_150, 2, 5_000, 100, 2],
      ],
      [
        [1_300, 1, 4_000, 80, 1],
        [1_300, 2, 5_000, 100, 1],
      ],
    ]);
  });

  it('pins the direct guide, forward movement, live strips and fourth-contact knock-back', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5201);
    expect(plan?.rows[0]?.motion).toEqual({
      kind: 'forward',
      nativeRange: 200,
      delayMs: 0,
      durationMs: 400,
    });
    expect(mir4NativeRuntimeGuidePolicy(5201, 520101)).toMatchObject({
      guideShape: 'direct',
      aliveMs: 680,
      scalingMs: 480,
      indicatorNativeLength: 700,
      indicatorNativeWidth: 600,
    });
    expect([520101, 520102, 520103].every((attackId) =>
      mir4NativeImpactType3RuntimeAttack(5201, attackId),
    )).toBe(true);
    expect(mir4NativeRuntimeKnockbackReaction(5201, 520102)).toEqual({
      kind: 'knock-back',
      stance: 'hit-02',
      durationMs: 800,
      moveDurationMs: 600,
      moveDistanceYards: 1,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
  });
});
