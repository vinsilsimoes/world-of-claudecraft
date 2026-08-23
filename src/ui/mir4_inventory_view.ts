// Pure MIR4 provider for the existing Bags window. Equipment instances are the
// current owned-item ledger; equipped and destroyed copies are excluded. The
// six-material wallet is always projected in a stable order.

import { mir4EquipmentDefinition } from '../sim/content/mir4/items';
import { MIR4_MOUNTS_CATALOG, mir4MountById } from '../sim/content/mir4/mounts_catalog';
import { MIR4_SPIRITS_CATALOG, mir4SpiritById } from '../sim/content/mir4/spirits_catalog';
import { ITEMS } from '../sim/data';
import {
  isMir4MountTicketId,
  MIR4_MOUNT_TICKET_VISUAL_ITEMS,
  type Mir4MountTicketId,
} from '../sim/mir4/collection_tickets';
import { MIR4_EMPTY_MATERIALS, type Mir4Materials } from '../sim/mir4/equipment';
import { mir4MountOwnedCount, mir4MountRuntimeStats, mir4MountVisualKey } from '../sim/mir4/mounts';
import {
  isMir4SpiritTicketId,
  type Mir4SpiritSpecialSkill,
  type Mir4SpiritTicketId,
  mir4SpiritOwnedCount,
  mir4SpiritSpecialSkill,
} from '../sim/mir4/spirits';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';
import { mountItemId } from '../sim/mounts';
import type { InvSlot } from '../sim/types';
import { buildMir4EquipmentItemView, type Mir4PaperdollItemView } from './mir4_character_view';

export const MIR4_MATERIAL_KEYS = [
  'sunStone',
  'moonStone',
  'solarScroll',
  'lunarSeal',
  'dawnTear',
  'solarWard',
] as const satisfies readonly (keyof Mir4Materials)[];

export interface Mir4MaterialView {
  key: keyof Mir4Materials;
  count: number;
}

export interface Mir4InventoryView {
  equipment: readonly Mir4PaperdollItemView[];
  materials: readonly Mir4MaterialView[];
  nativeItems: readonly Mir4NativeItemView[];
  mountTickets: readonly Mir4MountTicketView[];
  mounts: readonly Mir4MountView[];
  pendingMounts: readonly Mir4PendingMountView[];
  mountCombinations: readonly Mir4MountCombinationView[];
  spiritTickets: readonly Mir4SpiritTicketView[];
  spirits: readonly Mir4SpiritView[];
  pendingSpirits: readonly Mir4PendingSpiritView[];
  spiritCombinations: readonly Mir4SpiritCombinationView[];
}

export interface Mir4NativeItemView {
  slotIndex: number;
  slot: InvSlot;
}

export interface Mir4MountTicketView {
  ticketId: Mir4MountTicketId;
  count: number;
  visualItemId: string;
}

export interface Mir4MountView {
  mountId: string;
  grade: number;
  gradeKey: string;
  count: number;
  equipped: boolean;
  visualItemId: string;
  stats: Readonly<{
    moveSpeedBps: number;
    basicAttackSpeedBps: number;
    physicalDefense: number;
    magicDefense: number;
  }>;
}

export interface Mir4PendingMountView extends Omit<Mir4MountView, 'count' | 'equipped'> {
  pendingId: string;
}

export interface Mir4MountCombinationView {
  grade: number;
  owned: number;
  attempts: number;
  visualItemId: string;
}

export interface Mir4SpiritTicketView {
  ticketId: Mir4SpiritTicketId;
  count: number;
  visualItemId: string;
}

export interface Mir4SpiritView {
  spiritId: string;
  grade: number;
  gradeKey: string;
  count: number;
  equipped: boolean;
  visualItemId: string;
  stats: Readonly<Record<string, number>>;
  skill: Mir4SpiritSpecialSkill;
}

export interface Mir4PendingSpiritView extends Omit<Mir4SpiritView, 'count' | 'equipped'> {
  pendingId: string;
}

export interface Mir4SpiritCombinationView {
  grade: number;
  owned: number;
  attempts: number;
  visualItemId: string;
}

export const MIR4_SPIRIT_GRADE_VISUAL_ITEMS: Readonly<Record<number, string>> = {
  1: 'ghostly_essence',
  2: 'arcane_essence',
  3: 'soul_stone',
  4: 'wraithfire_orb',
  5: 'soulflame_cowl',
  6: 'maldrecs_soulbinder',
};

export const MIR4_SPIRIT_TICKET_VISUAL_ITEMS: Readonly<Record<Mir4SpiritTicketId, string>> = {
  'spirit-ticket-dawn': 'soul_stone',
  'spirit-ticket-sunset': 'wraithfire_orb',
};

function requiredMountVisualItemId(mountId: string): string {
  const visualItemId = mountItemId(mir4MountVisualKey(mountId));
  if (!visualItemId) throw new Error(`Missing native WoC mount visual for MIR4 mount ${mountId}`);
  return visualItemId;
}

function requiredMountForGrade(grade: number) {
  const mount = MIR4_MOUNTS_CATALOG.find((candidate) => candidate.grade === grade);
  if (!mount) throw new Error(`Missing MIR4 mount catalog entry for grade ${grade}`);
  return mount;
}

function requiredSpiritVisualItemId(grade: number): string {
  const visualItemId = MIR4_SPIRIT_GRADE_VISUAL_ITEMS[grade];
  if (!visualItemId) throw new Error(`Missing native WoC spirit visual for MIR4 grade ${grade}`);
  return visualItemId;
}

function requiredSpiritSkill(spiritId: string): Mir4SpiritSpecialSkill {
  const skill = mir4SpiritSpecialSkill(spiritId);
  if (!skill) throw new Error(`Missing MIR4 special skill for spirit ${spiritId}`);
  return skill;
}

export function buildMir4InventoryView(
  state: Readonly<Mir4PlayerUiState>,
  runtimeInventory: readonly InvSlot[] = [],
): Mir4InventoryView {
  const equipped = new Set(Object.values(state.mir4Equipment ?? {}));
  const instances = state.mir4EquipmentInstances ?? {};
  const ownedEquipmentIds = new Set<number>(
    Object.values(instances).map((instance) => instance.itemId),
  );
  for (const [itemKey, count] of Object.entries(state.mir4ArcRewards?.items ?? {})) {
    if (count <= 0) continue;
    const itemId = Number(itemKey);
    if (Number.isSafeInteger(itemId) && mir4EquipmentDefinition(itemId)) {
      ownedEquipmentIds.add(itemId);
    }
  }
  const equipment = [...ownedEquipmentIds]
    .filter((itemId) => !instances[itemId]?.destroyed && !equipped.has(itemId))
    .map((itemId) => {
      const def = mir4EquipmentDefinition(itemId);
      return def ? buildMir4EquipmentItemView(def, instances[itemId]) : null;
    })
    .filter((item): item is Mir4PaperdollItemView => item !== null)
    .sort((left, right) => left.slotId - right.slotId || left.itemId - right.itemId);
  const wallet = state.mir4Materials ?? MIR4_EMPTY_MATERIALS;
  const spirits = state.mir4Spirits;
  return {
    equipment,
    materials: MIR4_MATERIAL_KEYS.map((key) => ({ key, count: wallet[key] })),
    nativeItems: runtimeInventory
      .map((slot, slotIndex) => ({ slotIndex, slot }))
      .filter(
        ({ slot }) => ITEMS[slot.itemId]?.kind === 'potion' || ITEMS[slot.itemId]?.kind === 'mount',
      ),
    mountTickets: Object.entries(state.mir4ArcRewards?.tickets ?? {})
      .filter(
        (entry): entry is [Mir4MountTicketId, number] =>
          isMir4MountTicketId(entry[0]) && entry[1] > 0,
      )
      .map(([ticketId, count]) => ({
        ticketId,
        count,
        visualItemId: MIR4_MOUNT_TICKET_VISUAL_ITEMS[ticketId],
      })),
    mounts: MIR4_MOUNTS_CATALOG.filter(
      (mount) => (state.mir4Mounts?.owned?.[mount.id] ?? 0) > 0,
    ).map((mount) => ({
      mountId: mount.id,
      grade: mount.grade,
      gradeKey: mount.gradeKey,
      count: state.mir4Mounts?.owned?.[mount.id] ?? 0,
      equipped: state.mir4Mounts?.equippedMountId === mount.id,
      visualItemId: requiredMountVisualItemId(mount.id),
      stats: mir4MountRuntimeStats(mount),
    })),
    pendingMounts: (state.mir4Mounts?.pending ?? []).flatMap((pending) => {
      const mount = mir4MountById(pending.mountId);
      return mount
        ? [
            {
              pendingId: pending.id,
              mountId: mount.id,
              grade: mount.grade,
              gradeKey: mount.gradeKey,
              visualItemId: requiredMountVisualItemId(mount.id),
              stats: mir4MountRuntimeStats(mount),
            },
          ]
        : [];
    }),
    mountCombinations: [1, 2, 3, 4, 5]
      .map((grade) => {
        const owned = mir4MountOwnedCount(state.mir4Mounts, grade);
        const representative = requiredMountForGrade(grade);
        return {
          grade,
          owned,
          attempts: Math.floor(owned / 4),
          visualItemId: requiredMountVisualItemId(representative.id),
        };
      })
      .filter((entry) => entry.attempts > 0),
    spiritTickets: Object.entries(state.mir4ArcRewards?.tickets ?? {})
      .filter(
        (entry): entry is [Mir4SpiritTicketId, number] =>
          isMir4SpiritTicketId(entry[0]) && entry[1] > 0,
      )
      .map(([ticketId, count]) => ({
        ticketId,
        count,
        visualItemId: MIR4_SPIRIT_TICKET_VISUAL_ITEMS[ticketId],
      })),
    spirits: MIR4_SPIRITS_CATALOG.filter((spirit) => (spirits?.owned?.[spirit.id] ?? 0) > 0).map(
      (spirit) => ({
        spiritId: spirit.id,
        grade: spirit.grade,
        gradeKey: spirit.gradeKey,
        count: spirits?.owned?.[spirit.id] ?? 0,
        equipped: spirits?.equippedSpiritId === spirit.id,
        visualItemId: requiredSpiritVisualItemId(spirit.grade),
        stats: spirit.stats,
        skill: requiredSpiritSkill(spirit.id),
      }),
    ),
    pendingSpirits: (spirits?.pending ?? []).flatMap((pending) => {
      const spirit = mir4SpiritById(pending.spiritId);
      return spirit
        ? [
            {
              pendingId: pending.id,
              spiritId: spirit.id,
              grade: spirit.grade,
              gradeKey: spirit.gradeKey,
              visualItemId: requiredSpiritVisualItemId(spirit.grade),
              stats: spirit.stats,
              skill: requiredSpiritSkill(spirit.id),
            },
          ]
        : [];
    }),
    spiritCombinations: [1, 2, 3, 4, 5]
      .map((grade) => {
        const owned = mir4SpiritOwnedCount(spirits, grade);
        return {
          grade,
          owned,
          attempts: Math.floor(owned / 4),
          visualItemId: requiredSpiritVisualItemId(grade),
        };
      })
      .filter((entry) => entry.attempts > 0),
  };
}
