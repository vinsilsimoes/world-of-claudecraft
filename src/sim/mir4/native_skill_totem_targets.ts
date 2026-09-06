import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import {
  type Mir4NativeImpactType2CircleOrigin,
  selectMir4NativeImpactType2CircleCandidates,
} from './native_impact_type2_geometry';
import type { Mir4NativeTotemRuntimeContactPlan } from './native_skill_totem_runtime';

interface TotemCandidate {
  readonly entity: Entity;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radiusYards: number;
}

/**
 * Rebuild the durable entity's PvE target list at each contact. The preserved
 * server selects in host-zone iteration order rather than nearest-distance
 * order; unresolved player-affiliation rules deliberately fail closed.
 */
export function mir4NativeTotemContactTargets(
  ctx: SimContext,
  owner: Entity,
  origin: Mir4NativeImpactType2CircleOrigin,
  contact: Mir4NativeTotemRuntimeContactPlan,
): Entity[] {
  const candidates: TotemCandidate[] = [];
  for (const entity of ctx.entities.values()) {
    if (entity.kind !== 'mob' || entity.ownerId !== null || entity.id === owner.id) continue;
    candidates.push({
      entity,
      x: entity.pos.x,
      y: entity.pos.y,
      z: entity.pos.z,
      radiusYards: PLAYER_BODY_RADIUS,
    });
  }

  return selectMir4NativeImpactType2CircleCandidates(
    {
      attackId: contact.attackId,
      radiusMinYards: contact.area.radiusMinYards,
      radiusMaxYards: contact.area.radiusMaxYards,
      heightYards: contact.area.heightYards,
      targetCap: contact.area.targetCap,
      forwardOffsetYards: 0,
    },
    origin,
    candidates,
    (candidate) => !candidate.entity.dead && ctx.isHostileTo(owner, candidate.entity),
  ).map((candidate) => candidate.entity);
}
