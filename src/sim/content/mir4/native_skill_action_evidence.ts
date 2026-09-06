/**
 * Evidence-only aggregation of the 60 MIR4 class skills and five ultimates.
 *
 * This catalog is deliberately separate from `native_skill_actions.ts`, which is
 * currently consumed by the production action scheduler. These class projections
 * preserve the direct `SKILL.AttackLink` rows plus their raw projectile, Totem,
 * Buff, secondary-damage and super-state references. They are still not lossless
 * execution plans: referenced payload graphs and consumer semantics require their
 * own source-record catalogs and explicit runtime rulings.
 */

import type { Mir4NativeSkillAction } from './native_skill_action_types';
import { MIR4_NATIVE_ARBALIST_SKILL_ACTIONS } from './native_skill_actions_arbalist';
import { MIR4_NATIVE_LANCER_SKILL_ACTIONS } from './native_skill_actions_lancer';
import { MIR4_NATIVE_SORCERER_SKILL_ACTIONS } from './native_skill_actions_sorcerer';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from './native_skill_actions_taoist';
import { MIR4_NATIVE_WARRIOR_SKILL_ACTIONS } from './native_skill_actions_warrior';

export const MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE: readonly Mir4NativeSkillAction[] =
  Object.freeze([
    ...MIR4_NATIVE_WARRIOR_SKILL_ACTIONS,
    ...MIR4_NATIVE_SORCERER_SKILL_ACTIONS,
    ...MIR4_NATIVE_TAOIST_SKILL_ACTIONS,
    ...MIR4_NATIVE_ARBALIST_SKILL_ACTIONS,
    ...MIR4_NATIVE_LANCER_SKILL_ACTIONS,
  ]);

const DIRECT_EVIDENCE_BY_SKILL_ID = new Map(
  MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.map((action) => [action.skillId, action]),
);

export function mir4NativeDirectSkillActionEvidenceById(
  skillId: number,
): Mir4NativeSkillAction | null {
  return DIRECT_EVIDENCE_BY_SKILL_ID.get(skillId) ?? null;
}
