// One presentation profile for every MIR4 class, using only assets already
// shipped by the WoC runtime. Render, paperdoll and equipment projection read
// this table so body, outfit and held-weapon silhouettes cannot drift apart.

import type { PlayerClass } from '../types';

export type Mir4NativeArmorSetKey =
  | 'knight'
  | 'barbarian'
  | 'druid'
  | 'mage'
  | 'paladin'
  | 'ranger'
  | 'rogue';

export const MIR4_NATIVE_ARMOR_MASK = {
  chest: 1 << 0,
  head: 1 << 1,
  hands: 1 << 2,
  feet: 1 << 3,
} as const;

export interface Mir4NativeClassPresentation {
  classId: number;
  visualClass: PlayerClass;
  armorSet: Mir4NativeArmorSetKey;
  baselineArmorMask: number;
  weaponFamily: 'greatsword' | 'staff' | 'shortstaff' | 'crossbow' | 'spear';
  weaponItemIds: readonly (string | null)[];
}

const BASE_OUTFIT = MIR4_NATIVE_ARMOR_MASK.chest;

export const MIR4_NATIVE_CLASS_PRESENTATIONS: Readonly<
  Record<number, Mir4NativeClassPresentation>
> = {
  1: {
    classId: 1,
    visualClass: 'warrior',
    armorSet: 'knight',
    baselineArmorMask: BASE_OUTFIT,
    weaponFamily: 'greatsword',
    weaponItemIds: [
      'eastbrook_greatsword',
      'highwatch_greatsword',
      'wyrmfang_greatblade',
      'greatfang_of_the_basin',
      'deathless_greatblade',
      'kingsbane_last_oath',
    ],
  },
  2: {
    classId: 2,
    visualClass: 'mage',
    armorSet: 'mage',
    baselineArmorMask: BASE_OUTFIT,
    weaponFamily: 'staff',
    weaponItemIds: [
      'gnarled_staff',
      'apprentice_staff',
      'vaels_mist_staff',
      'staff_of_the_gravewyrm',
      'emberglass_warstaff',
      'deathless_heartwood',
    ],
  },
  3: {
    classId: 3,
    visualClass: 'shaman',
    armorSet: 'druid',
    baselineArmorMask: BASE_OUTFIT,
    weaponFamily: 'shortstaff',
    weaponItemIds: [
      'hickory_shortstaff',
      'gnarled_staff',
      'vaels_mist_staff',
      'staff_of_the_gravewyrm',
      'emberglass_warstaff',
      'deathless_heartwood',
    ],
  },
  4: {
    classId: 4,
    visualClass: 'hunter',
    armorSet: 'ranger',
    baselineArmorMask: BASE_OUTFIT,
    weaponFamily: 'crossbow',
    weaponItemIds: [null, null, null, null, null, null],
  },
  5: {
    classId: 5,
    visualClass: 'paladin',
    armorSet: 'paladin',
    baselineArmorMask: BASE_OUTFIT,
    weaponFamily: 'spear',
    weaponItemIds: [
      'ironbark_boar_spear',
      'tidereaver_gaff',
      'fen_reaver_glaive',
      'fanglords_beastspear',
      'heroic_fanglords_beastspear',
      'heroic_fanglords_beastspear',
    ],
  },
};

export function mir4NativeClassPresentation(classId: number): Mir4NativeClassPresentation {
  return MIR4_NATIVE_CLASS_PRESENTATIONS[classId] ?? MIR4_NATIVE_CLASS_PRESENTATIONS[1];
}
