// Pure authority adapter for navigation sites that do not exist as ordinary
// world entities. The authored delve doors and two-way overworld passages are
// immutable shipped content, while live Rift entrances remain entity-backed and
// deliberately obey the same 80-yard information boundary as their world art.

import { MIR4_WORLD_ARC } from '../sim/content/mir4/world_arc';
import { DELVE_LIST, PORTALS, zoneContaining } from '../sim/data';
import { type GameProfile, MIR4_GAME_PROFILE } from '../sim/game_profile';
import { mir4CampaignMapIdsForWorld } from '../sim/mir4/campaign_availability';
import { MIR4_ARC_PORTALS, mir4ArcPortalsForWorld } from '../sim/mir4/travel';
import type { WorldContent } from '../sim/types';
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

const MIR4_WORLD_NAVIGATION_CACHE = new WeakMap<
  WorldContent,
  readonly StableMapNavigationLandmark[]
>();

export function stableMapNavigationLandmarks(
  profile: GameProfile | undefined,
  world?: WorldContent,
): readonly StableMapNavigationLandmark[] {
  if (profile !== MIR4_GAME_PROFILE) return STABLE_MAP_NAVIGATION_LANDMARKS;
  if (world === undefined) return MIR4_MAP_NAVIGATION_LANDMARKS;
  const cached = MIR4_WORLD_NAVIGATION_CACHE.get(world);
  if (cached) return cached;
  if (world.travelPortals) {
    const zoneAt = (point: Readonly<{ x: number; z: number }>) =>
      world.zones.find(
        (zone) =>
          point.x >= (zone.xMin ?? -180) &&
          point.x < (zone.xMax ?? 180) &&
          point.z >= zone.zMin &&
          point.z < zone.zMax,
      );
    const landmarks = Object.freeze(
      world.travelPortals.flatMap((portal) => {
        const aZone = zoneAt(portal.a);
        const bZone = zoneAt(portal.b);
        if (!aZone || !bZone) return [];
        return [
          Object.freeze({
            kind: 'world-passage' as const,
            id: portal.id,
            side: 'a' as const,
            zoneId: aZone.id,
            destinationZoneId: bZone.id,
            x: portal.a.x,
            z: portal.a.z,
          }),
          Object.freeze({
            kind: 'world-passage' as const,
            id: portal.id,
            side: 'b' as const,
            zoneId: bZone.id,
            destinationZoneId: aZone.id,
            x: portal.b.x,
            z: portal.b.z,
          }),
        ];
      }),
    );
    MIR4_WORLD_NAVIGATION_CACHE.set(world, landmarks);
    return landmarks;
  }
  if (world.mir4ArcMapProjections?.length) {
    const projectionByMap = new Map(
      world.mir4ArcMapProjections.map((projection) => [projection.mapId, projection] as const),
    );
    const portals = mir4ArcPortalsForWorld(world);
    const projected = Object.freeze(
      portals.flatMap((portal, index) => {
        const from = world.mir4ArcMapProjections?.[index];
        const to = world.mir4ArcMapProjections?.[index + 1];
        if (!from || !to || !projectionByMap.has(from.mapId) || !projectionByMap.has(to.mapId)) {
          return [];
        }
        return [
          Object.freeze({
            kind: 'world-passage' as const,
            id: portal.id,
            side: 'a' as const,
            zoneId: from.targetZoneId,
            destinationZoneId: to.targetZoneId,
            x: portal.a.x,
            z: portal.a.z,
          }),
          Object.freeze({
            kind: 'world-passage' as const,
            id: portal.id,
            side: 'b' as const,
            zoneId: to.targetZoneId,
            destinationZoneId: from.targetZoneId,
            x: portal.b.x,
            z: portal.b.z,
          }),
        ];
      }),
    );
    MIR4_WORLD_NAVIGATION_CACHE.set(world, projected);
    return projected;
  }
  const campaignMapIds = mir4CampaignMapIdsForWorld(world);
  const admittedZones = new Set(campaignMapIds.map((mapId) => `mir4_${mapId}`));
  const landmarks = Object.freeze(
    MIR4_MAP_NAVIGATION_LANDMARKS.filter(
      (landmark) =>
        landmark.kind === 'world-passage' &&
        admittedZones.has(landmark.zoneId) &&
        admittedZones.has(landmark.destinationZoneId),
    ),
  );
  MIR4_WORLD_NAVIGATION_CACHE.set(world, landmarks);
  return landmarks;
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
