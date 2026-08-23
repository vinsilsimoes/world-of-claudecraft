import { afterEach, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../src/sim/content/mir4/arc_world';
import { MIR4_ARC_REGION_LAYOUTS } from '../src/sim/content/mir4/arc_world_layout';
import {
  customWorldRimDistance,
  customWorldRimIntersectsRect,
  customWorldTerrainHeight,
  nearCustomWorldRim,
} from '../src/sim/custom_world_terrain';
import { setActiveWorldContent } from '../src/sim/data';
import { PLAYER_MAX_CLIMB_SLOPE } from '../src/sim/pathfind';
import { terrainSteepnessAt } from '../src/sim/world';

const SEED = 181;

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

afterEach(() => {
  setActiveWorldContent(null);
});

describe('custom-world physical map limits', () => {
  it('builds a finite visible ridge instead of raising the whole void beyond a map', () => {
    const world = buildMir4ArcWorld(1);
    const region = required(MIR4_ARC_REGION_LAYOUTS[0], 'M01 region');
    const z = region.hub.z + 36;
    let crest = Number.NEGATIVE_INFINITY;
    for (let x = region.xMin - 10; x <= region.xMin + 10; x += 0.5) {
      crest = Math.max(crest, customWorldTerrainHeight(world, x, z, SEED));
    }
    const outerGround = customWorldTerrainHeight(world, region.xMin - 42, z, SEED);

    expect(Number.isFinite(crest)).toBe(true);
    expect(Number.isFinite(outerGround)).toBe(true);
    expect(crest - outerGround).toBeGreaterThan(8);
    for (const point of [
      { x: region.xMin - 160, z },
      { x: region.xMax + 160, z },
      { x: region.hub.x, z: region.zMin - 160 },
      { x: region.hub.x, z: region.zMax + 160 },
    ]) {
      const height = customWorldTerrainHeight(world, point.x, point.z, SEED);
      expect(Number.isFinite(height)).toBe(true);
      expect(height, `${point.x},${point.z}`).toBeLessThan(crest - 5);
    }
  });

  it('makes the visible ridge physically unwalkable while ordinary interior ground stays walkable', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const region = required(MIR4_ARC_REGION_LAYOUTS[1], 'M02 region');
    const midX = (region.xMin + region.xMax) / 2;
    const midZ = (region.zMin + region.zMax) / 2;
    const probes = [
      { label: 'west', at: (offset: number) => ({ x: region.xMin + offset, z: midZ }) },
      { label: 'east', at: (offset: number) => ({ x: region.xMax - offset, z: midZ }) },
      { label: 'south', at: (offset: number) => ({ x: midX, z: region.zMin + offset }) },
      { label: 'north', at: (offset: number) => ({ x: midX, z: region.zMax - offset }) },
    ];
    for (const probe of probes) {
      let ridgeSlope = 0;
      for (let offset = -6; offset <= 20; offset += 0.5) {
        const point = probe.at(offset);
        ridgeSlope = Math.max(ridgeSlope, terrainSteepnessAt(point.x, point.z, SEED));
      }
      expect(ridgeSlope, probe.label).toBeGreaterThan(PLAYER_MAX_CLIMB_SLOPE);
    }
    expect(terrainSteepnessAt(region.hub.x, region.hub.z + 36, SEED)).toBeLessThan(
      PLAYER_MAX_CLIMB_SLOPE,
    );
  });

  it('leaves a shared edge between touching zones open instead of drawing a hidden border', () => {
    const world = buildMir4ArcWorld(2);
    const west = required(world.zones[0], 'west zone');
    const east = required(world.zones[1], 'east zone');
    east.xMin = west.xMax;
    east.xMax = required(west.xMax, 'west max') + 280;
    east.zMin = west.zMin;
    east.zMax = west.zMax;
    const x = required(west.xMax, 'shared edge');
    const z = (west.zMin + west.zMax) / 2;

    expect(customWorldRimDistance(world, x, z)).toBeGreaterThan(50);
    expect(nearCustomWorldRim(world, x, z)).toBe(false);
    const westHeight = customWorldTerrainHeight(world, x - 0.25, z, SEED);
    const seamHeight = customWorldTerrainHeight(world, x, z, SEED);
    const eastHeight = customWorldTerrainHeight(world, x + 0.25, z, SEED);
    expect(Math.abs(seamHeight - westHeight) / 0.25).toBeLessThan(PLAYER_MAX_CLIMB_SLOPE);
    expect(Math.abs(eastHeight - seamHeight) / 0.25).toBeLessThan(PLAYER_MAX_CLIMB_SLOPE);
  });

  it('rounds the end of a partially shared edge without a vertical discontinuity', () => {
    const world = buildMir4ArcWorld(2);
    const west = required(world.zones[0], 'west zone');
    const east = required(world.zones[1], 'east zone');
    east.xMin = west.xMax;
    east.xMax = required(west.xMax, 'west max') + 280;
    east.zMin = west.zMin;
    east.zMax = west.zMin + 120;
    const x = required(west.xMax, 'shared edge') - 1;
    const endpoint = east.zMax;
    const before = customWorldTerrainHeight(world, x, endpoint - 0.1, SEED);
    const after = customWorldTerrainHeight(world, x, endpoint + 0.1, SEED);

    expect(Math.abs(after - before) / 0.2).toBeLessThan(PLAYER_MAX_CLIMB_SLOPE);
  });

  it('closes every authored rectangle with a continuously steep visible face, including corners', () => {
    const world = buildMir4ArcWorld(20);
    const maxOutwardAscent = (points: readonly { x: number; z: number }[]): number => {
      let steepest = Number.NEGATIVE_INFINITY;
      let previous = customWorldTerrainHeight(world, points[0]!.x, points[0]!.z, SEED);
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index]!;
        const next = customWorldTerrainHeight(world, point.x, point.z, SEED);
        const priorPoint = points[index - 1]!;
        const distance = Math.hypot(point.x - priorPoint.x, point.z - priorPoint.z);
        steepest = Math.max(steepest, (next - previous) / distance);
        previous = next;
      }
      return steepest;
    };

    for (const region of MIR4_ARC_REGION_LAYOUTS) {
      for (let z = region.zMin + 2; z <= region.zMax - 2; z += 4) {
        const west = Array.from({ length: 53 }, (_, index) => ({
          x: region.xMin + 20 - index * 0.5,
          z,
        }));
        const east = Array.from({ length: 53 }, (_, index) => ({
          x: region.xMax - 20 + index * 0.5,
          z,
        }));
        expect(maxOutwardAscent(west), `${region.mapId} west at ${z}`).toBeGreaterThan(
          PLAYER_MAX_CLIMB_SLOPE,
        );
        expect(maxOutwardAscent(east), `${region.mapId} east at ${z}`).toBeGreaterThan(
          PLAYER_MAX_CLIMB_SLOPE,
        );
      }
      for (let x = region.xMin + 2; x <= region.xMax - 2; x += 4) {
        const south = Array.from({ length: 53 }, (_, index) => ({
          x,
          z: region.zMin + 20 - index * 0.5,
        }));
        const north = Array.from({ length: 53 }, (_, index) => ({
          x,
          z: region.zMax - 20 + index * 0.5,
        }));
        expect(maxOutwardAscent(south), `${region.mapId} south at ${x}`).toBeGreaterThan(
          PLAYER_MAX_CLIMB_SLOPE,
        );
        expect(maxOutwardAscent(north), `${region.mapId} north at ${x}`).toBeGreaterThan(
          PLAYER_MAX_CLIMB_SLOPE,
        );
      }
      for (const [xSide, zSide] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const cornerX = xSide < 0 ? region.xMin : region.xMax;
        const cornerZ = zSide < 0 ? region.zMin : region.zMax;
        const diagonal = Array.from({ length: 45 }, (_, index) => {
          const offset = 16 - index * 0.5;
          return { x: cornerX - xSide * offset, z: cornerZ - zSide * offset };
        });
        expect(
          maxOutwardAscent(diagonal),
          `${region.mapId} corner ${xSide},${zSide}`,
        ).toBeGreaterThan(PLAYER_MAX_CLIMB_SLOPE);
      }
    }
  }, 30_000);

  it('marks renderer chunks touching a custom-world ridge even when their center is in a gap', () => {
    const world = buildMir4ArcWorld(20);
    const region = required(MIR4_ARC_REGION_LAYOUTS[1], 'M02 region');
    expect(
      customWorldRimIntersectsRect(
        world,
        region.xMin - 40,
        region.hub.z,
        region.xMin + 20,
        region.hub.z + 60,
        40,
      ),
    ).toBe(true);
  });
});
