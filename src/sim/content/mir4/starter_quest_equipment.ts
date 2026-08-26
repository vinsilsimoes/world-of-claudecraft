import type { Mir4ClassId } from './classes';
import { MIR4_EQUIPMENT_CATALOG, type Mir4EquipmentItemDef } from './equipment_catalog';

export const MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS = [
  'M01-Q01',
  'M01-Q02',
  'M01-Q03',
  'M01-Q04',
  'M01-Q05',
  'M01-Q06',
] as const;

export type Mir4M01EquipmentRewardQuestId = (typeof MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS)[number];

/**
 * The first chapter teaches the paper doll by replacing the exact two-piece
 * class-creation loadout one useful slot at a time. M01-Q06 closes the set,
 * while the existing chapter milestone remains the old-save catch-up path.
 */
const MIR4_M01_EQUIPMENT_REWARD_SLOTS: Readonly<
  Record<Mir4M01EquipmentRewardQuestId, readonly number[]>
> = Object.freeze({
  'M01-Q01': Object.freeze([8]),
  'M01-Q02': Object.freeze([5]),
  'M01-Q03': Object.freeze([1]),
  'M01-Q04': Object.freeze([4]),
  'M01-Q05': Object.freeze([6, 7]),
  'M01-Q06': Object.freeze([2, 3]),
});

function isInitialEquipmentQuest(questId: string): questId is Mir4M01EquipmentRewardQuestId {
  return MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS.includes(questId as Mir4M01EquipmentRewardQuestId);
}

/** Resolve the class-specific rank-one pieces earned by one initial main quest. */
export function mir4M01QuestEquipmentRewards(
  questId: string,
  classId: Mir4ClassId,
): readonly Mir4EquipmentItemDef[] {
  if (!isInitialEquipmentQuest(questId)) return [];
  const slots = MIR4_M01_EQUIPMENT_REWARD_SLOTS[questId];
  const rewards = slots.map((slot) =>
    MIR4_EQUIPMENT_CATALOG.find(
      (item) => item.classId === classId && item.catalogRank === 1 && item.equipSlot === slot,
    ),
  );
  if (rewards.some((item) => item === undefined)) {
    throw new Error(`MIR4 M01 equipment rewards are incomplete for class ${classId}`);
  }
  return rewards as readonly Mir4EquipmentItemDef[];
}
