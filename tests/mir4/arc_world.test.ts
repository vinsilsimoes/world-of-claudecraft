import { afterAll, describe, expect, it } from 'vitest';
import {
  buildMir4ArcWorld,
  MIR4_MAP_DEPTH,
  MIR4_MAP_WIDTH,
  mir4ArcBands,
} from '../../src/sim/content/mir4/arc_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import {
  generateDecorations,
  isOpenSeaAt,
  roadDistance,
  terrainHeight,
  waterLevel,
  waterLevelAt,
} from '../../src/sim/world';

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
    expect(Object.keys(one.npcs)).toHaveLength(4);
    expect(one.npcs['m01-vila-do-vau:tarek-duas-pontes']?.id).toBe('mir4_tarek_duas_pontes');
    expect(one.services?.noticeboards).toHaveLength(1);
    expect(one.services?.noticeboards?.[0]?.assetId).toBe(
      '/models/props/eastbrook_noticeboard.glb',
    );
    expect(one.services?.graveyards).toEqual([
      { id: 'mir4_m01-vila-do-vau_graveyard', name: 'Vila do Vau Graveyard', x: 5, z: 30 },
    ]);
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
    expect(
      [...sim.entities.values()].filter(
        (e) => e.kind === 'npc' && e.templateId !== 'spirit_healer',
      ),
    ).toHaveLength(4);
    expect(
      [...sim.entities.values()].filter(
        (e) => e.kind === 'npc' && e.templateId === 'spirit_healer',
      ),
    ).toHaveLength(1);
    // The m01 camps pick the census's first two mob ids (wolf + thorn_imp),
    // so the wolf pack is the east camp's five spawns.
    expect(
      [...sim.entities.values()].filter((e) => e.templateId === 'mir4_m01-vila-do-vau_forest_wolf')
        .length,
    ).toBe(5);
    const startZ = sim.player.pos.z;
    sim.player.facing = 0;
    sim.moveInput.forward = true;
    for (let tick = 0; tick < 24; tick++) sim.tick();
    expect(sim.player.pos.z - startZ).toBeGreaterThan(4);
    // The full arc builds too: 20 zones, 80 map-local giver placements, 40 camps.
    const all = buildMir4ArcWorld();
    expect(all.zones).toHaveLength(20);
    expect(Object.keys(all.npcs)).toHaveLength(80);
    expect(all.camps.length).toBe(40);
    expect(all.services?.noticeboards).toHaveLength(20);
    expect(all.services?.graveyards).toHaveLength(20);
  });

  it('authors dry playable anchors for every generated map instead of inheriting WoC seas', () => {
    const seed = 171;
    const world = buildMir4ArcWorld();
    const bands = mir4ArcBands();
    setActiveWorldContent(world);

    expect(world.zones.every((zone) => zone.xMin === -MIR4_MAP_WIDTH / 2)).toBe(true);
    expect(world.zones.every((zone) => zone.xMax === MIR4_MAP_WIDTH / 2)).toBe(true);

    const anchors = bands.flatMap((band, index) => [
      { label: `m${index + 1} hub`, ...band.hub },
      { label: `m${index + 1} east camp`, x: 70, z: band.hub.z + 40 },
      { label: `m${index + 1} west camp`, x: -70, z: band.hub.z + 40 },
      { label: `m${index + 1} portal`, ...band.portalOut },
    ]);
    for (const anchor of anchors) {
      const height = terrainHeight(anchor.x, anchor.z, seed);
      expect(Number.isFinite(height), anchor.label).toBe(true);
      expect(height, anchor.label).toBeGreaterThan(waterLevel() + 1);
      expect(waterLevelAt(anchor.x, anchor.z, seed), anchor.label).toBe(Number.NEGATIVE_INFINITY);
      expect(isOpenSeaAt(anchor.x, anchor.z, seed), anchor.label).toBe(false);
    }
  });

  it('fills all 20 maps with native deterministic dressing while keeping gameplay lanes clear', () => {
    const world = buildMir4ArcWorld();
    setActiveWorldContent(world);
    const decorations = generateDecorations(171);

    for (const zone of world.zones) {
      const inZone = decorations.filter(
        (decoration) =>
          decoration.x >= (zone.xMin ?? Number.NEGATIVE_INFINITY) &&
          decoration.x < (zone.xMax ?? Number.POSITIVE_INFINITY) &&
          decoration.z >= zone.zMin &&
          decoration.z < zone.zMax,
      );
      expect(inZone.length, zone.id).toBeGreaterThan(20);
    }
    for (const decoration of decorations) {
      expect(roadDistance(decoration.x, decoration.z)).toBeGreaterThanOrEqual(5);
      for (const zone of world.zones) {
        expect(
          Math.hypot(decoration.x - zone.hub.x, decoration.z - zone.hub.z),
        ).toBeGreaterThanOrEqual(zone.hub.radius + 4);
      }
      for (const camp of world.camps) {
        expect(
          Math.hypot(decoration.x - camp.center.x, decoration.z - camp.center.z),
        ).toBeGreaterThanOrEqual(camp.radius + 3);
      }
    }
  });

  it('composes every hub and hunting ground from the existing WoC prop vocabulary', () => {
    const world = buildMir4ArcWorld();
    expect(world.props.buildings.length).toBeGreaterThanOrEqual(52);
    expect(world.props.tents).toHaveLength(40);
    expect(world.props.campfires).toHaveLength(60);
    expect(world.props.crates).toHaveLength(40);
    expect(world.props.graveyards).toHaveLength(20);
    expect(world.props.wells).toHaveLength(20);
    expect(world.props.ruinRings.length).toBeGreaterThanOrEqual(8);
    expect(world.props.marshReeds.length).toBeGreaterThanOrEqual(24);

    for (let index = 0; index < MIR4_WORLD_ARC.length; index++) {
      const map = MIR4_WORLD_ARC[index]!;
      const hub = mir4ArcBands()[index]!.hub;
      const localBuildings = world.props.buildings.filter(
        (building) => Math.hypot(building.x - hub.x, building.z - hub.z) <= 30,
      );
      expect(localBuildings.length, map.mapId).toBeGreaterThanOrEqual(map.isCity ? 5 : 2);
    }
  });
});
