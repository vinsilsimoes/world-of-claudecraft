import { mir4NativeGeneratedMechanicalAction } from './native_skill_generated_contract';

export interface Mir4NativePassiveEligibilityPolicy {
  readonly skillId: number;
  readonly passiveEligibilityIds: readonly number[];
  readonly grantsAutomatically: false;
  readonly semantics: 'eligibility-only';
}

/**
 * Preserve SKILL.Passive as an external eligibility list. These references do
 * not add visible skills, grant passives, or execute effects by themselves.
 */
export function mir4NativeGeneratedPassiveEligibility(
  skillId: number,
): Mir4NativePassiveEligibilityPolicy | null {
  const action = mir4NativeGeneratedMechanicalAction(skillId);
  if (!action) return null;
  return Object.freeze({
    skillId,
    passiveEligibilityIds: action.nativeBehavior.passiveIds,
    grantsAutomatically: false,
    semantics: 'eligibility-only',
  });
}
