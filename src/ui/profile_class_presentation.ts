// Character-entry presentation is separate from the simulation shell. MIR4
// identities deliberately share the Warrior shell for classic compatibility,
// but every launcher surface must still use its own native WoC rig, outfit,
// emblem, and starter weapon.

import type { GameProfile } from '../sim/game_profile';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import {
  type Mir4NativeArmorSetKey,
  mir4NativeClassPresentation,
} from '../sim/mir4/native_class_presentation';
import { isMir4ClassKey, mir4ClassIdForPlayerClass, mir4ShellClassFor } from '../sim/mir4/stats';
import type { PlayableClass, PlayerClass } from '../sim/types';

export interface ProfileClassPresentation {
  key: PlayableClass;
  shellClass: PlayerClass;
  visualClass: PlayerClass;
  armorSet: Mir4NativeArmorSetKey | null;
  starterWeaponItemId: string | null | undefined;
}

export function profileClassPresentation(
  key: PlayableClass,
  profile: GameProfile,
): ProfileClassPresentation {
  const shellClass = mir4ShellClassFor(key, profile);
  if (profile !== MIR4_GAME_PROFILE || !isMir4ClassKey(key)) {
    return {
      key,
      shellClass,
      visualClass: shellClass,
      armorSet: null,
      starterWeaponItemId: undefined,
    };
  }

  const native = mir4NativeClassPresentation(mir4ClassIdForPlayerClass(key));
  return {
    key,
    shellClass,
    visualClass: native.visualClass,
    armorSet: native.armorSet,
    starterWeaponItemId: native.weaponItemIds[0] ?? null,
  };
}
