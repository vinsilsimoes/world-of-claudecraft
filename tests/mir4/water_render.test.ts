import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gfxInternalsForTest } from '../../src/render/gfx';
import { buildWater } from '../../src/render/water';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';

vi.mock('../../src/render/textures', async () => {
  const THREE = await import('three');
  return {
    waterNormalish: () => new THREE.Texture(),
    waterNormalMaps: () => [new THREE.Texture(), new THREE.Texture()],
  };
});

afterEach(() => {
  setActiveWorldContent(null);
});

describe('MIR4 water presentation', () => {
  it('does not paint the WoC ocean sheet over a custom world with no declared water', async () => {
    const world = buildMir4ArcWorld();
    for (const zone of world.zones) zone.lakes = [];
    setActiveWorldContent(world);
    const water = buildWater(171);

    expect(water.meshes).toEqual([]);
    expect(water.group.children).toEqual([]);
    await expect(water.ensureZone(world.zones[0]!)).resolves.toEqual([]);
    expect(water.isZoneLoaded(world.zones[0]!.id)).toBe(true);
    water.setLevel();
    water.dispose();
  });

  it('keeps custom lakes local on the low Phong tier instead of flooding the whole world', () => {
    const restore = gfxInternalsForTest.overrideSettings({ standardMaterials: false });
    try {
      const world = buildMir4ArcWorld(1);
      const lake = { x: 32, z: 70, radius: 10 };
      world.zones[0]!.lakes = [lake];
      setActiveWorldContent(world);
      const water = buildWater(171);

      expect(water.meshes).toHaveLength(1);
      const bounds = new THREE.Box3().setFromObject(water.meshes[0]!);
      expect(bounds.min.x).toBeGreaterThan(lake.x - 20);
      expect(bounds.max.x).toBeLessThan(lake.x + 20);
      expect(bounds.min.z).toBeGreaterThan(lake.z - 20);
      expect(bounds.max.z).toBeLessThan(lake.z + 20);
      water.dispose();
    } finally {
      restore();
    }
  });
});
