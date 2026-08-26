// MIR4/Aeldrune kill-loot settlement and corpse presentation lifetime.
//
// Unlike the classic profile, normal MIR4 combat has no corpse-loot interaction:
// every rolled reward is granted authoritatively at death. The dead entity remains
// replicated for a short presentation-only window, then updateMob clears its
// dedicated marker so renderers hide the body while the spawn waits for respawn.

import { awardSharedLootItem, distributeLootCopper } from '../loot/loot_roll';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import { cloneItemInstancePayload, DT, type Entity, type LootSlot } from '../types';
import { markWorldBossLooted } from '../world_boss';

export const MIR4_CORPSE_SECONDS = 10;

function grantLootSlot(ctx: SimContext, slot: LootSlot, pid: number, count: number): void {
  if (count <= 0) return;
  if (slot.instance) {
    ctx.addItemInstance(slot.itemId, cloneItemInstancePayload(slot.instance), pid, count, {
      lootOrigin: 'monster-drop',
    });
    return;
  }
  ctx.addItem(slot.itemId, count, pid, { lootOrigin: 'monster-drop' });
}

/**
 * Move every reward already rolled onto a MIR4 mob directly into its eligible
 * inventory. Shared drops belong to the tap/kill-credit player; personal drops
 * retain their per-player recipient list. Grants are not capacity-gated: a kill
 * must never destroy a reward merely because there is no corpse interaction left.
 */
export function settleMir4KillLoot(
  ctx: SimContext,
  mob: Entity,
  primary: PlayerMeta | null,
  worldBoss: boolean,
): void {
  const loot = mob.loot;
  if (loot) {
    if (primary && loot.copper > 0) distributeLootCopper(ctx, mob, primary);

    const worldBossRecipients = new Set<number>();
    for (const slot of loot.items) {
      if (slot.personalFor && slot.personalFor.length > 0) {
        const recipients = [...new Set(slot.personalFor)].sort((a, b) => a - b);
        for (const pid of recipients) {
          const recipient = ctx.players.get(pid);
          if (!recipient || recipient.leaving) continue;
          // A personal corpse slot represents one copy for every named player,
          // independent of its shared-stack count (the manual-loot contract).
          grantLootSlot(ctx, slot, pid, 1);
          if (worldBoss) worldBossRecipients.add(pid);
        }
        continue;
      }
      if (primary && !primary.leaving) {
        if (slot.instance) {
          grantLootSlot(ctx, slot, primary.entityId, slot.count);
          continue;
        }
        // Reuse the canonical party strategy: common loot rotates, premium
        // loot can open its existing need/greed/master flow, and solo loot goes
        // to the credited player. The fallback deliberately force-adds only
        // when the looter-takes-all capacity gate refuses; with no corpse loot
        // interaction remaining, leaving it behind would destroy the reward.
        for (let i = 0; i < slot.count; i++) {
          if (!awardSharedLootItem(ctx, slot.itemId, mob, primary)) {
            grantLootSlot(ctx, slot, primary.entityId, 1);
          }
        }
      }
    }

    if (worldBossRecipients.size > 0) {
      const untilMs = ctx.raidResetMs(ctx.lockoutNowMs());
      for (const pid of [...worldBossRecipients].sort((a, b) => a - b)) {
        const recipient = ctx.players.get(pid);
        if (recipient) markWorldBossLooted(recipient, mob.templateId, untilMs);
      }
    }
  }

  // Keep no collectible payload or loot action on the body. Corpse presentation
  // has a separate wire-visible marker so no empty loot nameplate/picker appears.
  mob.loot = null;
  mob.lootFfaTimer = 0;
  mob.lootable = false;
  mob.mir4CorpseVisible = true;
  // Death settlement can run before updateMob in the same simulation tick.
  // Add that one tick back so the first immediate decay leaves a full ten
  // seconds visible to the player instead of starting the timer at 9.95s.
  const presentationSeconds = Math.min(MIR4_CORPSE_SECONDS + DT, mob.respawnTimer);
  mob.mir4CorpseTimer = presentationSeconds;
  // MIR4 rewards and pending party rolls are already detached from corpse
  // interaction. Keep the normal ten-second body, but never let presentation
  // postpone an authored faster respawn cadence.
  mob.corpseTimer = Math.min(Math.max(mob.corpseTimer, presentationSeconds), mob.respawnTimer);
}
