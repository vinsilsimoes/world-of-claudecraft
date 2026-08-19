import { afterAll, describe, expect, it } from 'vitest';
import {
  buildMir4ArcWorld,
  MIR4_MAP_DEPTH,
  mir4ArcBands,
} from '../../src/sim/content/mir4/arc_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 5.1: the 20-map arc table (generated verbatim from the compiled
// runtime) and the procedural band generator that turns it into world zones.

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the world arc table', () => {
  it('is the 20 maps with the sealed progression anchors', () => {
    expect(MIR4_WORLD_ARC).toHaveLength(20);
    expect(MIR4_WORLD_ARC[0]).toMatchObject({
      mapId: 'm01-vila-do-vau',
      act: 1,
      levelMin: 1,
      levelMax: 10,
      isCity: false,
      targetGearRank: 2,
      zoneCount: 6,
    });
    expect(MIR4_WORLD_ARC[19]).toMatchObject({
      mapId: 'm20-bastilha-do-eclipse',
      act: 5,
      levelMin: 191,
      levelMax: 200,
      isCity: true,
      targetGearRank: 12,
    });
    // Cities at sequences 4/8/12/16/20; bands contiguous 1..200.
    expect(MIR4_WORLD_ARC.filter((m) => m.isCity).map((m) => m.sequence)).toEqual([
      4, 8, 12, 16, 20,
    ]);
    expect(MIR4_WORLD_ARC[0]!.levelMin).toBe(1);
    expect(MIR4_WORLD_ARC.map((m) => m.levelMax)).toEqual(
      MIR4_WORLD_ARC.map((_, i) => (i + 1) * 10),
    );
  });
});

describe('the arc band generator', () => {
  it('bands run south to north, contiguous, with hubs and portals', () => {
    const bands = mir4ArcBands();
    expect(bands).toHaveLength(20);
    expect(bands[0]!.zMin).toBe(0);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i]!.zMin).toBe(bands[i - 1]!.zMax);
    }
    expect(bands[19]!.zMax).toBe(20 * MIR4_MAP_DEPTH);
    expect(bands[0]!.hub.z).toBeGreaterThan(bands[0]!.zMin);
    expect(bands[0]!.portalOut.z).toBeGreaterThan(bands[0]!.hub.z);
  });
  it('builds a playable world from any prefix (m01 slice == 1 map)', () => {
    const one = buildMir4ArcWorld(1);
    expect(one.zones).toHaveLength(1);
    expect(one.zones[0]!.id).toBe('mir4_m01-vila-do-vau');
    expect(one.camps.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(one.npcs)).toHaveLength(1);
    setActiveWorldContent(one);
    const sim = new Sim({
      seed: 171,
      playerClass: 'warrior',
      playerName: 'Aldric',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world: one,
    });
    expect(zoneAt(0, 40)?.id).toBe('mir4_m01-vila-do-vau');
    expect([...sim.entities.values()].filter((e) => e.kind === 'npc')).toHaveLength(1);
    // The m01 camps pick the census's first two mob ids (wolf + thorn_imp),
    // so the wolf pack is the east camp's five spawns.
    expect(
      [...sim.entities.values()].filter((e) => e.templateId === 'mir4_forest_wolf').length,
    ).toBe(5);
    // The full arc builds too: 20 zones, 20 givers, 180 camps.
    const all = buildMir4ArcWorld();
    expect(all.zones).toHaveLength(20);
    expect(Object.keys(all.npcs)).toHaveLength(20);
    expect(all.camps.length).toBe(40);
  });
});
