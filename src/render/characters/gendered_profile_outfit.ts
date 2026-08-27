// Gender-specific MIR4 starter outfits assembled exclusively from the native
// WoC armour library. The visual class and weapon remain unchanged; only the
// clothing set changes, so each body choice has a genuinely different 3D
// silhouette without importing any asset from the 2D project.

import type { ArmorSetId, Gender } from './modular';

/**
 * Curated pairs stay inside the same broad equipment language: plate with
 * plate, robes with robes, and leather with leather.
 */
export const FEMALE_PROFILE_ARMOR_SET: Readonly<Record<ArmorSetId, ArmorSetId>> = {
  knight: 'paladin',
  paladin: 'knight',
  mage: 'druid',
  druid: 'mage',
  ranger: 'rogue',
  rogue: 'ranger',
  barbarian: 'druid',
};

export function genderedProfileArmorSet(baseSet: ArmorSetId, gender: Gender): ArmorSetId {
  return gender === 'female' ? FEMALE_PROFILE_ARMOR_SET[baseSet] : baseSet;
}
