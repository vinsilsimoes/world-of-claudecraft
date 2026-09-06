import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { interruptMir4SkillMovementOnDisplacement } from './displacement';
import { applyMir4Effect } from './effects';
import { refreshMir4NativeHitReactionState } from './native_skill_hit_reaction';
import type { Mir4NativeTotemRuntimeContactPlan } from './native_skill_totem_runtime';
import { mir4NativeDistanceToYards } from './native_skill_units';

export interface Mir4NativeTotemSpatialOrigin {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function radialDirection(
  origin: Mir4NativeTotemSpatialOrigin,
  target: Entity,
  owner: Entity,
): Readonly<{ x: number; z: number }> {
  const dx = target.pos.x - origin.x;
  const dz = target.pos.z - origin.z;
  const length = Math.hypot(dx, dz);
  return length > 1e-9
    ? Object.freeze({ x: dx / length, z: dz / length })
    : Object.freeze({ x: Math.sin(owner.facing), z: Math.cos(owner.facing) });
}

function applySignedRadialMove(
  ctx: SimContext,
  owner: Entity,
  target: Entity,
  origin: Mir4NativeTotemSpatialOrigin,
  distanceYards: number,
): void {
  if (distanceYards === 0) return;
  const direction = radialDirection(origin, target, owner);
  const resolved = ctx.resolveMove(
    target.pos.x,
    target.pos.z,
    target.pos.x + direction.x * distanceYards,
    target.pos.z + direction.z * distanceYards,
    PLAYER_BODY_RADIUS,
    target,
  );
  if (resolved.x === target.pos.x && resolved.z === target.pos.z) return;
  interruptMir4SkillMovementOnDisplacement(ctx, target);
  target.prevPos = { ...target.pos };
  target.pos = ctx.groundPos(resolved.x, resolved.z);
  target.vx = 0;
  target.vy = 0;
  target.vz = 0;
  ctx.rebucket(target);
}

/** Apply the already-landed Totem row's source-authored reaction around its fixed origin. */
export function applyMir4NativeTotemReaction(
  ctx: SimContext,
  owner: Entity,
  target: Entity,
  skillId: number,
  skillName: string | null,
  origin: Mir4NativeTotemSpatialOrigin,
  contact: Mir4NativeTotemRuntimeContactPlan,
): boolean {
  if (target.dead) return false;
  if (contact.reaction.kind === 'none') return true;
  const chanceBasisPoints = Math.max(
    0,
    Math.min(10_000, Math.trunc(contact.reaction.probabilityPercent * 100)),
  );
  if (chanceBasisPoints < 10_000 && Math.floor(ctx.rng.next() * 10_000) >= chanceBasisPoints) {
    return false;
  }
  if (contact.reaction.kind === 'knock-down') {
    const admitted = applyMir4Effect(ctx, target, {
      effectId: `mir4_${contact.attackId}_totem_knockdown`,
      kind: 'knockdown',
      durationSeconds: contact.reaction.durationMs / 1000,
      name: skillName ?? `Skill ${skillId}`,
      sourceId: owner.id,
    });
    if (!admitted.ok) return false;
  } else if (
    !refreshMir4NativeHitReactionState(target, contact.reaction.durationMs / 1000, owner.id)
  ) {
    return false;
  }

  // Native CrowdControlType 99 is an attack-back presentation reaction. Its
  // recovered row carries a value, but not a displacement consumer; moving the
  // target here would invent knock-back behaviour.
  if (contact.reaction.kind !== 'attack-back') {
    applySignedRadialMove(ctx, owner, target, origin, contact.reaction.moveDistanceYards);
  }
  ctx.emit({
    type: 'mir4HitReaction',
    sourceId: owner.id,
    targetId: target.id,
    skillId,
    attackId: contact.attackId,
    durationMs: contact.reaction.durationMs,
    stance: contact.reaction.stance === 'none' ? 'hit-01' : contact.reaction.stance,
    moveDurationMs: Math.min(contact.reaction.moveDurationMs, contact.reaction.durationMs),
    heightYards: mir4NativeDistanceToYards(contact.reaction.nativeHeight ?? 0),
  });
  return true;
}
