import { type GameProfile, MIR4_GAME_PROFILE } from '../game_profile';

export interface StarterItemGrant {
  readonly itemId: string;
  readonly count: number;
}

export const MIR4_STARTER_CONSUMABLES: readonly StarterItemGrant[] = Object.freeze([
  Object.freeze({ itemId: 'minor_healing_potion', count: 50 }),
  Object.freeze({ itemId: 'minor_mana_potion', count: 50 }),
]);

/** Fresh-character-only provisioning. Save restoration never calls this path. */
export function starterItemGrants(
  gameProfile: GameProfile,
  classItems: readonly StarterItemGrant[],
): readonly StarterItemGrant[] {
  return gameProfile === MIR4_GAME_PROFILE
    ? [...classItems, ...MIR4_STARTER_CONSUMABLES]
    : classItems;
}
