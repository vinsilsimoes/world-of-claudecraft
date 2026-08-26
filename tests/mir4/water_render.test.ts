import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gfxInternalsForTest } from '../../src/render/gfx';
import { buildWater, hasWaterShaderAssets } from '../../src/render/water';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import { buildMir4WocCampaignWorld } from '../../src/sim/mir4/woc_comparison_world';

vi.mock('../../src/render/textures', async () => {
  const THREE = await import('three');
  return {
    waterNormalish: () => new THREE.Texture(),
    waterNormalMaps: () => [new THREE.Texture(), new THREE.Texture()],
  };
});

vi.mock('../../src/render/assets/loader', () => ({
  loadTexture: vi.fn(async () => new THREE.Texture()),
}));

vi.mock('../../src/render/assets/preload', () => ({
  registerDeferredPreload: vi.fn((start: () => unknown) => void start()),
}));

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

  it('keeps the original WoC ocean when campaign zones are cloned over built-in terrain', () => {
    const restore = gfxInternalsForTest.overrideSettings({ standardMaterials: false });
    try {
      const world = buildMir4WocCampaignWorld();
      setActiveWorldContent(world);
      const water = buildWater(171);

      expect(world.terrainModel).toBe('builtin');
      expect(water.meshes).toHaveLength(1);
      expect(water.meshes[0]!.name).not.toBe('custom-world-water-surface');
      const bounds = new THREE.Box3().setFromObject(water.meshes[0]!);
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(3000);
      water.dispose();
    } finally {
      restore();
    }
  });

  it('keeps the original WoC ocean on the standard shader tier without crashing', async () => {
    const restore = gfxInternalsForTest.overrideSettings({ standardMaterials: true });
    try {
      await Promise.resolve();
      expect(hasWaterShaderAssets()).toBe(true);
      const world = buildMir4WocCampaignWorld();
      setActiveWorldContent(world);

      const water = buildWater(171);

      expect(water.meshes.length).toBeGreaterThan(0);
      expect(water.meshes.every((mesh) => mesh.name !== 'custom-world-water-surface')).toBe(true);
      expect(water.meshes[0]?.material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(() => water.update(1, 1 / 60, 0, 0)).not.toThrow();
      expect(() => water.dispose()).not.toThrow();
    } finally {
      restore();
    }
  });
});
