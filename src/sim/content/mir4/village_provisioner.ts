// Vila do Vau's authored starter shop. It uses existing WoC consumables and
// Aeldrune's separate starter loadout, filtered to the player's active class.

import type { Mir4ClassId } from './classes';
import type { Mir4EquipmentItemDef } from './equipment_catalog';
import { MIR4_ITEMS, MIR4_STARTER_LOADOUT_BY_CLASS } from './items';

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
  const loadout = MIR4_STARTER_LOADOUT_BY_CLASS[classId];
  return [MIR4_ITEMS[loadout.weapon], MIR4_ITEMS[loadout.armorTop]]
    .filter((item): item is Mir4EquipmentItemDef => item !== undefined)
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
  _quests: Readonly<Record<string, Mir4VillageQuestProgress>> | undefined,
): readonly Mir4VillageEquipmentOffer[] {
  return mir4VillageEquipmentOffers(classId);
}
