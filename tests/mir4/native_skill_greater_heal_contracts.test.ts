import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3504 Greater Heal compiled contracts', () => {
  it('promotes the two living and two dead-target rows without compatibility leftovers', () => {
    const action = mir4NativeSkillActionById(3504);
    const authority = mir4RuntimeSkillExecutionAuthority(3504);

    expect(action?.rows.map((row) => [row.attackId, row.targetSubtype])).toEqual([
      [350401, 'alive-only'],
      [350402, 'alive-only'],
      [350403, 'dead-only'],
      [350404, 'dead-only'],
    ]);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(3504));
    expect(authority?.plan).toMatchObject({
      skillId: 3504,
      cooldownMs: 46_000,
      skillCostType: 2,
      skillCost: 5_880,
      attackAnimationMs: 1_640,
      endCutAnimationMs: 1_500,
      sourceHitCount: 0,
      requiredClassLevel: 56,
      requiresTarget: false,
    });
    expect(authority?.plan?.rows.map((row) => [row.attackId, row.target.targetSubtype])).toEqual([
      [350401, 'alive-only'],
      [350402, 'alive-only'],
      [350403, 'dead-only'],
      [350404, 'dead-only'],
    ]);
  });
});
