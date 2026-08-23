import { afterEach, describe, expect, it } from 'vitest';
import { buildFarTerrain } from '../../src/render/far_terrain';
import {
  createFarTileBuilder,
  FAR_WORLD_MARGIN,
  farGroundColor,
  farVertexHeight,
  farWorldBounds,
  planFarTiles,
} from '../../src/render/far_terrain_core';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';

afterEach(() => setActiveWorldContent(null));

describe('MIR4 far terrain presentation', () => {
  it('colors M03 far terrain from the painted refuge and gorge biomes', () => {
    const world = buildMir4ArcWorld(3);
    const terrainOnly = { ...world, biomePaint: undefined };
    const colorAt = (x: number, z: number): [number, number, number] => {
      const out: [number, number, number] = [0, 0, 0];
      farGroundColor(x, z, 10, 0.02, 0.1, 0.1, 171, out);
      return out;
    };

    setActiveWorldContent(world);
    const paintedRefuge = colorAt(4425, 215);
    const paintedGorge = colorAt(4980, 35);
    setActiveWorldContent(terrainOnly);
    expect(paintedRefuge).not.toEqual(colorAt(4425, 215));
    expect(paintedGorge).not.toEqual(colorAt(4980, 35));
  });

  it('plans the horizon around all 20 active maps instead of the classic atlas', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);

    const bounds = farWorldBounds();
    expect(bounds).toEqual({
      minX: Math.min(...world.zones.map((zone) => zone.xMin ?? zone.hub.x - zone.hub.radius)),
      maxX: Math.max(...world.zones.map((zone) => zone.xMax ?? zone.hub.x + zone.hub.radius)),
      minZ: Math.min(...world.zones.map((zone) => zone.zMin)),
      maxZ: Math.max(...world.zones.map((zone) => zone.zMax)),
    });
    const tiles = planFarTiles(bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ);
    expect(Math.min(...tiles.map((tile) => tile.x0))).toBeLessThanOrEqual(
      bounds.minX - FAR_WORLD_MARGIN,
    );
    expect(Math.max(...tiles.map((tile) => tile.x0 + tile.size))).toBeGreaterThanOrEqual(
      bounds.maxX + FAR_WORLD_MARGIN,
    );
    expect(Math.min(...tiles.map((tile) => tile.z0))).toBeLessThanOrEqual(
      bounds.minZ - FAR_WORLD_MARGIN,
    );
    expect(Math.max(...tiles.map((tile) => tile.z0 + tile.size))).toBeGreaterThanOrEqual(
      bounds.maxZ + FAR_WORLD_MARGIN,
    );

    setActiveWorldContent(null);
    expect(farWorldBounds()).not.toEqual(bounds);
  });

  it('builds finite far-surface geometry inside the final map', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const last = world.zones.at(-1);
    if (!last) throw new Error('missing final MIR4 zone');
    const tile = {
      x0: last.hub.x - 12,
      z0: last.hub.z - 12,
      size: 24,
      cx: last.hub.x,
      cz: last.hub.z,
    };
    const builder = createFarTileBuilder(tile, 12, 171);
    while (!builder.step(100)) {
      // The builder is deliberately incremental; exhaust it deterministically.
    }
    const data = builder.result();
    expect(Array.from(data.positions).every(Number.isFinite)).toBe(true);
    expect(Array.from(data.colors).every(Number.isFinite)).toBe(true);
    expect(data.minY).toBeLessThanOrEqual(data.maxY);
  });

  it('closes an injected world with inland lakes using land instead of an ocean apron', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const bounds = farWorldBounds();
    const x = (bounds.minX + bounds.maxX) / 2;
    const edge = farVertexHeight(x, bounds.maxZ, 24, 171);
    const horizon = farVertexHeight(x, bounds.maxZ + 100, 24, 171);

    expect(horizon).toBeGreaterThan((world.waterLevel ?? -4.3) + 1.4);
    expect(Math.abs(edge - horizon)).toBeLessThan(8);
  });

  it('uses the ocean apron only when declared custom water reaches the world edge', () => {
    const world = buildMir4ArcWorld(20);
    const last = world.zones.at(-1);
    if (!last) throw new Error('missing final MIR4 zone');
    last.lakes.push({ x: last.hub.x, z: last.zMax - 4, radius: 12 });
    setActiveWorldContent(world);
    const bounds = farWorldBounds();
    const horizon = farVertexHeight(last.hub.x, bounds.maxZ + 100, 24, 171);

    expect(horizon).toBe((world.waterLevel ?? -4.3) - 6);
  });

  it('instantiates and completes the real far painter over the active 20-map world', async () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const view = buildFarTerrain(
      171,
      { enabled: true, spacing: 96, envelopeFar: 4_400, cameraFar: 4_800 },
      world.zones[0]?.hub,
    );
    expect(view.plannedTileCount()).toBeGreaterThan(0);
    await view.accelerateInitialBuild();
    expect(view.builtTileCount()).toBe(view.plannedTileCount());
    expect(view.group.children).toHaveLength(view.plannedTileCount());
    view.update(
      world.zones.at(-1)?.hub.x ?? 0,
      world.zones.at(-1)?.hub.z ?? 3_900,
      240,
      4_800,
      true,
    );
    expect(view.group.visible).toBe(true);
    view.dispose();
  });
});
