// MIR4 travel data adapted to the existing positional portal runtime. The
// source contributes only the ordered map links; entrances, landings and all
// geometry are authored against the procedural 3D bands in this repository.

import { mir4ArcBands } from '../content/mir4/arc_world';
import { mir4ArcRegionLayout } from '../content/mir4/arc_world_layout';
import { MIR4_WORLD_ARC } from '../content/mir4/world_arc';
import type { Mir4ArcMapProjection, PortalDef, WorldContent } from '../types';
import { mir4CampaignMapIdsForWorld } from './campaign_availability';
import { isMir4WocTutorialPortal } from './woc_campaign_portals';

const LANDING_OFFSET = 6;
const MIR4_PORTAL_RADIUS = 3;

function portalSide(
  portal: Readonly<{ x: number; z: number }>,
  hub: Readonly<{ x: number; z: number }>,
  landingOverride?: Readonly<{ x: number; z: number }>,
) {
  const dx = hub.x - portal.x;
  const dz = hub.z - portal.z;
  const length = Math.max(0.001, Math.hypot(dx, dz));
  return {
    x: portal.x,
    z: portal.z,
    landing: {
      x: landingOverride?.x ?? portal.x + (dx / length) * LANDING_OFFSET,
      z: landingOverride?.z ?? portal.z + (dz / length) * LANDING_OFFSET,
      facing: Math.atan2(dx, dz),
    },
  };
}

function buildMir4ArcPortals(projections?: readonly Mir4ArcMapProjection[]): readonly PortalDef[] {
  const bands = projections?.length
    ? MIR4_WORLD_ARC.map((map) => mir4ArcRegionLayout(map.mapId, projections)).filter(
        (band) => band !== null,
      )
    : mir4ArcBands();
  const portals: PortalDef[] = [];
  for (let index = 0; index < bands.length - 1; index++) {
    const from = bands[index]!;
    const to = bands[index + 1]!;
    const fromProjection = projections?.find((projection) => projection.mapId === from.mapId);
    const toProjection = projections?.find((projection) => projection.mapId === to.mapId);
    const fromMap = MIR4_WORLD_ARC[index]!;
    const toMap = MIR4_WORLD_ARC[index + 1]!;
    if (!fromMap.portalTo.includes(toMap.mapId)) continue;
    portals.push({
      id: `mir4_${fromMap.mapId}_to_${toMap.mapId}`,
      a: portalSide(from.portalOut, from.hub, fromProjection?.portalOutLanding),
      b: portalSide(to.portalIn, to.hub, toProjection?.portalInLanding),
      radius: MIR4_PORTAL_RADIUS,
      enterText: `Travelled to ${toMap.name}.`,
      leaveText: `Returned to ${fromMap.name}.`,
    });
  }
  return Object.freeze(portals.map((portal) => Object.freeze(portal)));
}

export const MIR4_ARC_PORTALS = buildMir4ArcPortals();

const worldPortalCache = new WeakMap<WorldContent, readonly PortalDef[]>();

/** Portal links physically present in one authored world. A link is admitted
 * only when both endpoint maps are present, preventing invisible travel into
 * source-data maps that have not passed the map-by-map production gate. */
export function mir4ArcPortalsForWorld(world: WorldContent): readonly PortalDef[] {
  const cached = worldPortalCache.get(world);
  if (cached) return cached;
  if (world.travelPortals) {
    const portals = Object.freeze([...world.travelPortals]);
    worldPortalCache.set(world, portals);
    return portals;
  }
  const available = new Set(mir4CampaignMapIdsForWorld(world));
  const projectedPortals = world.mir4ArcMapProjections?.length
    ? buildMir4ArcPortals(world.mir4ArcMapProjections)
    : MIR4_ARC_PORTALS;
  const portals = Object.freeze(
    projectedPortals.filter((_, index) => {
      const from = MIR4_WORLD_ARC[index];
      const to = MIR4_WORLD_ARC[index + 1];
      return Boolean(from && to && available.has(from.mapId) && available.has(to.mapId));
    }),
  );
  worldPortalCache.set(world, portals);
  return portals;
}

function bandIndexAt(
  pos: Readonly<{ x: number; z: number }>,
  projections?: readonly Mir4ArcMapProjection[],
): number {
  const bands = projections?.length
    ? MIR4_WORLD_ARC.map((map) => mir4ArcRegionLayout(map.mapId, projections)).filter(
        (band) => band !== null,
      )
    : mir4ArcBands();
  const found = bands.findIndex(
    (band) => pos.x >= band.xMin && pos.x < band.xMax && pos.z >= band.zMin && pos.z < band.zMax,
  );
  if (found >= 0) return found;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < bands.length; index++) {
    const band = bands[index]!;
    const dx = Math.max(band.xMin - pos.x, 0, pos.x - band.xMax);
    const dz = Math.max(band.zMin - pos.z, 0, pos.z - band.zMax);
    const distance = dx * dx + dz * dz;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

/** Returns the next reachable automation goal. Cross-map journeys must first
 * enter the reciprocal positional portal; aiming a long local A* segment at
 * the final objective can hit a sealed part of the band edge instead. */
export function mir4PortalRouteGoal(
  from: Readonly<{ x: number; z: number }>,
  destination: Readonly<{ x: number; z: number }>,
  availablePortals: readonly PortalDef[] = MIR4_ARC_PORTALS,
  projections?: readonly Mir4ArcMapProjection[],
  world?: WorldContent,
): { x: number; z: number } {
  if (world?.travelPortals) {
    const zoneAt = (point: Readonly<{ x: number; z: number }>) =>
      world.zones.find(
        (zone) =>
          point.x >= (zone.xMin ?? -180) &&
          point.x < (zone.xMax ?? 180) &&
          point.z >= zone.zMin &&
          point.z < zone.zMax,
      );
    const fromZone = zoneAt(from);
    const destinationZone = zoneAt(destination);
    if (!fromZone || !destinationZone || fromZone.id === destinationZone.id) {
      return { x: destination.x, z: destination.z };
    }
    for (const portal of availablePortals) {
      if (isMir4WocTutorialPortal(portal)) continue;
      const aZone = zoneAt(portal.a);
      const bZone = zoneAt(portal.b);
      if (!aZone || !bZone) continue;
      if (destinationZone.id === bZone.id && fromZone.id !== bZone.id) {
        return { x: portal.a.x, z: portal.a.z };
      }
      if (fromZone.id === bZone.id && destinationZone.id !== bZone.id) {
        return { x: portal.b.x, z: portal.b.z };
      }
    }
    return { x: destination.x, z: destination.z };
  }
  const fromBand = bandIndexAt(from, projections);
  const destinationBand = bandIndexAt(destination, projections);
  if (fromBand === destinationBand) return { x: destination.x, z: destination.z };
  const portalSequence = projections?.length ? buildMir4ArcPortals(projections) : MIR4_ARC_PORTALS;
  const expectedPortal =
    destinationBand > fromBand ? portalSequence[fromBand] : portalSequence[fromBand - 1];
  const portal = expectedPortal
    ? availablePortals.find((candidate) => candidate.id === expectedPortal.id)
    : undefined;
  const side = destinationBand > fromBand ? portal?.a : portal?.b;
  // A missing link is an unavailable world boundary, not permission to plot a
  // straight route through sealed terrain.
  return side ? { x: side.x, z: side.z } : { x: from.x, z: from.z };
}
