import { buildMir4ArcWorld } from './content/mir4/arc_world';
import { setActiveWorldContent } from './data';
import { type GameProfile, MIR4_GAME_PROFILE } from './game_profile';
import type { WorldContent } from './types';

export interface GameProfileWorldOptions {
  explicitWorld?: WorldContent;
  mir4MapCount?: number;
}

let fullMir4World: WorldContent | undefined;

/** Resolve the content owned by a game profile without changing process state. */
export function worldForGameProfile(
  profile: GameProfile,
  options: GameProfileWorldOptions = {},
): WorldContent | undefined {
  if (options.explicitWorld) return options.explicitWorld;
  if (profile !== MIR4_GAME_PROFILE) return undefined;
  if (options.mir4MapCount === undefined || options.mir4MapCount === 20) {
    fullMir4World ??= buildMir4ArcWorld();
    return fullMir4World;
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
