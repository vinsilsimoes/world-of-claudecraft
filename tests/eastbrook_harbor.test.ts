import type * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { buildEastbrookHarbor } from '../src/render/eastbrook_harbor';
import { surfaceMat } from '../src/render/gfx';
import { resolveMovement } from '../src/sim/colliders';
import { BUILTIN_WORLD, setActiveWorldContent } from '../src/sim/data';
import { AELDRUNE_EASTBROOK_HARBOR_DECKS, eastbrookDeckSurface } from '../src/sim/eastbrook_harbor';
import type { WorldContent } from '../src/sim/types';
import { groundHeight, terrainHeight, WATER_LEVEL } from '../src/sim/world';
import { WORLD_SEED } from '../src/sim/world_seed';

const terrain = (x: number, z: number): number => terrainHeight(x, z, WORLD_SEED);

afterEach(() => {
  setActiveWorldContent(null);
});

describe('Aeldrune Eastbrook harbor adaptation', () => {
  it('keeps the WoC harbor topology but seats every root on the local Mirror Lake shore', () => {
    expect(AELDRUNE_EASTBROOK_HARBOR_DECKS).toHaveLength(4);
    for (const deck of AELDRUNE_EASTBROOK_HARBOR_DECKS) {
      expect(terrain(deck.ax, deck.az), `anchor of ${deck.x},${deck.z}`).toBeGreaterThan(
        WATER_LEVEL,
      );
    }

    const ferry = AELDRUNE_EASTBROOK_HARBOR_DECKS[1];
    expect(ferry).toBeDefined();
    if (!ferry) return;
    const tipX = ferry.x + Math.sin(ferry.rot) * ferry.hl;
    const tipZ = ferry.z + Math.cos(ferry.rot) * ferry.hl;
    expect(terrain(tipX, tipZ), 'ferry pier reaches real water').toBeLessThan(WATER_LEVEL);
  });

  it('raises built-in presentation ground to the same deck plane rendered on screen', () => {
    const ferry = AELDRUNE_EASTBROOK_HARBOR_DECKS[1];
    expect(ferry).toBeDefined();
    if (!ferry) return;
    setActiveWorldContent({ ...BUILTIN_WORLD, presentationModel: 'builtin' });

    const deckY = eastbrookDeckSurface(ferry.x, ferry.z, terrain, WATER_LEVEL);
    expect(deckY).toBeGreaterThan(WATER_LEVEL);
    expect(groundHeight(ferry.x, ferry.z, WORLD_SEED)).toBeCloseTo(deckY, 5);
    expect(eastbrookDeckSurface(ferry.x, ferry.z + ferry.hw + 8, terrain, WATER_LEVEL)).toBe(
      -Infinity,
    );
  });

  it('lets a player walk from the shore boardwalk to the ferry-pier tip', () => {
    setActiveWorldContent({
      ...BUILTIN_WORLD,
      terrainModel: 'builtin',
      presentationModel: 'builtin',
    });
    let x = -61.5;
    let z = 70;
    const waypoints = [
      { x: -62, z: 82 },
      { x: -62, z: 94 },
      { x: -75, z: 94 },
      { x: -85, z: 94 },
    ];
    for (const waypoint of waypoints) {
      for (let step = 0; step < 80; step += 1) {
        const result = resolveMovement(WORLD_SEED, x, z, waypoint.x, waypoint.z, 0.5);
        x = result.x;
        z = result.z;
        if (Math.hypot(x - waypoint.x, z - waypoint.z) < 0.6) break;
      }
    }

    expect(Math.hypot(x + 85, z - 94), 'reached ferry-pier tip').toBeLessThan(1.5);
    expect(groundHeight(x, z, WORLD_SEED)).toBeGreaterThan(WATER_LEVEL);
    expect(terrain(x, z), 'the final planks stand over lake water').toBeLessThan(WATER_LEVEL);
  });

  it('does not leak the fixed harbor into content-authored worlds', () => {
    const ferry = AELDRUNE_EASTBROOK_HARBOR_DECKS[1];
    expect(ferry).toBeDefined();
    if (!ferry) return;
    const contentWorld: WorldContent = {
      ...BUILTIN_WORLD,
      presentationModel: 'content',
    };
    setActiveWorldContent(contentWorld);

    expect(groundHeight(ferry.x, ferry.z, WORLD_SEED)).toBe(terrain(ferry.x, ferry.z));
    expect(buildEastbrookHarbor(WORLD_SEED).children).toHaveLength(0);
  });

  it('renders for Aeldrune worlds that explicitly retain the built-in WoC presentation', () => {
    setActiveWorldContent({
      ...BUILTIN_WORLD,
      terrainModel: 'builtin',
      presentationModel: 'builtin',
    });
    const harbor = buildEastbrookHarbor(WORLD_SEED);

    expect(harbor.name).toBe('aeldruneEastbrookHarbor');
    expect(harbor.children.length).toBeGreaterThan(0);
  });

  it('reuses the tier-aware shared material factory for the harbor deck', () => {
    setActiveWorldContent({
      ...BUILTIN_WORLD,
      terrainModel: 'builtin',
      presentationModel: 'builtin',
    });
    const harbor = buildEastbrookHarbor(WORLD_SEED);
    const [planks, posts] = harbor.children as THREE.Mesh[];

    expect(planks?.material).toBe(surfaceMat({ color: 0x8a6a4a, roughness: 0.9 }));
    expect(posts?.material).toBe(surfaceMat({ color: 0x6b523d, roughness: 0.92 }));
  });
});
