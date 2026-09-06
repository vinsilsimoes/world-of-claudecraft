import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType3RuntimeAttack } from '../../src/sim/mir4/native_impact_type3_targets';
import {
  mir4NativeBashPolicy,
  mir4NativeLancerBashPassiveBonusBasisPoints,
} from '../../src/sim/mir4/native_skill_bash';
import {
  mir4NativeDoubleStrikePolicy,
  mir4NativeDoubleStrikeSourceMatches,
} from '../../src/sim/mir4/native_skill_double_strike';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import { mir4NativeRuntimeSkillSourceFacets } from '../../src/sim/mir4/native_skill_source_facets';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5301 Double Strike compiled contracts', () => {
  it('promotes the exact three-contact action and removes the generic area effect', () => {
    const action = mir4NativeSkillActionById(5301);
    const skill = mir4SkillById(5301);
    const authority = mir4RuntimeSkillExecutionAuthority(5301);

    expect(mir4NativeDoubleStrikeSourceMatches()).toBe(true);
    expect(action?.rows.map((row) => row.attackId)).toEqual([530101, 530102, 530103]);
    expect(skill).toMatchObject({
      requiresTarget: true,
      impactOffsetsMs: [400, 1_040, 1_200],
      minTargets: null,
      effect: null,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5301));
    expect(authority?.plan).toMatchObject({
      skillId: 5301,
      cooldownMs: 24_000,
      skillCostType: 2,
      skillCost: 3_300,
      attackAnimationMs: 1_900,
      endCutAnimationMs: 1_700,
      sourceHitCount: 3,
      requiredClassLevel: 1,
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
        attackId: 530101,
        motion: { kind: 'forward', nativeRange: 350, delayMs: 0, durationMs: 240 },
        contacts: [[400, 9_000, 180]],
      },
      {
        attackId: 530102,
        motion: { kind: 'target', nativeRange: 120, delayMs: 0, durationMs: 250 },
        contacts: [[1_040, 8_000, 160]],
      },
      {
        attackId: 530103,
        motion: null,
        contacts: [[1_200, 8_000, 160]],
      },
    ]);
  });

  it('pins the real footprint, guide, final facing and both authored knock-backs', () => {
    expect(
      [530101, 530102, 530103].every((attackId) =>
        mir4NativeImpactType3RuntimeAttack(5301, attackId),
      ),
    ).toBe(true);
    expect(mir4NativeRuntimeGuidePolicy(5301, 530102)).toMatchObject({
      guideShape: 'direct',
      aliveMs: 500,
      scalingMs: 300,
      indicatorIndex: 103,
      indicatorNativeLength: 600,
      indicatorNativeWidth: 600,
    });
    expect(mir4NativeRuntimeKnockbackReaction(5301, 530101)).toEqual({
      kind: 'knock-back',
      stance: 'hit-02',
      durationMs: 1_000,
      moveDurationMs: 300,
      moveDistanceYards: 2.5,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(5301, 530103)).toEqual({
      kind: 'knock-back',
      stance: 'hit-02',
      durationMs: 800,
      moveDurationMs: 300,
      moveDistanceYards: 2,
      heightYards: 0.5,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(actionRow(530103).viewTarget).toBe(2);
  });

  it('seals the rank ladder, Chill stacks and cumulative Lancer Bash passive', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeDoubleStrikePolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        bashDamageBasisPoints: 5_000,
        chilledDamageBasisPointsByStacks: [0, 0, 0],
        persistentBashDamageBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 5,
        bashDamageBasisPoints: 6_500,
        chilledDamageBasisPointsByStacks: [2_000, 2_500, 3_000],
        persistentBashDamageBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 8,
        bashDamageBasisPoints: 8_000,
        chilledDamageBasisPointsByStacks: [5_000, 6_000, 7_000],
        persistentBashDamageBasisPoints: 1_000,
      }),
      expect.objectContaining({
        skillLevel: 10,
        bashDamageBasisPoints: 10_000,
        chilledDamageBasisPointsByStacks: [9_000, 10_000, 11_000],
        persistentBashDamageBasisPoints: 1_500,
      }),
    ]);
    expect(mir4NativeBashPolicy(5301, 10)).toMatchObject({
      passiveId: 102001,
      requiredDebilitationBuffIds: [20020],
      skillBonusBasisPoints: 10_000,
    });
    expect(mir4NativeLancerBashPassiveBonusBasisPoints({ 5101: 10, 5301: 10 })).toBe(3_500);
  });

  it('admits the exact source facets without granting referenced passives', () => {
    expect(mir4NativeRuntimeSkillSourceFacets(5301)).toMatchObject({
      skillId: 5301,
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
      smiteBuffIds: [20020],
      autoLearnPassiveIds: [102001],
      skillModPassiveIds: [],
    });
  });
});

function actionRow(attackId: number) {
  const row = mir4NativeSkillActionById(5301)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row) throw new Error(`Missing Double Strike row ${attackId}`);
  return row;
}
