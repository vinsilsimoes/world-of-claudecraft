// Pure vendor projection for Sara's class-specific rank-one equipment.

import type { Mir4ClassId } from '../../../sim/content/mir4/classes';
import {
  MIR4_VILLAGE_PROVISIONER_NPC_ID,
  mir4VillageEquipmentOffersForProgress,
} from '../../../sim/content/mir4/village_provisioner';
import type { Mir4PlayerUiState } from '../../../sim/mir4/ui_state';
import { buildMir4EquipmentItemView, type Mir4PaperdollItemView } from '../../mir4_character_view';

export interface Mir4VillageEquipmentRow {
  readonly item: Mir4PaperdollItemView;
  readonly copper: number;
  readonly owned: boolean;
  readonly equipped: boolean;
  readonly affordable: boolean;
}

export interface Mir4VillageEquipmentView {
  readonly rows: readonly Mir4VillageEquipmentRow[];
}

export function buildMir4VillageEquipmentView(
  npcTemplateId: string,
  state: Readonly<Mir4PlayerUiState> | null,
  copper: number,
): Mir4VillageEquipmentView | null {
  if (!state || npcTemplateId !== MIR4_VILLAGE_PROVISIONER_NPC_ID) return null;
  const equipped = new Set(Object.values(state.mir4Equipment ?? {}));
  const instances = state.mir4EquipmentInstances ?? {};
  const rewardItems = state.mir4ArcRewards?.items ?? {};
  return {
    rows: mir4VillageEquipmentOffersForProgress(
      state.classId as Mir4ClassId,
      state.mir4ArcQuests,
    ).map((offer) => {
      const instance = instances[offer.item.itemId];
      const owned =
        (instance !== undefined && !instance.destroyed) ||
        (rewardItems[String(offer.item.itemId)] ?? 0) > 0;
      return {
        item: buildMir4EquipmentItemView(offer.item, instance),
        copper: offer.copper,
        owned,
        equipped: equipped.has(offer.item.itemId),
        affordable: copper >= offer.copper,
      };
    }),
  };
}
