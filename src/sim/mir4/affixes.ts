// The mir4 enchantment/blessing layers (Phase 4.2/4.3), ported verbatim from
// the source's rollLayer/resolveLayer/rollAffixes: enchantment rolls 2 affixes
// for 1 Selo Lunar, blessing rolls 3 for 1 Lágrima da Aurora at a 0.7x value
// multiplier; every roll goes to a PENDING preview the player accepts or
// refuses by rollId (stale previews fail closed). Affix values follow the
// source's scale (level band + tier + grade for ratings; flat bps for the
// penetration pair), and the pool weights by slot exactly as shipped.

import type { Mir4EquipmentItemDef } from '../content/mir4/equipment_catalog';
import { mir4EquipmentDefinition } from '../content/mir4/items';
import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import {
  MIR4_EMPTY_MATERIALS,
  type Mir4EquipmentInstanceState,
  mir4OwnsEquipmentItem,
} from './equipment';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';
import { markMir4WireDirty } from './wire_revision';

/** The source's AFFIX table: key -> statusId/unit/min/max. */
export interface Mir4AffixDef {
  key: string;
  label: string;
  statusId: number | null;
  unit: 'rating' | 'basis-points';
  min: number;
  max: number;
}

export const MIR4_AFFIXES: Readonly<Record<string, Mir4AffixDef>> = Object.freeze({
  physicalAttack: {
    key: 'physicalAttack',
    label: 'Ataque físico',
    statusId: 20,
    unit: 'rating',
    min: 2,
    max: 4,
  },
  magicAttack: {
    key: 'magicAttack',
    label: 'Ataque mágico',
    statusId: 22,
    unit: 'rating',
    min: 2,
    max: 4,
  },
  physicalDefense: {
    key: 'physicalDefense',
    label: 'Defesa física',
    statusId: 24,
    unit: 'rating',
    min: 2,
    max: 5,
  },
  magicDefense: {
    key: 'magicDefense',
    label: 'Defesa mágica',
    statusId: 26,
    unit: 'rating',
    min: 2,
    max: 5,
  },
  accuracy: { key: 'accuracy', label: 'Acerto', statusId: 28, unit: 'rating', min: 1, max: 3 },
  dodge: { key: 'dodge', label: 'Esquiva', statusId: 29, unit: 'rating', min: 1, max: 3 },
  critical: { key: 'critical', label: 'Crítico', statusId: 30, unit: 'rating', min: 1, max: 2 },
  criticalDefense: {
    key: 'criticalDefense',
    label: 'Defesa crítica',
    statusId: 31,
    unit: 'rating',
    min: 1,
    max: 2,
  },
  penetration: {
    key: 'penetration',
    label: 'Perfuração',
    statusId: null,
    unit: 'basis-points',
    min: 25,
    max: 60,
  },
  penetrationDefense: {
    key: 'penetrationDefense',
    label: 'Defesa contra perfuração',
    statusId: null,
    unit: 'basis-points',
    min: 25,
    max: 60,
  },
});

/** The class's attack affix keys (hybrid classes get both). */
function classAttackAffixes(classId: number): string[] {
  if (classId === 1 || classId === 4) return ['physicalAttack'];
  if (classId === 2) return ['magicAttack'];
  return ['physicalAttack', 'magicAttack'];
}

/** The slot-weighted pool (weapon double-attacks; armor double-defenses). */
function affixPool(classId: number, equipSlot: number): string[] {
  const attacks = classAttackAffixes(classId);
  if (equipSlot === 1) {
    return [...attacks, ...attacks, 'accuracy', 'accuracy', 'critical', 'penetration'];
  }
  if (equipSlot >= 5) {
    return [
      'physicalDefense',
      'physicalDefense',
      'magicDefense',
      'magicDefense',
      'dodge',
      'criticalDefense',
      'penetrationDefense',
    ];
  }
  return [
    ...attacks,
    'physicalDefense',
    'magicDefense',
    'accuracy',
    'dodge',
    'critical',
    'criticalDefense',
    'penetration',
    'penetrationDefense',
  ];
}

/** One deterministic roll helper over the shared rng stream. */
function randInt(ctx: SimContext, span: number): number {
  return Math.min(span - 1, Math.floor(ctx.rng.next() * span));
}

/** The source's affixValue: bps flat, ratings scaled by band+tier+grade. */
function affixValue(
  ctx: SimContext,
  def: Mir4AffixDef,
  item: Mir4EquipmentItemDef,
  playerLevel: number,
  multiplier: number,
): number {
  if (def.unit === 'basis-points') {
    const span = def.max - def.min + 1;
    return Math.max(1, Math.round((def.min + randInt(ctx, span)) * multiplier));
  }
  const levelBand = Math.floor(Math.max(1, playerLevel) / 10);
  const scale = Math.max(1, 1 + levelBand + item.tier + item.grade);
  const raw = def.min + randInt(ctx, def.max - def.min + 1);
  return Math.max(1, Math.round(raw * scale * multiplier));
}

/** Roll `count` unique affixes from the slot pool (the source's loop). */
function rollAffixes(
  ctx: SimContext,
  classId: number,
  item: Mir4EquipmentItemDef,
  playerLevel: number,
  count: number,
  multiplier: number,
): { key: string; statusId: number | null; value: number }[] {
  const pool = affixPool(classId, item.equipSlot);
  const selected: { key: string; statusId: number | null; value: number }[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (selected.length < count && guard < 100) {
    guard += 1;
    const key = pool[randInt(ctx, pool.length)];
    if (seen.has(key)) continue;
    seen.add(key);
    const def = MIR4_AFFIXES[key];
    if (!def) continue;
    selected.push({
      key,
      statusId: def.statusId,
      value: affixValue(ctx, def, item, playerLevel, multiplier),
    });
  }
  if (selected.length !== count) throw new Error('affix pool could not produce unique results');
  return selected;
}

export type Mir4LayerKind = 'enchantment' | 'blessing';

export type Mir4LayerRoll =
  | { ok: true; rollId: string; affixes: { key: string; statusId: number | null; value: number }[] }
  | { ok: false; code: 'unknown-item' | 'not-enchantable' | 'preview-pending' | 'no-materials' };

export type Mir4LayerResolve =
  | { ok: true; accepted: boolean }
  | { ok: false; code: 'unknown-item' | 'preview-stale' };

/** Roll a layer's preview: consume the material, stash the pending affixes. */
export function mir4RollLayer(
  ctx: SimContext,
  pid: number,
  itemId: number,
  layer: Mir4LayerKind,
): Mir4LayerRoll {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return { ok: false, code: 'unknown-item' };
  const def = mir4EquipmentDefinition(itemId);
  if (!def) return { ok: false, code: 'unknown-item' };
  if (!mir4OwnsEquipmentItem(meta, itemId)) return { ok: false, code: 'unknown-item' };
  const enchantable = layer === 'enchantment' ? def.enchantable : def.blessable;
  if (!enchantable) return { ok: false, code: 'not-enchantable' };
  let inst: Mir4EquipmentInstanceState | undefined = meta.mir4EquipmentInstances?.[itemId];
  if (!inst) {
    inst = { itemId, enhancement: 0 };
    meta.mir4EquipmentInstances = { ...meta.mir4EquipmentInstances, [itemId]: inst };
    markMir4WireDirty(meta);
  }
  if (inst.destroyed) return { ok: false, code: 'unknown-item' };
  if (inst.pendingRoll) return { ok: false, code: 'preview-pending' };
  const wallet = meta.mir4Materials ?? { ...MIR4_EMPTY_MATERIALS };
  const material = layer === 'blessing' ? 'dawnTear' : 'lunarSeal';
  if (wallet[material] < 1) return { ok: false, code: 'no-materials' };
  meta.mir4Materials = wallet;
  wallet[material] -= 1;
  markMir4WireDirty(meta);
  const count = layer === 'blessing' ? 3 : 2;
  const multiplier = layer === 'blessing' ? 0.7 : 1;
  const affixes = rollAffixes(ctx, def.classId, def, p.level, count, multiplier);
  const rollId = `roll-${ctx.tickCount}-${itemId}-${layer}`;
  inst.pendingRoll = {
    rollId,
    layer,
    affixes: affixes.map((a) => [a.statusId ?? 0, a.value] as const),
  };
  return { ok: true, rollId, affixes };
}

/** Resolve the pending preview by rollId: accept replaces the layer, refuse keeps it. */
export function mir4ResolveLayer(
  ctx: SimContext,
  pid: number,
  itemId: number,
  layer: Mir4LayerKind,
  rollId: string,
  accept: boolean,
): Mir4LayerResolve {
  const meta = ctx.players.get(pid);
  if (!meta) return { ok: false, code: 'unknown-item' };
  const inst = meta.mir4EquipmentInstances?.[itemId];
  if (
    !inst?.pendingRoll ||
    inst.pendingRoll.rollId !== rollId ||
    inst.pendingRoll.layer !== layer
  ) {
    return { ok: false, code: 'preview-stale' };
  }
  if (accept) {
    inst.affixes = {
      ...inst.affixes,
      [layer]: inst.pendingRoll.affixes.map((a) => [...a] as [number, number]),
    };
    if (Object.values(meta.mir4Equipment ?? {}).includes(itemId)) {
      const player = ctx.entities.get(pid);
      if (player)
        recalcMir4PlayerStats(
          player,
          mir4RecalcClassOf(player),
          player.level,
          meta.mir4Equipment,
          meta.mir4EquipmentInstances,
          meta.mir4Spirits,
          meta.mir4Mounts,
        );
    }
  }
  inst.pendingRoll = undefined;
  markMir4WireDirty(meta);
  creditMir4ArcTutorialReceipt(meta, {
    kind: layer === 'enchantment' ? 'resolve-enchantment' : 'resolve-blessing',
  });
  return { ok: true, accepted: accept };
}
