import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import {
  mir4NativeRuntimeSkillPresentationFacets,
  mir4NativeRuntimeSkillSourceFacets,
} from '../../src/sim/mir4/native_skill_source_facets';
import { mir4NativeRuntimeStateConditionPolicy } from '../../src/sim/mir4/native_skill_state_condition';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3501 Guardian Circle compiled contracts', () => {
  it('promotes all three native rows without compatibility leftovers', () => {
    const action = mir4NativeSkillActionById(3501);
    const authority = mir4RuntimeSkillExecutionAuthority(3501);

    expect(action?.rows.map((row) => row.attackId)).toEqual([350101, 350102, 350103]);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(3501));
    expect(authority?.plan).toMatchObject({
      skillId: 3501,
      cooldownMs: 46_000,
      skillCostType: 2,
      skillCost: 2_640,
      attackAnimationMs: 1_000,
      endCutAnimationMs: 950,
      sourceHitCount: 1,
      requiredClassLevel: 16,
      requiresTarget: false,
      damageAllocation: 'per-impact',
    });
    expect(authority?.plan?.rows.map((row) => row.contacts.length)).toEqual([0, 1, 0]);
    expect(authority?.plan?.rows[1]?.contacts[0]).toEqual({
      sourceImpactIndex: 0,
      offsetMs: 400,
      damage: {
        damageType: 2,
        damageAttribute: 0,
        coefficient: 6_000,
        levelUpCoefficient: 100,
        componentImpactCount: 1,
        allocationMode: 'per-impact',
      },
    });
  });

  it('pins the exact source buff tuples and passive eligibility evidence', () => {
    const source = mir4NativeRuntimeSkillSourceFacets(3501);
    expect(source?.abilities).toEqual([
      {
        slotIndex: 0,
        type: 24,
        value: 25,
        levelUpValue: 5,
        time: 60,
        active: false,
        inactiveReason: 'attack-row-buff-metadata',
        sourceAttackId: 350103,
        sourceBuffId: 35011,
      },
      {
        slotIndex: 1,
        type: 0,
        value: 10,
        levelUpValue: 2,
        time: 60,
        active: false,
        inactiveReason: 'attack-row-buff-metadata',
        sourceAttackId: 350103,
        sourceBuffId: 35010,
      },
      {
        slotIndex: 2,
        type: 0,
        value: 0,
        levelUpValue: 0,
        time: 0,
        active: false,
        inactiveReason: 'zero-type',
      },
      {
        slotIndex: 3,
        type: 0,
        value: 0,
        levelUpValue: 0,
        time: 20,
        active: false,
        inactiveReason: 'zero-type',
      },
    ]);
    expect(source?.passiveEligibilityIds[0]).toBe(204001);
    expect(source?.passiveEligibilityIds).toContain(204025);
    expect(source?.passiveEligibilityIds).toContain(205025);
    expect(source?.smiteBuffIds).toEqual([]);
    expect(source?.autoLearnPassiveIds).toEqual([]);
    expect(source?.skillModPassiveIds).toEqual([]);
    expect(mir4NativeRuntimeSkillPresentationFacets(3501)?.abilities).toBe(source?.abilities);
  });

  it('pins the self-centered guide and rank-8 stunned-cast condition', () => {
    expect(mir4NativeRuntimeGuidePolicy(3501, 350101)).toMatchObject({
      skillId: 3501,
      attackId: 350101,
      nativeApplyType: 0,
      applyTo: 'self',
      guideEffectId: 102,
      guideEffectType: 2,
      guideShape: 'circle',
      materialPathId: 100012,
      materialAssetPath: '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
      aliveMs: 400,
      scalingMs: 200,
      materialScalarCurve: 'inside-linear-grow-then-hold',
      indicatorIndex: 102,
      indicatorNativeRadius: 1_500,
    });
    expect(mir4NativeRuntimeStateConditionPolicy(3501)).toEqual({
      skillId: 3501,
      stateConditionUse: true,
      usableWhileStunnedFromRank: 8,
      conditionalBuffId: 30306,
    });
  });
});
