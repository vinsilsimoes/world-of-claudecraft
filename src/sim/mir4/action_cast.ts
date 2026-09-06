// Thin profile router that lets the existing cast command/action bar execute a
// MIR4 skill without teaching the classic casting lifecycle MIR4 formulas.

import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { mir4ClassIdFromUltimateAction, mir4SkillIdFromAction } from './action_abilities';
import { mir4CastErrorText, requestMir4SkillActivation } from './skill_activation';

/** True when `abilityId` belonged to the MIR4 action namespace and was handled. */
export function castMir4Action(
  ctx: SimContext,
  abilityId: string,
  pid: number,
  targetId?: number,
): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  const ultimateClassId = mir4ClassIdFromUltimateAction(abilityId);
  if (ultimateClassId !== null) {
    const result = requestMir4SkillActivation(ctx, abilityId, pid, targetId);
    if (!result.ok) {
      ctx.error(
        pid,
        result.reason === 'no-mp'
          ? 'Your Ultimate gauge is not full.'
          : mir4CastErrorText(result.reason ?? 'unknown-skill'),
      );
    }
    return true;
  }
  const skillId = mir4SkillIdFromAction(abilityId);
  if (skillId === null) return false;
  const result = requestMir4SkillActivation(ctx, abilityId, pid, targetId);
  if (!result.ok) ctx.error(pid, mir4CastErrorText(result.reason ?? 'unknown-skill'));
  return true;
}
