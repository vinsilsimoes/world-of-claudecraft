import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import {
  mir4NativeRuntimeSkillPresentationFacets,
  mir4NativeRuntimeSkillSourceFacets,
} from '../../src/sim/mir4/native_skill_source_facets';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3404 Expulsion Circle compiled contracts', () => {
  it('promotes its one targetless party row without compatibility leftovers', () => {
    const action = mir4NativeSkillActionById(3404);
    const authority = mir4RuntimeSkillExecutionAuthority(3404);
    expect(action?.rows.map((row) => row.attackId)).toEqual([340401]);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(3404));
    expect(authority?.plan).toMatchObject({
      skillId: 3404,
      cooldownMs: 46_000,
      skillCostType: 2,
      skillCost: 3_000,
      attackAnimationMs: 1_000,
      endCutAnimationMs: 950,
      sourceHitCount: 0,
      requiredClassLevel: 48,
      requiresTarget: false,
      damageAllocation: null,
    });
    expect(authority?.plan?.rows[0]?.contacts).toEqual([]);
  });

  it('pins the source Spell DEF tuple, passive eligibility, and circle guide', () => {
    const source = mir4NativeRuntimeSkillSourceFacets(3404);
    expect(source?.abilities[0]).toEqual({
      slotIndex: 0,
      type: 26,
      value: 25,
      levelUpValue: 5,
      time: 60,
      active: false,
      inactiveReason: 'attack-row-buff-metadata',
      sourceAttackId: 340401,
      sourceBuffId: 35012,
    });
    expect(source?.passiveEligibilityIds[0]).toBe(204025);
    expect(source?.passiveEligibilityIds).toContain(204025);
    expect(source?.passiveEligibilityIds).toContain(205025);
    expect(source?.smiteBuffIds).toEqual([]);
    expect(mir4NativeRuntimeSkillPresentationFacets(3404)?.abilities).toBe(source?.abilities);
    expect(mir4NativeRuntimeGuidePolicy(3404, 340401)).toMatchObject({
      skillId: 3404,
      attackId: 340401,
      nativeApplyType: 0,
      applyTo: 'self',
      guideEffectId: 102,
      guideEffectType: 2,
      guideShape: 'circle',
      aliveMs: 764,
      scalingMs: 564,
      indicatorIndex: 102,
      indicatorNativeRadius: 1_500,
    });
  });
});
