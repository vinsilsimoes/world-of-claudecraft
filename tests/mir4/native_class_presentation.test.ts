import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../src/sim/data';
import {
  MIR4_NATIVE_ARMOR_MASK,
  MIR4_NATIVE_CLASS_PRESENTATIONS,
  mir4NativeClassPresentation,
} from '../../src/sim/mir4/native_class_presentation';

describe('MIR4 native class presentation profiles', () => {
  it('maps every MIR4 class to one deliberate WoC body and armor identity', () => {
    expect([1, 2, 3, 4, 5].map((classId) => mir4NativeClassPresentation(classId))).toMatchObject([
      { visualClass: 'warrior', armorSet: 'knight', weaponFamily: 'greatsword' },
      { visualClass: 'mage', armorSet: 'mage', weaponFamily: 'staff' },
      { visualClass: 'shaman', armorSet: 'druid', weaponFamily: 'shortstaff' },
      { visualClass: 'hunter', armorSet: 'ranger', weaponFamily: 'crossbow' },
      { visualClass: 'paladin', armorSet: 'paladin', weaponFamily: 'spear' },
    ]);
  });

  it('gives a recognizable base outfit without hiding equipment sockets', () => {
    for (const classId of [1, 2, 3, 4, 5]) {
      expect(mir4NativeClassPresentation(classId).baselineArmorMask).toBe(
        MIR4_NATIVE_ARMOR_MASK.chest,
      );
    }
  });

  it('never substitutes a dagger or cleaver for the Taoist and Lancer silhouettes', () => {
    expect(mir4NativeClassPresentation(3).weaponItemIds).toEqual([
      'hickory_shortstaff',
      'gnarled_staff',
      'vaels_mist_staff',
      'staff_of_the_gravewyrm',
      'emberglass_warstaff',
      'deathless_heartwood',
    ]);
    expect(mir4NativeClassPresentation(5).weaponItemIds.at(-1)).toBe('heroic_fanglords_beastspear');
    expect(mir4NativeClassPresentation(4).weaponItemIds).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('pins all six native weapon ranks for Warrior, Elementalist, and Lancer', () => {
    expect(mir4NativeClassPresentation(1).weaponItemIds).toEqual([
      'eastbrook_greatsword',
      'highwatch_greatsword',
      'wyrmfang_greatblade',
      'greatfang_of_the_basin',
      'deathless_greatblade',
      'kingsbane_last_oath',
    ]);
    expect(mir4NativeClassPresentation(2).weaponItemIds).toEqual([
      'gnarled_staff',
      'apprentice_staff',
      'vaels_mist_staff',
      'staff_of_the_gravewyrm',
      'emberglass_warstaff',
      'deathless_heartwood',
    ]);
    expect(mir4NativeClassPresentation(5).weaponItemIds).toEqual([
      'ironbark_boar_spear',
      'tidereaver_gaff',
      'fen_reaver_glaive',
      'fanglords_beastspear',
      'heroic_fanglords_beastspear',
      'heroic_fanglords_beastspear',
    ]);
  });

  it('references only native items that actually ship in the WoC catalog', () => {
    const itemIds = Object.values(MIR4_NATIVE_CLASS_PRESENTATIONS)
      .flatMap((profile) => profile.weaponItemIds)
      .filter((itemId): itemId is string => itemId !== null);
    for (const itemId of itemIds) expect(ITEMS[itemId], itemId).toBeDefined();
  });
});
