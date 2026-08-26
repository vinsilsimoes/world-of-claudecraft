// Pure, DOM-free view for the MIR4 action dock. The dock owns two independent
// toggle tools (Auto Collect and Auto Battle) and two role-stable potion seats.
// It deliberately does not model either toggle as an ability or HotbarAction.

import { type GameProfile, MIR4_GAME_PROFILE } from '../../../sim/game_profile';
import type { InvSlot, ItemDef } from '../../../sim/types';

export const MIR4_ACTION_POTION_SLOTS = 2;

type PotionItem = Pick<ItemDef, 'id' | 'kind' | 'potionHp' | 'potionMana'>;
export type Mir4PotionLookup = (itemId: string) => PotionItem | undefined;

function strongerPotion(
  current: PotionItem | null,
  candidate: PotionItem,
  potency: (item: PotionItem) => number,
): PotionItem {
  if (current === null) return candidate;
  const currentPotency = potency(current);
  const candidatePotency = potency(candidate);
  if (candidatePotency !== currentPotency) {
    return candidatePotency > currentPotency ? candidate : current;
  }
  return candidate.id < current.id ? candidate : current;
}

/**
 * Fill the fixed MIR4 potion seats with the strongest carried healing potion,
 * then the strongest carried mana potion. Food, drinks and elixirs stay in the
 * existing consumables surface; a missing role leaves its seat empty.
 */
export function mir4PotionBarItems(
  inventory: readonly Pick<InvSlot, 'itemId'>[],
  lookup: Mir4PotionLookup,
  out: (string | null)[],
): (string | null)[] {
  let healing: PotionItem | null = null;
  let mana: PotionItem | null = null;
  for (const slot of inventory) {
    const item = lookup(slot.itemId);
    if (item?.kind !== 'potion') continue;
    if ((item.potionHp ?? 0) > 0) {
      healing = strongerPotion(healing, item, (candidate) => candidate.potionHp ?? 0);
    }
    if ((item.potionMana ?? 0) > 0) {
      mana = strongerPotion(mana, item, (candidate) => candidate.potionMana ?? 0);
    }
  }
  out.length = MIR4_ACTION_POTION_SLOTS;
  out[0] = healing?.id ?? null;
  out[1] = mana && mana.id !== healing?.id ? mana.id : null;
  return out;
}

export interface Mir4ActionToolsInput {
  profile: GameProfile | undefined;
  autoBattleActive: boolean;
  autoCollectActive: boolean;
  autoBattleKeybind: string;
  autoCollectKeybind: string;
  inventory: readonly Pick<InvSlot, 'itemId'>[];
}

export interface Mir4ActionToolsState {
  visible: boolean;
  autoBattleActive: boolean;
  autoCollectActive: boolean;
  autoBattleKeybind: string;
  autoCollectKeybind: string;
  potionIds: (string | null)[];
}

export interface Mir4ActionToolsView {
  tick(input: Mir4ActionToolsInput): Mir4ActionToolsState;
}

/** Allocation-stable view: both the result object and potion id array are reused. */
export function createMir4ActionToolsView(lookup: Mir4PotionLookup): Mir4ActionToolsView {
  const potionIds: (string | null)[] = [null, null];
  const state: Mir4ActionToolsState = {
    visible: false,
    autoBattleActive: false,
    autoCollectActive: false,
    autoBattleKeybind: '',
    autoCollectKeybind: '',
    potionIds,
  };
  return {
    tick(input: Mir4ActionToolsInput): Mir4ActionToolsState {
      state.visible = input.profile === MIR4_GAME_PROFILE;
      state.autoBattleActive = input.autoBattleActive;
      state.autoCollectActive = input.autoCollectActive;
      state.autoBattleKeybind = input.autoBattleKeybind;
      state.autoCollectKeybind = input.autoCollectKeybind;
      mir4PotionBarItems(input.inventory, lookup, potionIds);
      return state;
    },
  };
}
