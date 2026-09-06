import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { interruptMir4SkillActionMotion } from './skill_action_scheduler';
import { markMir4WireDirty } from './wire_revision';

export type Mir4DisplacementDirection = 'radial' | 'source-facing';

/** Resolve the two native hard-displacement direction modes recovered from the client. */
export function mir4DisplacementUnitVector(
  source: Pick<Entity, 'pos' | 'facing'>,
  target: Pick<Entity, 'pos'>,
  direction: Mir4DisplacementDirection,
): Readonly<{ x: number; z: number }> {
  if (direction === 'source-facing') {
    return Object.freeze({ x: Math.sin(source.facing), z: Math.cos(source.facing) });
  }
  const dx = target.pos.x - source.pos.x;
  const dz = target.pos.z - source.pos.z;
  const length = Math.hypot(dx, dz);
  return length > 1e-9
    ? Object.freeze({ x: dx / length, z: dz / length })
    : Object.freeze({ x: Math.sin(source.facing), z: Math.cos(source.facing) });
}

/**
 * Hard position replacement ends a refundable approach and interrupts only
 * the remaining authored actor motion of a committed skill. Damage contacts,
 * resource spend, cooldown and end-cut recovery stay committed.
 */
export function interruptMir4SkillMovementOnDisplacement(ctx: SimContext, entity: Entity): void {
  if (entity.kind !== 'player') return;
  const meta = ctx.players.get(entity.id);
  if (meta) {
    const hadApproach = meta.mir4SkillActivation !== undefined;
    meta.mir4SkillActivation = undefined;
    meta.mir4SkillActivationClaimedThroughTick = undefined;
    if (hadApproach) markMir4WireDirty(meta);
  }
  interruptMir4SkillActionMotion(ctx, entity.id);
}
