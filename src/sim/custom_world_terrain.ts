import { fbm2 } from './rng';
import { BIOME_SHAPE, type TerrainBiomeShape } from './terrain_biome_shape';
import type { BiomeId, WorldContent, ZoneDef } from './types';
import { worldContentBounds } from './world_content_bounds';

const SHAPE_BLEND = 28;
const ROAD_CORE = 4;
const ROAD_SKIRT = 12;
const SIDE_RIM_WIDTH = 22;
const SIDE_RIM_HEIGHT = 18;
const BIOME_BY_PAINT_ID: readonly BiomeId[] = [
  'vale',
  'marsh',
  'peaks',
  'beach',
  'desert',
  'volcano',
  'cave',
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

function paintedBiomeAt(content: WorldContent, x: number, z: number): BiomeId | null {
  const paint = content.biomePaint;
  if (!paint) return null;
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

function outerRim(content: WorldContent, x: number, z: number): number {
  const zone = zoneFor(content, x, z);
  const bounds = worldContentBounds(content, -160, 160);
  const edgeDistance = Math.min(
    x - zoneXMin(zone),
    zoneXMax(zone) - x,
    bounds ? z - bounds.minZ : Number.POSITIVE_INFINITY,
    bounds ? bounds.maxZ - z : Number.POSITIVE_INFINITY,
  );
  return SIDE_RIM_HEIGHT * (1 - smoothstep(0, SIDE_RIM_WIDTH, edgeDistance));
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
  return shapeLakes(content, x, z, height);
}
