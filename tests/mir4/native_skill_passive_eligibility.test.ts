import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_SORCERER_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions_sorcerer';
import { mir4NativeGeneratedPassiveEligibility } from '../../src/sim/mir4/native_skill_passive_eligibility';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';

const SORCERER_REGULAR_SKILL_IDS = Object.freeze([
  2101, 2111, 2501, 2301, 2503, 2203, 2303, 2201, 2502, 2103, 2204, 2202,
]);

describe('MIR4 native passive eligibility references', () => {
  it('preserves every reviewed Sorcerer list without granting a player-facing passive', () => {
    for (const skillId of SORCERER_REGULAR_SKILL_IDS) {
      const action = MIR4_NATIVE_SORCERER_SKILL_ACTIONS.find(
        (candidate) => candidate.skillId === skillId,
      );
      const policy = mir4NativeGeneratedPassiveEligibility(skillId);
      expect(policy, `${skillId}`).toEqual({
        skillId,
        passiveEligibilityIds: action?.nativeBehavior.passiveIds,
        grantsAutomatically: false,
        semantics: 'eligibility-only',
      });
    }
  });

  it('removes only the eligibility-list compiler blocker', () => {
    for (const skillId of SORCERER_REGULAR_SKILL_IDS) {
      expect(
        mir4RuntimeSkillExecutionAuthority(skillId)?.issues.some(
          (issue) => issue.path === 'action.nativeBehavior.passiveIds',
        ),
        `${skillId}`,
      ).toBe(false);
    }
  });

  it('keeps skills outside the reviewed generated contract closed', () => {
    expect(mir4NativeGeneratedPassiveEligibility(999_999)).toBeNull();
  });
});
