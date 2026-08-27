import type { Entity } from '../types';
import { OPEN_WORLD_PVP_MIN_LEVEL } from './infamy';

export function pvpController(
  entities: ReadonlyMap<number, Entity>,
  entity: Entity | null,
): Entity | null {
  if (!entity) return null;
  if (entity.kind === 'player') return entity;
  if (entity.kind !== 'mob' || entity.ownerId === null) return null;
  const owner = entities.get(entity.ownerId);
  return owner?.kind === 'player' ? owner : null;
}

export function isOpenWorldPvpHostile(
  attacker: Entity,
  target: Entity,
  enabled: boolean,
  bothInOverworld: boolean,
  sameParty: boolean,
): boolean {
  return (
    enabled &&
    bothInOverworld &&
    !sameParty &&
    attacker.targetId === target.id &&
    attacker.level >= OPEN_WORLD_PVP_MIN_LEVEL &&
    target.level >= OPEN_WORLD_PVP_MIN_LEVEL
  );
}
