import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

function mockEmptyTerrainAssets(): void {
  vi.doMock('../../src/render/assets/loader', () => ({
    loadKtx2Texture: vi.fn(() => new Promise(() => {})),
    loadTexture: vi.fn(() => new Promise(() => {})),
  }));
  const texture = (): THREE.DataTexture => {
    const data = new Uint8Array([255, 255, 255, 255]);
    return new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  };
  vi.doMock('../../src/render/textures', () => ({
    groundDetailTexture: vi.fn(texture),
    groundSplatMaps: vi.fn(() => ({
      grass: texture(),
      dirt: texture(),
      rock: texture(),
      sand: texture(),
      mud: texture(),
      snow: texture(),
    })),
    macroNoiseTexture: vi.fn(texture),
  }));
}

afterEach(async () => {
  vi.useRealTimers();
  const { setActiveWorldContent } = await import('../../src/sim/data');
  setActiveWorldContent(null);
});

describe('MIR4 terrain presentation', () => {
  it('colors M03 near terrain from each painted district instead of its dusk zone alone', async () => {
    vi.resetModules();
    const [{ groundGrassColorAt }, { buildMir4ArcWorld }, { setActiveWorldContent }] =
      await Promise.all([
        import('../../src/render/terrain_chunk_build'),
        import('../../src/sim/content/mir4/arc_world'),
        import('../../src/sim/data'),
      ]);
    const world = buildMir4ArcWorld(3);
    const terrainOnly = { ...world, biomePaint: undefined };
    const colorAt = (x: number, z: number) =>
      groundGrassColorAt(x, z, 171, new THREE.Color()).toArray();

    setActiveWorldContent(world);
    const paintedRefuge = colorAt(4425, 215);
    const paintedGorge = colorAt(4980, 35);
    setActiveWorldContent(terrainOnly);
    expect(paintedRefuge).not.toEqual(colorAt(4425, 215));
    expect(paintedGorge).not.toEqual(colorAt(4980, 35));
  });

  it('streams geometry for the final map instead of stopping at the WoC atlas boundary', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    mockEmptyTerrainAssets();
    const [{ buildTerrain }, { buildMir4ArcWorld }, { setActiveWorldContent }] = await Promise.all([
      import('../../src/render/terrain'),
      import('../../src/sim/content/mir4/arc_world'),
      import('../../src/sim/data'),
    ]);
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const last = world.zones.at(-1);
    if (!last) throw new Error('missing final MIR4 zone');

    const terrain = buildTerrain(171, last.hub);
    const residency = terrain.groundResidency().grid;
    expect(residency.originZ).toBeLessThanOrEqual(world.zones[0]!.zMin);
    expect(residency.originZ + residency.countZ * residency.size).toBeGreaterThanOrEqual(last.zMax);

    const task = terrain.ensureZone(last);
    await vi.runAllTimersAsync();
    await task;
    const coversHub = terrain.group.children.some((mesh) => {
      const bounds = new THREE.Box3().setFromObject(mesh);
      return (
        last.hub.x >= bounds.min.x &&
        last.hub.x <= bounds.max.x &&
        last.hub.z >= bounds.min.z &&
        last.hub.z <= bounds.max.z
      );
    });
    expect(coversHub).toBe(true);
    const finalMapUvs = terrain.group.children
      .filter((mesh) => {
        const bounds = new THREE.Box3().setFromObject(mesh);
        return last.hub.z >= bounds.min.z && last.hub.z <= bounds.max.z;
      })
      .flatMap((mesh) => {
        const uv = (mesh as THREE.Mesh<THREE.BufferGeometry>).geometry.getAttribute('uv');
        return uv ? Array.from(uv.array as ArrayLike<number>) : [];
      });
    expect(finalMapUvs.length).toBeGreaterThan(0);
    expect(Math.min(...finalMapUvs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...finalMapUvs)).toBeLessThanOrEqual(1);
    terrain.cancelStreaming();
  });
});
