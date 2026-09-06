import { mir4NativeSkillActionById } from '../content/mir4';
import type {
  Mir4NativeSkillAction,
  Mir4NativeSkillAttackRow,
} from '../content/mir4/native_skill_action_types';

/**
 * Skills whose directly extracted mechanical rows have been reviewed and may
 * feed the generic runtime-contract projectors.
 *
 * Admission stays explicit and fail-closed. Adding an id does not approve the
 * skill's buffs, passives, movement, presentation, or runtime behaviour; it
 * only removes duplicated hand-written copies of fields already present in
 * SKILL/SKILL_ATTACK evidence.
 */
const GENERATED_MECHANICAL_CONTRACT_SKILL_IDS = new Set<number>([
  1101, 1403, 2101, 2103, 2111, 2201, 2202, 2203, 2204, 2301, 2303, 2501, 2502, 2503, 3101, 3103,
  3104, 3201, 3203, 3301, 3404, 3501, 3503, 3504, 3505, 4101, 4102, 4103, 4104, 4105, 4107, 4108,
  4109, 4110, 4111, 4112, 4113, 5101, 5102, 5103, 5104, 5201, 5202, 5205, 5301, 5303, 5304, 5203,
  5401, 5403,
]);

export function mir4NativeGeneratedMechanicalAction(skillId: number): Mir4NativeSkillAction | null {
  if (!GENERATED_MECHANICAL_CONTRACT_SKILL_IDS.has(skillId)) return null;
  return mir4NativeSkillActionById(skillId);
}

export function mir4NativeGeneratedMechanicalRow(
  skillId: number,
  attackId: number,
): Mir4NativeSkillAttackRow | null {
  return (
    mir4NativeGeneratedMechanicalAction(skillId)?.rows.find(
      (candidate) => candidate.attackId === attackId,
    ) ?? null
  );
}

export function mir4NativeRowHasDamageContact(row: Mir4NativeSkillAttackRow): boolean {
  const behavior = row.nativeBehavior;
  return (
    behavior.damageType !== 0 &&
    (behavior.physicalDamage.coefficient !== 0 ||
      behavior.physicalDamage.levelUpCoefficient !== 0 ||
      behavior.magicDamage.coefficient !== 0 ||
      behavior.magicDamage.levelUpCoefficient !== 0)
  );
}
