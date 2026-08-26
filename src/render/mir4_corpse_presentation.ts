import type { GameProfile } from '../sim/game_profile';
import type { Entity } from '../sim/types';
import { entityViewBodyVisible } from './entity_view_policy_core';

/** Hides an expired presentation-only corpse and lets the caller skip all later rig work. */
export function hideExpiredMir4Body(
  group: { visible: boolean },
  entity: Entity,
  profile: GameProfile | undefined,
): boolean {
  if (entityViewBodyVisible(entity, profile)) return false;
  group.visible = false;
  return true;
}
