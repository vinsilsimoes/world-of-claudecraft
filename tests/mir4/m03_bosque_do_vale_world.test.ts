import { afterEach, describe, expect, it } from 'vitest';
import { PROP_ASSET_DEFS } from '../../src/render/props';
import { skyBiomesAt } from '../../src/render/sky';
import { isBlocked } from '../../src/sim/colliders';
import { mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_REGION_LAYOUTS } from '../../src/sim/content/mir4/arc_world_layout';
import { MIR4_AUTHORED_MAP_IDS } from '../../src/sim/content/mir4/authored_maps';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from '../../src/sim/content/mir4/m03_bosque_do_vale_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { customWorldTerrainHeight } from '../../src/sim/custom_world_terrain';
import { BUILTIN_WORLD, setActiveWorldContent } from '../../src/sim/data';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { worldForGameProfile } from '../../src/sim/game_profile_world';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { mir4ArcPortalsForWorld } from '../../src/sim/mir4/travel';
import {
  findPlayerPath,
  PLAYER_BODY_RADIUS,
  PLAYER_MAX_CLIMB_SLOPE,
  PLAYER_SWIM_DEPTH,
} from '../../src/sim/pathfind';
import { Sim } from '../../src/sim/sim';
import { biomeAt, terrainHeight, terrainSteepnessAt, waterLevelAt } from '../../src/sim/world';

function insideBounds(point: Readonly<{ x: number; z: number }>): boolean {
  const { bounds } = M03_BOSQUE_DO_VALE_BLUEPRINT;
  return (
    point.x >= bounds.xMin &&
    point.x <= bounds.xMax &&
    point.z >= bounds.zMin &&
    point.z <= bounds.zMax
  );
}

type Point = Readonly<{ x: number; z: number }>;

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const rx = b.x - a.x;
  const rz = b.z - a.z;
  const sx = d.x - c.x;
  const sz = d.z - c.z;
  const denominator = rx * sz - rz * sx;
  if (Math.abs(denominator) < 1e-9) return false;
  const qx = c.x - a.x;
  const qz = c.z - a.z;
  const t = (qx * sz - qz * sx) / denominator;
  const u = (qx * rz - qz * rx) / denominator;
  return t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6;
}

function pathCrossesGate(
  from: Point,
  path: readonly Point[],
  gate: readonly [Point, Point],
): boolean {
  const points = [from, ...path];
  return points
    .slice(1)
    .some((point, index) => segmentsIntersect(points[index]!, point, gate[0], gate[1]));
}

function playerPathIsPhysicallyWalkable(
  seed: number,
  from: Point,
  path: readonly Point[],
): boolean {
  let previous = from;
  let previousHeight = terrainHeight(previous.x, previous.z, seed);
  for (const destination of path) {
    const segmentStart = previous;
    let previousX = segmentStart.x;
    let previousZ = segmentStart.z;
    const distance = Math.hypot(destination.x - segmentStart.x, destination.z - segmentStart.z);
    const samples = Math.max(1, Math.ceil(distance / 0.25));
    for (let index = 1; index <= samples; index++) {
      const t = index / samples;
      const x = segmentStart.x + (destination.x - segmentStart.x) * t;
      const z = segmentStart.z + (destination.z - segmentStart.z) * t;
      const height = terrainHeight(x, z, seed);
      const step = Math.hypot(x - previousX, z - previousZ);
      if (
        isBlocked(seed, x, z, PLAYER_BODY_RADIUS) ||
        height < waterLevelAt(x, z, seed) - PLAYER_SWIM_DEPTH ||
        (step > 1e-6 && (height - previousHeight) / step > PLAYER_MAX_CLIMB_SLOPE)
      ) {
        return false;
      }
      previousX = x;
      previousZ = z;
      previousHeight = height;
    }
    previous = destination;
  }
  return true;
}

describe('Bosque do Vale authored world blueprint', () => {
  afterEach(() => setActiveWorldContent(BUILTIN_WORLD));

  it('keeps M03 frozen while the approved M04 is appended', () => {
    expect(MIR4_AUTHORED_MAP_IDS).toEqual([
      'm01-vila-do-vau',
      'm02-trilha-dos-juncos',
      'm03-bosque-do-vale',
      'm04-ruinas-da-encosta',
    ]);
    expect(
      worldForGameProfile(MIR4_GAME_PROFILE, { mir4WocMap: false })?.zones.map((zone) => zone.id),
    ).toEqual([
      'mir4_m01-vila-do-vau',
      'mir4_m02-trilha-dos-juncos',
      'mir4_m03-bosque-do-vale',
      'mir4_m04-ruinas-da-encosta',
    ]);
  });

  it('authors one broad ancient-forest valley with ten distinct points of interest', () => {
    const { bounds, missionSites, pointsOfInterest } = M03_BOSQUE_DO_VALE_BLUEPRINT;
    expect(bounds.xMax - bounds.xMin).toBeGreaterThanOrEqual(700);
    expect(bounds.zMax - bounds.zMin).toBeGreaterThanOrEqual(560);
    expect(missionSites).toHaveLength(6);
    expect(pointsOfInterest).toHaveLength(10);
    expect(new Set(pointsOfInterest.map((poi) => poi.id)).size).toBe(10);
    expect(new Set(pointsOfInterest.map((poi) => poi.label)).size).toBe(10);
    expect(pointsOfInterest.filter((poi) => poi.purpose === 'exploration')).toHaveLength(3);
    expect(pointsOfInterest.every((poi) => insideBounds(poi.pos))).toBe(true);
  });

  it('gives M03 its own twilight-forest identity after the approved green valley and marsh', () => {
    expect(
      MIR4_WORLD_ARC.slice(0, 3).map(({ mapId, environment, biome }) => ({
        mapId,
        environment,
        biome,
      })),
    ).toEqual([
      {
        mapId: 'm01-vila-do-vau',
        environment: 'grass-land-forest-river',
        biome: 'vale',
      },
      {
        mapId: 'm02-trilha-dos-juncos',
        environment: 'grass-land-wetland',
        biome: 'marsh',
      },
      {
        mapId: 'm03-bosque-do-vale',
        environment: 'ancient-twilight-forest',
        biome: 'dusk',
      },
    ]);
    expect(
      buildMir4ArcWorld(3).zones.find((zone) => zone.id === 'mir4_m03-bosque-do-vale')?.biome,
    ).toBe('dusk');
  });

  it('authors three ecological art districts instead of repeating one forest treatment', () => {
    const { artDistricts, pointsOfInterest, decorPlacements } = M03_BOSQUE_DO_VALE_BLUEPRINT;
    expect(
      artDistricts.map(({ id, presentationBiome, poiIds }) => ({
        id,
        presentationBiome,
        poiCount: poiIds.length,
      })),
    ).toEqual([
      { id: 'refuge-canopy', presentationBiome: 'vale', poiCount: 1 },
      { id: 'twilight-wilds', presentationBiome: 'dusk', poiCount: 6 },
      { id: 'cold-gorge', presentationBiome: 'haunt', poiCount: 3 },
    ]);

    const assignedPoiIds = artDistricts.flatMap((district) => district.poiIds);
    expect([...assignedPoiIds].sort()).toEqual(pointsOfInterest.map((poi) => poi.id).sort());
    expect(new Set(assignedPoiIds).size).toBe(assignedPoiIds.length);

    const keysIn = (districtId: (typeof artDistricts)[number]['id']) => {
      const district = artDistricts.find((candidate) => candidate.id === districtId)!;
      return new Set(
        decorPlacements
          .filter((placement) => district.poiIds.includes(placement.poiId))
          .map((placement) => placement.key),
      );
    };
    expect(keysIn('refuge-canopy')).toContain('oakTree');
    expect(keysIn('refuge-canopy')).not.toContain('marshDeadTree');
    expect(keysIn('refuge-canopy')).not.toContain('crystalAmethystCluster');
    for (const key of [
      'oakTree',
      'marshDeadTree',
      'mushroomGlowCluster',
      'crystalAmethystCluster',
    ]) {
      expect(keysIn('twilight-wilds'), key).toContain(key);
    }
    for (const key of ['marshDeadTree', 'marshRootWall', 'starHeartCrystal']) {
      expect(keysIn('cold-gorge'), key).toContain(key);
    }
    expect(decorPlacements).toHaveLength(106);
    expect(
      artDistricts.map((district) => [
        district.id,
        decorPlacements.filter((placement) => district.poiIds.includes(placement.poiId)).length,
      ]),
    ).toEqual([
      ['refuge-canopy', 8],
      ['twilight-wilds', 73],
      ['cold-gorge', 25],
    ]);
    expect(
      [
        ...M03_BOSQUE_DO_VALE_BLUEPRINT.biomePaint.ids.reduce((counts, id) => {
          counts.set(id, (counts.get(id) ?? 0) + 1);
          return counts;
        }, new Map<number, number>()),
      ].sort(([a], [b]) => a - b),
    ).toEqual([
      [0, 261],
      [13, 649],
      [255, 2201],
    ]);
  });

  it('renders the three districts as mixed biomes without changing authored terrain physics', () => {
    const world = buildMir4ArcWorld(3);
    expect(world.biomePaint?.affectsTerrain).toBe(false);
    setActiveWorldContent(world);

    const expectedPoiBiomes = new Map([
      ['m03-poi-abrigo-silvas', 'vale'],
      ['m03-poi-ruinas-marca', 'dusk'],
      ['m03-poi-jardim-ferido', 'dusk'],
      ['m03-poi-campanario-partido', 'dusk'],
      ['m03-poi-covil-vigia', 'dusk'],
      ['m03-poi-quatro-totens', 'haunt'],
      ['m03-poi-garganta-uivo', 'haunt'],
      ['m03-poi-gruta-orvalho', 'dusk'],
      ['m03-poi-ponte-raiz', 'dusk'],
      ['m03-poi-mirante-farol', 'haunt'],
    ]);
    for (const poi of M03_BOSQUE_DO_VALE_BLUEPRINT.pointsOfInterest) {
      const expected = expectedPoiBiomes.get(poi.id);
      expect(expected, poi.id).toBeDefined();
      expect(biomeAt(poi.pos.x, poi.pos.z), poi.id).toBe(expected);
      expect(skyBiomesAt(poi.pos.x, poi.pos.z), poi.id).toEqual([expected]);
    }

    const terrainOnly = { ...world, biomePaint: undefined };
    for (const point of [
      { x: 4425, z: 215 },
      { x: 4610, z: 320 },
      { x: 4980, z: 35 },
    ]) {
      expect(customWorldTerrainHeight(world, point.x, point.z, 181)).toBe(
        customWorldTerrainHeight(terrainOnly, point.x, point.z, 181),
      );
    }
  });

  it('occupies its own authored province without overlapping any source-data scaffold', () => {
    const m03 = MIR4_ARC_REGION_LAYOUTS.find((region) => region.mapId === 'm03-bosque-do-vale')!;
    expect(m03).toMatchObject(M03_BOSQUE_DO_VALE_BLUEPRINT.bounds);
    for (const other of MIR4_ARC_REGION_LAYOUTS) {
      if (other.mapId === m03.mapId) continue;
      const separated =
        m03.xMax <= other.xMin ||
        other.xMax <= m03.xMin ||
        m03.zMax <= other.zMin ||
        other.zMax <= m03.zMin;
      expect(separated, `${m03.mapId} overlaps ${other.mapId}`).toBe(true);
    }
  });

  it('binds every main quest to its own authored landscape and combat band', () => {
    expect(
      M03_BOSQUE_DO_VALE_BLUEPRINT.missionSites.map((site) => ({
        questId: site.questId,
        label: site.label,
        levelRange: site.levelRange,
      })),
    ).toEqual([
      {
        questId: 'M03-Q01',
        label: 'Ruínas da Marca Apagada',
        levelRange: [21, 22],
      },
      {
        questId: 'M03-Q02',
        label: 'Jardim das Ervas Feridas',
        levelRange: [23, 24],
      },
      { questId: 'M03-Q03', label: 'Campanário Partido', levelRange: [25, 25] },
      {
        questId: 'M03-Q04',
        label: 'Covil da Vigia de Plumas',
        levelRange: [26, 27],
      },
      {
        questId: 'M03-Q05',
        label: 'Encruzilhada dos Quatro Totens',
        levelRange: [28, 29],
      },
      { questId: 'M03-Q06', label: 'Garganta do Uivo', levelRange: [30, 30] },
    ]);
    expect(
      M03_BOSQUE_DO_VALE_BLUEPRINT.camps.map((camp) => ({
        questId: camp.questId,
        levelRange: camp.levelRange,
      })),
    ).toEqual(
      M03_BOSQUE_DO_VALE_BLUEPRINT.missionSites.map((site) => ({
        questId: site.questId,
        levelRange: site.levelRange,
      })),
    );
  });

  it('keeps recent human architecture inside the refuge and ecological sites natural', () => {
    const poiById = new Map(
      M03_BOSQUE_DO_VALE_BLUEPRINT.pointsOfInterest.map((poi) => [poi.id, poi] as const),
    );
    for (const placement of M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements) {
      const poi = poiById.get(placement.poiId);
      expect(poi, placement.poiId).toBeDefined();
      expect(placement.key in PROP_ASSET_DEFS, placement.key).toBe(true);
      if (poi?.occupants === 'wildlife' || poi?.occupants === 'guardians') {
        expect(placement.origin, `${poi.label}:${placement.key}`).not.toBe('settlement');
      }
      if (placement.origin === 'settlement') {
        expect(placement.poiId).toBe('m03-poi-abrigo-silvas');
      }
    }
    expect(poiById.get('m03-poi-abrigo-silvas')).toMatchObject({
      occupants: 'villagers',
      architecture: 'forest-refuge',
    });
    expect(poiById.get('m03-poi-covil-vigia')).toMatchObject({
      occupants: 'wildlife',
      architecture: 'natural-den',
    });
    expect(poiById.get('m03-poi-garganta-uivo')).toMatchObject({
      occupants: 'guardians',
      architecture: 'root-amphitheater',
    });

    const refugeStructures = M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements.filter(
      (placement) => placement.origin === 'settlement',
    );
    expect(refugeStructures.map((placement) => placement.key).sort()).toEqual([
      'kmedHomeA',
      'well',
    ]);
    expect(
      refugeStructures.some((placement) =>
        [
          'kmedTavern',
          'kmedMarket',
          'kmedHomeB',
          'stand1',
          'fenbridgeMoonwortApothecary',
          'fenbridgeMusterBoard',
        ].includes(placement.key),
      ),
    ).toBe(false);

    expect(
      M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements
        .filter((placement) => placement.poiId === 'm03-poi-abrigo-silvas')
        .map((placement) => placement.key)
        .sort(),
    ).toEqual([
      'kmedHomeA',
      'oakTree',
      'oakTree',
      'oakTree',
      'oakTree',
      'oakTree',
      'oakTree',
      'well',
    ]);

    const world = buildMir4ArcWorld(3);
    expect(world.props.buildings.filter(insideBounds)).toHaveLength(0);
    expect(world.props.stalls.filter(insideBounds)).toHaveLength(0);
    expect(world.props.wells.filter(insideBounds)).toHaveLength(0);
    expect(world.props.mudHuts.filter(([x, z]) => insideBounds({ x, z }))).toHaveLength(0);
  });

  it('uses route loops instead of one straight campaign corridor', () => {
    const { missionSites, roads } = M03_BOSQUE_DO_VALE_BLUEPRINT;
    expect(roads).toHaveLength(11);
    for (const road of roads) {
      expect(road.length).toBeGreaterThanOrEqual(2);
      expect(road.every(insideBounds)).toBe(true);
    }
    for (const site of missionSites) {
      expect(
        roads.some((road) =>
          road.some((point) => point.x === site.pos.x && point.z === site.pos.z),
        ),
        site.questId,
      ).toBe(true);
    }
    const finalSite = missionSites[5]!;
    expect(
      roads.filter((road) =>
        road.some((point) => point.x === finalSite.pos.x && point.z === finalSite.pos.z),
      ).length,
    ).toBeGreaterThanOrEqual(2);

    const world = buildMir4ArcWorld(3);
    expect(world.roads.filter((road) => road.every(insideBounds))).toEqual(roads);
    expect(world.litRoads?.filter((road) => road.every(insideBounds))).toEqual(
      M03_BOSQUE_DO_VALE_BLUEPRINT.litRoads,
    );
  });

  it('forms the final fight as a physical gorge with an open east-west floor', () => {
    const world = buildMir4ArcWorld(3);
    setActiveWorldContent(world);
    const seed = 181;
    const center = terrainHeight(4980, 35, seed);
    const southRidge = terrainHeight(4975, -45, seed);
    const northRidge = terrainHeight(4975, 112, seed);
    const eastExit = terrainHeight(5030, 35, seed);

    expect(southRidge - center).toBeGreaterThan(10);
    expect(northRidge - center).toBeGreaterThan(10);
    expect(eastExit).toBeLessThan(Math.min(southRidge, northRidge) - 5);

    for (const x of Array.from({ length: 41 }, (_, index) => 4960 + index * 2)) {
      const steepestSouth = Math.max(
        ...Array.from({ length: 29 }, (_, index) => terrainSteepnessAt(x, -79 + index * 2, seed)),
      );
      const steepestNorth = Math.max(
        ...Array.from({ length: 29 }, (_, index) => terrainSteepnessAt(x, 76 + index * 2, seed)),
      );
      expect(steepestSouth, `south ridge at x=${x}`).toBeGreaterThan(PLAYER_MAX_CLIMB_SLOPE);
      expect(steepestNorth, `north ridge at x=${x}`).toBeGreaterThan(PLAYER_MAX_CLIMB_SLOPE);
    }

    for (const x of [4968, 4984, 5000, 5016, 5032]) {
      const southStart = { x, z: -15 };
      const southPath = findPlayerPath(seed, southStart, { x, z: -95 }, 128);
      expect(
        playerPathIsPhysicallyWalkable(seed, southStart, southPath),
        `south ridge cannot be crossed at x=${x}`,
      ).toBe(false);

      const northStart = { x, z: 75 };
      const northPath = findPlayerPath(seed, northStart, { x, z: 150 }, 128);
      expect(
        playerPathIsPhysicallyWalkable(seed, northStart, northPath),
        `north ridge cannot be crossed at x=${x}`,
      ).toBe(false);
    }

    for (const exit of [
      { x: 4935, z: 35 },
      { x: 5040, z: 35 },
    ]) {
      const floor = { x: 4980, z: 35 };
      const path = findPlayerPath(seed, floor, exit, 80);
      expect(playerPathIsPhysicallyWalkable(seed, floor, path), `open exit ${exit.x}`).toBe(true);
    }
  });

  it('lets Auto Journey break all three final wards inside the physical gorge', () => {
    const world = { ...buildMir4ArcWorld(3), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 30_361,
      playerClass: 'warrior',
      playerName: 'GorgeJourneyAudit',
      gameProfile: MIR4_GAME_PROFILE,
      world,
    });
    sim.setPlayerLevel(30);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M03-Q06': {
        questId: 'M03-Q06',
        stageIndex: 2,
        stageProgress: 0,
        state: 'active',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M03-Q06',
      phase: 'to-site',
      siteIndex: 0,
      suspended: false,
      manualSelection: true,
    };
    sim.player.pos = sim.groundPos(4900, 70);

    let ticks = 0;
    while (meta.mir4ArcQuests['M03-Q06']?.stageIndex === 2 && ticks++ < 1_500) {
      sim.tick();
    }

    expect(ticks).toBeLessThan(1_500);
    expect(meta.mir4ArcQuests['M03-Q06']?.stageIndex).toBeGreaterThan(2);
  });

  it('lets a completed M03-Q06 Auto Journey return from the gorge to Selene', () => {
    const world = { ...buildMir4ArcWorld(3), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 20_061,
      playerClass: 'warrior',
      playerName: 'GorgeReturnAudit',
      gameProfile: MIR4_GAME_PROFILE,
      world,
    });
    sim.setPlayerLevel(30);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M03-Q06': {
        questId: 'M03-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'ready',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M03-Q06',
      phase: 'return',
      siteIndex: 5,
      suspended: false,
      manualSelection: true,
    };
    sim.player.pos = sim.groundPos(4980, 35);

    let ticks = 0;
    while (meta.mir4ArcQuests['M03-Q06']?.state === 'ready' && ticks++ < 3_000) {
      sim.tick();
    }

    expect(ticks).toBeLessThan(3_000);
    expect(meta.mir4ArcQuests['M03-Q06']?.state).toBe('done');
    sim.tick();
    expect(meta.mir4AutoQuest).toBeUndefined();
  });

  it('turns both forest streams into visible physical crossings', () => {
    const world = buildMir4ArcWorld(3);
    setActiveWorldContent(world);
    const bridges = M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements.filter(
      (placement) => placement.key === 'marshPlankBridge',
    );
    expect(bridges).toHaveLength(2);
    expect(
      world.props.decorProps?.filter(
        (placement) => placement.key === 'marshPlankBridge' && insideBounds(placement),
      ),
    ).toEqual(bridges.map(({ poiId: _poiId, origin: _origin, ...placement }) => placement));
    expect(M03_BOSQUE_DO_VALE_BLUEPRINT.dryCrossings).toHaveLength(2);
    expect(world.dryCrossings?.filter(insideBounds)).toEqual(
      M03_BOSQUE_DO_VALE_BLUEPRINT.dryCrossings,
    );
    expect(
      world.zones.find((zone) => zone.id === `mir4_${M03_BOSQUE_DO_VALE_BLUEPRINT.mapId}`)?.lakes,
    ).toEqual(M03_BOSQUE_DO_VALE_BLUEPRINT.lakes);
    for (const bridge of bridges) {
      expect(
        M03_BOSQUE_DO_VALE_BLUEPRINT.dryCrossings.some(
          (crossing) => Math.hypot(crossing.x - bridge.x, crossing.z - bridge.z) <= 3,
        ),
        bridge.poiId,
      ).toBe(true);
      expect(
        M03_BOSQUE_DO_VALE_BLUEPRINT.lakes.filter(
          (lake) => Math.hypot(lake.x - bridge.x, lake.z - bridge.z) <= lake.radius + 18,
        ).length,
      ).toBeGreaterThanOrEqual(2);
    }
    for (const crossing of M03_BOSQUE_DO_VALE_BLUEPRINT.dryCrossings) {
      expect(waterLevelAt(crossing.x, crossing.z, 181), `${crossing.x},${crossing.z}`).toBe(
        -Infinity,
      );
    }
    for (const lake of M03_BOSQUE_DO_VALE_BLUEPRINT.lakes.slice(0, 4)) {
      const waterSamples = Array.from({ length: 16 }, (_, index) => {
        const angle = (index * Math.PI) / 8;
        return waterLevelAt(
          lake.x + Math.cos(angle) * lake.radius * 0.85,
          lake.z + Math.sin(angle) * lake.radius * 0.85,
          181,
        );
      });
      expect(waterSamples.some(Number.isFinite), `${lake.x},${lake.z} keeps visible water`).toBe(
        true,
      );
    }

    for (const roadIndex of [6, 8]) {
      const road = M03_BOSQUE_DO_VALE_BLUEPRINT.roads[roadIndex]!;
      for (let pointIndex = 1; pointIndex < road.length; pointIndex++) {
        const from = road[pointIndex - 1]!;
        const to = road[pointIndex]!;
        const distance = Math.hypot(to.x - from.x, to.z - from.z);
        for (let step = 0; step <= Math.ceil(distance / 2); step++) {
          const t = Math.min(1, (step * 2) / distance);
          const x = from.x + (to.x - from.x) * t;
          const z = from.z + (to.z - from.z) * t;
          expect(waterLevelAt(x, z, 20_061), `road ${roadIndex} is wet at ${x},${z}`).toBe(
            -Infinity,
          );
          expect(
            terrainSteepnessAt(x, z, 20_061),
            `road ${roadIndex} is too steep at ${x},${z}`,
          ).toBeLessThanOrEqual(PLAYER_MAX_CLIMB_SLOPE);
        }
      }
    }
  });

  it('keeps both cave mouths open and uses visible rocks as their physical flanks', () => {
    const world = buildMir4ArcWorld(3);
    setActiveWorldContent(world);
    const caves = M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements.filter(
      (placement) => placement.key === 'crystalMoundCave',
    );
    expect(caves.map(({ poiId, x, z, r }) => ({ poiId, x, z, r }))).toEqual([
      { poiId: 'm03-poi-covil-vigia', x: 4840, z: 360, r: undefined },
      { poiId: 'm03-poi-gruta-orvalho', x: 4720, z: 350, r: undefined },
    ]);
    const caveRocks = M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements.filter(
      (placement) =>
        placement.key === 'rockLargeD' &&
        (placement.poiId.includes('covil') || placement.poiId.includes('gruta')),
    );
    expect(caveRocks.filter((placement) => placement.poiId.includes('covil'))).toHaveLength(11);
    expect(caveRocks.filter((placement) => placement.poiId.includes('gruta'))).toHaveLength(10);
    expect(caveRocks.every(({ r, h, scale }) => r === 2.2 && h === 2.4 && scale === 4.1)).toBe(
      true,
    );
    expect(caveRocks.map(({ x, z }) => `${x},${z}`)).toEqual(
      expect.arrayContaining(['4832,359', '4838,351', '4714,344', '4726,344']),
    );

    const cavePieces = M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements.filter(
      (placement) =>
        placement.key === 'crystalMoundCave' ||
        (placement.key === 'rockLargeD' &&
          (placement.poiId.includes('covil') || placement.poiId.includes('gruta'))),
    );
    expect(
      world.props.decorProps?.filter(
        (placement) =>
          insideBounds(placement) &&
          (placement.key === 'crystalMoundCave' || placement.key === 'rockLargeD'),
      ),
    ).toEqual(cavePieces.map(({ poiId: _poiId, origin: _origin, ...placement }) => placement));

    const caveAudits = [
      {
        center: { x: 4720, z: 350 },
        gate: [
          { x: 4716.7, z: 344 },
          { x: 4723.3, z: 344 },
        ] as const,
        approach: { x: 4720, z: 330 },
        shell: [
          { x: 4714, z: 344 },
          { x: 4712.3, z: 347.9 },
          { x: 4712.3, z: 352.1 },
          { x: 4714.3, z: 355.7 },
          { x: 4717.9, z: 357.7 },
          { x: 4722.1, z: 357.7 },
          { x: 4725.7, z: 355.7 },
          { x: 4727.7, z: 352.1 },
          { x: 4727.7, z: 347.9 },
          { x: 4726, z: 344 },
        ],
      },
      {
        center: { x: 4840, z: 360 },
        gate: [
          { x: 4833.7, z: 356.7 },
          { x: 4836.3, z: 353.3 },
        ] as const,
        approach: { x: 4825, z: 350 },
        shell: [
          { x: 4832, z: 359 },
          { x: 4832.2, z: 361.8 },
          { x: 4834.1, z: 365.5 },
          { x: 4837.7, z: 367.7 },
          { x: 4841.8, z: 367.8 },
          { x: 4845.5, z: 365.9 },
          { x: 4847.7, z: 362.3 },
          { x: 4847.8, z: 358.2 },
          { x: 4845.9, z: 354.5 },
          { x: 4842.3, z: 352.4 },
          { x: 4838, z: 351 },
        ],
      },
    ];
    for (const { center: to, gate, approach: from, shell } of caveAudits) {
      const path = findPlayerPath(20_061, from, to, 80);
      expect(playerPathIsPhysicallyWalkable(20_061, from, path), `${from.x},${from.z} enters`).toBe(
        true,
      );
      expect(pathCrossesGate(from, path, gate), `${from.x},${from.z} uses mouth`).toBe(true);
      expect(path[path.length - 1]).toEqual(to);

      for (let index = 1; index < shell.length; index++) {
        const previous = shell[index - 1]!;
        const next = shell[index]!;
        expect(Math.hypot(next.x - previous.x, next.z - previous.z)).toBeLessThanOrEqual(
          2 * (2.2 + PLAYER_BODY_RADIUS),
        );
        expect(
          isBlocked(
            20_061,
            (previous.x + next.x) / 2,
            (previous.z + next.z) / 2,
            PLAYER_BODY_RADIUS,
          ),
          `compound shell ${index}`,
        ).toBe(true);
      }
      expect(
        isBlocked(
          20_061,
          (gate[0].x + gate[1].x) / 2,
          (gate[0].z + gate[1].z) / 2,
          PLAYER_BODY_RADIUS,
        ),
      ).toBe(false);
    }
  });

  it('matches ruin landmark colliders to the native WoC presentation scale', () => {
    expect(
      M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements
        .filter((placement) =>
          ['column', 'columnBroken', 'statueHead', 'statueBlock'].includes(placement.key),
        )
        .map(({ key, r, h, scale }) => ({ key, r, h, scale })),
    ).toEqual([
      { key: 'columnBroken', r: 0.6, h: 2.1, scale: undefined },
      { key: 'statueHead', r: 1.05, h: 2.3, scale: undefined },
      { key: 'statueBlock', r: 0.6, h: 0.85, scale: undefined },
      { key: 'column', r: 0.6, h: 3.75, scale: undefined },
      { key: 'columnBroken', r: 0.6, h: 2.1, scale: undefined },
      { key: 'column', r: 0.6, h: 3.75, scale: undefined },
      { key: 'columnBroken', r: 0.6, h: 2.1, scale: undefined },
    ]);
  });

  it('places nine unique NPCs between one refuge and dispersed story posts', () => {
    const { hub, hubRadius, npcPlacements } = M03_BOSQUE_DO_VALE_BLUEPRINT;
    expect(npcPlacements).toHaveLength(9);
    expect(new Set(npcPlacements.map((npc) => npc.id)).size).toBe(9);
    expect(new Set(npcPlacements.map((npc) => npc.name)).size).toBe(9);
    expect(npcPlacements.filter((npc) => npc.campaign)).toHaveLength(4);
    const refugeNpcs = npcPlacements.filter(
      (npc) => Math.hypot(npc.pos.x - hub.x, npc.pos.z - hub.z) <= hubRadius,
    );
    const fieldNpcs = npcPlacements.filter(
      (npc) => Math.hypot(npc.pos.x - hub.x, npc.pos.z - hub.z) > hubRadius,
    );
    expect(refugeNpcs).toHaveLength(4);
    expect(fieldNpcs).toHaveLength(5);
    expect(fieldNpcs.filter((npc) => npc.campaign)).toHaveLength(3);
    expect(
      Math.max(...fieldNpcs.map((npc) => npc.pos.x)) -
        Math.min(...fieldNpcs.map((npc) => npc.pos.x)),
    ).toBeGreaterThan(300);

    for (const npc of npcPlacements) {
      expect(insideBounds(npc.pos), npc.name).toBe(true);
      for (const decor of M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements) {
        if (decor.hw !== undefined && decor.hd !== undefined) {
          const dx = npc.pos.x - decor.x;
          const dz = npc.pos.z - decor.z;
          const cos = Math.cos(-(decor.rot ?? 0));
          const sin = Math.sin(-(decor.rot ?? 0));
          const localX = dx * cos - dz * sin;
          const localZ = dx * sin + dz * cos;
          expect(
            Math.abs(localX) > decor.hw + 0.8 || Math.abs(localZ) > decor.hd + 0.8,
            `${npc.name} inside ${decor.key}`,
          ).toBe(true);
        } else if (decor.r) {
          expect(
            Math.hypot(npc.pos.x - decor.x, npc.pos.z - decor.z),
            `${npc.name} inside ${decor.key}`,
          ).toBeGreaterThan(decor.r + 0.8);
        }
      }
    }
  });

  it('keeps every campaign contact on the authored road graph and physically reachable', () => {
    const world = buildMir4ArcWorld(3);
    setActiveWorldContent(world);
    const { hub, npcPlacements, roads } = M03_BOSQUE_DO_VALE_BLUEPRINT;
    const roadPoints = roads.flat();
    const campaignNpcs = npcPlacements.filter((npc) => npc.campaign);

    for (const npc of campaignNpcs) {
      const nearestRoadDistance = Math.min(
        ...roadPoints.map((point) => Math.hypot(point.x - npc.pos.x, point.z - npc.pos.z)),
      );
      expect(nearestRoadDistance, `${npc.name} stays near an authored road`).toBeLessThanOrEqual(
        40,
      );

      const path = findPlayerPath(20_061, hub, npc.pos, 700);
      expect(path.at(-1), `${npc.name} has a complete path from the refuge`).toEqual(npc.pos);
      expect(
        playerPathIsPhysicallyWalkable(20_061, hub, path),
        `${npc.name} is physically reachable from the refuge`,
      ).toBe(true);
    }
  });

  it('keeps a three-map prefix free of the optional M04 exit', () => {
    const world = buildMir4ArcWorld(3);
    expect(mir4ArcPortalsForWorld(world).map((portal) => portal.id)).toEqual([
      'mir4_m01-vila-do-vau_to_m02-trilha-dos-juncos',
      'mir4_m02-trilha-dos-juncos_to_m03-bosque-do-vale',
    ]);
    const exit = M03_BOSQUE_DO_VALE_BLUEPRINT.portalOut;
    expect(
      world.props.decorProps?.some(
        (prop) => prop.key === 'gardenArch' && Math.hypot(prop.x - exit.x, prop.z - exit.z) < 1,
      ),
    ).toBe(false);
  });

  it('projects every M03 POI, NPC and hostile camp into the runtime world exactly once', () => {
    const world = buildMir4ArcWorld(3);
    const zone = world.zones.find((candidate) => candidate.id === 'mir4_m03-bosque-do-vale');
    expect(zone?.pois).toEqual(
      M03_BOSQUE_DO_VALE_BLUEPRINT.pointsOfInterest.map((poi) => ({
        id: poi.id,
        x: poi.pos.x,
        z: poi.pos.z,
        label: poi.label,
      })),
    );
    for (const npc of M03_BOSQUE_DO_VALE_BLUEPRINT.npcPlacements) {
      expect(world.npcs[npc.id]?.pos, npc.id).toEqual(npc.pos);
      expect(world.npcs[npc.id]?.name, npc.id).toBe(npc.name);
    }
    const camps = world.camps.filter((camp) => insideBounds(camp.center));
    expect(camps).toEqual(
      M03_BOSQUE_DO_VALE_BLUEPRINT.camps.map((camp) => ({
        mobId: `mir4_m03-bosque-do-vale_${camp.mobId}`,
        center: camp.center,
        radius: camp.radius,
        count: camp.count,
        minLevel: camp.levelRange[0],
        maxLevel: camp.levelRange[1],
        offStream: true,
      })),
    );

    const runtimeDecor = world.props.decorProps?.filter(insideBounds) ?? [];
    const authoredDecor = M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements.map(
      ({ poiId: _poiId, origin: _origin, ...placement }) => placement,
    );
    expect(runtimeDecor).toHaveLength(authoredDecor.length + 1);
    for (const placement of authoredDecor) expect(runtimeDecor).toContainEqual(placement);
    expect(
      runtimeDecor.filter(
        (placement) =>
          placement.key === 'gardenArch' &&
          placement.x === M03_BOSQUE_DO_VALE_BLUEPRINT.portalIn.x &&
          placement.z === M03_BOSQUE_DO_VALE_BLUEPRINT.portalIn.z,
      ),
    ).toHaveLength(1);
  });

  it('spawns every authored M03 camp at its exact population and combat band', () => {
    const world = buildMir4ArcWorld(3);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 30_303,
      playerClass: 'warrior',
      playerName: 'M03PopulationAudit',
      gameProfile: MIR4_GAME_PROFILE,
      world,
    });
    for (const camp of M03_BOSQUE_DO_VALE_BLUEPRINT.camps) {
      const templateId = `mir4_m03-bosque-do-vale_${camp.mobId}`;
      const mobs = [...sim.entities.values()].filter(
        (entity) => entity.kind === 'mob' && entity.templateId === templateId,
      );
      expect(mobs, templateId).toHaveLength(camp.count);
      expect(
        mobs.every((mob) => mob.level >= camp.levelRange[0] && mob.level <= camp.levelRange[1]),
        templateId,
      ).toBe(true);
    }
  });

  it('binds all interaction stages to visible authored landmarks', () => {
    expect(
      M03_BOSQUE_DO_VALE_BLUEPRINT.objectiveAnchors.map(
        (plan) =>
          `${plan.questId}:${plan.stageIndex}:${plan.points
            .map((point) => `${point.x},${point.z}`)
            .join('|')}`,
      ),
    ).toEqual([
      'M03-Q01:2:4530,100|4565,90|4570,130',
      'M03-Q01:4:4550,110',
      'M03-Q02:2:4565,300|4590,335|4610,305',
      'M03-Q03:2:4675,20|4705,-15|4725,25',
      'M03-Q03:4:4700,10',
      'M03-Q04:2:4778,315|4805,360|4840,330',
      'M03-Q04:4:4770,320|4810,340|4850,315',
      'M03-Q04:5:4840,360',
      'M03-Q05:2:4845,160|4895,155|4870,215',
      'M03-Q05:3:4870,180',
      'M03-Q06:2:4950,10|4960,65|5010,45',
      'M03-Q06:3:4980,35',
      'M03-Q06:4:4990,70',
    ]);
    for (const plan of M03_BOSQUE_DO_VALE_BLUEPRINT.objectiveAnchors) {
      const quest = mir4ArcQuest(plan.questId)!;
      const stage = quest.stages[plan.stageIndex]!;
      for (let index = 0; index < plan.points.length; index++) {
        expect(mir4ArcStageAnchor(plan.questId, stage, index)).toEqual(plan.points[index]);
      }
    }
  });
});
