// Pure, DOM-free view for the MIR4 action dock. The dock owns two independent
// toggle tools (Auto Collect and Auto Battle) and two role-stable potion seats.
// It deliberately does not model either toggle as an ability or HotbarAction.

import { type GameProfile, MIR4_GAME_PROFILE } from '../../../sim/game_profile';
import {
  MIR4_ACTION_POTION_SLOTS,
  type Mir4PotionLookup,
  mir4PotionBarItems,
} from '../../../sim/mir4/potion_inventory';
import type { InvSlot } from '../../../sim/types';

export type { Mir4PotionLookup };
export { MIR4_ACTION_POTION_SLOTS, mir4PotionBarItems };

/**
 * Fill the fixed MIR4 potion seats with the strongest carried healing potion,
 * then the strongest carried mana potion. Food, drinks and elixirs stay in the
 * existing consumables surface; a missing role leaves its seat empty.
 */
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
