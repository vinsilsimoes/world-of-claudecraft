import type { Entity } from './types';

type CorpsePresenceEntity = Pick<Entity, 'kind' | 'dead' | 'lootable' | 'mir4CorpseVisible'>;

/**
 * Whether a dead mob still has a player-facing corpse interaction surface.
 * Classic corpses use `lootable`; MIR4 keeps a separate ten-second body marker
 * after kill loot has already been transferred into the eligible bags.
 */
export function corpseInteractionPresent(entity: CorpsePresenceEntity): boolean {
  return (
    entity.kind === 'mob' &&
    entity.dead &&
    (entity.lootable === true || entity.mir4CorpseVisible === true)
  );
}
