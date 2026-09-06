import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeSkillEffect } from '../../src/sim/mir4/native_skill_runtime_effect';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3503 Heal compiled contracts', () => {
  it('promotes all three zero-damage native rows without compatibility leftovers', () => {
    const action = mir4NativeSkillActionById(3503);
    const authority = mir4RuntimeSkillExecutionAuthority(3503);

    expect(action?.rows.map((row) => row.attackId)).toEqual([350301, 350302, 350303]);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(3503));
    expect(authority?.plan).toMatchObject({
      skillId: 3503,
      cooldownMs: 20_000,
      skillCostType: 2,
      skillCost: 5_200,
      attackAnimationMs: 1_400,
      endCutAnimationMs: 1_350,
      sourceHitCount: 0,
      requiredClassLevel: 5,
      requiresTarget: false,
    });
    expect(authority?.plan?.rows.map((row) => row.contacts.length)).toEqual([0, 0, 0]);
  });

  it('matches the runtime effect to the extracted five-pulse party projection', () => {
    expect(mir4NativeRuntimeSkillEffect(3503)).toEqual({
      skillId: 3503,
      sourceAttackId: 350301,
      nativeTargetCap: 5,
      effect: mir4SkillById(3503)?.effect,
    });
  });
});
