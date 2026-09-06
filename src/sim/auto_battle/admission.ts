// Shared no-action admission for MIR4 automation. Journey owns movement before
// Battle runs, so both coordinators must consult the same deterministic view of
// classic and MIR4 hard control. Root still stops pursuit through the run-speed
// path, but it never suppresses a legal attack or skill at the current range.

import { mir4HardControlled, mir4Rooted } from '../mir4/effects';
import { mir4HitReacting } from '../mir4/native_skill_hit_reaction';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { RUN_SPEED } from '../types';

export function mir4AutomationActionBlocked(ctx: SimContext, player: Entity): boolean {
  return ctx.isStunned(player) || mir4HardControlled(player) || mir4HitReacting(player);
}

/** The shared run-speed admission used by both MIR4 locomotion owners. */
export function mir4AutomationRunSpeed(ctx: SimContext, player: Entity): number {
  if (mir4AutomationActionBlocked(ctx, player)) return 0;
  if (ctx.isRooted(player) || mir4Rooted(player)) return 0;
  return RUN_SPEED * ctx.moveSpeedMult(player);
}
