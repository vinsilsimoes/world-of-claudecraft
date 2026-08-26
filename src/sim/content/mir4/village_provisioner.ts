// Vila do Vau's authored starter shop. It uses existing WoC consumables and
// MIR4's rank-one equipment catalog, filtered to the player's active class.

import type { Mir4ClassId } from './classes';
import { MIR4_EQUIPMENT_CATALOG, type Mir4EquipmentItemDef } from './equipment_catalog';
import {
  MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS,
  mir4M01QuestEquipmentRewards,
} from './starter_quest_equipment';

export const MIR4_VILLAGE_PROVISIONER_NPC_ID = 'mir4_m01_vila_do_vau_sara_das_ervas';

export const MIR4_VILLAGE_GENERAL_GOODS = [
  'minor_healing_potion',
  'minor_mana_potion',
  'baked_bread',
  'spring_water',
] as const;

const PRICE_BY_SLOT: Readonly<Record<number, number>> = Object.freeze({
  1: 160,
  2: 90,
  3: 90,
  4: 90,
  5: 140,
  6: 110,
  7: 110,
  8: 110,
});

export interface Mir4VillageEquipmentOffer {
  readonly item: Mir4EquipmentItemDef;
  readonly copper: number;
}

export function mir4VillageEquipmentOffers(
  classId: Mir4ClassId,
): readonly Mir4VillageEquipmentOffer[] {
  return MIR4_EQUIPMENT_CATALOG.filter((item) => item.classId === classId && item.catalogRank === 1)
    .sort((left, right) => left.equipSlot - right.equipSlot)
    .map((item) => ({ item, copper: PRICE_BY_SLOT[item.equipSlot] ?? 100 }));
}

interface Mir4VillageQuestProgress {
  readonly state: 'active' | 'ready' | 'done';
}

/** Sara restocks pieces the campaign has reached, including the active quest's
 * next reward. She replaces missed/destroyed gear without skipping the M01
 * paper-doll progression and exposing the complete set on the second quest. */
export function mir4VillageEquipmentOffersForProgress(
  classId: Mir4ClassId,
  quests: Readonly<Record<string, Mir4VillageQuestProgress>> | undefined,
): readonly Mir4VillageEquipmentOffer[] {
  const unlockedItemIds = new Set<number>();
  for (const questId of MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS) {
    if (!quests?.[questId]) continue;
    for (const item of mir4M01QuestEquipmentRewards(questId, classId)) {
      unlockedItemIds.add(item.itemId);
    }
  }
  return mir4VillageEquipmentOffers(classId).filter((offer) =>
    unlockedItemIds.has(offer.item.itemId),
  );
}
