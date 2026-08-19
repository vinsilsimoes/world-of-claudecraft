// The mir4 equipment system (Phase 4): the full 8-slot bag against the
// generated 240-item catalog, the enhancement (+0..+15) with the exact source
// success table, destruction above +5 without protection, the Amparo Solar
// ward, and the enchantment/blessing layers (roll -> preview -> resolve).
// Stat application stays in recalcMir4PlayerStats (single funnel). Materials
// ride the runtime wallet (mir4Materials on PlayerMeta) until the shared
// inventory surface lands; every verb validates class/slot/level server-side.

import {
  MIR4_EQUIPMENT_CATALOG,
  type Mir4EquipmentItemDef,
  mir4EquipmentItem,
} from '../content/mir4/equipment_catalog';
import { MIR4_ITEMS } from '../content/mir4/items';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';

/** The full slot bag: source equip slots 1..8 keyed by number. */
export interface Mir4Equipment {
  weapon?: number;
  [slot: number]: number | undefined;
}

/** Per-item equipment state: enhancement level and the rolled layers. */
export interface Mir4EquipmentInstanceState {
  itemId: number;
  enhancement: number;
  /** Pending enchantment/blessing roll awaiting resolve (one at a time). */
  pendingRoll?: {
    layer: 'enchantment' | 'blessing';
    affixes: readonly (readonly [number, number])[];
  };
  affixes?: {
    enchantment?: readonly (readonly [number, number])[];
    blessing?: readonly (readonly [number, number])[];
  };
  destroyed?: boolean;
}

/** The material wallet (runtime until the shared inventory lands). */
export interface Mir4Materials {
  sunStone: number;
  moonStone: number;
  solarScroll: number;
  lunarSeal: number;
  dawnTear: number;
  solarWard: number;
}

export const MIR4_EMPTY_MATERIALS: Mir4Materials = {
  sunStone: 0,
  moonStone: 0,
  solarScroll: 0,
  lunarSeal: 0,
  dawnTear: 0,
  solarWard: 0,
};

/** The source's sealed enhancement table (bps per target level 1..15). */
export const MIR4_ENHANCEMENT_SUCCESS_BPS: Readonly<Record<number, number>> = {
  1: 100_000,
  2: 100_000,
  3: 100_000,
  4: 100_000,
  5: 100_000,
  6: 50_000,
  7: 40_000,
  8: 30_000,
  9: 25_000,
  10: 10_000,
  11: 10_000,
  12: 10_000,
  13: 10_000,
  14: 10_000,
  15: 10_000,
};

/** Cumulative stat bonus percent per enhancement level (index = level). */
export const MIR4_ENHANCEMENT_CUMULATIVE_PERCENT: readonly number[] = [
  0, 3, 6, 9, 12, 15, 19, 23, 27, 31, 36, 41, 46, 51, 56, 61,
];

/** The source's per-slot stat multiplier for enhancement bonuses. */
export function mir4EnhancementMultiplierFor(equipSlot: number, statusId: number): number {
  if (equipSlot === 1) return statusId === 20 || statusId === 22 ? 1 : 0.5;
  if (equipSlot >= 5) return statusId === 24 || statusId === 26 ? 1 : 0.5;
  return statusId === 20 || statusId === 22 || statusId === 24 || statusId === 26 ? 0.65 : 0.35;
}

/** Materials by item id (the source MATERIALS map). */
export const MIR4_MATERIAL_IDS = {
  sunStone: 990100001,
  moonStone: 990100002,
  solarScroll: 990100003,
  lunarSeal: 990100004,
  dawnTear: 990100005,
  solarWard: 990100006,
} as const;

/** Re-derive the entity's stats after any equipment change (single funnel). */
function recalcFor(ctx: SimContext, pid: number): Entity | null {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return null;
  recalcMir4PlayerStats(
    p,
    mir4RecalcClassOf(p),
    p.level,
    meta.mir4Equipment,
    meta.mir4EquipmentInstances,
  );
  return p;
}

function instanceFor(
  meta: { mir4EquipmentInstances?: Record<number, Mir4EquipmentInstanceState> },
  itemId: number,
): Mir4EquipmentInstanceState {
  let inst = meta.mir4EquipmentInstances?.[itemId];
  if (!inst) {
    inst = { itemId, enhancement: 0 };
    meta.mir4EquipmentInstances = { ...meta.mir4EquipmentInstances, [itemId]: inst };
  }
  return inst;
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

/** Equip any catalog item into its source slot, validating class and level. */
export function mir4EquipItem(ctx: SimContext, pid: number, itemId: number): string {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return 'You cannot do that right now.';
  const def = mir4EquipmentItem(itemId);
  if (!def) return 'Unknown item.';
  if (def.classId !== p.mir4?.classId) return 'Your class cannot use this.';
  if (p.level < def.requiredLevel) return 'Your level is too low.';
  meta.mir4Equipment = { ...meta.mir4Equipment, [def.equipSlot]: itemId };
  instanceFor(meta, itemId);
  recalcFor(ctx, pid);
  return `${def.name} equipped.`;
}

export function mir4UnequipSlot(ctx: SimContext, pid: number, equipSlot: number): string {
  const meta = ctx.players.get(pid);
  if (meta?.mir4Equipment?.[equipSlot] === undefined) return 'Nothing equipped.';
  delete meta.mir4Equipment[equipSlot];
  recalcFor(ctx, pid);
  return 'Unequipped.';
}

export type Mir4EnhanceOutcome =
  | { ok: true; level: number; destroyed: boolean; protected: boolean }
  | { ok: false; code: 'unknown-item' | 'not-enhanceable' | 'max-level' | 'no-materials' };

/**
 * The enhancement attempt: 1 Solar Scroll per try; above +5 an unwarded
 * failure DESTROYS the item, a ward is consumed to save it. The roll draws
 * from the shared rng (deterministic across hosts).
 */
export function mir4Enhance(ctx: SimContext, pid: number, itemId: number): Mir4EnhanceOutcome {
  const meta = ctx.players.get(pid);
  if (!meta) return { ok: false, code: 'unknown-item' };
  const def = mir4EquipmentItem(itemId);
  if (!def) return { ok: false, code: 'unknown-item' };
  if (!def.enhanceable) return { ok: false, code: 'not-enhanceable' };
  const inst = instanceFor(meta, itemId);
  if (inst.destroyed) return { ok: false, code: 'unknown-item' };
  if (inst.enhancement >= def.maxEnhancementLevel) return { ok: false, code: 'max-level' };
  const wallet = (meta.mir4Materials ??= { ...MIR4_EMPTY_MATERIALS });
  if (wallet.solarScroll < 1) return { ok: false, code: 'no-materials' };
  wallet.solarScroll -= 1;
  const target = inst.enhancement + 1;
  const chanceBps = MIR4_ENHANCEMENT_SUCCESS_BPS[target] ?? 100_000;
  const roll = Math.floor(ctx.rng.next() * 100_000);
  if (roll < chanceBps) {
    inst.enhancement = target;
    if (isEquipped(meta, itemId)) recalcFor(ctx, pid);
    return { ok: true, level: target, destroyed: false, protected: false };
  }
  if (target > 5) {
    if (wallet.solarWard >= 1) {
      wallet.solarWard -= 1;
      return { ok: true, level: inst.enhancement, destroyed: false, protected: true };
    }
    inst.destroyed = true;
    const bag = meta.mir4Equipment ?? {};
    for (const slot of Object.keys(bag)) {
      if (bag[Number(slot)] === itemId) delete bag[Number(slot)];
    }
    recalcFor(ctx, pid);
    return { ok: true, level: inst.enhancement, destroyed: true, protected: false };
  }
  return { ok: true, level: inst.enhancement, destroyed: false, protected: false };
}

function isEquipped(meta: { mir4Equipment?: Mir4Equipment }, itemId: number): boolean {
  return Object.values(meta.mir4Equipment ?? {}).includes(itemId);
}

/** The applied attribute pairs of one item: base + enhancement % + layer affixes. */
export function mir4ItemAttributes(
  def: Mir4EquipmentItemDef,
  inst: Mir4EquipmentInstanceState | undefined,
): readonly (readonly [number, number])[] {
  const out: [number, number][] = [];
  const level = inst?.enhancement ?? 0;
  const cumul = MIR4_ENHANCEMENT_CUMULATIVE_PERCENT[level] ?? 0;
  for (const [statusId, base] of def.baseAttributes) {
    const slotMult = mir4EnhancementMultiplierFor(def.equipSlot, statusId);
    const bonus = Math.floor((base * cumul * slotMult) / 100);
    out.push([statusId, base + bonus]);
  }
  for (const layer of ['enchantment', 'blessing'] as const) {
    for (const affix of inst?.affixes?.[layer] ?? []) out.push([affix[0], affix[1]]);
  }
  return out;
}

/** Every equipped item's applied attributes (all slots, destroyed excluded). */
export function mir4EquippedAttributes(
  equipment: Mir4Equipment | undefined,
  instances: Record<number, Mir4EquipmentInstanceState> | undefined,
): readonly (readonly [number, number])[] {
  const out: [number, number][] = [];
  for (const id of Object.values(equipment ?? {})) {
    if (id === undefined) continue;
    if (id === 200201000) {
      // The native starter weapon keeps its verbatim pairs from items.ts.
      for (const attr of MIR4_ITEMS[200201000]?.attributes ?? []) out.push([attr[0], attr[1]]);
      continue;
    }
    const def = mir4EquipmentItem(id);
    if (!def) continue;
    if (instances?.[id]?.destroyed) continue;
    for (const attr of mir4ItemAttributes(def, instances?.[id])) out.push([attr[0], attr[1]]);
  }
  return out;
}

/** The equipped weapon's applied attribute pairs (legacy starter path). */
export function mir4WeaponAttributes(
  equipment: Mir4Equipment | undefined,
): readonly (readonly [number, number])[] {
  const weapon = equipment?.weapon;
  if (weapon === undefined) return [];
  return MIR4_ITEMS[weapon]?.attributes ?? [];
}

export const MIR4_EQUIPMENT_CATALOG_SIZE = MIR4_EQUIPMENT_CATALOG.length;
