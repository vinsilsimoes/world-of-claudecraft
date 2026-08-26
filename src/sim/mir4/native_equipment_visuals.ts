// Presentation-only bridge from MIR4 logical equipment to the existing
// Aeldrune character/equipment catalog. No source-project asset
// crosses this boundary: MIR4 owns stats and effects, while every visible
// mesh and icon is selected from WoC's native runtime inventory.

import type { Mir4EquipmentItemDef } from '../content/mir4/equipment_catalog';
import { mir4EquipmentDefinition } from '../content/mir4/items';
import { ITEMS } from '../data';
import type { EquipSlot, ItemDef, PlayerClass } from '../types';
import {
  MIR4_NATIVE_ARMOR_MASK,
  MIR4_NATIVE_CLASS_PRESENTATIONS,
  type Mir4NativeArmorSetKey,
  mir4NativeClassPresentation,
} from './native_class_presentation';

export { MIR4_NATIVE_ARMOR_MASK, type Mir4NativeArmorSetKey };

export const MIR4_NATIVE_VISUAL_CLASS: Readonly<Record<number, PlayerClass>> = Object.fromEntries(
  Object.entries(MIR4_NATIVE_CLASS_PRESENTATIONS).map(([classId, profile]) => [
    classId,
    profile.visualClass,
  ]),
);

export const MIR4_NATIVE_ARMOR_SET: Readonly<Record<number, Mir4NativeArmorSetKey>> =
  Object.fromEntries(
    Object.entries(MIR4_NATIVE_CLASS_PRESENTATIONS).map(([classId, profile]) => [
      classId,
      profile.armorSet,
    ]),
  );

export const MIR4_NATIVE_EQUIP_SLOT: Readonly<Record<number, EquipSlot>> = {
  1: 'mainhand',
  2: 'neck',
  3: 'ring1',
  4: 'offhand',
  5: 'chest',
  6: 'helmet',
  7: 'gloves',
  8: 'feet',
};

const RANK_QUALITY = ['common', 'uncommon', 'rare', 'rare', 'epic', 'legendary'] as const;

// Deliberate WoC-native weapon silhouettes for each MIR4 class/rank. The
// arbalist keeps the Hunter rig's built-in crossbow because WoC represents
// that weapon as a class attachment rather than an inventory item model.
function compatibleNativeItems(def: Mir4EquipmentItemDef): ItemDef[] {
  const visualSlot = MIR4_NATIVE_EQUIP_SLOT[def.equipSlot];
  const itemSlot = visualSlot === 'ring1' || visualSlot === 'ring2' ? 'ring' : visualSlot;
  const visualClass = MIR4_NATIVE_VISUAL_CLASS[def.classId] ?? 'warrior';
  return Object.values(ITEMS)
    .filter(
      (item) =>
        item.slot === itemSlot && (!item.requiredClass || item.requiredClass.includes(visualClass)),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

/** Native WoC inventory item used for the paperdoll/icon shell. */
export function mir4NativeVisualItem(def: Mir4EquipmentItemDef): ItemDef {
  if (def.equipSlot === 1) {
    const preferred = mir4NativeClassPresentation(def.classId).weaponItemIds[def.catalogRank - 1];
    const item = preferred ? ITEMS[preferred] : undefined;
    if (item) return item;
  }
  const candidates = compatibleNativeItems(def);
  const quality = RANK_QUALITY[Math.max(0, Math.min(RANK_QUALITY.length - 1, def.catalogRank - 1))];
  const ranked = candidates.filter((item) => item.quality === quality);
  const selected =
    ranked[(def.classId + def.grade - 2) % Math.max(1, ranked.length)] ?? candidates[0];
  if (!selected) {
    throw new Error(`no Aeldrune visual equipment for slot ${def.equipSlot}`);
  }
  return selected;
}

/** Held model override. Null deliberately preserves a class-native attachment. */
export function mir4NativeHeldItemId(def: Mir4EquipmentItemDef): string | null {
  if (def.equipSlot !== 1) return mir4NativeVisualItem(def).id;
  return mir4NativeClassPresentation(def.classId).weaponItemIds[def.catalogRank - 1] ?? null;
}

export interface Mir4NativeEquipmentPresentation {
  classId: number;
  armorMask: number;
  mainhandItemId: string | null;
  offhandItemId: string | null;
}

/** Compact presentation mirror suitable for Entity and the identity wire. */
export function mir4NativeEquipmentPresentation(
  classId: number,
  equipment?: Readonly<{ weapon?: number; [slot: number]: number | undefined }>,
): Mir4NativeEquipmentPresentation {
  let armorMask = mir4NativeClassPresentation(classId).baselineArmorMask;
  if (equipment?.[5] !== undefined) armorMask |= MIR4_NATIVE_ARMOR_MASK.chest;
  if (equipment?.[6] !== undefined) armorMask |= MIR4_NATIVE_ARMOR_MASK.head;
  if (equipment?.[7] !== undefined) armorMask |= MIR4_NATIVE_ARMOR_MASK.hands;
  if (equipment?.[8] !== undefined) armorMask |= MIR4_NATIVE_ARMOR_MASK.feet;

  const weaponId = equipment?.[1] ?? equipment?.weapon;
  const weaponDef = weaponId === undefined ? undefined : mir4EquipmentDefinition(weaponId);
  const offhandId = equipment?.[4];
  const offhandDef = offhandId === undefined ? undefined : mir4EquipmentDefinition(offhandId);
  return {
    classId,
    armorMask,
    mainhandItemId: weaponDef ? mir4NativeHeldItemId(weaponDef) : null,
    offhandItemId: offhandDef ? mir4NativeHeldItemId(offhandDef) : null,
  };
}
