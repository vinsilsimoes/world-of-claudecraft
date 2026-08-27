// Shared role selection and authoritative automatic use for MIR4 potion seats.
// The HUD and Auto Battle use the same strongest-carried choice, so the icon
// shown to the player is the exact stack the server consumes.

import { ITEMS } from '../data';
import { useItem } from '../items';
import type { SimContext } from '../sim_context';
import type { InvSlot, ItemDef } from '../types';

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

export function useMir4AutomaticPotion(ctx: SimContext, pid: number, kind: 'hp' | 'mp'): boolean {
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead || ctx.time < player.potionCooldownUntil) return false;
  const potionIds = mir4PotionBarItems(meta.inventory, (itemId) => ITEMS[itemId], []);
  const itemId = potionIds[kind === 'hp' ? 0 : 1];
  if (!itemId) return false;
  const before = ctx.countItem(itemId, pid);
  useItem(ctx, itemId, pid);
  return ctx.countItem(itemId, pid) === before - 1;
}
