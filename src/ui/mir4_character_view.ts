// Pure provider that maps the authoritative MIR4 self state into the existing
// character window's paperdoll and stat layout. It owns no DOM and imports no
// renderer or network host.

import { type Mir4ClassKey, mir4ClassById } from '../sim/content/mir4/classes';
import {
  type Mir4EquipmentItemDef,
  mir4EquipmentItem,
} from '../sim/content/mir4/equipment_catalog';
import {
  type Mir4EquipmentRarity,
  mir4EquipmentRarityForRank,
} from '../sim/content/mir4/item_progression';
import { mir4EquipmentDefinition } from '../sim/content/mir4/items';
import { mir4MountById } from '../sim/content/mir4/mounts_catalog';
import { mir4SpiritById } from '../sim/content/mir4/spirits_catalog';
import {
  deriveMir4PlayerStats,
  MIR4_RUNTIME_STATUS_IDS,
  type Mir4DerivedPlayerStats,
} from '../sim/mir4/derived_stats';
import { type Mir4EquipmentInstanceState, mir4ItemAttributes } from '../sim/mir4/equipment';
import {
  MIR4_NATIVE_ARMOR_SET,
  MIR4_NATIVE_EQUIP_SLOT,
  MIR4_NATIVE_VISUAL_CLASS,
  type Mir4NativeArmorSetKey,
  mir4NativeVisualItem,
} from '../sim/mir4/native_equipment_visuals';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';
import type { EquipSlot, PlayerClass } from '../sim/types';

export const MIR4_EQUIPMENT_SLOT_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type Mir4EquipmentSlotId = (typeof MIR4_EQUIPMENT_SLOT_IDS)[number];

export interface Mir4PaperdollItemView {
  itemId: number;
  key: string;
  slotId: Mir4EquipmentSlotId;
  tier: number;
  grade: number;
  requiredLevel: number;
  craftingRarity: Mir4EquipmentRarity | null;
  enhancement: number;
  attributes: readonly (readonly [number, number])[];
  runtimeAttributes: readonly Readonly<{ statusId: number; value: number }>[];
  /** Existing Aeldrune item used only for 3D/UI appearance. */
  visualItemId: string;
  visualSlot: EquipSlot;
}

export interface Mir4PaperdollSlotView {
  slotId: Mir4EquipmentSlotId;
  item: Mir4PaperdollItemView | null;
}

export interface Mir4CharacterView {
  classId: number;
  classKey: Mir4ClassKey;
  stats: Mir4DerivedPlayerStats;
  slots: readonly Mir4PaperdollSlotView[];
  spirit: Readonly<{ id: string; grade: number }> | null;
  mount: Readonly<{ id: string; grade: number }> | null;
}

export interface Mir4CharacterPreviewView {
  visualClass: PlayerClass;
  equipment: Readonly<Partial<Record<EquipSlot, string | null>>>;
  worn: Mir4PreviewArmorLoadout;
}

export type Mir4PreviewArmorSetId = Mir4NativeArmorSetKey;

export type Mir4PreviewArmorLoadout = Readonly<
  Partial<
    Record<
      'head' | 'chest' | 'arms' | 'hands' | 'legs' | 'feet' | 'back',
      Mir4PreviewArmorSetId | null
    >
  >
>;

export type Mir4PreviewEquipmentOverride = Readonly<Partial<Record<EquipSlot, string | null>>>;

export function resolveMir4PreviewHands(
  equipment: Readonly<Partial<Record<EquipSlot, string>>>,
  override?: Mir4PreviewEquipmentOverride,
): Readonly<{ mainhand: string | null; offhand: string | null }> {
  return {
    mainhand:
      override && 'mainhand' in override
        ? (override.mainhand ?? null)
        : (equipment.mainhand ?? null),
    offhand:
      override && 'offhand' in override ? (override.offhand ?? null) : (equipment.offhand ?? null),
  };
}

export const MIR4_TO_WOC_EQUIP_SLOT: Readonly<Record<Mir4EquipmentSlotId, EquipSlot>> = {
  1: MIR4_NATIVE_EQUIP_SLOT[1],
  2: MIR4_NATIVE_EQUIP_SLOT[2],
  3: MIR4_NATIVE_EQUIP_SLOT[3],
  4: MIR4_NATIVE_EQUIP_SLOT[4],
  5: MIR4_NATIVE_EQUIP_SLOT[5],
  6: MIR4_NATIVE_EQUIP_SLOT[6],
  7: MIR4_NATIVE_EQUIP_SLOT[7],
  8: MIR4_NATIVE_EQUIP_SLOT[8],
};

export function buildMir4EquipmentItemView(
  def: Mir4EquipmentItemDef,
  instance: Mir4EquipmentInstanceState | undefined,
): Mir4PaperdollItemView {
  const visualItem = mir4NativeVisualItem(def);
  const attributes = mir4ItemAttributes(def, instance);
  const effective = new Map<number, number>();
  for (const [statusId, value] of attributes) {
    if (MIR4_RUNTIME_STATUS_IDS.has(statusId)) {
      effective.set(statusId, (effective.get(statusId) ?? 0) + value);
    }
  }
  return {
    itemId: def.itemId,
    key: def.key,
    slotId: def.equipSlot as Mir4EquipmentSlotId,
    tier: def.tier,
    grade: def.grade,
    requiredLevel: def.requiredLevel,
    craftingRarity: mir4EquipmentItem(def.itemId)
      ? mir4EquipmentRarityForRank(def.catalogRank)
      : null,
    enhancement: instance?.enhancement ?? 0,
    attributes,
    runtimeAttributes: [...effective].map(([statusId, value]) => ({
      statusId,
      value,
    })),
    visualItemId: visualItem.id,
    visualSlot: MIR4_TO_WOC_EQUIP_SLOT[def.equipSlot as Mir4EquipmentSlotId],
  };
}

/**
 * Project logical MIR4 equipment onto the existing modular WoC turntable.
 * Jewelry remains paperdoll-only because the native character rig has no
 * necklace or ring mesh sockets. Every visible socket is explicit: empty
 * MIR4 hands/body pieces stay empty instead of falling back to the classic
 * shell's equipment or full class kit.
 */
export function buildMir4CharacterPreview(view: Mir4CharacterView): Mir4CharacterPreviewView {
  const visualClass = MIR4_NATIVE_VISUAL_CLASS[view.classId] ?? 'warrior';
  const armorSet = MIR4_NATIVE_ARMOR_SET[view.classId] ?? 'knight';
  const equipment: Partial<Record<EquipSlot, string | null>> = {
    mainhand: null,
    offhand: null,
  };
  const worn: Partial<Record<keyof Mir4PreviewArmorLoadout, Mir4PreviewArmorSetId | null>> = {};
  for (const slot of view.slots) {
    if (!slot.item) continue;
    switch (slot.slotId) {
      case 1:
        equipment.mainhand = slot.item.visualItemId;
        break;
      case 4:
        equipment.offhand = slot.item.visualItemId;
        break;
      case 5:
        worn.chest = armorSet;
        worn.arms = armorSet;
        worn.legs = armorSet;
        worn.back = armorSet;
        break;
      case 6:
        worn.head = armorSet;
        break;
      case 7:
        worn.hands = armorSet;
        break;
      case 8:
        worn.feet = armorSet;
        break;
    }
  }
  return { visualClass, equipment, worn };
}

export function buildMir4CharacterView(
  state: Readonly<Mir4PlayerUiState> | null,
  level: number,
): Mir4CharacterView | null {
  if (!state) return null;
  const classDef = mir4ClassById(state.classId);
  if (!classDef) return null;
  const slots = MIR4_EQUIPMENT_SLOT_IDS.map((slotId): Mir4PaperdollSlotView => {
    const itemId = state.mir4Equipment?.[slotId];
    const def = itemId === undefined ? null : mir4EquipmentDefinition(itemId);
    return {
      slotId,
      item: def
        ? buildMir4EquipmentItemView(def, state.mir4EquipmentInstances?.[def.itemId])
        : null,
    };
  });
  const spirit = state.mir4Spirits?.equippedSpiritId
    ? mir4SpiritById(state.mir4Spirits.equippedSpiritId)
    : null;
  const mount = state.mir4Mounts?.equippedMountId
    ? mir4MountById(state.mir4Mounts.equippedMountId)
    : null;
  return {
    classId: state.classId,
    classKey: classDef.key,
    stats: deriveMir4PlayerStats(
      state.classId,
      level,
      state.mir4Equipment,
      state.mir4EquipmentInstances,
      state.mir4Spirits,
      state.mir4Mounts,
      state.mir4Codex,
      state.mir4ArcRewards?.items,
      state.mir4Training,
    ),
    slots,
    spirit: spirit ? { id: spirit.id, grade: spirit.grade } : null,
    mount: mount ? { id: mount.id, grade: mount.grade } : null,
  };
}
