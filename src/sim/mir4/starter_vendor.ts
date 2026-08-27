// Authoritative class-equipment service for the Vila do Vau provisioner.
// Native consumables continue through the shared WoC vendor pipeline; only
// MIR4's numeric equipment ledger needs this profile-specific purchase leaf.

import type { Mir4ClassId } from '../content/mir4/classes';
import { MIR4_ITEMS } from '../content/mir4/items';
import {
  MIR4_VILLAGE_PROVISIONER_NPC_ID,
  mir4VillageEquipmentOffers,
  mir4VillageEquipmentOffersForProgress,
} from '../content/mir4/village_provisioner';
import type { SimContext } from '../sim_context';
import { dist2d, INTERACT_RANGE } from '../types';
import { mir4OwnsEquipmentItem } from './equipment';
import { markMir4WireDirty } from './wire_revision';

export {
  MIR4_VILLAGE_PROVISIONER_NPC_ID,
  mir4VillageEquipmentOffers,
  mir4VillageEquipmentOffersForProgress,
};

export type Mir4VillageEquipmentPurchase =
  | 'purchased'
  | 'unavailable'
  | 'out-of-range'
  | 'wrong-class'
  | 'already-owned'
  | 'not-enough-copper';

export function mir4BuyVillageEquipment(
  ctx: SimContext,
  pid: number,
  npcId: number,
  itemId: number,
): Mir4VillageEquipmentPurchase {
  const player = ctx.entities.get(pid);
  const meta = ctx.players.get(pid);
  const npc = ctx.entities.get(npcId);
  if (
    !player ||
    player.kind !== 'player' ||
    player.dead ||
    !meta ||
    !npc ||
    npc.kind !== 'npc' ||
    npc.templateId !== MIR4_VILLAGE_PROVISIONER_NPC_ID
  ) {
    return 'unavailable';
  }
  if (dist2d(player.pos, npc.pos) > INTERACT_RANGE + 2) return 'out-of-range';
  const classId = player.mir4?.classId as Mir4ClassId | undefined;
  if (classId === undefined) return 'unavailable';
  const offer = mir4VillageEquipmentOffersForProgress(classId, meta.mir4ArcQuests).find(
    (candidate) => candidate.item.itemId === itemId,
  );
  if (!offer) {
    const catalogItem = MIR4_ITEMS[itemId];
    return catalogItem && catalogItem.classId !== classId ? 'wrong-class' : 'unavailable';
  }
  if (mir4OwnsEquipmentItem(meta, itemId)) return 'already-owned';
  if (meta.copper < offer.copper) return 'not-enough-copper';

  meta.copper -= offer.copper;
  meta.mir4EquipmentInstances = {
    ...meta.mir4EquipmentInstances,
    [itemId]: { itemId, enhancement: 0 },
  };
  markMir4WireDirty(meta);
  return 'purchased';
}
