import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3201 Tai Chi compiled contracts', () => {
  it('promotes all seven native rows without compatibility leftovers', () => {
    const action = mir4NativeSkillActionById(3201);
    const authority = mir4RuntimeSkillExecutionAuthority(3201);

    expect(action?.rows.map((row) => row.attackId)).toEqual([
      320101, 320102, 320103, 320104, 320105, 320106, 320107,
    ]);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(3201));
    expect(authority?.plan).toMatchObject({
      skillId: 3201,
      cooldownMs: 35_000,
      skillCostType: 2,
      skillCost: 3_000,
      attackAnimationMs: 2_067,
      endCutAnimationMs: 1_850,
      sourceHitCount: 6,
      requiredClassLevel: 24,
      requiresTarget: true,
      damageAllocation: 'per-impact',
    });
    expect(authority?.plan?.rows.map((row) => row.contacts.length)).toEqual([
      2, 2, 2, 2, 2, 2, 0,
    ]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts.map((contact) => contact.offsetMs)))
      .toEqual([20, 20, 490, 490, 690, 690, 850, 850, 1_000, 1_000, 1_340, 1_340]);
  });
});
