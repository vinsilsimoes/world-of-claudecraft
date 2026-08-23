import { STRIP_MAX_X, STRIP_MIN_X } from '../data';
import { type GameProfile, MIR4_GAME_PROFILE } from '../game_profile';
import type { WorldContent, ZoneDef } from '../types';

export interface SavedWorldPosition {
  x: number;
  z: number;
}

type SavedPositionWorld = Pick<WorldContent, 'playerStart' | 'zones'>;

function isInsideCurrentWorldZone(
  zones: readonly ZoneDef[],
  pos: Readonly<SavedWorldPosition>,
): boolean {
  return zones.some(
    (zone) =>
      pos.x >= (zone.xMin ?? STRIP_MIN_X) &&
      pos.x < (zone.xMax ?? STRIP_MAX_X) &&
      pos.z >= zone.zMin &&
      pos.z < zone.zMax,
  );
}

/** MIR4 world revisions moved the campaign from the legacy strip to the
 * authored continent and then onto the original WoC world. A numeric save
 * outside every zone in the currently selected world must restart at that
 * world's entrance instead of leaving the character beyond reachable land. */
export function mir4SavedPositionIsStale(
  profile: GameProfile | undefined,
  world: SavedPositionWorld,
  pos: Readonly<SavedWorldPosition>,
): boolean {
  return profile === MIR4_GAME_PROFILE && !isInsideCurrentWorldZone(world.zones, pos);
}

export function recoverMir4CorpsePosition(
  profile: GameProfile | undefined,
  world: SavedPositionWorld,
  corpsePos: SavedWorldPosition | null | undefined,
): SavedWorldPosition | null {
  if (!corpsePos) return null;
  return mir4SavedPositionIsStale(profile, world, corpsePos) ? world.playerStart : corpsePos;
}
