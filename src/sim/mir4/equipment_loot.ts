// Ready-made Aeldrune equipment drops. Crafting remains the deterministic
// progression route; field loot is a bounded jackpot route and can never
// produce legendary or mythic gear.

import type { Mir4ClassId } from '../content/mir4/classes';
import type { Mir4EquipmentItemDef } from '../content/mir4/equipment_catalog';
import { mir4ItemProgressionRank } from '../content/mir4/item_progression';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4OwnsEquipmentItem } from './equipment';
import { mir4ModifiedDropChance } from './status_effects';
import { markMir4WireDirty } from './wire_revision';

export const MIR4_EPIC_EQUIPMENT_DROP_CHANCE = 0.0000001;

// Only the two authored act-five climax encounters can roll a finished epic.
// Level alone is deliberately insufficient: incidental or repeatable guardians
// in the same level band must not become epic farms.
const MIR4_EPIC_EQUIPMENT_BOSS_PREFIXES = [
  'mir4_quest_m19-q06_4_',
  'mir4_quest_m20-q06_4_',
] as const;

export interface Mir4EquipmentDropRule {
  readonly catalogRank: 1 | 2 | 3 | 4;
  readonly minimumMobLevel: number;
  readonly normalChance: number;
  readonly eliteChance: number;
  readonly bossChance: number;
  readonly bossOnly: boolean;
}

/** Rarest first so one shared roll can award at most one ready-made item. */
export const MIR4_EQUIPMENT_DROP_RULES: readonly Mir4EquipmentDropRule[] = Object.freeze([
  {
    catalogRank: 4,
    minimumMobLevel: 181,
    normalChance: 0,
    eliteChance: 0,
    bossChance: MIR4_EPIC_EQUIPMENT_DROP_CHANCE,
    bossOnly: true,
  },
  {
    catalogRank: 3,
    minimumMobLevel: 70,
    normalChance: 0.00005,
    eliteChance: 0.0002,
    bossChance: 0.001,
    bossOnly: false,
  },
  {
    catalogRank: 2,
    minimumMobLevel: 30,
    normalChance: 0.001,
    eliteChance: 0.005,
    bossChance: 0.02,
    bossOnly: false,
  },
  {
    catalogRank: 1,
    minimumMobLevel: 1,
    normalChance: 0.01,
    eliteChance: 0.03,
    bossChance: 0.08,
    bossOnly: false,
  },
]);

export interface Mir4EquipmentDropSource {
  readonly level: number;
  readonly elite: boolean;
  readonly boss: boolean;
  readonly templateId?: string;
}

export function isMir4EpicEquipmentBoss(templateId: string | undefined): boolean {
  return MIR4_EPIC_EQUIPMENT_BOSS_PREFIXES.some((prefix) => templateId?.startsWith(prefix));
}

function baseChance(rule: Mir4EquipmentDropRule, source: Mir4EquipmentDropSource): number {
  if (source.level < rule.minimumMobLevel) return 0;
  if (rule.bossOnly && !source.boss) return 0;
  if (rule.catalogRank === 4 && !isMir4EpicEquipmentBoss(source.templateId)) return 0;
  if (source.boss) return rule.bossChance;
  return source.elite ? rule.eliteChance : rule.normalChance;
}

/** Resolve one shared 0..1 roll into one rank, or no equipment reward. */
export function mir4EquipmentDropRank(
  source: Mir4EquipmentDropSource,
  roll: number,
  modifyChance: (chance: number) => number = (chance) => chance,
): number | null {
  let threshold = 0;
  for (const rule of MIR4_EQUIPMENT_DROP_RULES) {
    threshold += Math.max(0, modifyChance(baseChance(rule, source)));
    if (roll < threshold) return rule.catalogRank;
  }
  return null;
}

export function mir4EquipmentDropCandidates(
  meta: PlayerMeta,
  classId: Mir4ClassId,
  catalogRank: number,
): readonly Mir4EquipmentItemDef[] {
  const rank = mir4ItemProgressionRank(catalogRank);
  return (rank?.itemsByClass[classId] ?? []).filter(
    (item) => !mir4OwnsEquipmentItem(meta, item.itemId),
  );
}

/** Roll and grant one missing class-specific item directly to the Aeldrune bag. */
export function rollMir4EquipmentDrop(
  ctx: SimContext,
  mob: Entity,
  meta: PlayerMeta,
): Mir4EquipmentItemDef | null {
  const player = ctx.entities.get(meta.entityId);
  const classId = player?.mir4?.classId as Mir4ClassId | undefined;
  if (!player || classId === undefined) return null;
  const catalogRank = mir4EquipmentDropRank(
    {
      level: mob.level,
      elite: mob.mobElite === true,
      boss: mob.mobBoss === true,
      templateId: mob.templateId,
    },
    ctx.rng.next(),
    (chance) => mir4ModifiedDropChance(chance, player.mir4?.statusValues),
  );
  if (catalogRank === null) return null;
  const candidates = mir4EquipmentDropCandidates(meta, classId, catalogRank);
  if (candidates.length === 0) return null;
  const item = candidates[ctx.rng.int(0, candidates.length - 1)];
  if (!item) return null;
  meta.mir4EquipmentInstances = {
    ...meta.mir4EquipmentInstances,
    [item.itemId]: { itemId: item.itemId, enhancement: 0 },
  };
  markMir4WireDirty(meta);
  ctx.emit({
    type: 'loot',
    text: `You receive: ${item.name}.`,
    pid: meta.entityId,
    lootOrigin: 'monster-drop',
  });
  return item;
}
