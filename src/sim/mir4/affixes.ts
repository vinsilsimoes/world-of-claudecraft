// The mir4 enchantment/blessing layers (Phase 4.2/4.3): enchantment rolls 2
// affixes for 1 Selo Lunar, blessing rolls 3 for 1 Lágrima da Aurora at a 0.7x
// value multiplier. Every roll goes to a pending preview the player accepts or
// refuses by rollId (stale previews fail closed). Ratings scale by level band,
// tier, and grade. Slot pools use weighted, mutually competing build families.

import type { Mir4EquipmentItemDef } from '../content/mir4/equipment_catalog';
import { mir4EquipmentDefinition } from '../content/mir4/items';
import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import {
  MIR4_EMPTY_MATERIALS,
  MIR4_SPECIAL_AFFIX_STATUS_IDS,
  type Mir4EquipmentInstanceState,
  mir4OwnsEquipmentItem,
} from './equipment';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';
import { markMir4WireDirty } from './wire_revision';

/** The Aeldrune affix table and its build-path metadata. */
export type Mir4AffixFamily =
  | 'power'
  | 'precision'
  | 'critical'
  | 'penetration'
  | 'control'
  | 'basic'
  | 'skill'
  | 'context'
  | 'defense'
  | 'tenacity'
  | 'sustain'
  | 'tempo';

export type Mir4AffixSlotKind = 'weapon' | 'accessory' | 'armor';

export interface Mir4AffixDef {
  key: string;
  label: string;
  statusId: number;
  unit: 'rating' | 'basis-points';
  min: number;
  max: number;
  /** One affix from each family can occupy a layer. This makes paths compete. */
  family: Mir4AffixFamily;
  /** Relative probability inside an eligible slot pool. */
  weight: number;
  slots: readonly Mir4AffixSlotKind[];
}

export const MIR4_AFFIXES: Readonly<Record<string, Mir4AffixDef>> = Object.freeze({
  physicalAttack: {
    key: 'physicalAttack',
    label: 'Ataque físico',
    statusId: 20,
    unit: 'rating',
    min: 2,
    max: 4,
    family: 'power',
    weight: 6,
    slots: ['weapon', 'accessory'],
  },
  magicAttack: {
    key: 'magicAttack',
    label: 'Ataque mágico',
    statusId: 22,
    unit: 'rating',
    min: 2,
    max: 4,
    family: 'power',
    weight: 6,
    slots: ['weapon', 'accessory'],
  },
  physicalDefense: {
    key: 'physicalDefense',
    label: 'Defesa física',
    statusId: 24,
    unit: 'rating',
    min: 2,
    max: 5,
    family: 'defense',
    weight: 6,
    slots: ['accessory', 'armor'],
  },
  magicDefense: {
    key: 'magicDefense',
    label: 'Defesa mágica',
    statusId: 26,
    unit: 'rating',
    min: 2,
    max: 5,
    family: 'defense',
    weight: 6,
    slots: ['accessory', 'armor'],
  },
  accuracy: {
    key: 'accuracy',
    label: 'Acerto',
    statusId: 28,
    unit: 'rating',
    min: 1,
    max: 3,
    family: 'precision',
    weight: 4,
    slots: ['weapon', 'accessory'],
  },
  dodge: {
    key: 'dodge',
    label: 'Esquiva',
    statusId: 29,
    unit: 'rating',
    min: 1,
    max: 3,
    family: 'precision',
    weight: 4,
    slots: ['accessory', 'armor'],
  },
  critical: {
    key: 'critical',
    label: 'Crítico',
    statusId: 30,
    unit: 'rating',
    min: 1,
    max: 2,
    family: 'critical',
    weight: 3,
    slots: ['weapon', 'accessory'],
  },
  criticalDefense: {
    key: 'criticalDefense',
    label: 'Defesa crítica',
    statusId: 31,
    unit: 'rating',
    min: 1,
    max: 2,
    family: 'critical',
    weight: 3,
    slots: ['accessory', 'armor'],
  },
  criticalDamage: {
    key: 'criticalDamage',
    label: 'Dano crítico',
    statusId: 32,
    unit: 'rating',
    min: 1,
    max: 2,
    family: 'critical',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  criticalDamageReduction: {
    key: 'criticalDamageReduction',
    label: 'Redução de dano crítico',
    statusId: 33,
    unit: 'rating',
    min: 1,
    max: 2,
    family: 'critical',
    weight: 2,
    slots: ['accessory', 'armor'],
  },
  penetration: {
    key: 'penetration',
    label: 'Perfuração',
    statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration,
    unit: 'basis-points',
    min: 25,
    max: 60,
    family: 'penetration',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  penetrationDefense: {
    key: 'penetrationDefense',
    label: 'Defesa contra perfuração',
    statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense,
    unit: 'basis-points',
    min: 25,
    max: 60,
    family: 'penetration',
    weight: 2,
    slots: ['accessory', 'armor'],
  },
  stunSuccess: {
    key: 'stunSuccess',
    label: 'Sucesso de atordoamento',
    statusId: 48,
    unit: 'basis-points',
    min: 50,
    max: 150,
    family: 'control',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  debilitationSuccess: {
    key: 'debilitationSuccess',
    label: 'Sucesso de debilitação',
    statusId: 50,
    unit: 'basis-points',
    min: 50,
    max: 150,
    family: 'control',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  silenceSuccess: {
    key: 'silenceSuccess',
    label: 'Sucesso de silêncio',
    statusId: 52,
    unit: 'basis-points',
    min: 50,
    max: 150,
    family: 'control',
    weight: 1,
    slots: ['accessory'],
  },
  stunResistance: {
    key: 'stunResistance',
    label: 'Resistência a atordoamento',
    statusId: 49,
    unit: 'basis-points',
    min: 50,
    max: 150,
    family: 'tenacity',
    weight: 3,
    slots: ['accessory', 'armor'],
  },
  debilitationResistance: {
    key: 'debilitationResistance',
    label: 'Resistência a debilitação',
    statusId: 51,
    unit: 'basis-points',
    min: 50,
    max: 150,
    family: 'tenacity',
    weight: 3,
    slots: ['accessory', 'armor'],
  },
  silenceResistance: {
    key: 'silenceResistance',
    label: 'Resistência a silêncio',
    statusId: 53,
    unit: 'basis-points',
    min: 50,
    max: 150,
    family: 'tenacity',
    weight: 2,
    slots: ['accessory', 'armor'],
  },
  maxHp: {
    key: 'maxHp',
    label: 'HP máximo',
    statusId: 1,
    unit: 'rating',
    min: 8,
    max: 16,
    family: 'sustain',
    weight: 4,
    slots: ['armor'],
  },
  hpDrain: {
    key: 'hpDrain',
    label: 'Dreno de HP',
    statusId: 80,
    unit: 'basis-points',
    min: 10,
    max: 35,
    family: 'sustain',
    weight: 2,
    slots: ['accessory'],
  },
  mpDrain: {
    key: 'mpDrain',
    label: 'Dreno de MP',
    statusId: 81,
    unit: 'basis-points',
    min: 10,
    max: 35,
    family: 'sustain',
    weight: 2,
    slots: ['accessory'],
  },
  potionEffect: {
    key: 'potionEffect',
    label: 'Efeito de poção de HP',
    statusId: 146,
    unit: 'basis-points',
    min: 100,
    max: 250,
    family: 'sustain',
    weight: 2,
    slots: ['armor'],
  },
  manaPotionEffect: {
    key: 'manaPotionEffect',
    label: 'Efeito de poção de MP',
    statusId: 147,
    unit: 'basis-points',
    min: 100,
    max: 250,
    family: 'sustain',
    weight: 2,
    slots: ['armor'],
  },
  cooldownReduction: {
    key: 'cooldownReduction',
    label: 'Redução de recarga',
    statusId: 95,
    unit: 'basis-points',
    min: 50,
    max: 150,
    family: 'tempo',
    weight: 2,
    slots: ['accessory'],
  },
  basicAttackDamage: {
    key: 'basicAttackDamage',
    label: 'Dano de ataque básico',
    statusId: 143,
    unit: 'basis-points',
    min: 60,
    max: 180,
    family: 'basic',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  basicDamageReduction: {
    key: 'basicDamageReduction',
    label: 'Redução de dano básico',
    statusId: 160,
    unit: 'basis-points',
    min: 60,
    max: 180,
    family: 'basic',
    weight: 2,
    slots: ['armor'],
  },
  skillDamage: {
    key: 'skillDamage',
    label: 'Dano de habilidade',
    statusId: 44,
    unit: 'basis-points',
    min: 60,
    max: 180,
    family: 'skill',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  skillDamageReduction: {
    key: 'skillDamageReduction',
    label: 'Redução de dano de habilidade',
    statusId: 45,
    unit: 'basis-points',
    min: 60,
    max: 180,
    family: 'skill',
    weight: 2,
    slots: ['armor'],
  },
  bossDamage: {
    key: 'bossDamage',
    label: 'Dano contra chefes',
    statusId: 41,
    unit: 'basis-points',
    min: 80,
    max: 220,
    family: 'context',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  monsterDamage: {
    key: 'monsterDamage',
    label: 'Dano contra monstros',
    statusId: 40,
    unit: 'basis-points',
    min: 80,
    max: 220,
    family: 'context',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  pvpDamage: {
    key: 'pvpDamage',
    label: 'Dano PvP',
    statusId: 38,
    unit: 'basis-points',
    min: 80,
    max: 220,
    family: 'context',
    weight: 2,
    slots: ['weapon', 'accessory'],
  },
  monsterDamageReduction: {
    key: 'monsterDamageReduction',
    label: 'Redução de dano de monstros',
    statusId: 42,
    unit: 'basis-points',
    min: 80,
    max: 220,
    family: 'context',
    weight: 2,
    slots: ['armor'],
  },
  bossDamageReduction: {
    key: 'bossDamageReduction',
    label: 'Redução de dano de chefes',
    statusId: 43,
    unit: 'basis-points',
    min: 80,
    max: 220,
    family: 'context',
    weight: 2,
    slots: ['armor'],
  },
  pvpDamageReduction: {
    key: 'pvpDamageReduction',
    label: 'Redução de dano PvP',
    statusId: 39,
    unit: 'basis-points',
    min: 80,
    max: 220,
    family: 'context',
    weight: 2,
    slots: ['armor'],
  },
});

/** The class's attack affix keys (hybrid classes get both). */
function classAttackAffixes(classId: number): string[] {
  if (classId === 1 || classId === 4) return ['physicalAttack'];
  if (classId === 2) return ['magicAttack'];
  return ['physicalAttack', 'magicAttack'];
}

function slotKind(equipSlot: number): Mir4AffixSlotKind {
  if (equipSlot === 1) return 'weapon';
  return equipSlot >= 5 ? 'armor' : 'accessory';
}

/** Eligible definitions for one class and slot, with weight metadata intact. */
export function mir4AffixPoolFor(classId: number, equipSlot: number): readonly Mir4AffixDef[] {
  const kind = slotKind(equipSlot);
  const classAttacks = new Set(classAttackAffixes(classId));
  return Object.values(MIR4_AFFIXES).filter((def) => {
    if (!def.slots.includes(kind)) return false;
    if (def.family !== 'power') return true;
    return classAttacks.has(def.key);
  });
}

/**
 * Rollback bridge for the first build-diversity release. This release teaches
 * persistence and combat about every V2 status, but live rolls stay inside the
 * status ids understood by the previous production binary. A later release may
 * switch the roller to mir4AffixPoolFor after this bridge is the rollback floor.
 */
export function mir4RollbackBridgeAffixPoolFor(
  classId: number,
  equipSlot: number,
): readonly Mir4AffixDef[] {
  const definitions = new Map<string, Mir4AffixDef>();
  for (const selectionKey of mir4RollbackBridgeAffixKeysFor(classId, equipSlot)) {
    const definition = rollbackBridgeAffixDefinition(selectionKey, equipSlot);
    if (definition) definitions.set(definition.key, definition);
  }
  return [...definitions.values()];
}

/**
 * Exact production-v0.1 pool, including duplicate weights and ordering.
 * Keeping this list intact preserves both the rollback wire format and the
 * shared RNG draw stream. The expanded family pool above is staged until the
 * build-diversity release itself becomes the rollback floor.
 */
export function mir4RollbackBridgeAffixKeysFor(classId: number, equipSlot: number): string[] {
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

/**
 * Keep both legacy accessory selection identities until de-duplication is
 * complete, then map their shared rollback id to the slot's one unambiguous
 * semantic channel.
 */
function rollbackBridgeAffixDefinition(
  selectionKey: string,
  equipSlot: number,
): Mir4AffixDef | undefined {
  if (selectionKey !== 'penetration' && selectionKey !== 'penetrationDefense') {
    return MIR4_AFFIXES[selectionKey];
  }
  const semanticKey = equipSlot === 1 || equipSlot === 3 ? 'penetration' : 'penetrationDefense';
  return MIR4_AFFIXES[semanticKey];
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

/** Roll `count` unique selection identities from the slot pool. */
function rollAffixes(
  ctx: SimContext,
  classId: number,
  item: Mir4EquipmentItemDef,
  playerLevel: number,
  count: number,
  multiplier: number,
): { key: string; statusId: number; value: number }[] {
  const pool = mir4RollbackBridgeAffixKeysFor(classId, item.equipSlot);
  const selected: { key: string; statusId: number; value: number }[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (selected.length < count && guard < 100) {
    guard += 1;
    const selectionKey = pool[randInt(ctx, pool.length)];
    if (!selectionKey || seen.has(selectionKey)) continue;
    seen.add(selectionKey);
    const def = rollbackBridgeAffixDefinition(selectionKey, item.equipSlot);
    if (!def) break;
    selected.push({
      key: def.key,
      statusId: def.statusId,
      value: affixValue(ctx, def, item, playerLevel, multiplier),
    });
  }
  if (selected.length !== count) throw new Error('affix pool could not produce unique results');
  return selected;
}

export type Mir4LayerKind = 'enchantment' | 'blessing';

export type Mir4LayerRoll =
  | { ok: true; rollId: string; affixes: { key: string; statusId: number; value: number }[] }
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
    affixes: affixes.map(
      (a) =>
        [
          a.statusId === MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration ||
          a.statusId === MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense
            ? 0
            : a.statusId,
          a.value,
        ] as const,
    ),
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
          meta.mir4Codex,
          meta.mir4ArcRewards?.items,
          meta.mir4Training,
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
