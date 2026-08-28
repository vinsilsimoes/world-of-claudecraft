// Thin profile router that lets the existing cast command/action bar execute a
// MIR4 skill without teaching the classic casting lifecycle MIR4 formulas.

import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { mir4ClassIdFromUltimateAction, mir4SkillIdFromAction } from './action_abilities';
import { castMir4Skill, type Mir4CastResult, mir4Ultimate } from './combat';

const ERROR_TEXT: Readonly<Record<NonNullable<Mir4CastResult['reason']>, string>> = {
  'unknown-skill': 'Unknown ability.',
  'wrong-class': 'That ability belongs to another class.',
  'not-unlocked': 'That ability is not unlocked yet.',
  'no-target': 'You have no target.',
  'out-of-range': 'Out of range.',
  'no-mp': 'Not enough MP.',
  'on-cooldown': 'That ability is not ready yet.',
  'on-gcd': 'Another action is not ready yet.',
  controlled: 'You are stunned!',
  silenced: 'You are silenced!',
  'utility-not-ready': 'That ability is not ready yet.',
};

/** True when `abilityId` belonged to the MIR4 action namespace and was handled. */
export function castMir4Action(ctx: SimContext, abilityId: string, pid: number): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  const ultimateClassId = mir4ClassIdFromUltimateAction(abilityId);
  if (ultimateClassId !== null) {
    const player = ctx.entities.get(pid);
    const result =
      player?.mir4?.classId === ultimateClassId
        ? mir4Ultimate(ctx, pid)
        : ({ ok: false, reason: 'wrong-class' } as const);
    if (!result.ok) {
      ctx.error(
        pid,
        result.reason === 'no-mp'
          ? 'Your Ultimate gauge is not full.'
          : ERROR_TEXT[result.reason ?? 'unknown-skill'],
      );
    }
    return true;
  }
  const skillId = mir4SkillIdFromAction(abilityId);
  if (skillId === null) return false;
  const result = castMir4Skill(ctx, pid, skillId);
  if (!result.ok) ctx.error(pid, ERROR_TEXT[result.reason ?? 'unknown-skill']);
  return true;
}
