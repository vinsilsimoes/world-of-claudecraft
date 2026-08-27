import type { Mir4ClassId } from './classes';
import type { Mir4EquipmentItemDef } from './equipment_catalog';

export const MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS = [
  'M01-Q01',
  'M01-Q02',
  'M01-Q03',
  'M01-Q04',
  'M01-Q05',
  'M01-Q06',
] as const;

export type Mir4M01EquipmentRewardQuestId = (typeof MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS)[number];

/** Legacy quest ids remain recognized so old saves keep their claim ledger.
 * New characters receive only their separate class starter loadout. Crafted
 * Common equipment is never awarded by a quest. */
export function mir4M01QuestEquipmentRewards(
  _questId: string,
  _classId: Mir4ClassId,
): readonly Mir4EquipmentItemDef[] {
  return [];
}
