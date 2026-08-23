import { buildMir4ArcWorld } from './content/mir4/arc_world';
import { MIR4_AUTHORED_MAP_IDS } from './content/mir4/authored_maps';
import { setActiveWorldContent } from './data';
import { type GameProfile, MIR4_GAME_PROFILE } from './game_profile';
import { buildMir4WocCampaignWorld } from './mir4/woc_comparison_world';
import type { WorldContent } from './types';

export interface GameProfileWorldOptions {
  explicitWorld?: WorldContent;
  mir4MapCount?: number;
  mir4WocMap?: boolean;
  terrainSeed?: number;
}

let authoredMir4World: WorldContent | undefined;

/** Resolve the content owned by a game profile without changing process state. */
export function worldForGameProfile(
  profile: GameProfile,
  options: GameProfileWorldOptions = {},
): WorldContent | undefined {
  if (options.explicitWorld) return options.explicitWorld;
  if (profile !== MIR4_GAME_PROFILE) return undefined;
  if (options.mir4WocMap !== false) {
    return buildMir4WocCampaignWorld(undefined, options.terrainSeed);
  }
  if (options.mir4MapCount === undefined) {
    authoredMir4World ??= buildMir4ArcWorld(MIR4_AUTHORED_MAP_IDS.length);
    return authoredMir4World;
  }
  return buildMir4ArcWorld(options.mir4MapCount);
}

/**
 * Select one host's world and register the same content for terrain, collision,
 * rendering, and Sim construction. A process hosts only one active profile.
 */
export function activateWorldForGameProfile(
  profile: GameProfile,
  options: GameProfileWorldOptions = {},
): WorldContent | undefined {
  const world = worldForGameProfile(profile, options);
  setActiveWorldContent(world ?? null);
  return world;
}
