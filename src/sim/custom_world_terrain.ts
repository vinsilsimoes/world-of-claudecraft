import { fbm2 } from './rng';
import { BIOME_SHAPE, type TerrainBiomeShape } from './terrain_biome_shape';
import type { BiomeId, WorldContent, ZoneDef } from './types';

const SHAPE_BLEND = 28;
const ROAD_CORE = 4;
const ROAD_SKIRT = 12;
// Custom-world limits are terrain, not invisible walls. A narrow crag face
// supplies the unwalkable physics while a wider shoulder makes the obstacle
// legible from the playfield. Both fade back to ordinary terrain outside the
// authored rectangle: the old constant +18 outside every map produced an
// endless grey plateau that looked like a rendering bug.
const RIM_FACE_HEIGHT = 14;
const RIM_SHOULDER_HEIGHT = 3;
const RIM_INNER_FACE_WIDTH = 7.5;
const RIM_OUTER_FACE_WIDTH = 11;
const RIM_INNER_SHOULDER_WIDTH = 27;
const RIM_OUTER_SHOULDER_WIDTH = 21;
const BIOME_BY_PAINT_ID: readonly BiomeId[] = [
  'vale',
  'marsh',
  'peaks',
  'beach',
  'desert',
  'volcano',
  'cave',
  'dusk',
  'ember',
  'frost',
  'amber',
  'fen',
  'night',
  'haunt',
  'jungle',
  'garden',
  'gale',
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function zoneXMin(zone: ZoneDef): number {
  return zone.xMin ?? -160;
}

function zoneXMax(zone: ZoneDef): number {
  return zone.xMax ?? 160;
}

function rectDistanceSq(zone: ZoneDef, x: number, z: number): number {
  const dx = Math.max(zoneXMin(zone) - x, 0, x - zoneXMax(zone));
  const dz = Math.max(zone.zMin - z, 0, z - zone.zMax);
  return dx * dx + dz * dz;
}

function zoneFor(content: WorldContent, x: number, z: number): ZoneDef {
  const containing = content.zones.find(
    (zone) => x >= zoneXMin(zone) && x < zoneXMax(zone) && z >= zone.zMin && z < zone.zMax,
  );
  if (containing) return containing;
  let nearest = content.zones[0];
  let best = nearest ? rectDistanceSq(nearest, x, z) : Number.POSITIVE_INFINITY;
  for (let i = 1; i < content.zones.length; i++) {
    const candidate = content.zones[i];
    const distance = rectDistanceSq(candidate, x, z);
    if (distance < best) {
      nearest = candidate;
      best = distance;
    }
  }
  if (!nearest) throw new Error('custom WorldContent requires at least one zone');
  return nearest;
}

/**
 * Signed distance to the nearest authored zone rectangle: positive on the
 * playable side, negative in the void between regions. This geometric fact is
 * shared by the ridge profile and the movement hot-path's cheap proximity
 * screen; neither invents a collision volume that the renderer cannot show.
 */
export function customWorldRimDistance(content: WorldContent, x: number, z: number): number {
  const containing = content.zones.find(
    (zone) => x >= zoneXMin(zone) && x < zoneXMax(zone) && z >= zone.zMin && z < zone.zMax,
  );
  if (containing) {
    const xMin = zoneXMin(containing);
    const xMax = zoneXMax(containing);
    let westShared = false;
    let eastShared = false;
    let southShared = false;
    let northShared = false;
    for (const candidate of content.zones) {
      if (candidate === containing) continue;
      const overlapsZ = z >= candidate.zMin && z < candidate.zMax;
      const overlapsX = x >= zoneXMin(candidate) && x < zoneXMax(candidate);
      if (overlapsZ && zoneXMax(candidate) === xMin) westShared = true;
      if (overlapsZ && zoneXMin(candidate) === xMax) eastShared = true;
      if (overlapsX && candidate.zMax === containing.zMin) southShared = true;
      if (overlapsX && candidate.zMin === containing.zMax) northShared = true;
    }
    let distance = Number.POSITIVE_INFINITY;
    if (!westShared) distance = Math.min(distance, x - xMin);
    if (!eastShared) distance = Math.min(distance, xMax - x);
    if (!southShared) distance = Math.min(distance, z - containing.zMin);
    if (!northShared) distance = Math.min(distance, containing.zMax - z);
    return distance;
  }
  const zone = zoneFor(content, x, z);
  const dx = Math.max(zoneXMin(zone) - x, 0, x - zoneXMax(zone));
  const dz = Math.max(zone.zMin - z, 0, z - zone.zMax);
  return -Math.hypot(dx, dz);
}

export function nearCustomWorldRim(
  content: WorldContent,
  x: number,
  z: number,
  margin = RIM_INNER_SHOULDER_WIDTH + 4,
): boolean {
  return Math.abs(customWorldRimDistance(content, x, z)) <= margin;
}

function paintedBiomeAt(content: WorldContent, x: number, z: number): BiomeId | null {
  const paint = content.biomePaint;
  if (!paint || paint.affectsTerrain === false) return null;
  const col = Math.floor((x - paint.originX) / paint.cell);
  const row = Math.floor((z - paint.originZ) / paint.cell);
  if (col < 0 || row < 0 || col >= paint.cols || row >= paint.rows) return null;
  return BIOME_BY_PAINT_ID[paint.ids[row * paint.cols + col] ?? 255] ?? null;
}

function blendShape(
  first: TerrainBiomeShape,
  second: TerrainBiomeShape,
  t: number,
): TerrainBiomeShape {
  return {
    hill: lerp(first.hill, second.hill, t),
    base: lerp(first.base, second.base, t),
    hubHeight: lerp(first.hubHeight, second.hubHeight, t),
    crag: lerp(first.crag, second.crag, t),
  };
}

function sharedEdgesAt(
  content: WorldContent,
  zone: ZoneDef,
  x: number,
  z: number,
): { west: boolean; east: boolean; south: boolean; north: boolean } {
  const xMin = zoneXMin(zone);
  const xMax = zoneXMax(zone);
  let west = false;
  let east = false;
  let south = false;
  let north = false;
  for (const candidate of content.zones) {
    if (candidate === zone) continue;
    const overlapsZ = z >= candidate.zMin && z < candidate.zMax;
    const overlapsX = x >= zoneXMin(candidate) && x < zoneXMax(candidate);
    if (overlapsZ && zoneXMax(candidate) === xMin) west = true;
    if (overlapsZ && zoneXMin(candidate) === xMax) east = true;
    if (overlapsX && candidate.zMax === zone.zMin) south = true;
    if (overlapsX && candidate.zMin === zone.zMax) north = true;
  }
  return { west, east, south, north };
}

function shapeAt(content: WorldContent, x: number, z: number): TerrainBiomeShape {
  const painted = paintedBiomeAt(content, x, z);
  if (painted) return BIOME_SHAPE[painted];
  const zone = zoneFor(content, x, z);
  let shape = BIOME_SHAPE[zone.biome];
  const south = content.zones.find(
    (candidate) =>
      candidate.zMax === zone.zMin &&
      x >= Math.max(zoneXMin(zone), zoneXMin(candidate)) &&
      x < Math.min(zoneXMax(zone), zoneXMax(candidate)),
  );
  if (south && z < zone.zMin + SHAPE_BLEND) {
    shape = blendShape(
      BIOME_SHAPE[south.biome],
      shape,
      smoothstep(zone.zMin - SHAPE_BLEND, zone.zMin + SHAPE_BLEND, z),
    );
  }
  const north = content.zones.find(
    (candidate) =>
      candidate.zMin === zone.zMax &&
      x >= Math.max(zoneXMin(zone), zoneXMin(candidate)) &&
      x < Math.min(zoneXMax(zone), zoneXMax(candidate)),
  );
  if (north && z > zone.zMax - SHAPE_BLEND) {
    shape = blendShape(
      shape,
      BIOME_SHAPE[north.biome],
      smoothstep(zone.zMax - SHAPE_BLEND, zone.zMax + SHAPE_BLEND, z),
    );
  }
  let west: ZoneDef | undefined;
  let westTangent = Infinity;
  let east: ZoneDef | undefined;
  let eastTangent = Infinity;
  for (const candidate of content.zones) {
    if (candidate === zone) continue;
    const overlapMin = Math.max(zone.zMin, candidate.zMin);
    const overlapMax = Math.min(zone.zMax, candidate.zMax);
    if (overlapMin >= overlapMax) continue;
    const tangent = intervalDistance(z, overlapMin, overlapMax);
    if (zoneXMax(candidate) === zoneXMin(zone) && tangent < westTangent) {
      west = candidate;
      westTangent = tangent;
    }
    if (zoneXMin(candidate) === zoneXMax(zone) && tangent < eastTangent) {
      east = candidate;
      eastTangent = tangent;
    }
  }
  if (west && westTangent < SHAPE_BLEND && x < zoneXMin(zone) + SHAPE_BLEND) {
    const across = blendShape(
      BIOME_SHAPE[west.biome],
      shape,
      smoothstep(zoneXMin(zone) - SHAPE_BLEND, zoneXMin(zone) + SHAPE_BLEND, x),
    );
    shape = blendShape(shape, across, 1 - smoothstep(0, SHAPE_BLEND, westTangent));
  }
  if (east && eastTangent < SHAPE_BLEND && x > zoneXMax(zone) - SHAPE_BLEND) {
    const across = blendShape(
      shape,
      BIOME_SHAPE[east.biome],
      smoothstep(zoneXMax(zone) - SHAPE_BLEND, zoneXMax(zone) + SHAPE_BLEND, x),
    );
    shape = blendShape(shape, across, 1 - smoothstep(0, SHAPE_BLEND, eastTangent));
  }
  return shape;
}

function naturalHeight(content: WorldContent, x: number, z: number, seed: number): number {
  const shape = shapeAt(content, x, z);
  const broad = fbm2(x * 0.012 + 100, z * 0.012 + 100, seed, 4);
  const detail = fbm2(x * 0.05, z * 0.05, seed + 7, 2);
  return shape.base + (broad - 0.5) * shape.hill + (detail - 0.5) * (0.8 + shape.hill * 0.045);
}

function flattenRoads(
  content: WorldContent,
  x: number,
  z: number,
  seed: number,
  height: number,
): number {
  let result = height;
  for (const road of content.roads) {
    for (let i = 0; i + 1 < road.length; i++) {
      const a = road[i];
      const b = road[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const lengthSq = abx * abx + abz * abz;
      const along = lengthSq > 0 ? clamp01(((x - a.x) * abx + (z - a.z) * abz) / lengthSq) : 0;
      const px = a.x + abx * along;
      const pz = a.z + abz * along;
      const distance = Math.hypot(x - px, z - pz);
      if (distance >= ROAD_SKIRT) continue;
      const weight = 1 - smoothstep(ROAD_CORE, ROAD_SKIRT, distance);
      result = lerp(result, naturalHeight(content, px, pz, seed), weight);
    }
  }
  return result;
}

function flattenSettlementsAndCamps(
  content: WorldContent,
  x: number,
  z: number,
  seed: number,
  height: number,
): number {
  let result = height;
  for (const zone of content.zones) {
    const distance = Math.hypot(x - zone.hub.x, z - zone.hub.z);
    if (distance >= zone.hub.radius * 1.6) continue;
    const weight = 1 - smoothstep(zone.hub.radius * 0.72, zone.hub.radius * 1.6, distance);
    result = lerp(result, BIOME_SHAPE[zone.biome].hubHeight, weight);
  }
  for (const camp of content.camps) {
    const distance = Math.hypot(x - camp.center.x, z - camp.center.z);
    if (distance >= camp.radius * 1.55) continue;
    const weight = 1 - smoothstep(camp.radius * 0.85, camp.radius * 1.55, distance);
    result = lerp(result, naturalHeight(content, camp.center.x, camp.center.z, seed), weight);
  }
  return result;
}

function shapeLakes(content: WorldContent, x: number, z: number, height: number): number {
  let result = height;
  const surface = content.waterLevel ?? -4.3;
  for (const zone of content.zones) {
    for (const lake of zone.lakes) {
      const distance = Math.hypot(x - lake.x, z - lake.z);
      if (distance >= lake.radius * 1.6) continue;
      const blend = smoothstep(lake.radius * 0.55, lake.radius * 1.6, distance);
      result = lerp(surface - 4, result, blend);
    }
  }
  return result;
}

function restoreDryCrossings(
  content: WorldContent,
  x: number,
  z: number,
  dryHeight: number,
  lakeHeight: number,
): number {
  let result = lakeHeight;
  for (const crossing of content.dryCrossings ?? []) {
    const distance = Math.hypot(x - crossing.x, z - crossing.z);
    const shoulder = crossing.radius + 4;
    if (distance >= shoulder) continue;
    const weight = 1 - smoothstep(crossing.radius, shoulder, distance);
    result = Math.max(result, lerp(lakeHeight, dryHeight, weight));
  }
  return result;
}

function intervalDistance(value: number, min: number, max: number): number {
  return Math.max(min - value, 0, value - max);
}

function rimContribution(signedDistance: number, tangentDistance: number): number {
  const inside = signedDistance >= 0;
  const distance = Math.abs(signedDistance);
  const faceWidth = inside ? RIM_INNER_FACE_WIDTH : RIM_OUTER_FACE_WIDTH;
  const shoulderWidth = inside ? RIM_INNER_SHOULDER_WIDTH : RIM_OUTER_SHOULDER_WIDTH;
  if (distance >= shoulderWidth || tangentDistance >= RIM_OUTER_SHOULDER_WIDTH) return 0;
  const face = 1 - smoothstep(0, faceWidth, distance);
  const shoulder = 1 - smoothstep(0, shoulderWidth, distance);
  const tangentFade = 1 - smoothstep(0, RIM_OUTER_SHOULDER_WIDTH, tangentDistance);
  // Keep the transverse face invariant. Tangential noise introduces a slope
  // along the wall that can slide a stationary or hard-controlled character,
  // and it can make the camera pulse while walking beside the boundary.
  return (face * RIM_FACE_HEIGHT + shoulder * RIM_SHOULDER_HEIGHT) * tangentFade;
}

function exposedEdgeFactor(
  content: WorldContent,
  zone: ZoneDef,
  side: 'west' | 'east' | 'south' | 'north',
  tangent: number,
): number {
  const xMin = zoneXMin(zone);
  const xMax = zoneXMax(zone);
  let nearestSharedEnd = Infinity;
  for (const candidate of content.zones) {
    if (candidate === zone) continue;
    const sharesLine =
      side === 'west'
        ? zoneXMax(candidate) === xMin
        : side === 'east'
          ? zoneXMin(candidate) === xMax
          : side === 'south'
            ? candidate.zMax === zone.zMin
            : candidate.zMin === zone.zMax;
    if (!sharesLine) continue;
    const overlapMin =
      side === 'west' || side === 'east'
        ? Math.max(zone.zMin, candidate.zMin)
        : Math.max(xMin, zoneXMin(candidate));
    const overlapMax =
      side === 'west' || side === 'east'
        ? Math.min(zone.zMax, candidate.zMax)
        : Math.min(xMax, zoneXMax(candidate));
    if (overlapMin >= overlapMax) continue;
    const distance = intervalDistance(tangent, overlapMin, overlapMax);
    if (distance === 0) return 0;
    nearestSharedEnd = Math.min(nearestSharedEnd, distance);
  }
  return Number.isFinite(nearestSharedEnd)
    ? smoothstep(0, RIM_OUTER_SHOULDER_WIDTH, nearestSharedEnd)
    : 1;
}

function outerRim(content: WorldContent, x: number, z: number): number {
  let height = 0;
  // Sum nearby exposed segments so a partially shared edge gets a rounded cap
  // from the neighboring rectangle. Looking only at the containing rectangle
  // creates either an abrupt 17-yard step at the end of the shared segment or
  // a tapered hole that can be crossed diagonally.
  for (const zone of content.zones) {
    const xMin = zoneXMin(zone);
    const xMax = zoneXMax(zone);
    const zOutside = intervalDistance(z, zone.zMin, zone.zMax);
    const xOutside = intervalDistance(x, xMin, xMax);
    if (zOutside < RIM_OUTER_SHOULDER_WIDTH) {
      const west = rimContribution(x - xMin, zOutside);
      const east = rimContribution(xMax - x, zOutside);
      if (west > 0) height += west * exposedEdgeFactor(content, zone, 'west', z);
      if (east > 0) height += east * exposedEdgeFactor(content, zone, 'east', z);
    }
    if (xOutside < RIM_OUTER_SHOULDER_WIDTH) {
      const south = rimContribution(z - zone.zMin, xOutside);
      const north = rimContribution(zone.zMax - z, xOutside);
      if (south > 0) height += south * exposedEdgeFactor(content, zone, 'south', x);
      if (north > 0) height += north * exposedEdgeFactor(content, zone, 'north', x);
    }
  }
  return height;
}

function intervalsOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMin < bMax && aMax > bMin;
}

/** True when a render cell overlaps any authored custom-world perimeter. */
export function customWorldRimIntersectsRect(
  content: WorldContent,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  margin = RIM_INNER_SHOULDER_WIDTH + 4,
): boolean {
  for (const zone of content.zones) {
    const xMin = zoneXMin(zone);
    const xMax = zoneXMax(zone);
    if (
      intervalsOverlap(minX, maxX, xMin - margin, xMin + margin) &&
      intervalsOverlap(minZ, maxZ, zone.zMin - margin, zone.zMax + margin)
    ) {
      return true;
    }
    if (
      intervalsOverlap(minX, maxX, xMax - margin, xMax + margin) &&
      intervalsOverlap(minZ, maxZ, zone.zMin - margin, zone.zMax + margin)
    ) {
      return true;
    }
    if (
      intervalsOverlap(minZ, maxZ, zone.zMin - margin, zone.zMin + margin) &&
      intervalsOverlap(minX, maxX, xMin - margin, xMax + margin)
    ) {
      return true;
    }
    if (
      intervalsOverlap(minZ, maxZ, zone.zMax - margin, zone.zMax + margin) &&
      intervalsOverlap(minX, maxX, xMin - margin, xMax + margin)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Generic deterministic heightfield for injected worlds. It intentionally
 * excludes every named WoC coast, massif and landmark pad; those belong only
 * to the built-in topology. WorldContent zones, roads, camps and lakes are the
 * complete authority here, with editor height stamps applied by world.ts.
 */
export function customWorldTerrainHeight(
  content: WorldContent,
  x: number,
  z: number,
  seed: number,
): number {
  let height = naturalHeight(content, x, z, seed);
  height = flattenRoads(content, x, z, seed, height);
  height = flattenSettlementsAndCamps(content, x, z, seed, height);
  height += outerRim(content, x, z);
  const minimumDryLand = (content.waterLevel ?? -4.3) + 1.4;
  if (height < minimumDryLand) height = minimumDryLand;
  const dryHeight = height;
  const lakeHeight = shapeLakes(content, x, z, height);
  return restoreDryCrossings(content, x, z, dryHeight, lakeHeight);
}
