import { MIR4_CLASS_IDS, type Mir4ClassId } from './classes';
import { MIR4_EQUIPMENT_CATALOG, type Mir4EquipmentItemDef } from './equipment_catalog';

export interface Mir4ItemProgressionRank {
  readonly catalogRank: number;
  readonly rarity: Mir4EquipmentRarity;
  readonly metal: Mir4EquipmentMetal;
  readonly metalCount: 50;
  readonly darksteelCost: number;
  readonly previousCatalogRank: number | null;
  readonly itemsByClass: Readonly<Record<Mir4ClassId, readonly Mir4EquipmentItemDef[]>>;
  readonly previousItemsByClass: Readonly<Record<Mir4ClassId, readonly Mir4EquipmentItemDef[]>>;
}

export type Mir4EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type Mir4EquipmentMetal =
  | 'metalCommon'
  | 'metalUncommon'
  | 'metalRare'
  | 'metalEpic'
  | 'metalLegendary'
  | 'metalMythic';

const RARITY_BY_RANK: readonly Mir4EquipmentRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
] as const;

const METAL_BY_RANK: readonly Mir4EquipmentMetal[] = [
  'metalCommon',
  'metalUncommon',
  'metalRare',
  'metalEpic',
  'metalLegendary',
  'metalMythic',
] as const;

const DARKSTEEL_BY_RANK = [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000] as const;

// Crafting is never level-gated, but equipping a traded or lucky-drop item is.
// Stretch the six finished-item ranks across Aeldrune's full level-200 arc.
const REQUIRED_LEVEL_BY_RANK = [1, 30, 70, 120, 160, 200] as const;

function itemsForClassAndRank(
  classId: Mir4ClassId,
  catalogRank: number,
): readonly Mir4EquipmentItemDef[] {
  const items = MIR4_EQUIPMENT_CATALOG.filter(
    (item) => item.classId === classId && item.catalogRank === catalogRank,
  ).sort((left, right) => left.equipSlot - right.equipSlot);
  if (items.length !== 8) {
    throw new Error(
      `MIR4 equipment rank ${catalogRank} class ${classId} must contain exactly 8 items`,
    );
  }
  return Object.freeze(items);
}

function progressionRank(catalogRank: number): Mir4ItemProgressionRank {
  const rarity = RARITY_BY_RANK[catalogRank - 1];
  const metal = METAL_BY_RANK[catalogRank - 1];
  const darksteelCost = DARKSTEEL_BY_RANK[catalogRank - 1];
  if (!rarity || !metal || darksteelCost === undefined) {
    throw new Error(`MIR4 equipment progression rank ${catalogRank} is incomplete`);
  }
  const previousCatalogRank = catalogRank > 1 ? catalogRank - 1 : null;
  const itemsByClass = Object.freeze(
    Object.fromEntries(
      MIR4_CLASS_IDS.map((classId) => [classId, itemsForClassAndRank(classId, catalogRank)]),
    ) as Record<Mir4ClassId, readonly Mir4EquipmentItemDef[]>,
  );
  const previousItemsByClass = Object.freeze(
    Object.fromEntries(
      MIR4_CLASS_IDS.map((classId) => [
        classId,
        previousCatalogRank === null ? [] : itemsForClassAndRank(classId, previousCatalogRank),
      ]),
    ) as Record<Mir4ClassId, readonly Mir4EquipmentItemDef[]>,
  );
  return Object.freeze({
    catalogRank,
    rarity,
    metal,
    metalCount: 50,
    darksteelCost,
    previousCatalogRank,
    itemsByClass,
    previousItemsByClass,
  });
}

/** Canonical class-specific equipment progression, from the imported 240-item catalogue. */
export const MIR4_ITEM_PROGRESSION_RANKS: readonly Mir4ItemProgressionRank[] = Object.freeze(
  Array.from({ length: 6 }, (_, index) => progressionRank(index + 1)),
);

export function mir4ItemProgressionRank(catalogRank: number): Mir4ItemProgressionRank | null {
  return MIR4_ITEM_PROGRESSION_RANKS.find((rank) => rank.catalogRank === catalogRank) ?? null;
}

export function mir4EquipmentRarityForRank(catalogRank: number): Mir4EquipmentRarity | null {
  return mir4ItemProgressionRank(catalogRank)?.rarity ?? null;
}

export function mir4EquipmentRequiredLevelForRank(catalogRank: number): number {
  return REQUIRED_LEVEL_BY_RANK[catalogRank - 1] ?? Number.POSITIVE_INFINITY;
}
