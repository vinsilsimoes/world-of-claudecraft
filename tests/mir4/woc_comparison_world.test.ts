import { afterEach, describe, expect, it } from 'vitest';
import {
  MIR4_QUESTS_ARC,
  mir4ArcNpcTemplateId,
  mir4ArcQuest,
} from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { mir4ArcRegionAt, projectMir4ArcPoint } from '../../src/sim/content/mir4/arc_world_layout';
import {
  BUILTIN_WORLD,
  DUNGEON_LIST,
  getActiveWorldContent,
  MOBS,
  setActiveWorldContent,
} from '../../src/sim/data';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
import { mir4CampaignMapIdsForWorld } from '../../src/sim/mir4/campaign_availability';
import { mir4ArcPortalsForWorld, mir4PortalRouteGoal } from '../../src/sim/mir4/travel';
import { MIR4_WOC_TUTORIAL_PORTALS } from '../../src/sim/mir4/woc_campaign_portals';
import { buildMir4WocComparisonWorld } from '../../src/sim/mir4/woc_comparison_world';
import { findPlayerPath } from '../../src/sim/pathfind';
import { Sim } from '../../src/sim/sim';
import { terrainHeight, waterLevelAt } from '../../src/sim/world';
import { WORLD_SEED } from '../../src/sim/world_seed';

afterEach(() => setActiveWorldContent(null));

describe('MIR4 local comparison on the original WoC map', () => {
  it('keeps the original WoC geometry while replacing its actors with MIR4 content', () => {
    const originalNpcCount = Object.keys(BUILTIN_WORLD.npcs).length;
    const originalCampCount = BUILTIN_WORLD.camps.length;
    const world = buildMir4WocComparisonWorld(4);

    expect(world.terrainModel).toBe('builtin');
    expect(world.zones).toBe(BUILTIN_WORLD.zones);
    expect(world.roads).toBe(BUILTIN_WORLD.roads);
    expect(world.litRoads).toBe(BUILTIN_WORLD.litRoads);
    expect(world.dryCrossings).toBe(BUILTIN_WORLD.dryCrossings);
    expect(world.props.buildings).toBe(BUILTIN_WORLD.props.buildings);
    expect(world.props.walls).toBe(BUILTIN_WORLD.props.walls);
    expect(world.props.decorProps?.slice(0, BUILTIN_WORLD.props.decorProps?.length)).toEqual(
      BUILTIN_WORLD.props.decorProps,
    );
    for (const portal of MIR4_WOC_TUTORIAL_PORTALS) {
      for (const side of [portal.a, portal.b]) {
        expect(
          world.props.decorProps?.some(
            (prop) =>
              prop.key === 'gardenArch' &&
              prop.x === side.x &&
              prop.z === side.z &&
              prop.r === undefined,
          ),
        ).toBe(true);
      }
    }
    expect(world.terrainEdits).toBe(BUILTIN_WORLD.terrainEdits);
    expect(world.placements).toBe(BUILTIN_WORLD.placements);
    expect(world.blockers).toBe(BUILTIN_WORLD.blockers);
    expect(world.biomePaint).toBe(BUILTIN_WORLD.biomePaint);
    expect(world.waterLevel).toBe(BUILTIN_WORLD.waterLevel);
    const source = buildMir4ArcWorld(4);
    expect(Object.keys(world.npcs).sort()).toEqual(Object.keys(source.npcs).sort());
    expect(Object.values(world.npcs).every((npc) => npc.id.startsWith('mir4_'))).toBe(true);
    expect(world.camps.length).toBeGreaterThan(source.camps.length);
    expect(world.camps.every((camp) => camp.mobId.startsWith('mir4_'))).toBe(true);
    expect(
      world.groundObjects
        .map((object) => `${object.itemId}:${object.name}:${object.positions.length}`)
        .sort(),
    ).toEqual(
      source.groundObjects
        .map((object) => `${object.itemId}:${object.name}:${object.positions.length}`)
        .sort(),
    );
    expect(world.services?.noticeboards?.map((board) => board.id).sort()).toEqual(
      source.services?.noticeboards?.map((board) => board.id).sort(),
    );
    expect(world.services?.graveyards?.map((graveyard) => graveyard.id).sort()).toEqual(
      source.services?.graveyards?.map((graveyard) => graveyard.id).sort(),
    );
    expect(Object.keys(BUILTIN_WORLD.npcs)).toHaveLength(originalNpcCount);
    expect(BUILTIN_WORLD.camps).toHaveLength(originalCampCount);
  });

  it('builds from canonical WoC terrain without inheriting or replacing an active custom world', () => {
    const custom = buildMir4ArcWorld(1);
    setActiveWorldContent(custom);

    const world = buildMir4WocComparisonWorld(1, 1_789);

    expect(world.zones).toBe(BUILTIN_WORLD.zones);
    expect(world.mir4ArcMapProjections).toHaveLength(1);
    expect(world.camps.length).toBeGreaterThan(0);
    expect(getActiveWorldContent()).toBe(custom);
  });

  it('pins projection scale, corners, identity fallback, and region boundaries', () => {
    const projections = [
      {
        mapId: 'm01-vila-do-vau',
        targetZoneId: 'test-zone',
        source: { xMin: 100, xMax: 300, zMin: -40, zMax: 60 },
        target: { xMin: -20, xMax: 80, zMin: 200, zMax: 600 },
      },
    ] as const;

    expect(projectMir4ArcPoint(projections, 'm01-vila-do-vau', { x: 100, z: -40 })).toEqual({
      x: -20,
      z: 200,
    });
    expect(projectMir4ArcPoint(projections, 'm01-vila-do-vau', { x: 300, z: 60 })).toEqual({
      x: 80,
      z: 600,
    });
    expect(projectMir4ArcPoint(projections, 'm01-vila-do-vau', { x: 200, z: 10 })).toEqual({
      x: 30,
      z: 400,
    });
    expect(projectMir4ArcPoint(projections, 'm02-trilha-dos-juncos', { x: 7, z: 9 })).toEqual({
      x: 7,
      z: 9,
    });
    expect(mir4ArcRegionAt({ x: -20, z: 200 }, projections)?.mapId).toBe('m01-vila-do-vau');
    expect(mir4ArcRegionAt({ x: 79.999, z: 599.999 }, projections)?.mapId).toBe('m01-vila-do-vau');
    expect(mir4ArcRegionAt({ x: 80, z: 599.999 }, projections)).toBeNull();
    expect(mir4ArcRegionAt({ x: 79.999, z: 600 }, projections)).toBeNull();
  });

  it('projects the four authored campaign maps onto four original WoC regions', () => {
    const world = buildMir4WocComparisonWorld(4);

    expect(mir4CampaignMapIdsForWorld(world)).toEqual([
      'm01-vila-do-vau',
      'm02-trilha-dos-juncos',
      'm03-bosque-do-vale',
      'm04-ruinas-da-encosta',
    ]);
    expect(world.mir4ArcMapProjections?.map((projection) => projection.targetZoneId)).toEqual([
      'eastbrook_vale',
      'willowfen',
      'evergarden',
      'thornpeak_heights',
    ]);
    for (const npc of Object.values(world.npcs)) {
      expect(mir4ArcRegionAt(npc.pos, world.mir4ArcMapProjections)).not.toBeNull();
    }
  });

  it('uses the projected objective anchor for auto journey and quest evidence', () => {
    const world = buildMir4WocComparisonWorld(4);
    const progress = {
      questId: 'M04-Q05',
      stageIndex: 0,
      stageProgress: 0,
      state: 'active' as const,
    };
    const stage = mir4QuestCurrentStage(progress);
    expect(stage).not.toBeNull();
    if (!stage) throw new Error('M04-Q05 opening stage is required');

    const authored = mir4ArcStageAnchor(progress.questId, stage, 0);
    const projected = mir4ArcStageAnchor(progress.questId, stage, 0, world.mir4ArcMapProjections);

    expect(authored).not.toBeNull();
    if (!authored || !projected) throw new Error('M04-Q05 anchors are required');
    expect(projected).toEqual(
      projectMir4ArcPoint(world.mir4ArcMapProjections, 'm04-ruinas-da-encosta', authored),
    );
    expect(mir4ArcRegionAt(projected, world.mir4ArcMapProjections)?.mapId).toBe(
      'm04-ruinas-da-encosta',
    );
  });

  it('runs the opening MIR4 quest against the projected NPC and objective positions', () => {
    const world = buildMir4WocComparisonWorld(4);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 1789,
      playerClass: 'warrior',
      playerName: 'Comparison',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const quest = mir4ArcQuest('M01-Q01');
    if (!quest) throw new Error('M01-Q01 is required');
    const giver = [...sim.entities.values()].find(
      (entity) => entity.templateId === mir4ArcNpcTemplateId(quest.giverNpcId),
    );
    expect(giver).toBeDefined();
    if (!giver) throw new Error('M01-Q01 giver is required');
    expect(mir4ArcRegionAt(giver.pos, world.mir4ArcMapProjections)?.mapId).toBe(quest.mapId);

    sim.talkToNpc(giver.id);
    const progress = sim.players.get(sim.playerId)?.mir4ArcQuests?.['M01-Q01'];
    expect(progress).toMatchObject({ stageIndex: 1, state: 'active' });
    if (!progress) throw new Error('M01-Q01 progress is required');
    const stage = mir4QuestCurrentStage(progress);
    if (!stage) throw new Error('M01-Q01 travel stage is required');
    const anchor = mir4ArcStageAnchor(
      progress.questId,
      stage,
      progress.stageProgress,
      world.mir4ArcMapProjections,
    );
    if (!anchor) throw new Error('M01-Q01 projected anchor is required');
    const player = sim.entities.get(sim.playerId);
    if (!player) throw new Error('Comparison player is required');
    player.pos = { ...player.pos, ...anchor };
    player.prevPos = { ...player.pos };
    sim.tick();

    expect(progress?.stageIndex).toBe(2);
  });

  it('lets Auto Journey reach the deliberate M01 tutorial checkpoint', () => {
    const world = buildMir4WocComparisonWorld(4);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 1790,
      playerClass: 'warrior',
      playerName: 'AutoComparison',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('Comparison player metadata is required');

    sim.setMir4AutoQuest(true);
    let guard = 0;
    while (
      meta.mir4AutoQuest &&
      meta.mir4ArcQuests?.['M01-Q01']?.stageIndex !== 3 &&
      guard++ < 1_000
    ) {
      sim.tick();
    }

    expect(guard).toBeLessThan(1_000);
    expect(meta.mir4ArcQuests?.['M01-Q01']).toMatchObject({
      stageIndex: 3,
      state: 'active',
    });
    expect(meta.mir4AutoQuest).toBeDefined();
  });

  it('reuses the original WoC passage for chapters placed inside the Veiled Hollow', () => {
    const world = buildMir4WocComparisonWorld(5);
    const portals = mir4ArcPortalsForWorld(world);
    const first = portals[0];
    if (!first) throw new Error('Original Duskfall passage is required');
    const hollowNpc = Object.values(world.npcs).find((npc) => npc.id.startsWith('mir4_m05_'));

    expect(portals.map((portal) => portal.id)).toEqual([
      'duskfall_passage',
      'mir4_woc_tutorial_m02_waypoint',
      'mir4_woc_tutorial_m09_waypoint',
    ]);
    expect(first.id).toBe('duskfall_passage');
    expect(hollowNpc).toBeDefined();
    if (!hollowNpc) throw new Error('M05 Hollow NPC is required');
    expect(
      mir4PortalRouteGoal(
        world.playerStart,
        hollowNpc.pos,
        portals,
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual({ x: first.a.x, z: first.a.z });
  });

  it('keeps tutorial waypoints out of ordinary Auto Journey routing', () => {
    const world = buildMir4WocComparisonWorld(2);
    const nara = Object.values(world.npcs).find((npc) => npc.id.startsWith('mir4_m02_'));
    if (!nara) throw new Error('M02 story NPC is required');

    expect(
      mir4PortalRouteGoal(
        world.playerStart,
        nara.pos,
        mir4ArcPortalsForWorld(world),
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual(nara.pos);
  });

  it('leaves the Hollow after M05 without sending the M06 journey back through its entrance', () => {
    const world = buildMir4WocComparisonWorld(6);
    const portals = mir4ArcPortalsForWorld(world);
    const passage = portals.find((portal) => portal.id === 'duskfall_passage');
    const m06Npc = Object.values(world.npcs).find((npc) => npc.id.startsWith('mir4_m06_'));
    if (!passage || !m06Npc) throw new Error('M05-M06 transition fixtures are required');

    expect(
      mir4PortalRouteGoal(
        passage.b.landing,
        m06Npc.pos,
        portals,
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual({ x: passage.b.x, z: passage.b.z });
    expect(
      mir4PortalRouteGoal(
        passage.a.landing,
        m06Npc.pos,
        portals,
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual(m06Npc.pos);
  });

  it('transplants all twenty story chapters without losing actors or encounters', () => {
    const world = buildMir4WocComparisonWorld();
    const source = buildMir4ArcWorld(20);

    expect(mir4CampaignMapIdsForWorld(world)).toHaveLength(20);
    expect(mir4CampaignMapIdsForWorld(world).at(-1)).toBe('m20-bastilha-do-eclipse');
    expect(Object.keys(world.npcs).sort()).toEqual(Object.keys(source.npcs).sort());
    expect(world.camps.length).toBeGreaterThan(source.camps.length);
    expect(world.services?.noticeboards).toHaveLength(source.services?.noticeboards?.length ?? 0);
    expect(world.services?.graveyards).toHaveLength(source.services?.graveyards?.length ?? 0);
  });

  it('seats MIR4 actors on the authored WoC population fabric instead of six compressed sites', () => {
    const world = buildMir4WocComparisonWorld();
    const nativeNpcSeats = new Set(
      Object.values(BUILTIN_WORLD.npcs)
        .filter((npc) => !npc.dynamic)
        .map((npc) => `${npc.pos.x}:${npc.pos.z}`),
    );
    const npcPositions = Object.values(world.npcs).map((npc) => `${npc.pos.x}:${npc.pos.z}`);
    const nativeSeatsUsed = npcPositions.filter((position) => nativeNpcSeats.has(position));

    expect(new Set(npcPositions).size).toBe(npcPositions.length);
    expect(nativeSeatsUsed.length).toBeGreaterThanOrEqual(70);

    const nativeCampCenters = new Set(
      BUILTIN_WORLD.camps
        .filter((camp) => {
          const template = MOBS[camp.mobId];
          return (
            !!template && !template.dummy && !template.ambient && !template.friendlyPracticeTarget
          );
        })
        .map((camp) => `${camp.center.x}:${camp.center.z}`),
    );
    expect(world.camps.length).toBeGreaterThanOrEqual(158);
    expect(new Set(world.camps.map((camp) => `${camp.center.x}:${camp.center.z}`)).size).toBe(
      world.camps.length,
    );
    expect(
      world.camps.every((camp) => nativeCampCenters.has(`${camp.center.x}:${camp.center.z}`)),
    ).toBe(true);
    expect(world.camps.reduce((total, camp) => total + camp.count, 0)).toBeGreaterThanOrEqual(
      1_258,
    );
    expect(Math.min(...world.camps.map((camp) => camp.radius))).toBeGreaterThanOrEqual(6);
    for (const zone of world.zones) {
      const camps = world.camps.filter(
        (camp) =>
          camp.center.x >= (zone.xMin ?? -180) &&
          camp.center.x < (zone.xMax ?? 180) &&
          camp.center.z >= zone.zMin &&
          camp.center.z < zone.zMax,
      );
      expect(camps.length, zone.id).toBeGreaterThanOrEqual(5);
      expect(
        camps.reduce((total, camp) => total + camp.count, 0),
        zone.id,
      ).toBeGreaterThanOrEqual(30);
    }

    setActiveWorldContent(world);
    const sim = new Sim({
      seed: WORLD_SEED,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      world,
      noPlayer: true,
    });
    const spawnedMobs = [...sim.entities.values()].filter((entity) => entity.kind === 'mob');
    expect(spawnedMobs.length).toBeGreaterThanOrEqual(1_258);
    expect(new Set(spawnedMobs.map((mob) => `${mob.pos.x}:${mob.pos.z}`)).size).toBe(
      spawnedMobs.length,
    );
  });

  it('keeps grind packs clear of story actors and every original WoC dungeon entrance', () => {
    const world = buildMir4WocComparisonWorld();
    const dungeonDoors = DUNGEON_LIST.filter((dungeon) => dungeon.overworldDoor !== false).map(
      (dungeon) => dungeon.doorPos,
    );
    const protectedServices = [
      ...(world.services?.graveyards ?? []).map((graveyard) => ({
        id: graveyard.id,
        x: graveyard.x,
        z: graveyard.z,
      })),
      ...(world.services?.noticeboards ?? []).flatMap((board) => [
        { id: board.id, x: board.x, z: board.z },
        { id: `${board.id}:front`, ...board.frontStandingPoint },
      ]),
    ];

    for (const camp of world.camps) {
      for (const npc of Object.values(world.npcs)) {
        expect(
          Math.hypot(camp.center.x - npc.pos.x, camp.center.z - npc.pos.z),
          `${camp.mobId} overlaps ${npc.id}`,
        ).toBeGreaterThanOrEqual(18 + camp.radius);
      }
      for (const service of protectedServices) {
        expect(
          Math.hypot(camp.center.x - service.x, camp.center.z - service.z),
          `${camp.mobId} overlaps service ${service.id}`,
        ).toBeGreaterThanOrEqual(18 + camp.radius);
      }
      for (const door of dungeonDoors) {
        expect(
          Math.hypot(camp.center.x - door.x, camp.center.z - door.z),
          `${camp.mobId} blocks dungeon door ${door.x},${door.z}`,
        ).toBeGreaterThanOrEqual(24 + camp.radius);
      }
    }
  });

  it.each([1, 2, 99, 171, 1_789, 1_790, 424_242])(
    'keeps grind and story anchors dry against the active terrain seed %i',
    (seed) => {
      const world = buildMir4WocComparisonWorld(20, seed);
      for (const camp of world.camps) {
        expect(
          terrainHeight(camp.center.x, camp.center.z, seed),
          `${seed}:${camp.mobId}:${camp.center.x},${camp.center.z}`,
        ).toBeGreaterThanOrEqual(waterLevelAt(camp.center.x, camp.center.z, seed) + 0.2);
      }
      for (const quest of MIR4_QUESTS_ARC) {
        for (const stage of quest.stages) {
          const objectiveCount = Math.max(1, Array.isArray(stage.target) ? stage.target.length : 1);
          for (let objectiveIndex = 0; objectiveIndex < objectiveCount; objectiveIndex += 1) {
            const anchor = mir4ArcStageAnchor(
              quest.questId,
              stage,
              objectiveIndex,
              world.mir4ArcMapProjections,
            );
            if (!anchor) continue;
            expect(
              terrainHeight(anchor.x, anchor.z, seed),
              `${seed}:${quest.questId}:${stage.kind}:${objectiveIndex}`,
            ).toBeGreaterThanOrEqual(waterLevelAt(anchor.x, anchor.z, seed) + 0.2);
          }
        }
      }
    },
  );

  it('keeps every story objective dry on the original WoC terrain', () => {
    const world = buildMir4WocComparisonWorld();
    setActiveWorldContent(world);
    let anchorCount = 0;

    for (const quest of MIR4_QUESTS_ARC) {
      for (const stage of quest.stages) {
        const objectiveCount = Math.max(1, Array.isArray(stage.target) ? stage.target.length : 1);
        for (let objectiveIndex = 0; objectiveIndex < objectiveCount; objectiveIndex += 1) {
          const anchor = mir4ArcStageAnchor(
            quest.questId,
            stage,
            objectiveIndex,
            world.mir4ArcMapProjections,
          );
          if (!anchor) continue;
          anchorCount += 1;
          const ground = terrainHeight(anchor.x, anchor.z, WORLD_SEED);
          const water = waterLevelAt(anchor.x, anchor.z, WORLD_SEED);
          if (Number.isFinite(water)) {
            expect(
              ground,
              `${quest.questId}:${stage.kind}:${objectiveIndex}`,
            ).toBeGreaterThanOrEqual(water + 0.2);
          }
        }
      }
    }

    expect(anchorCount).toBe(1_288);
  });

  it('keeps every transplanted NPC, camp, board, and graveyard on dry terrain', () => {
    const world = buildMir4WocComparisonWorld();
    setActiveWorldContent(world);
    const points: { label: string; x: number; z: number }[] = [
      ...Object.values(world.npcs).map((npc) => ({ label: `npc:${npc.id}`, ...npc.pos })),
      ...world.camps.map((camp) => ({ label: `camp:${camp.mobId}`, ...camp.center })),
      ...(world.services?.noticeboards ?? []).flatMap((board) => [
        { label: `board:${board.id}`, x: board.x, z: board.z },
        { label: `board-front:${board.id}`, ...board.frontStandingPoint },
      ]),
      ...(world.services?.graveyards ?? []).map((graveyard) => ({
        label: `graveyard:${graveyard.id}`,
        x: graveyard.x,
        z: graveyard.z,
      })),
    ];

    for (const point of points) {
      const ground = terrainHeight(point.x, point.z, WORLD_SEED);
      const water = waterLevelAt(point.x, point.z, WORLD_SEED);
      if (Number.isFinite(water)) {
        expect(ground, point.label).toBeGreaterThanOrEqual(water + 0.2);
      }
    }

    expect(points).toHaveLength(
      Object.keys(world.npcs).length +
        world.camps.length +
        (world.services?.noticeboards?.length ?? 0) * 2 +
        (world.services?.graveyards?.length ?? 0),
    );
  });

  it('keeps every chapter control point connected to its WoC story hub', () => {
    const world = buildMir4WocComparisonWorld();
    setActiveWorldContent(world);
    let routeCount = 0;

    for (const projection of world.mir4ArcMapProjections ?? []) {
      const hub = projection.controlPoints?.[0]?.target;
      if (!hub) throw new Error(`${projection.mapId} requires a physical story hub`);
      for (const control of projection.controlPoints ?? []) {
        routeCount += 1;
        const route = findPlayerPath(WORLD_SEED, hub, control.target, 900, false, false, 0);
        const last = route.at(-1) ?? hub;
        expect(
          Math.hypot(last.x - control.target.x, last.z - control.target.z),
          `${projection.mapId} cannot reach ${control.target.x},${control.target.z}`,
        ).toBeLessThanOrEqual(2);
      }
    }

    expect(routeCount).toBe(180);
  }, 40_000);
});
