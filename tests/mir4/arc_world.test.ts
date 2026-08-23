import { afterAll, describe, expect, it } from 'vitest';
import {
  MIR4_QUESTS_MAIN,
  mir4ArcNpcTemplateId,
  mir4ArcQuest,
} from '../../src/sim/content/mir4/arc_campaign';
import { mir4ArcMobTemplate } from '../../src/sim/content/mir4/arc_mobs';
import {
  buildMir4ArcWorld,
  MIR4_MAP_WIDTH,
  mir4ArcBands,
} from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_REGION_LAYOUTS } from '../../src/sim/content/mir4/arc_world_layout';
import { M01_VILA_DO_VAU_BLUEPRINT } from '../../src/sim/content/mir4/m01_vila_do_vau_world';
import { M02_TRILHA_DOS_JUNCOS_BLUEPRINT } from '../../src/sim/content/mir4/m02_trilha_dos_juncos_world';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from '../../src/sim/content/mir4/m03_bosque_do_vale_world';
import { M04_RUINAS_DA_ENCOSTA_BLUEPRINT } from '../../src/sim/content/mir4/m04_ruinas_da_encosta_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { resolveRespawnSeconds } from '../../src/sim/respawn_policy';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import {
  generateDecorations,
  isInWaterBody,
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
  it('lays the campaign out as five bent provinces instead of one straight corridor', () => {
    const bands = mir4ArcBands();
    expect(bands).toHaveLength(20);
    expect(new Set(bands.map((band) => band.xMin)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(bands.map((band) => band.zMin)).size).toBeGreaterThanOrEqual(4);
    expect(MIR4_ARC_REGION_LAYOUTS.every((region) => region.sites.length === 6)).toBe(true);
    expect(bands[0]!.hub.z).toBeGreaterThan(bands[0]!.zMin);
    expect(bands[0]!.portalOut.z).toBeGreaterThan(bands[0]!.hub.z + 150);
  });

  it('gives Reed Trail its own asymmetric sites and routes around the wetlands', () => {
    const world = buildMir4ArcWorld(20);
    const ford = MIR4_ARC_REGION_LAYOUTS[0]!;
    const reeds = MIR4_ARC_REGION_LAYOUTS[1]!;
    const localSignature = (region: (typeof MIR4_ARC_REGION_LAYOUTS)[number]) =>
      region.sites.map((site) => ({
        id: site.id,
        dx: Math.abs(site.pos.x - region.hub.x),
        dz: site.pos.z - region.hub.z,
      }));
    expect(localSignature(reeds)).not.toEqual(localSignature(ford));

    const localRoads = world.roads.filter((road) =>
      road.some(
        (point) =>
          point.x >= reeds.xMin &&
          point.x < reeds.xMax &&
          point.z >= reeds.zMin &&
          point.z < reeds.zMax,
      ),
    );
    const outskirts = reeds.sites.find((site) => site.id === 'three-flames-reeds')!.pos;
    const stronghold = reeds.sites.find((site) => site.id === 'guardian-root')!.pos;
    const hasStraightSkip = localRoads.some((road) =>
      road.some(
        (point, index) =>
          index > 0 &&
          point.x === stronghold.x &&
          point.z === stronghold.z &&
          road[index - 1]!.x === outskirts.x &&
          road[index - 1]!.z === outskirts.z,
      ),
    );
    expect(hasStraightSkip).toBe(false);
    expect(localRoads).toHaveLength(M02_TRILHA_DOS_JUNCOS_BLUEPRINT.roads.length);

    setActiveWorldContent(world);
    for (const road of localRoads) {
      for (let index = 0; index + 1 < road.length; index += 1) {
        const start = road[index]!;
        const end = road[index + 1]!;
        const length = Math.hypot(end.x - start.x, end.z - start.z);
        const samples = Math.max(1, Math.ceil(length));
        for (let sample = 0; sample <= samples; sample += 1) {
          const t = sample / samples;
          const point = {
            x: start.x + (end.x - start.x) * t,
            z: start.z + (end.z - start.z) * t,
          };
          expect(
            isInWaterBody(point.x, point.z),
            `M02 road ${index} at ${point.x.toFixed(1)},${point.z.toFixed(1)}`,
          ).toBe(false);
        }
      }
    }
  });
  it('builds a playable world from any prefix (m01 slice == 1 map)', () => {
    const one = buildMir4ArcWorld(1);
    expect(one.zones).toHaveLength(1);
    expect(one.zones[0]!.id).toBe('mir4_m01-vila-do-vau');
    expect(one.camps.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(one.npcs)).toHaveLength(9);
    const firstGiverId = mir4ArcQuest('M01-Q01')!.giverNpcId;
    expect(one.npcs[firstGiverId]?.id).toBe(mir4ArcNpcTemplateId(firstGiverId));
    expect(one.services?.noticeboards).toHaveLength(1);
    expect(one.services?.noticeboards?.[0]?.assetId).toBe(
      '/models/props/eastbrook_noticeboard.glb',
    );
    expect(one.services?.graveyards).toEqual([
      {
        id: 'mir4_m01-vila-do-vau_graveyard',
        name: 'Vila do Vau Graveyard',
        x: M01_VILA_DO_VAU_BLUEPRINT.graveyard.x,
        z: M01_VILA_DO_VAU_BLUEPRINT.graveyard.z,
      },
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
    ).toHaveLength(9);
    expect(
      [...sim.entities.values()].filter(
        (e) => e.kind === 'npc' && e.templateId === 'spirit_healer',
      ),
    ).toHaveLength(1);
    // The safe settlement opens into six quest-specific encounter spaces.
    const hostileMobs = [...sim.entities.values()].filter(
      (e) => e.templateId === 'mir4_m01-vila-do-vau_forest_wolf',
    );
    expect(hostileMobs.length).toBeGreaterThanOrEqual(7);
    const slain = hostileMobs[0]!;
    sim.dealDamage(null, slain, 99_999, false, 'physical', null, 'hit');
    expect(slain.respawnTimer).toBe(one.zones[0]!.trashRespawnSeconds);
    expect(slain.corpseTimer).toBe(slain.respawnTimer);
    for (let tick = 0; tick < 400; tick++) sim.tick();
    expect(slain.dead).toBe(false);
    const sentry = hostileMobs[1]!;
    sim.player.pos = sim.groundPos(sentry.pos.x + 3, sentry.pos.z);
    sim.player.prevPos = { ...sim.player.pos };
    sim.rebucket(sim.player);
    for (let tick = 0; tick < 80; tick++) sim.tick();
    expect(sentry.aggroTargetId).toBe(sim.playerId);
    const startZ = sim.player.pos.z;
    sim.player.facing = 0;
    sim.moveInput.forward = true;
    for (let tick = 0; tick < 24; tick++) sim.tick();
    expect(sim.player.pos.z - startZ).toBeGreaterThan(4);
    // Explicit development builds retain later scaffolding for systems tests,
    // plus the production-authored M01 villagers and ecology.
    const all = buildMir4ArcWorld(20);
    expect(all.zones).toHaveLength(20);
    expect(Object.keys(all.npcs)).toHaveLength(107);
    expect(all.camps.length).toBe(104);
    expect(all.camps.reduce((sum, camp) => sum + camp.count, 0)).toBeGreaterThanOrEqual(760);
    expect(all.services?.noticeboards).toHaveLength(20);
    expect(all.services?.graveyards).toHaveLength(20);
  });

  it('authors dry playable anchors for every generated map instead of inheriting WoC seas', () => {
    const seed = 171;
    const world = buildMir4ArcWorld(20);
    const bands = mir4ArcBands();
    setActiveWorldContent(world);

    expect((world.zones[0]?.xMax ?? 0) - (world.zones[0]?.xMin ?? 0)).toBe(
      M01_VILA_DO_VAU_BLUEPRINT.bounds.xMax - M01_VILA_DO_VAU_BLUEPRINT.bounds.xMin,
    );
    expect(
      world.zones.slice(4).every((zone) => (zone.xMax ?? 0) - (zone.xMin ?? 0) === MIR4_MAP_WIDTH),
    ).toBe(true);
    expect((world.zones[1]?.xMax ?? 0) - (world.zones[1]?.xMin ?? 0)).toBe(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.bounds.xMax - M02_TRILHA_DOS_JUNCOS_BLUEPRINT.bounds.xMin,
    );
    expect((world.zones[2]?.xMax ?? 0) - (world.zones[2]?.xMin ?? 0)).toBe(
      M03_BOSQUE_DO_VALE_BLUEPRINT.bounds.xMax - M03_BOSQUE_DO_VALE_BLUEPRINT.bounds.xMin,
    );
    expect((world.zones[3]?.xMax ?? 0) - (world.zones[3]?.xMin ?? 0)).toBe(
      M04_RUINAS_DA_ENCOSTA_BLUEPRINT.bounds.xMax - M04_RUINAS_DA_ENCOSTA_BLUEPRINT.bounds.xMin,
    );

    const anchors = bands.flatMap((band, index) => [
      { label: `m${index + 1} hub`, ...band.hub },
      ...band.sites.map((site) => ({ label: `m${index + 1} ${site.id}`, ...site.pos })),
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

  it('keeps every hostile camp footprint off the visible boundary ridge', () => {
    const world = buildMir4ArcWorld(20);
    for (const [index, region] of MIR4_ARC_REGION_LAYOUTS.entries()) {
      const local = world.camps.filter(
        (camp) =>
          camp.center.x >= region.xMin &&
          camp.center.x < region.xMax &&
          camp.center.z >= region.zMin &&
          camp.center.z < region.zMax,
      );
      for (const camp of local) {
        const clear = Math.min(
          camp.center.x - region.xMin,
          region.xMax - camp.center.x,
          camp.center.z - region.zMin,
          region.zMax - camp.center.z,
        );
        expect(
          clear - camp.radius,
          `${MIR4_WORLD_ARC[index]!.mapId} ${camp.mobId}`,
        ).toBeGreaterThanOrEqual(27);
      }
    }
  });

  it('makes hunting grounds dense, aggressive, and quick to repopulate outside safe hubs', () => {
    const world = buildMir4ArcWorld(20);
    expect(world.zones.every((zone) => (zone.trashRespawnSeconds ?? 60) <= 18)).toBe(true);
    const firstCamp = world.camps[0]!;
    expect(resolveRespawnSeconds(undefined, firstCamp.center, undefined, null, world.zones)).toBe(
      world.zones[0]!.trashRespawnSeconds,
    );
    for (const [index, region] of MIR4_ARC_REGION_LAYOUTS.entries()) {
      const mapId = MIR4_WORLD_ARC[index]!.mapId;
      const local = world.camps.filter(
        (camp) =>
          camp.center.x >= region.xMin &&
          camp.center.x < region.xMax &&
          camp.center.z >= region.zMin &&
          camp.center.z < region.zMax,
      );
      expect(local, mapId).toHaveLength(index <= 3 ? 6 : 5);
      expect(
        local.reduce((sum, camp) => sum + camp.count, 0),
        mapId,
      ).toBeGreaterThanOrEqual(38);
      for (const camp of local) {
        expect(
          Math.hypot(camp.center.x - region.hub.x, camp.center.z - region.hub.z),
        ).toBeGreaterThan(55);
        expect(mir4ArcMobTemplate(camp.mobId)?.aggroRadius ?? 0).toBeGreaterThanOrEqual(9);
      }
    }
  });

  it('sends the six main quests in each region to six separate authored sites', () => {
    for (const map of MIR4_WORLD_ARC) {
      const anchors = MIR4_QUESTS_MAIN.filter((quest) => quest.mapId === map.mapId).map((quest) => {
        const stage =
          quest.stages.find((candidate) => candidate.kind === 'travel') ?? quest.stages[1]!;
        const anchor = mir4ArcStageAnchor(quest.questId, stage);
        if (!anchor) throw new Error(`Missing anchor for ${quest.questId}`);
        return { questId: quest.questId, ...anchor };
      });
      expect(anchors, map.mapId).toHaveLength(6);
      for (let left = 0; left < anchors.length; left++) {
        for (let right = left + 1; right < anchors.length; right++) {
          expect(
            Math.hypot(anchors[left]!.x - anchors[right]!.x, anchors[left]!.z - anchors[right]!.z),
            `${anchors[left]!.questId}/${anchors[right]!.questId}`,
          ).toBeGreaterThan(35);
        }
      }
    }
  });

  it('fills all 20 maps with native deterministic dressing while keeping gameplay lanes clear', () => {
    const world = buildMir4ArcWorld(20);
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
    const world = buildMir4ArcWorld(20);
    expect(world.props.buildings).toHaveLength(25);
    expect(world.props.tents).toHaveLength(34);
    expect(world.props.campfires.length).toBeGreaterThanOrEqual(56);
    expect(world.props.crates.length).toBeGreaterThanOrEqual(40);
    expect(world.props.graveyards.length).toBeGreaterThanOrEqual(20);
    expect(world.props.wells).toHaveLength(5);
    expect(world.props.mudHuts).toHaveLength(0);
    expect(world.props.ruinRings.length).toBeGreaterThanOrEqual(8);
    expect(world.props.marshReeds.length).toBeGreaterThanOrEqual(24);

    for (let index = 0; index < MIR4_WORLD_ARC.length; index++) {
      const map = MIR4_WORLD_ARC[index]!;
      const hub = mir4ArcBands()[index]!.hub;
      const localBuildings = world.props.buildings.filter(
        (building) => Math.hypot(building.x - hub.x, building.z - hub.z) <= 30,
      );
      const localMudHuts = world.props.mudHuts.filter(
        ([x, z]) => Math.hypot(x - hub.x, z - hub.z) <= 30,
      );
      const localStalls = world.props.stalls.filter(
        (stall) => Math.hypot(stall.x - hub.x, stall.z - hub.z) <= 30,
      );
      const localWells = world.props.wells.filter(
        (well) => Math.hypot(well.x - hub.x, well.z - hub.z) <= 30,
      );
      if (map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId) {
        expect(localBuildings.length, map.mapId).toBeGreaterThanOrEqual(3);
      } else if (map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId) {
        const localFenbridgeBuildings = (world.props.decorProps ?? []).filter(
          (prop) =>
            prop.key.startsWith('fenbridge') && Math.hypot(prop.x - hub.x, prop.z - hub.z) <= 58,
        );
        expect(localFenbridgeBuildings.length, map.mapId).toBeGreaterThanOrEqual(8);
      } else if (map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId) {
        const localRefugeBuildings = (world.props.decorProps ?? []).filter(
          (prop) =>
            ['kmedTavern', 'kmedHomeA', 'kmedHomeB', 'fenbridgeMoonwortApothecary'].includes(
              prop.key,
            ) && Math.hypot(prop.x - hub.x, prop.z - hub.z) <= 70,
        );
        expect(
          localRefugeBuildings.map((prop) => prop.key),
          map.mapId,
        ).toEqual(['kmedHomeA']);
      } else if (map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId) {
        const localHighlandBuildings = (world.props.decorProps ?? []).filter(
          (prop) =>
            [
              'hexbTownhall',
              'hexbMarket',
              'hexbTavern',
              'hexbWorkshop',
              'hexbHomeA',
              'hexbHomeB',
            ].includes(prop.key) && Math.hypot(prop.x - hub.x, prop.z - hub.z) <= 82,
        );
        expect(localHighlandBuildings.length, map.mapId).toBeGreaterThanOrEqual(7);
      } else {
        if (map.isCity) {
          expect(localBuildings.length, map.mapId).toBeGreaterThanOrEqual(5);
        } else {
          expect(
            [...localBuildings, ...localMudHuts, ...localStalls, ...localWells],
            `${map.mapId} must not receive a generic settlement`,
          ).toHaveLength(0);
        }
      }
    }
  });
});
