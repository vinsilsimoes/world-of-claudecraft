import type { Mir4SkillEffect } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';

const BROWSER_PIXELS_PER_YARD = 16;

interface Point2d {
  x: number;
  z: number;
}

function castForward(attacker: Entity, primary: Entity): Point2d {
  const dx = primary.pos.x - attacker.pos.x;
  const dz = primary.pos.z - attacker.pos.z;
  const length = Math.hypot(dx, dz);
  if (length > 0.0001) return { x: dx / length, z: dz / length };
  return { x: Math.sin(attacker.facing), z: Math.cos(attacker.facing) };
}

function circularCenter(
  attacker: Entity,
  primary: Entity,
  effect: Mir4SkillEffect,
  forward: Point2d,
): Point2d {
  switch (effect.areaOrigin ?? 'target') {
    case 'actor':
      return attacker.pos;
    case 'forward': {
      const offset = Number(effect.areaForwardOffsetPx ?? 0) / BROWSER_PIXELS_PER_YARD;
      return {
        x: attacker.pos.x + forward.x * offset,
        z: attacker.pos.z + forward.z * offset,
      };
    }
    default:
      return primary.pos;
  }
}

/**
 * Selects deterministic hostile secondary targets inside the authored skill footprint.
 * The already-resolved primary is never re-admitted. Line of sight is checked only
 * after the inexpensive geometry rejection, preserving the combat selector contract.
 */
export function mir4AreaSecondaryTargets(
  ctx: SimContext,
  attacker: Entity,
  primary: Entity,
  effect: Mir4SkillEffect,
  maxTargets: number,
): Entity[] {
  const shape = effect.areaShape ?? 'circle';
  const forward = castForward(attacker, primary);
  const center = circularCenter(attacker, primary, effect, forward);
  const radius = Number(effect.areaRadiusPx ?? 0) / BROWSER_PIXELS_PER_YARD;
  const radiusSq = radius * radius;
  const stripLength = Number(effect.areaLengthPx ?? 0) / BROWSER_PIXELS_PER_YARD;
  const stripHalfWidth = Number(effect.areaWidthPx ?? 0) / BROWSER_PIXELS_PER_YARD / 2;
  const found: Array<{ entity: Entity; distance: number }> = [];

  for (const entity of ctx.entities.values()) {
    if (
      entity.id === attacker.id ||
      entity.id === primary.id ||
      (entity.kind !== 'mob' && entity.kind !== 'player') ||
      entity.dead
    ) {
      continue;
    }

    const fromActorX = entity.pos.x - attacker.pos.x;
    const fromActorZ = entity.pos.z - attacker.pos.z;
    let distance: number;
    if (shape === 'frontal-strip') {
      const forwardDistance = fromActorX * forward.x + fromActorZ * forward.z;
      const lateralDistance = Math.abs(fromActorX * forward.z - fromActorZ * forward.x);
      if (
        forwardDistance < 0 ||
        forwardDistance > stripLength ||
        lateralDistance > stripHalfWidth
      ) {
        continue;
      }
      distance = Math.hypot(fromActorX, fromActorZ);
    } else {
      const dx = entity.pos.x - center.x;
      const dz = entity.pos.z - center.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > radiusSq) continue;
      distance = Math.sqrt(distanceSq);
    }

    if (!ctx.isHostileTo(attacker, entity) || !ctx.hasLineOfSight(attacker, entity)) continue;
    found.push({ entity, distance });
  }

  found.sort((a, b) =>
    a.distance === b.distance ? a.entity.id - b.entity.id : a.distance - b.distance,
  );
  return found.slice(0, maxTargets).map(({ entity }) => entity);
}
