import { MIR4_CLASS_IDS, type Mir4ClassId } from './classes';
import { MIR4_EQUIPMENT_CATALOG, type Mir4EquipmentItemDef } from './equipment_catalog';

export interface Mir4ItemProgressionRank {
  readonly catalogRank: number;
  readonly requiredLevel: number;
  readonly tier: number;
  readonly grade: number;
  readonly campaignQuestId: string;
  readonly itemsByClass: Readonly<Record<Mir4ClassId, readonly Mir4EquipmentItemDef[]>>;
}

const CAMPAIGN_QUEST_BY_RANK = [
  'M01-Q06',
  'M02-Q06',
  'M03-Q06',
  'M05-Q06',
  'M07-Q06',
  'M09-Q06',
] as const;

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
  const sample = MIR4_EQUIPMENT_CATALOG.find((item) => item.catalogRank === catalogRank);
  const campaignQuestId = CAMPAIGN_QUEST_BY_RANK[catalogRank - 1];
  if (!sample || !campaignQuestId) {
    throw new Error(`MIR4 equipment progression rank ${catalogRank} is incomplete`);
  }
  return Object.freeze({
    catalogRank,
    requiredLevel: sample.requiredLevel,
    tier: sample.tier,
    grade: sample.grade,
    campaignQuestId,
    itemsByClass: Object.freeze(
      Object.fromEntries(
        MIR4_CLASS_IDS.map((classId) => [classId, itemsForClassAndRank(classId, catalogRank)]),
      ) as Record<Mir4ClassId, readonly Mir4EquipmentItemDef[]>,
    ),
  });
}

/** Canonical class-specific equipment progression, from the imported 240-item catalogue. */
export const MIR4_ITEM_PROGRESSION_RANKS: readonly Mir4ItemProgressionRank[] = Object.freeze(
  Array.from({ length: 6 }, (_, index) => progressionRank(index + 1)),
);

export function mir4ItemProgressionRank(catalogRank: number): Mir4ItemProgressionRank | null {
  return MIR4_ITEM_PROGRESSION_RANKS.find((rank) => rank.catalogRank === catalogRank) ?? null;
}
