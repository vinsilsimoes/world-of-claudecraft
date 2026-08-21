// Pure authority adapter for navigation sites that do not exist as ordinary
// world entities. The authored delve doors and two-way overworld passages are
// immutable shipped content, while live Rift entrances remain entity-backed and
// deliberately obey the same 80-yard information boundary as their world art.

import { MIR4_WORLD_ARC } from '../sim/content/mir4/world_arc';
import { DELVE_LIST, PORTALS, zoneContaining } from '../sim/data';
import { type GameProfile, MIR4_GAME_PROFILE } from '../sim/game_profile';
import { MIR4_ARC_PORTALS } from '../sim/mir4/travel';
import { isLiveMapEntityDisclosed } from './map_entity_disclosure_core';

export type StableMapNavigationLandmark =
  | Readonly<{
      kind: 'delve-entrance';
      id: string;
      zoneId: string;
      x: number;
      z: number;
    }>
  | Readonly<{
      kind: 'world-passage';
      id: string;
      side: 'a' | 'b';
      zoneId: string;
      destinationZoneId: string;
      x: number;
      z: number;
    }>;

function buildStableMapNavigationLandmarks(): readonly StableMapNavigationLandmark[] {
  const landmarks: StableMapNavigationLandmark[] = [];
  for (const delve of DELVE_LIST) {
    const zone = zoneContaining(delve.doorPos.x, delve.doorPos.z);
    if (!zone) continue;
    landmarks.push(
      Object.freeze({
        kind: 'delve-entrance',
        id: delve.id,
        zoneId: zone.id,
        x: delve.doorPos.x,
        z: delve.doorPos.z,
      }),
    );
  }
  for (const portal of PORTALS) {
    const aZone = zoneContaining(portal.a.x, portal.a.z);
    const bZone = zoneContaining(portal.b.x, portal.b.z);
    // Invalid authored sites are not projected into an unrelated clamped zone.
    // Content guards make this omission a test failure for the shipped world.
    if (!aZone || !bZone) continue;
    landmarks.push(
      Object.freeze({
        kind: 'world-passage',
        id: portal.id,
        side: 'a',
        zoneId: aZone.id,
        destinationZoneId: bZone.id,
        x: portal.a.x,
        z: portal.a.z,
      }),
      Object.freeze({
        kind: 'world-passage',
        id: portal.id,
        side: 'b',
        zoneId: bZone.id,
        destinationZoneId: aZone.id,
        x: portal.b.x,
        z: portal.b.z,
      }),
    );
  }
  return Object.freeze(landmarks);
}

/** Shipped, entity-free navigation sites, constructed once at module load. */
export const STABLE_MAP_NAVIGATION_LANDMARKS = buildStableMapNavigationLandmarks();

const MIR4_MAP_NAVIGATION_LANDMARKS: readonly StableMapNavigationLandmark[] = Object.freeze(
  MIR4_ARC_PORTALS.flatMap((portal, index) => {
    const from = MIR4_WORLD_ARC[index]!;
    const to = MIR4_WORLD_ARC[index + 1]!;
    return [
      Object.freeze({
        kind: 'world-passage' as const,
        id: portal.id,
        side: 'a' as const,
        zoneId: `mir4_${from.mapId}`,
        destinationZoneId: `mir4_${to.mapId}`,
        x: portal.a.x,
        z: portal.a.z,
      }),
      Object.freeze({
        kind: 'world-passage' as const,
        id: portal.id,
        side: 'b' as const,
        zoneId: `mir4_${to.mapId}`,
        destinationZoneId: `mir4_${from.mapId}`,
        x: portal.b.x,
        z: portal.b.z,
      }),
    ];
  }),
);

export function stableMapNavigationLandmarks(
  profile: GameProfile | undefined,
): readonly StableMapNavigationLandmark[] {
  return profile === MIR4_GAME_PROFILE
    ? MIR4_MAP_NAVIGATION_LANDMARKS
    : STABLE_MAP_NAVIGATION_LANDMARKS;
}

export interface LiveRiftZoneMapEntity {
  readonly kind: string;
  readonly templateId: string;
  readonly pos: Readonly<{ x: number; z: number }>;
}

/**
 * Whether one live entity may be disclosed as a Rift entrance on the zone map.
 * Template and object identity are checked before position so the hot entity
 * scan does no distance work for ordinary actors or objects.
 */
export function isNearbyLiveRiftZoneMapEntity(
  entity: LiveRiftZoneMapEntity,
  playerPosition: Readonly<{ x: number; z: number }>,
): boolean {
  if (entity.templateId !== 'rift_portal' || entity.kind !== 'object') return false;
  return isLiveMapEntityDisclosed(playerPosition.x, playerPosition.z, entity.pos.x, entity.pos.z);
}
