// Automatic potion upkeep is independent from movement and combat automation.
// A player can fight manually, stand still, or run Auto Journey and still receive
// the configured recovery while carrying a matching potion.

import { resolveMir4AutoPotionThresholds } from '../auto_battle/potion_thresholds';
import type { SimContext } from '../sim_context';
import { useMir4AutomaticPotion } from './potion_inventory';

export function updateMir4AutoPotions(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const player = ctx.entities.get(meta.entityId);
    if (!player || player.dead) continue;

    const thresholds = resolveMir4AutoPotionThresholds(meta.mir4AutoPotion);
    if (player.maxHp > 0 && player.hp / player.maxHp <= thresholds.health / 100) {
      if (useMir4AutomaticPotion(ctx, player.id, 'hp')) continue;
    }
    if (player.maxResource > 0 && player.resource / player.maxResource <= thresholds.mana / 100) {
      useMir4AutomaticPotion(ctx, player.id, 'mp');
    }
  }
}
