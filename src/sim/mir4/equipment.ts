// The mir4 slice equipment verbs: equip/unequip against the profile-scoped
// registry (src/sim/content/mir4/items.ts), with the stat application living
// in recalcMir4PlayerStats so level-ups and restores can never desync gear.
// Slice acquisition is direct (the starter weapon); drops, the shared
// inventory surface, and refinement/enchant/blessing layers are the Phase 4
// equipment port.

import { MIR4_ITEMS } from '../content/mir4/items';
import type { SimContext } from '../sim_context';
import type { Entity, PlayerClass } from '../types';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';

/** The mir4 equipment bag on PlayerMeta (runtime this slice; Phase 4 persists). */
export interface Mir4Equipment {
  weapon?: number;
}

/** Re-derive the entity's stats after any equipment change (single funnel). */
function recalcFor(ctx: SimContext, pid: number): Entity | null {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return null;
  recalcMir4PlayerStats(p, mir4RecalcClassOf(p), p.level, meta.mir4Equipment);
  return p;
}

export function mir4EquipStarterWeapon(ctx: SimContext, pid: number): string {
  const meta = ctx.players.get(pid);
  if (!meta) return 'You cannot do that right now.';
  if (meta.mir4Equipment?.weapon === 200201000) return 'Already equipped.';
  meta.mir4Equipment = { ...meta.mir4Equipment, weapon: 200201000 };
  recalcFor(ctx, pid);
  return 'Starter weapon equipped.';
}

export function mir4UnequipWeapon(ctx: SimContext, pid: number): string {
  const meta = ctx.players.get(pid);
  if (!meta?.mir4Equipment?.weapon) return 'Nothing equipped.';
  delete meta.mir4Equipment.weapon;
  recalcFor(ctx, pid);
  return 'Weapon unequipped.';
}

/** The equipped weapon's applied attribute pairs (empty when bare-handed). */
export function mir4WeaponAttributes(
  equipment: Mir4Equipment | undefined,
): readonly (readonly [number, number])[] {
  const weapon = equipment?.weapon;
  if (weapon === undefined) return [];
  return MIR4_ITEMS[weapon]?.attributes ?? [];
}
