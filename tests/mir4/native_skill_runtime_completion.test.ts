import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE } from '../../src/sim/content/mir4/native_skill_action_evidence';
import {
  MIR4_NATIVE_ULTIMATE_SKILL_IDS,
  mir4NativeUltimateExecutionPlanBySkillId,
} from '../../src/sim/mir4/native_ultimate_runtime';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 complete runtime skill authority', () => {
  it('keeps all sixty regular skills executable through the fail-closed compiler', () => {
    const ultimateIds = new Set(Object.values(MIR4_NATIVE_ULTIMATE_SKILL_IDS));
    const regularSkillIds = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.map(
      (action) => action.skillId,
    ).filter((skillId) => !ultimateIds.has(skillId));

    expect(regularSkillIds).toHaveLength(60);
    expect(
      regularSkillIds.flatMap((skillId) => {
        const plan = mir4RuntimeSkillExecutionPlan(skillId);
        return plan
          ? []
          : [{ skillId, issues: mir4RuntimeSkillExecutionAuthority(skillId)?.issues ?? [] }];
      }),
    ).toEqual([]);
  });

  it('keeps one executable ultimate for every MIR4 class', () => {
    const ultimateSkillIds = Object.values(MIR4_NATIVE_ULTIMATE_SKILL_IDS);

    expect(ultimateSkillIds).toHaveLength(5);
    expect(new Set(ultimateSkillIds).size).toBe(5);
    expect(
      ultimateSkillIds.filter((skillId) => !mir4NativeUltimateExecutionPlanBySkillId(skillId)),
    ).toEqual([]);
  });
});
