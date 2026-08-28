import { afterEach, describe, expect, it } from 'vitest';
import { colliderInternalsForTest } from '../../src/sim/colliders';
import {
  MIR4_QUESTS_ARC,
  mir4ArcNpcTemplateId,
  mir4ArcQuest,
} from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { mir4ArcRegionAt, projectMir4ArcPoint } from '../../src/sim/content/mir4/arc_world_layout';
import {
  MIR4_VILLAGE_GENERAL_GOODS,
  MIR4_VILLAGE_PROVISIONER_NPC_ID,
} from '../../src/sim/content/mir4/village_provisioner';
import {
  BUILTIN_WORLD,
  DUNGEON_LIST,
  getActiveWorldContent,
  MOBS,
  setActiveWorldContent,
} from '../../src/sim/data';
import { PORTAL_CLEAR_RADIUS, portalClearancePoints } from '../../src/sim/dungeon_door_clearance';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
import { mir4CampaignMapIdsForWorld } from '../../src/sim/mir4/campaign_availability';
import { mir4ArcPortalsForWorld, mir4PortalRouteGoal } from '../../src/sim/mir4/travel';
import {
  buildMir4GrindPopulation,
  MIR4_WOC_POPULATION_RULES,
} from '../../src/sim/mir4/woc_campaign_population';
import { MIR4_WOC_TUTORIAL_PORTALS } from '../../src/sim/mir4/woc_campaign_portals';
import {
  AELDRUNE_EASTBROOK_HARBOR_POI,
  buildMir4WocComparisonWorld,
} from '../../src/sim/mir4/woc_comparison_world';
import { findPlayerPath } from '../../src/sim/pathfind';
import { Sim } from '../../src/sim/sim';
import { terrainHeight, waterLevelAt } from '../../src/sim/world';
import { WORLD_SEED } from '../../src/sim/world_seed';

afterEach(() => setActiveWorldContent(null));

describe('MIR4 local comparison on the original WoC map', () => {
  it('raises every ordinary WoC camp by exactly 40% over the prior MIR4 population', () => {
    const combatAnchor = BUILTIN_WORLD.camps.find((camp) => {
      const template = MOBS[camp.mobId];
      return !!template && !template.dummy && !template.ambient && !template.friendlyPracticeTarget;
    });
    const source = buildMir4ArcWorld(1).camps[0];
    const baseZone = BUILTIN_WORLD.zones[0];
    if (!combatAnchor || !source || !baseZone) throw new Error('Population fixtures are required');
    const zone = {
      ...baseZone,
      xMin: -100,
      xMax: 100,
      zMin: 0,
      zMax: 100,
    };
    const authoredCounts = [1, 3, 4, 5];
    const anchors = authoredCounts.map((count, index) => ({
      ...combatAnchor,
      center: { x: -30 + index * 20, z: 50 },
      radius: 6,
      count,
    }));

    const population = buildMir4GrindPopulation(
      [{ ...source, center: { x: 0, z: 50 } }],
      anchors,
      MOBS,
      [zone],
      {},
      [],
      [],
    );

    // Previous MIR4 counts were max(6, ceil(authored * 2)): 6, 6, 8, 10.
    // Their exact 40%-larger integer populations are therefore 9, 9, 12, 14.
    expect(population.map((camp) => camp.count)).toEqual([9, 9, 12, 14]);
  });

  it('keeps an objective interaction guarded by one independently capped six-creature pack', () => {
    const combatAnchor = BUILTIN_WORLD.camps.find((camp) => {
      const template = MOBS[camp.mobId];
      return !!template && !template.dummy && !template.ambient && !template.friendlyPracticeTarget;
    });
    const source = buildMir4ArcWorld(1).camps[0];
    const baseZone = BUILTIN_WORLD.zones[0];
    if (!combatAnchor || !source || !baseZone) throw new Error('Population fixtures are required');
    const center = { x: 0, z: 50 };
    const zone = {
      ...baseZone,
      xMin: -100,
      xMax: 100,
      zMin: 0,
      zMax: 100,
    };

    const population = buildMir4GrindPopulation(
      [{ ...source, center }],
      [
        { ...combatAnchor, center, radius: 6, count: 5 },
        { ...combatAnchor, center: { x: 8, z: 50 }, radius: 6, count: 5 },
      ],
      MOBS,
      [zone],
      {},
      [],
      [],
      undefined,
      [{ ...center, clearRadius: 4 }],
    );

    expect(MIR4_WOC_POPULATION_RULES.objectiveGuardMaxCount).toBe(6);
    expect(population).toHaveLength(1);
    expect(population[0]?.count).toBe(6);
  });

  it('keeps the original WoC geometry while replacing its actors with MIR4 content', () => {
    const originalNpcCount = Object.keys(BUILTIN_WORLD.npcs).length;
    const originalCampCount = BUILTIN_WORLD.camps.length;
    const world = buildMir4WocComparisonWorld(4);

    expect(world.terrainModel).toBe('builtin');
    expect(world.presentationModel).toBe('builtin');
    expect(world.zones).not.toBe(BUILTIN_WORLD.zones);
    expect(world.zones.map(({ pois: _pois, ...zone }) => zone)).toEqual(
      BUILTIN_WORLD.zones.map(({ pois: _pois, ...zone }) => zone),
    );
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
    expect(world.zones[0]?.pois).toContainEqual(AELDRUNE_EASTBROOK_HARBOR_POI);
    const source = buildMir4ArcWorld(4);
    expect(Object.keys(world.npcs).sort()).toEqual(Object.keys(source.npcs).sort());
    expect(Object.values(world.npcs).every((npc) => npc.id.startsWith('mir4_'))).toBe(true);
    expect(world.camps.length).toBeGreaterThan(source.camps.length);
    expect(world.camps.every((camp) => camp.mobId.startsWith('mir4_'))).toBe(true);
    expect(
      world.groundObjects
        .filter((object) => object.itemId !== 'mir4_object_energy_crystal')
        .map((object) => `${object.itemId}:${object.name}:${object.positions.length}`)
        .sort(),
    ).toEqual(
      source.groundObjects
        .map((object) => `${object.itemId}:${object.name}:${object.positions.length}`)
        .sort(),
    );
    expect(
      world.groundObjects.find((object) => object.itemId === 'mir4_object_energy_crystal')
        ?.positions,
    ).toHaveLength(1);
    expect(world.services?.noticeboards?.map((board) => board.id).sort()).toEqual(
      source.services?.noticeboards?.map((board) => board.id).sort(),
    );
    expect(world.services?.graveyards?.map((graveyard) => graveyard.id).sort()).toEqual(
      source.services?.graveyards?.map((graveyard) => graveyard.id).sort(),
    );
    expect(world.services?.musterBoards).toBe(BUILTIN_WORLD.services?.musterBoards);
    expect(Object.keys(BUILTIN_WORLD.npcs)).toHaveLength(originalNpcCount);
    expect(BUILTIN_WORLD.camps).toHaveLength(originalCampCount);
  });

  it("keeps Sara's starter stock and lets M01-Q02 interact with her on the projected WoC map", () => {
    const world = buildMir4WocComparisonWorld(1);
    const saraDef = Object.values(world.npcs).find(
      (npc) => npc.id === MIR4_VILLAGE_PROVISIONER_NPC_ID,
    );
    expect(saraDef?.vendorItems).toEqual([...MIR4_VILLAGE_GENERAL_GOODS]);

    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 1_791,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      playerName: 'Sara Route',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const q1 = mir4ArcQuest('M01-Q01')!;
    const q2 = mir4ArcQuest('M01-Q02')!;
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: q1.questId,
        stageIndex: q1.stages.length,
        stageProgress: 0,
        state: 'done',
      },
    };
    const maela = [...sim.entities.values()].find(
      (entity) => entity.templateId === mir4ArcNpcTemplateId(q2.giverNpcId),
    );
    const sara = [...sim.entities.values()].find(
      (entity) => entity.templateId === MIR4_VILLAGE_PROVISIONER_NPC_ID,
    );
    if (!maela || !sara) throw new Error('M01-Q02 merchant route requires Maela and Sara');
    expect(sara.vendorItems).toEqual([...MIR4_VILLAGE_GENERAL_GOODS]);

    sim.talkToNpc(maela.id);
    expect(meta.mir4ArcQuests['M01-Q02']).toMatchObject({
      stageIndex: 0,
      state: 'active',
    });
    sim.talkToNpc(sara.id);
    expect(meta.mir4ArcQuests['M01-Q02']).toMatchObject({
      stageIndex: 1,
      state: 'active',
    });
  });

  it("keeps Fenbridge's visible muster board aligned with its physical collider", () => {
    const world = buildMir4WocComparisonWorld();
    setActiveWorldContent(world);
    const board = world.services?.musterBoards?.[0];
    expect(board).toBeDefined();
    if (!board) return;

    expect(
      colliderInternalsForTest
        .staticWorldColliders(WORLD_SEED)
        .find(
          (collider) =>
            collider.type === 'obb' &&
            collider.x === board.x &&
            collider.z === board.z &&
            collider.hw === board.width / 2 &&
            collider.hd === board.depth / 2,
        ),
    ).toBeDefined();
  });

  it('builds from canonical WoC terrain without inheriting or replacing an active custom world', () => {
    const custom = buildMir4ArcWorld(1);
    setActiveWorldContent(custom);

    const world = buildMir4WocComparisonWorld(1, 1_789);

    expect(world.zones).not.toBe(BUILTIN_WORLD.zones);
    expect(world.zones[0]?.id).toBe(BUILTIN_WORLD.zones[0]?.id);
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

  it('labels the original WoC terrain with the campaign places used by Fogo nos Juncos', () => {
    const world = buildMir4WocComparisonWorld(2);
    const willowfen = world.zones.find((zone) => zone.id === 'willowfen');
    const builtinWillowfen = BUILTIN_WORLD.zones.find((zone) => zone.id === 'willowfen');
    if (!willowfen || !builtinWillowfen) throw new Error('Willowfen is required');

    expect(willowfen.pois.map((poi) => poi.label)).toEqual([
      'Posto das Duas Pontes',
      'Juncal das Três Chamas',
      'Passagem dos Batedores',
      'Cais do Lodo Claro',
      'Ilhas das Quatro Vozes',
      'Farol Velho do Juncal',
      'Entreposto Afundado',
      'Atalho da Folha Seca',
      'Três Abrigos da Maré',
      'Raiz do Guardião',
    ]);
    expect(willowfen.pois.find((poi) => poi.id === 'm02-poi-juncal-tres-chamas')).toMatchObject({
      x: -372,
      z: 260,
      label: 'Juncal das Três Chamas',
    });
    expect(builtinWillowfen.pois.map((poi) => poi.label)).toContain('The Amberfen Steps');
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
    // This checkpoint exercises M01 only. Building later campaign projections
    // makes the deterministic 741-tick journey needlessly approach Vitest's
    // timeout under parallel load without adding coverage to this assertion.
    const world = buildMir4WocComparisonWorld(1);
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
      'mir4_woc_m02_m03_garden_waypoint',
      'mir4_woc_m06_m07_veil_waypoint',
      'mir4_woc_m07_m08_gale_waypoint',
      'mir4_woc_m12_m13_dune_waypoint',
      'mir4_woc_m13_m14_akhet_waypoint',
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

  it('routes the M01 to M02 Auto Journey through the safe campaign waypoint', () => {
    const world = buildMir4WocComparisonWorld(2);
    const nara = Object.values(world.npcs).find((npc) => npc.id.startsWith('mir4_m02_'));
    const waypoint = MIR4_WOC_TUTORIAL_PORTALS.find(
      (portal) => portal.id === 'mir4_woc_tutorial_m02_waypoint',
    );
    const m01Exit = world.mir4ArcMapProjections?.find(
      (projection) => projection.mapId === 'm01-vila-do-vau',
    )?.portalOut;
    if (!nara || !waypoint || !m01Exit) throw new Error('M02 transition fixtures are required');

    expect(
      mir4PortalRouteGoal(
        m01Exit,
        nara.pos,
        mir4ArcPortalsForWorld(world),
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual({ x: waypoint.b.x, z: waypoint.b.z });
  });

  it('routes the M02 return lesson back through the reciprocal campaign waypoint', () => {
    const world = buildMir4WocComparisonWorld(2);
    const m01Npc = Object.values(world.npcs).find((npc) => npc.id.startsWith('mir4_m01_'));
    const waypoint = MIR4_WOC_TUTORIAL_PORTALS.find(
      (portal) => portal.id === 'mir4_woc_tutorial_m02_waypoint',
    );
    if (!m01Npc || !waypoint) throw new Error('M01 return fixtures are required');

    expect(
      mir4PortalRouteGoal(
        waypoint.a.landing,
        m01Npc.pos,
        mir4ArcPortalsForWorld(world),
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual({ x: waypoint.a.x, z: waypoint.a.z });
  });

  it('uses the M06-M07 transit only for its two endpoint regions', () => {
    const world = buildMir4WocComparisonWorld();
    const portals = mir4ArcPortalsForWorld(world);
    const transit = portals.find((portal) => portal.id === 'mir4_woc_m06_m07_veil_waypoint');
    const m13Npc = Object.values(world.npcs).find((npc) => npc.id.startsWith('mir4_m13_'));
    if (!transit || !m13Npc) throw new Error('M06-M07 transit and M13 actor are required');

    expect(
      mir4PortalRouteGoal(
        transit.b.landing,
        m13Npc.pos,
        portals,
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual(m13Npc.pos);
    expect(
      mir4PortalRouteGoal(
        transit.a.landing,
        transit.b.landing,
        portals,
        world.mir4ArcMapProjections,
        world,
      ),
    ).toEqual({ x: transit.a.x, z: transit.a.z });
  });

  it('keeps the M07 story footprint outside the later M19 grind camps', () => {
    const world = buildMir4WocComparisonWorld(20);
    const m07 = world.mir4ArcMapProjections?.find(
      (projection) => projection.mapId === 'm07-galerias-do-ossario',
    );
    const m19Camps = world.camps.filter((camp) => camp.mobId.startsWith('mir4_m19-'));
    if (!m07) throw new Error('M07 projection is required');
    const storySites = m07.controlPoints?.slice(3).map((control) => control.target) ?? [];
    const storyNpcs = Object.values(world.npcs)
      .filter((npc) => npc.id.startsWith('mir4_m07_'))
      .map((npc) => npc.pos);

    expect(storySites).toEqual([
      { x: -360, z: 1636 },
      { x: -380, z: 1620 },
      { x: -380, z: 1700 },
      { x: -320, z: 1720 },
      { x: -330, z: 1740 },
      { x: -348, z: 1816 },
    ]);
    expect(storyNpcs).toEqual(
      expect.arrayContaining([
        { x: -364, z: 1584 },
        { x: -376, z: 1620 },
        { x: -380, z: 1700 },
        { x: -330, z: 1740 },
      ]),
    );
    expect(m19Camps.length).toBeGreaterThan(0);
    for (const camp of m19Camps) {
      for (const point of [...storySites, ...storyNpcs]) {
        expect(Math.hypot(camp.center.x - point.x, camp.center.z - point.z)).toBeGreaterThan(
          camp.radius + 45,
        );
      }
    }
  });

  it('gives guarded mission interactions a finite clear window', () => {
    const world = buildMir4WocComparisonWorld(20);
    const m09 = world.mir4ArcMapProjections?.find(
      (projection) => projection.mapId === 'm09-pantano-das-lanternas',
    );
    const interactionSite = m09?.controlPoints?.[4]?.target;
    if (!interactionSite) throw new Error('M09-Q02 interaction site is required');
    const overlappingGuards = world.camps.filter(
      (camp) =>
        Math.hypot(camp.center.x - interactionSite.x, camp.center.z - interactionSite.z) <=
        camp.radius + MIR4_WOC_POPULATION_RULES.objectiveInteractionClearRadius,
    );

    expect(interactionSite).toEqual({ x: 92, z: 350 });
    expect(overlappingGuards).toHaveLength(1);
    expect(overlappingGuards[0]?.count).toBeLessThanOrEqual(
      MIR4_WOC_POPULATION_RULES.objectiveGuardMaxCount,
    );
  });

  it('keeps the M16 travel chokes dangerous but finitely clearable', () => {
    const world = buildMir4WocComparisonWorld(20);
    for (const choke of [
      { x: 390, z: 2264, clearRadius: 20 },
      { x: 351, z: 2294, clearRadius: 18 },
    ]) {
      const overlappingGuards = world.camps.filter(
        (camp) =>
          Math.hypot(camp.center.x - choke.x, camp.center.z - choke.z) <=
          camp.radius + choke.clearRadius,
      );

      expect(overlappingGuards, `${choke.x},${choke.z}`).toHaveLength(1);
      expect(overlappingGuards[0]?.mobId).toContain('m16-forja-do-sol-partido');
      expect(overlappingGuards[0]?.count).toBeLessThanOrEqual(
        MIR4_WOC_POPULATION_RULES.objectiveGuardMaxCount,
      );
    }
  });

  it('lets the real Auto Journey cross safely from the completed M01 arc into M02', () => {
    const world = { ...buildMir4WocComparisonWorld(2), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 77,
      playerClass: 'warrior',
      playerName: 'SafeChapterRoute',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('Comparison player metadata is required');
    sim.setPlayerLevel(30);
    meta.mir4ArcQuests = {};
    for (let index = 1; index <= 6; index += 1) {
      const questId = `M01-Q0${index}`;
      meta.mir4ArcQuests[questId] = {
        questId,
        stageIndex: 99,
        stageProgress: 0,
        state: 'done',
      };
    }

    sim.setMir4AutoQuest(true);
    let guard = 0;
    while (guard++ < 12_000 && !meta.mir4ArcQuests['M02-Q01']) sim.tick();

    expect(guard).toBeLessThan(12_000);
    expect(meta.mir4ArcQuests['M02-Q01']).toMatchObject({
      questId: 'M02-Q01',
      stageIndex: 1,
      state: 'active',
    });
    expect(sim.player.pos.x).toBeLessThan(-180);
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
    // The two remaining Frostveil seats are inside Icemantle's lodge
    // collision. Requiring the former count of 70 pushed one campaign actor
    // back behind a wall; 69 keeps the broad native fabric while the explicit
    // road seats remain physically reachable.
    expect(nativeSeatsUsed.length).toBeGreaterThanOrEqual(69);
    expect(npcPositions).not.toContain('-27:1557');
    expect(npcPositions).not.toContain('-40:1557');

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
    expect(MIR4_WOC_POPULATION_RULES.grindCountMultiplier).toBe(2.8);
    expect(MIR4_WOC_POPULATION_RULES.grindMinPerCamp).toBe(9);

    // Duplicate native camps occupied already-guarded objectives, two road
    // chokes, and two portal safety envelopes. Removing only those overlaps
    // leaves more than fourteen hundred monsters while guaranteeing finite
    // clear windows and safe arrival areas before trash respawns.
    expect(world.camps.length).toBeGreaterThanOrEqual(146);
    expect(new Set(world.camps.map((camp) => `${camp.center.x}:${camp.center.z}`)).size).toBe(
      world.camps.length,
    );
    expect(
      world.camps.every((camp) => nativeCampCenters.has(`${camp.center.x}:${camp.center.z}`)),
    ).toBe(true);
    expect(world.camps.reduce((total, camp) => total + camp.count, 0)).toBeGreaterThanOrEqual(
      1_400,
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
      ).toBeGreaterThanOrEqual(42);
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
    expect(spawnedMobs.length).toBeGreaterThanOrEqual(1_400);
    expect(new Set(spawnedMobs.map((mob) => `${mob.pos.x}:${mob.pos.z}`)).size).toBe(
      spawnedMobs.length,
    );
  });

  it('keeps grind packs clear of story actors, dungeon entrances and travel portals', () => {
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
    const portalSafetyPoints = (world.travelPortals ?? []).flatMap((portal) => [
      { id: `${portal.id}:a`, x: portal.a.x, z: portal.a.z },
      { id: `${portal.id}:a:arrival`, x: portal.a.landing.x, z: portal.a.landing.z },
      { id: `${portal.id}:b`, x: portal.b.x, z: portal.b.z },
      { id: `${portal.id}:b:arrival`, x: portal.b.landing.x, z: portal.b.landing.z },
    ]);

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
      for (const portal of portalSafetyPoints) {
        expect(
          Math.hypot(camp.center.x - portal.x, camp.center.z - portal.z),
          `${camp.mobId} respawns inside portal safety radius ${portal.id}`,
        ).toBeGreaterThanOrEqual(24 + camp.radius);
      }
    }
  });

  it.each([7, WORLD_SEED])(
    'keeps every spawned monster outside portal endpoints and arrivals for seed %i',
    (seed) => {
      const world = buildMir4WocComparisonWorld();
      setActiveWorldContent(world);
      const sim = new Sim({
        seed,
        playerClass: 'warrior',
        gameProfile: 'mir4-gameplay-port',
        world,
        noPlayer: true,
      });
      const portalPoints = portalClearancePoints(world.travelPortals);
      const spawnedMobs = [...sim.entities.values()].filter((entity) => entity.kind === 'mob');

      expect(portalPoints.length).toBeGreaterThan(0);
      expect(spawnedMobs.length).toBeGreaterThan(0);
      for (const mob of spawnedMobs) {
        for (const point of portalPoints) {
          for (const [kind, position] of [
            ['position', mob.pos],
            ['respawn', mob.spawnPos],
          ] as const) {
            expect(
              Math.hypot(position.x - point.x, position.z - point.z),
              `${mob.templateId} ${kind} is inside portal safety radius at ${point.x},${point.z}`,
            ).toBeGreaterThanOrEqual(PORTAL_CLEAR_RADIUS - 1e-6);
          }
        }
      }
    },
  );

  it('keeps an M03 death in Evergarden instead of releasing into the stronger M06 zone', () => {
    const world = buildMir4WocComparisonWorld();
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: WORLD_SEED,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const player = sim.player;
    const deathPos = sim.groundPos(418, 1124);
    player.pos = { ...deathPos };
    player.prevPos = { ...deathPos };
    sim.rebucket(player);
    player.hp = 0;
    player.dead = true;

    sim.releaseSpirit();

    expect(player.ghost).toBe(true);
    expect({ x: player.corpsePos?.x, z: player.corpsePos?.z }).toEqual({
      x: deathPos.x,
      z: deathPos.z,
    });
    expect(mir4ArcRegionAt(player.pos, world.mir4ArcMapProjections)?.mapId).toBe(
      'm03-bosque-do-vale',
    );
    expect({ x: player.pos.x, z: player.pos.z }).toEqual({ x: 321.04, z: 806.8 });
    expect(sim.resurrectAtSpiritHealer()).toBe(true);
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

  it('keeps the three M03 final wolf signs separated on the North Watch road', () => {
    const world = buildMir4WocComparisonWorld();
    const quest = mir4ArcQuest('M03-Q06');
    if (!quest) throw new Error('M03-Q06 is required');
    const stage = quest.stages[2];
    if (!stage) throw new Error('M03-Q06 clue stage is required');

    const anchors = [0, 1, 2].map((index) =>
      mir4ArcStageAnchor(quest.questId, stage, index, world.mir4ArcMapProjections),
    );

    expect(anchors).toEqual([
      { x: 387, z: 1098 },
      { x: 420, z: 1104 },
      { x: 440, z: 1110 },
    ]);
    expect(
      Math.hypot(anchors[0]!.x - anchors[1]!.x, anchors[0]!.z - anchors[1]!.z),
    ).toBeGreaterThan(30);
    expect(
      Math.hypot(anchors[1]!.x - anchors[2]!.x, anchors[1]!.z - anchors[2]!.z),
    ).toBeGreaterThan(20);
  });

  it('keeps the last M04 strengthening nodes outside the later crypt pack', () => {
    const world = buildMir4WocComparisonWorld();
    const projection = world.mir4ArcMapProjections?.find(
      (candidate) => candidate.mapId === 'm04-ruinas-da-encosta',
    );
    const plan = projection?.objectiveAnchors?.find(
      (candidate) => candidate.questId === 'M04-S01' && candidate.stageIndex === 1,
    );
    expect(plan?.points.slice(-2)).toEqual([
      { x: -166, z: 735 },
      { x: -151, z: 765 },
    ]);
    expect(
      plan?.points.slice(-2).every((point) => Math.hypot(point.x - 109, point.z - 759) > 100),
    ).toBe(true);
    const westRoadChoke = { x: -96, z: 724, clearRadius: 40 };
    const overlappingGuards = world.camps.filter(
      (camp) =>
        Math.hypot(camp.center.x - westRoadChoke.x, camp.center.z - westRoadChoke.z) <=
        camp.radius + westRoadChoke.clearRadius,
    );
    expect(overlappingGuards).toHaveLength(1);
    expect(overlappingGuards[0]?.count).toBeLessThanOrEqual(
      MIR4_WOC_POPULATION_RULES.objectiveGuardMaxCount,
    );
  });

  it('keeps all eight M17 salvage nodes on the walkable Glacier Tarn rim', () => {
    const world = buildMir4WocComparisonWorld();
    const quest = mir4ArcQuest('M17-S01');
    if (!quest) throw new Error('M17-S01 is required');
    const stage = quest.stages[1];
    if (!stage) throw new Error('M17-S01 salvage stage is required');

    const anchors = Array.from({ length: 8 }, (_, index) =>
      mir4ArcStageAnchor(quest.questId, stage, index, world.mir4ArcMapProjections),
    );

    expect(anchors).toEqual([
      { x: 28, z: 1662 },
      { x: 30, z: 1670 },
      { x: 34, z: 1680 },
      { x: 38, z: 1690 },
      { x: 40, z: 1700 },
      { x: 36, z: 1710 },
      { x: 32, z: 1720 },
      { x: 30, z: 1730 },
    ]);
    expect(
      mir4ArcStageAnchor(quest.questId, quest.stages[2]!, 0, world.mir4ArcMapProjections),
    ).toEqual({ x: 30, z: 1730 });
  });

  it('keeps the M17 civilian supplies beside Edda in the aurora camp', () => {
    const world = buildMir4WocComparisonWorld();
    const quest = mir4ArcQuest('M17-S03');
    if (!quest) throw new Error('M17-S03 is required');
    const stage = quest.stages[1];
    if (!stage) throw new Error('M17-S03 preparation stage is required');

    expect(mir4ArcStageAnchor(quest.questId, stage, 0, world.mir4ArcMapProjections)).toEqual({
      x: 36,
      z: 1710,
    });
  });

  it('keeps every transplanted NPC, camp, board, and graveyard on dry terrain', () => {
    const world = buildMir4WocComparisonWorld();
    setActiveWorldContent(world);
    const points: { label: string; x: number; z: number }[] = [
      ...Object.values(world.npcs).map((npc) => ({
        label: `npc:${npc.id}`,
        ...npc.pos,
      })),
      ...world.camps.map((camp) => ({
        label: `camp:${camp.mobId}`,
        ...camp.center,
      })),
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
