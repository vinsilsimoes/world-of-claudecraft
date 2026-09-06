import { describe, expect, it } from 'vitest';
import { MIR4_CLASS_IDS, MIR4_SKILLS, mir4SkillById } from '../../src/sim/content/mir4';
import {
  mir4ActionAbilityDef,
  mir4ActionId,
  mir4UltimateActionId,
} from '../../src/sim/mir4/action_abilities';
import {
  MIR4_SKILL_ACTIVATION_POLICIES,
  mir4SkillActivationPolicy,
} from '../../src/sim/mir4/skill_activation_policy';

const RUNTIME_SKILL_ACTION_IDS = MIR4_SKILLS.map((skill) => mir4ActionId(skill.skillId));
const ULTIMATE_ACTION_IDS = MIR4_CLASS_IDS.map(mir4UltimateActionId);
const RUNTIME_ACTION_IDS = [...RUNTIME_SKILL_ACTION_IDS, ...ULTIMATE_ACTION_IDS];

describe('MIR4 skill activation policy inventory', () => {
  it('covers all 60 runtime skills and five class ultimates exactly once', () => {
    expect(RUNTIME_SKILL_ACTION_IDS).toHaveLength(60);
    expect(new Set(RUNTIME_SKILL_ACTION_IDS).size).toBe(60);
    expect(ULTIMATE_ACTION_IDS).toHaveLength(5);
    expect(new Set(ULTIMATE_ACTION_IDS).size).toBe(5);
    expect(RUNTIME_ACTION_IDS).toHaveLength(65);
    expect(new Set(RUNTIME_ACTION_IDS).size).toBe(65);

    const policyIds = MIR4_SKILL_ACTIVATION_POLICIES.map((policy) => policy.abilityId);
    expect(MIR4_SKILL_ACTIVATION_POLICIES).toHaveLength(RUNTIME_ACTION_IDS.length);
    expect(new Set(policyIds).size).toBe(policyIds.length);
    expect([...policyIds].sort()).toEqual([...RUNTIME_ACTION_IDS].sort());

    for (const abilityId of RUNTIME_ACTION_IDS) {
      const matchingPolicies = MIR4_SKILL_ACTIVATION_POLICIES.filter(
        (policy) => policy.abilityId === abilityId,
      );
      expect(matchingPolicies).toHaveLength(1);
      expect(mir4SkillActivationPolicy(abilityId)).toBe(matchingPolicies[0]);
    }
  });

  it('contains only known actions with internally consistent targeting behavior', () => {
    for (const policy of MIR4_SKILL_ACTIVATION_POLICIES) {
      const action = mir4ActionAbilityDef(policy.abilityId);
      expect(action).not.toBeNull();
      if (!action) continue;

      const targeted = policy.targetMode === 'selected-hostile';
      expect(action.requiresTarget).toBe(targeted);
      expect(policy.approach).toBe(targeted ? 'until-in-range' : 'none');
      expect(policy.faceOnCommit).toBe(targeted);
    }

    expect(mir4SkillActivationPolicy('mir4_skill_999999')).toBeNull();
    expect(mir4SkillActivationPolicy('mir4_ultimate_999999')).toBeNull();
  });

  it.each([2201, 2202] as const)(
    'keeps unresolved Sorcerer skill %i targetless pending native replay evidence',
    (skillId) => {
      expect(mir4SkillById(skillId)).toMatchObject({ classId: 2, requiresTarget: false });
      expect(mir4SkillActivationPolicy(mir4ActionId(skillId))).toEqual({
        abilityId: mir4ActionId(skillId),
        targetMode: 'none',
        approach: 'none',
        faceOnCommit: false,
      });
    },
  );
});
