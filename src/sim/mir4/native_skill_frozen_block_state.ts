import type { Entity } from '../types';

export const MIR4_FROZEN_BLOCK_AURA_ID = 'mir4_frozen_block';

export function mir4FrozenBlockActive(entity: Pick<Entity, 'auras'>): boolean {
  return entity.auras.some(
    (aura) => aura.id === MIR4_FROZEN_BLOCK_AURA_ID && aura.kind === 'stasis' && aura.remaining > 0,
  );
}
