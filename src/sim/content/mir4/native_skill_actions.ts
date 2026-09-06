import { MIR4_NATIVE_REVIEWED_CLOAKING_ACTION } from './native_skill_action_cloaking';
import { MIR4_NATIVE_REVIEWED_PAINSTRIKE_GALE_ACTION } from './native_skill_action_painstrike_gale';
import type { Mir4NativeSkillAction } from './native_skill_action_types';
import { MIR4_NATIVE_ARBALIST_SKILL_ACTIONS } from './native_skill_actions_arbalist';
import { MIR4_NATIVE_LANCER_SKILL_ACTIONS } from './native_skill_actions_lancer';
import { MIR4_NATIVE_SORCERER_SKILL_ACTIONS } from './native_skill_actions_sorcerer';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from './native_skill_actions_taoist';
import { MIR4_NATIVE_WARRIOR_SKILL_ACTIONS } from './native_skill_actions_warrior';

const MIR4_REVIEWED_TAOIST_SKILL_ACTIONS = Object.freeze(
  MIR4_NATIVE_TAOIST_SKILL_ACTIONS.filter(
    (action) =>
      action.skillId === 3506 ||
      action.skillId === 3101 ||
      action.skillId === 3301 ||
      action.skillId === 3104 ||
      action.skillId === 3103 ||
      action.skillId === 3501 ||
      action.skillId === 3201 ||
      action.skillId === 3505 ||
      action.skillId === 3203 ||
      action.skillId === 3404 ||
      action.skillId === 3503 ||
      action.skillId === 3504 ||
      action.skillId === 3303,
  ),
);

const MIR4_REVIEWED_ARBALIST_SKILL_ACTIONS = Object.freeze([
  ...MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.filter(
    (action) =>
      action.skillId === 4101 ||
      action.skillId === 4102 ||
      action.skillId === 4103 ||
      action.skillId === 4104 ||
      action.skillId === 4105 ||
      action.skillId === 4107 ||
      action.skillId === 4108 ||
      action.skillId === 4109 ||
      action.skillId === 4110 ||
      action.skillId === 4111 ||
      action.skillId === 4113,
  ),
  MIR4_NATIVE_REVIEWED_PAINSTRIKE_GALE_ACTION,
  MIR4_NATIVE_REVIEWED_CLOAKING_ACTION,
]);

const MIR4_REVIEWED_LANCER_SKILL_ACTIONS = Object.freeze(
  MIR4_NATIVE_LANCER_SKILL_ACTIONS.filter(
    (action) =>
      action.skillId === 5101 ||
      action.skillId === 5104 ||
      action.skillId === 5201 ||
      action.skillId === 5301 ||
      action.skillId === 5401 ||
      action.skillId === 5102 ||
      action.skillId === 5103 ||
      action.skillId === 5303 ||
      action.skillId === 5403 ||
      action.skillId === 5205 ||
      action.skillId === 5304 ||
      action.skillId === 5202 ||
      action.skillId === 5203,
  ),
);

export type {
  Mir4NativeAnimationBindingConfidence,
  Mir4NativeCrowdControlKind,
  Mir4NativeCrowdControlStance,
  Mir4NativeHitReaction,
  Mir4NativeMovementKind,
  Mir4NativeSkillAction,
  Mir4NativeSkillAttackRow,
  Mir4NativeSkillDamage,
  Mir4NativeSkillGeometry,
  Mir4NativeSkillIndicator,
  Mir4NativeSkillMovement,
  Mir4NativeSkillPresentation,
  Mir4NativeTargetSubtype,
  Mir4NativeVector,
} from './native_skill_action_types';

export const MIR4_NATIVE_SKILL_ACTIONS: readonly Mir4NativeSkillAction[] = Object.freeze([
  ...MIR4_NATIVE_WARRIOR_SKILL_ACTIONS,
  ...MIR4_NATIVE_SORCERER_SKILL_ACTIONS,
  ...MIR4_REVIEWED_TAOIST_SKILL_ACTIONS,
  ...MIR4_REVIEWED_ARBALIST_SKILL_ACTIONS,
  ...MIR4_REVIEWED_LANCER_SKILL_ACTIONS,
]);

const ACTION_BY_SKILL_ID = new Map(
  MIR4_NATIVE_SKILL_ACTIONS.map((action) => [action.skillId, action]),
);

export function mir4NativeSkillActionById(skillId: number): Mir4NativeSkillAction | null {
  return ACTION_BY_SKILL_ID.get(skillId) ?? null;
}
