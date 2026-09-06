import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeMultiImpactPolicy } from '../../src/sim/mir4/native_skill_multi_impact';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3203 Soaring Slash compiled contracts', () => {
  it('promotes all three hybrid rows and all nine authored contacts', () => {
    const action = mir4NativeSkillActionById(3203);
    const authority = mir4RuntimeSkillExecutionAuthority(3203);

    expect(action?.rows.map((row) => row.attackId)).toEqual([320301, 320302, 320303]);
    expect(mir4NativeRuntimeMultiImpactPolicy(3203)).toMatchObject({
      skillId: 3203,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 400,
      summaryLevelUpCoefficient: 8,
      totalImpactCount: 9,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(3203));
    expect(authority?.plan).toMatchObject({
      skillId: 3203,
      cooldownMs: 31_000,
      skillCostType: 2,
      skillCost: 2_800,
      attackAnimationMs: 1_700,
      endCutAnimationMs: 1_550,
      sourceHitCount: 9,
      requiredClassLevel: 40,
      requiresTarget: true,
      damageAllocation: 'row-total-impact-vector',
    });
    expect(authority?.plan?.rows.map((row) => row.contacts.length)).toEqual([6, 6, 6]);
    expect(
      authority?.plan?.rows.map((row) =>
        row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.damageType,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
        ]),
      ),
    ).toEqual([
      [
        [350, 1, 9_000, 200],
        [500, 1, 9_000, 200],
        [650, 1, 9_000, 200],
        [350, 2, 3_000, 60],
        [500, 2, 3_000, 60],
        [650, 2, 3_000, 60],
      ],
      [
        [800, 1, 10_000, 200],
        [950, 1, 10_000, 200],
        [1_100, 1, 10_000, 200],
        [800, 2, 4_000, 70],
        [950, 2, 4_000, 70],
        [1_100, 2, 4_000, 70],
      ],
      [
        [1_250, 1, 10_000, 200],
        [1_450, 1, 10_000, 200],
        [1_650, 1, 10_000, 200],
        [1_250, 2, 4_000, 70],
        [1_450, 2, 4_000, 70],
        [1_650, 2, 4_000, 70],
      ],
    ]);
  });
});
