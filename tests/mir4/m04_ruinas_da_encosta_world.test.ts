import { afterEach, describe, expect, it } from 'vitest';
import { PROP_ASSET_DEFS } from '../../src/render/props';
import { advanceMir4AutomationRoute, authoredRoadRoute } from '../../src/sim/auto_quest/route';
import { isBlocked } from '../../src/sim/colliders';
import { MIR4_QUESTS_ARC, mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_REGION_LAYOUTS } from '../../src/sim/content/mir4/arc_world_layout';
import { MIR4_AUTHORED_MAP_IDS } from '../../src/sim/content/mir4/authored_maps';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from '../../src/sim/content/mir4/m03_bosque_do_vale_world';
import { M04_RUINAS_DA_ENCOSTA_BLUEPRINT } from '../../src/sim/content/mir4/m04_ruinas_da_encosta_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { BUILTIN_WORLD, setActiveWorldContent } from '../../src/sim/data';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { worldForGameProfile } from '../../src/sim/game_profile_world';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_ESCORT_STAGE_KINDS,
  MIR4_ARC_INTERACT_STAGE_KINDS,
  MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS,
} from '../../src/sim/mir4/arc_stage_kinds';
import { mir4ArcPortalsForWorld } from '../../src/sim/mir4/travel';
import {
  findPlayerPath,
  PLAYER_BODY_RADIUS,
  PLAYER_MAX_CLIMB_SLOPE,
  PLAYER_SWIM_DEPTH,
} from '../../src/sim/pathfind';
import { biomeAt, terrainHeight, waterLevelAt } from '../../src/sim/world';
import { WORLD_SEED } from '../../src/sim/world_seed';

type Point = Readonly<{ x: number; z: number }>;

function insideBounds(point: Point): boolean {
  const { bounds } = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
  return (
    point.x >= bounds.xMin &&
    point.x <= bounds.xMax &&
    point.z >= bounds.zMin &&
    point.z <= bounds.zMax
  );
}

function nearestRoadDistance(point: Point): number {
  return Math.min(
    ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.roads.flatMap((road) =>
      road.map((roadPoint) => Math.hypot(point.x - roadPoint.x, point.z - roadPoint.z)),
    ),
  );
}

function pathIsWalkable(seed: number, from: Point, path: readonly Point[]): boolean {
  let previous = from;
  let previousHeight = terrainHeight(from.x, from.z, seed);
  for (const destination of path) {
    const distance = Math.hypot(destination.x - previous.x, destination.z - previous.z);
    const samples = Math.max(1, Math.ceil(distance / 0.5));
    let previousX = previous.x;
    let previousZ = previous.z;
    for (let index = 1; index <= samples; index++) {
      const t = index / samples;
      const x = previous.x + (destination.x - previous.x) * t;
      const z = previous.z + (destination.z - previous.z) * t;
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

function objectiveAnchorDigest(): string {
  const serialized = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.objectiveAnchors
    .map(
      (plan) =>
        `${plan.questId}:${plan.stageIndex}:${plan.points
          .map((point) => `${point.x},${point.z}`)
          .join('|')}`,
    )
    .join(';');
  let digest = 2_166_136_261;
  for (let index = 0; index < serialized.length; index++) {
    digest ^= serialized.charCodeAt(index);
    digest = Math.imul(digest, 16_777_619) >>> 0;
  }
  return digest.toString(16).padStart(8, '0');
}

describe('Ruinas da Encosta authored world blueprint', () => {
  afterEach(() => setActiveWorldContent(BUILTIN_WORLD));

  it('admits M04 after the three frozen approved maps and leaves M05 unavailable', () => {
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

  it('authors a broad highland city map with six mission grounds and eleven distinct POIs', () => {
    const { bounds, missionSites, pointsOfInterest } = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
    expect(bounds.xMax - bounds.xMin).toBeGreaterThanOrEqual(800);
    expect(bounds.zMax - bounds.zMin).toBeGreaterThanOrEqual(700);
    expect(missionSites).toHaveLength(6);
    expect(missionSites.map((site) => site.questId)).toEqual([
      'M04-Q01',
      'M04-Q02',
      'M04-Q03',
      'M04-Q04',
      'M04-Q05',
      'M04-Q06',
    ]);
    expect(missionSites.map((site) => site.levelRange)).toEqual([
      [31, 32],
      [33, 34],
      [35, 35],
      [36, 37],
      [38, 39],
      [40, 40],
    ]);
    expect(pointsOfInterest).toHaveLength(11);
    expect(new Set(pointsOfInterest.map((poi) => poi.id)).size).toBe(11);
    expect(new Set(pointsOfInterest.map((poi) => poi.label)).size).toBe(11);
    expect(pointsOfInterest.filter((poi) => poi.purpose === 'exploration')).toHaveLength(4);
    expect(pointsOfInterest.every((poi) => insideBounds(poi.pos))).toBe(true);
  });

  it('pins the complete M04 topology and all thirteen contract anchor plans', () => {
    const blueprint = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
    expect({
      roads: blueprint.roads.length,
      litRoads: blueprint.litRoads.length,
      dryCrossings: blueprint.dryCrossings.length,
      camps: blueprint.camps.length,
      aggressiveMobs: blueprint.camps.reduce((total, camp) => total + camp.count, 0),
      npcs: blueprint.npcPlacements.length,
      decorPlacements: blueprint.decorPlacements.length,
      terrainEdits: blueprint.terrainEdits.length,
      objectivePlans: blueprint.objectiveAnchors.length,
      objectivePoints: blueprint.objectiveAnchors.reduce(
        (total, plan) => total + plan.points.length,
        0,
      ),
    }).toEqual({
      roads: 12,
      litRoads: 3,
      dryCrossings: 2,
      camps: 6,
      aggressiveMobs: 78,
      npcs: 16,
      decorPlacements: 133,
      terrainEdits: 14,
      objectivePlans: 41,
      objectivePoints: 91,
    });
    expect([...new Set(blueprint.objectiveAnchors.map((plan) => plan.questId))].sort()).toEqual([
      'M04-P01',
      'M04-P02',
      'M04-Q01',
      'M04-Q02',
      'M04-Q03',
      'M04-Q04',
      'M04-Q05',
      'M04-Q06',
      'M04-R01',
      'M04-R02',
      'M04-S01',
      'M04-S02',
      'M04-S03',
    ]);
    expect(objectiveAnchorDigest()).toBe('6c31f1b5');
  });

  it('uses four coherent art districts rather than another all-purpose forest', () => {
    const { artDistricts, pointsOfInterest, decorPlacements } = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
    expect(
      artDistricts.map(({ id, presentationBiome, poiIds }) => ({
        id,
        presentationBiome,
        poiCount: poiIds.length,
      })),
    ).toEqual([
      { id: 'golden-terraces', presentationBiome: 'amber', poiCount: 2 },
      { id: 'root-undercroft', presentationBiome: 'cave', poiCount: 2 },
      { id: 'windward-ramparts', presentationBiome: 'gale', poiCount: 6 },
      { id: 'inverted-beacon', presentationBiome: 'ember', poiCount: 1 },
    ]);

    const assignedPoiIds = artDistricts.flatMap((district) => district.poiIds);
    expect([...assignedPoiIds].sort()).toEqual(pointsOfInterest.map((poi) => poi.id).sort());
    expect(new Set(assignedPoiIds).size).toBe(assignedPoiIds.length);

    const humanArchitecture = new Set(['highland-city', 'regent-citadel']);
    for (const placement of decorPlacements.filter((decor) => decor.origin === 'settlement')) {
      const poi = pointsOfInterest.find((candidate) => candidate.id === placement.poiId)!;
      expect(humanArchitecture.has(poi.architecture), `${placement.key} at ${poi.label}`).toBe(
        true,
      );
    }
    expect(
      decorPlacements.filter((decor) => decor.origin === 'settlement').map((decor) => decor.key),
    ).toEqual(expect.arrayContaining(['hexbTownhall', 'hexbMarket', 'hexbWorkshop']));
    expect(
      decorPlacements.filter((decor) => decor.origin === 'ancient').map((decor) => decor.key),
    ).toEqual(expect.arrayContaining(['kcasWallBroken', 'kcasStairsWide', 'kkPillar']));
    expect(decorPlacements.length).toBeGreaterThanOrEqual(90);
    expect(MIR4_WORLD_ARC[3]).toMatchObject({
      mapId: 'm04-ruinas-da-encosta',
      environment: 'highland-city-root-ruins',
      biome: 'gale',
    });
  });

  it('keeps the M03 mixed presentation intact while adding four M04 presentation biomes', () => {
    const world = buildMir4ArcWorld(4);
    expect(world.biomePaint?.affectsTerrain).toBe(false);
    setActiveWorldContent(world);

    const m03Samples = new Map([
      ['m03-poi-abrigo-silvas', 'vale'],
      ['m03-poi-ruinas-marca', 'dusk'],
      ['m03-poi-garganta-uivo', 'haunt'],
    ]);
    for (const [poiId, expected] of m03Samples) {
      const poi = M03_BOSQUE_DO_VALE_BLUEPRINT.pointsOfInterest.find(
        (candidate) => candidate.id === poiId,
      )!;
      expect(biomeAt(poi.pos.x, poi.pos.z), poiId).toBe(expected);
    }

    for (const district of M04_RUINAS_DA_ENCOSTA_BLUEPRINT.artDistricts) {
      for (const poiId of district.poiIds) {
        const poi = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.pointsOfInterest.find(
          (candidate) => candidate.id === poiId,
        )!;
        expect(biomeAt(poi.pos.x, poi.pos.z), poiId).toBe(district.presentationBiome);
      }
    }
  });

  it('builds a branched road network that reaches every mission ground and both portals', () => {
    const { hub, portalIn, portalOut, roads, missionSites } = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
    expect(roads.length).toBeGreaterThanOrEqual(10);
    expect(nearestRoadDistance(hub)).toBeLessThanOrEqual(1);
    expect(nearestRoadDistance(portalIn)).toBeLessThanOrEqual(1);
    expect(nearestRoadDistance(portalOut)).toBeLessThanOrEqual(1);
    for (const site of missionSites) {
      expect(nearestRoadDistance(site.pos), site.label).toBeLessThanOrEqual(1);
    }

    const endpointKeys = new Set(
      roads.flatMap((road) => [road[0]!, road[road.length - 1]!]).map((p) => `${p.x},${p.z}`),
    );
    expect(endpointKeys.has(`${hub.x},${hub.z}`)).toBe(true);
    expect(endpointKeys.has(`${portalIn.x},${portalIn.z}`)).toBe(true);
    expect(endpointKeys.has(`${portalOut.x},${portalOut.z}`)).toBe(true);
  });

  it('gives every hostile quest POI a safe authored arrival vista facing its landmark', () => {
    for (const camp of M04_RUINAS_DA_ENCOSTA_BLUEPRINT.camps) {
      const site = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.missionSites.find(
        (candidate) => candidate.questId === camp.questId,
      )!;
      const poi = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.pointsOfInterest.find((candidate) =>
        candidate.label.includes(site.label.split(' da ')[0]!),
      );
      expect(poi?.diagnosticSpawn, camp.questId).toBeDefined();
      expect(insideBounds(poi!.diagnosticSpawn!), camp.questId).toBe(true);
      expect(
        Math.hypot(
          poi!.diagnosticSpawn!.x - camp.center.x,
          poi!.diagnosticSpawn!.z - camp.center.z,
        ),
        camp.questId,
      ).toBeGreaterThan(camp.radius + 18);
    }
  });

  it('keeps every road leg short and physically walkable in both directions', () => {
    const seed = WORLD_SEED;
    const world = buildMir4ArcWorld(4);
    setActiveWorldContent(world);
    for (const [roadIndex, road] of M04_RUINAS_DA_ENCOSTA_BLUEPRINT.roads.entries()) {
      for (let pointIndex = 1; pointIndex < road.length; pointIndex++) {
        const from = road[pointIndex - 1]!;
        const to = road[pointIndex]!;
        expect(
          Math.hypot(to.x - from.x, to.z - from.z),
          `road ${roadIndex}:${pointIndex} span`,
        ).toBeLessThanOrEqual(96);
        for (const [start, end, direction] of [
          [from, to, 'forward'],
          [to, from, 'reverse'],
        ] as const) {
          const path = findPlayerPath(seed, start, end, 128);
          expect(path[path.length - 1], `road ${roadIndex}:${pointIndex} ${direction} end`).toEqual(
            end,
          );
          expect(
            pathIsWalkable(seed, start, path),
            `road ${roadIndex}:${pointIndex} ${direction} walkable`,
          ).toBe(true);
        }
      }
    }
  });

  it('routes Auto Journey through every M04 objective, including six intentional local legs', () => {
    const blueprint = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
    const world = buildMir4ArcWorld(4);
    setActiveWorldContent(world);
    const localLegs: string[] = [];
    for (const plan of blueprint.objectiveAnchors) {
      for (const [pointIndex, point] of plan.points.entries()) {
        if (!authoredRoadRoute(blueprint.hub, point, blueprint.roads)) {
          localLegs.push(`${plan.questId}:${plan.stageIndex}:${pointIndex}`);
        }
      }
    }
    expect(localLegs).toEqual([
      'M04-Q03:2:0',
      'M04-Q03:2:2',
      'M04-Q04:4:0',
      'M04-P01:1:6',
      'M04-P01:1:8',
      'M04-P01:2:0',
    ]);

    const contractIds = [...new Set(blueprint.objectiveAnchors.map((plan) => plan.questId))];
    for (const questId of contractIds) {
      let current: Point = blueprint.hub;
      const plans = blueprint.objectiveAnchors
        .filter((plan) => plan.questId === questId)
        .sort((left, right) => left.stageIndex - right.stageIndex);
      for (const plan of plans) {
        for (const [pointIndex, goal] of plan.points.entries()) {
          let reached = Math.hypot(goal.x - current.x, goal.z - current.z) <= 0.75;
          for (let segment = 0; segment < 12 && !reached; segment++) {
            const result = advanceMir4AutomationRoute(
              WORLD_SEED,
              { ...current },
              goal,
              undefined,
              0,
              findPlayerPath,
              true,
              blueprint.roads,
            );
            expect(
              result.route.waypoints.length,
              `${questId}:${plan.stageIndex}:${pointIndex} segment ${segment} has a path`,
            ).toBeGreaterThan(0);
            expect(
              pathIsWalkable(WORLD_SEED, current, result.route.waypoints),
              `${questId}:${plan.stageIndex}:${pointIndex} segment ${segment} is walkable`,
            ).toBe(true);
            const next = result.route.waypoints.at(-1)!;
            expect(
              Math.hypot(next.x - current.x, next.z - current.z),
              `${questId}:${plan.stageIndex}:${pointIndex} segment ${segment} advances`,
            ).toBeGreaterThan(0.05);
            current = next;
            reached = Math.hypot(goal.x - current.x, goal.z - current.z) <= 0.75;
          }
          expect(reached, `${questId}:${plan.stageIndex}:${pointIndex} reaches its goal`).toBe(
            true,
          );
        }
      }
    }
  });

  it('keeps visible doorways open, their masonry solid and the final cleft physical', () => {
    const world = buildMir4ArcWorld(4);
    setActiveWorldContent(world);
    for (const opening of [
      { x: 5415, z: -88, label: 'pedreira' },
      { x: 5710, z: 4, label: 'cripta' },
    ]) {
      expect(
        isBlocked(WORLD_SEED, opening.x, opening.z, PLAYER_BODY_RADIUS),
        `${opening.label} opening`,
      ).toBe(false);
    }
    for (const wall of [
      { x: 5407, z: -88, label: 'pedreira west masonry' },
      { x: 5423, z: -88, label: 'pedreira east masonry' },
      { x: 5701, z: 4, label: 'cripta west masonry' },
      { x: 5719, z: 4, label: 'cripta east masonry' },
      { x: 5285, z: 94, label: 'occupied gated wall' },
    ]) {
      expect(isBlocked(WORLD_SEED, wall.x, wall.z, PLAYER_BODY_RADIUS), wall.label).toBe(true);
    }

    const bridge = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.portalOut;
    const bridgeHeight = terrainHeight(bridge.x, bridge.z, WORLD_SEED);
    expect(bridgeHeight - terrainHeight(bridge.x, bridge.z - 25, WORLD_SEED)).toBeGreaterThan(8);
    expect(bridgeHeight - terrainHeight(bridge.x, bridge.z + 25, WORLD_SEED)).toBeGreaterThan(8);
    const bridgePath = findPlayerPath(WORLD_SEED, { x: 5860, z: 385 }, bridge, 128);
    expect(bridgePath.at(-1)).toEqual(bridge);
    expect(pathIsWalkable(WORLD_SEED, { x: 5860, z: 385 }, bridgePath)).toBe(true);
  });

  it('gives every physical interaction stage authored anchors inside its quest ground', () => {
    const required = new Map<string, number[]>([
      ['M04-Q01', [2, 4, 5]],
      ['M04-Q02', [2, 3, 4]],
      ['M04-Q03', [2, 4, 5]],
      ['M04-Q04', [2, 4, 5]],
      ['M04-Q05', [2, 4, 5, 6]],
      ['M04-Q06', [2, 3, 4]],
    ]);
    const world = buildMir4ArcWorld(4);
    setActiveWorldContent(world);
    for (const [questId, stages] of required) {
      const site = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.missionSites.find(
        (candidate) => candidate.questId === questId,
      )!;
      for (const stageIndex of stages) {
        const plans = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.objectiveAnchors.filter(
          (plan) => plan.questId === questId && plan.stageIndex === stageIndex,
        );
        expect(plans, `${questId}:${stageIndex}`).toHaveLength(1);
        expect(plans[0]!.points.length).toBeGreaterThan(0);
        expect(
          plans[0]!.points.every(
            (point) => Math.hypot(point.x - site.pos.x, point.z - site.pos.z) <= 76,
          ),
          `${questId}:${stageIndex} stays in ${site.label}`,
        ).toBe(true);
        const stage = mir4ArcQuest(questId)!.stages[stageIndex]!;
        expect(mir4ArcStageAnchor(questId, stage, 0)).toEqual(plans[0]!.points[0]);
      }
    }
  });

  it('authors physical anchors for all thirteen M04 contracts instead of hashed fallbacks', () => {
    const physicalKinds = new Set([
      ...MIR4_ARC_INTERACT_STAGE_KINDS,
      ...MIR4_ARC_COMBAT_STAGE_KINDS,
      ...MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS,
      ...MIR4_ARC_ESCORT_STAGE_KINDS,
      'survive-zone',
      'craft-receipt',
      'refine-receipt',
      'salvage-receipt',
    ]);
    const contracts = MIR4_QUESTS_ARC.filter(
      (quest) => quest.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId,
    );
    expect(contracts).toHaveLength(13);

    for (const quest of contracts) {
      for (const [stageIndex, stage] of quest.stages.entries()) {
        if (!physicalKinds.has(stage.kind)) continue;
        const plans = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.objectiveAnchors.filter(
          (plan) => plan.questId === quest.questId && plan.stageIndex === stageIndex,
        );
        expect(plans, `${quest.questId}:${stageIndex}:${stage.kind}`).toHaveLength(1);
        const expectedPoints = MIR4_ARC_INTERACT_STAGE_KINDS.has(stage.kind)
          ? Math.max(1, stage.goal ?? 1)
          : MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind)
            ? Math.max(1, stage.checkpoints ?? 1)
            : 1;
        expect(plans[0]!.points.length, `${quest.questId}:${stageIndex}`).toBeGreaterThanOrEqual(
          expectedPoints,
        );
        for (const [pointIndex, point] of plans[0]!.points.entries()) {
          expect(insideBounds(point), `${quest.questId}:${stageIndex}:${pointIndex}`).toBe(true);
          expect(mir4ArcStageAnchor(quest.questId, stage, pointIndex)).toEqual(point);
        }
      }
    }
  });

  it('keeps the M04 strengthening materials out of the later crypt camp', () => {
    const plan = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.objectiveAnchors.find(
      (candidate) => candidate.questId === 'M04-S01' && candidate.stageIndex === 1,
    );
    expect(plan?.points.slice(-2)).toEqual([
      { x: 5565, z: 235 },
      { x: 5645, z: 200 },
    ]);
    expect(
      plan?.points.slice(-2).every((point) => Math.hypot(point.x - 5710, point.z - 35) > 100),
    ).toBe(true);
  });

  it('uses only registered WoC props and projects authored content exactly once', () => {
    const world = buildMir4ArcWorld(4);
    const blueprint = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
    expect(blueprint.decorPlacements.every((placement) => placement.key in PROP_ASSET_DEFS)).toBe(
      true,
    );

    const zone = world.zones.find((candidate) => candidate.id === 'mir4_m04-ruinas-da-encosta');
    expect(zone?.pois).toEqual(
      blueprint.pointsOfInterest.map((poi) => ({
        id: poi.id,
        x: poi.pos.x,
        z: poi.pos.z,
        label: poi.label,
        ...(poi.diagnosticSpawn ? { diagnosticSpawn: { ...poi.diagnosticSpawn } } : {}),
      })),
    );
    expect(world.camps.filter((camp) => insideBounds(camp.center))).toEqual(
      blueprint.camps.map((camp) => ({
        mobId: `mir4_m04-ruinas-da-encosta_${camp.mobId}`,
        center: camp.center,
        radius: camp.radius,
        count: camp.count,
        minLevel: camp.levelRange[0],
        maxLevel: camp.levelRange[1],
        offStream: true,
      })),
    );
    for (const npc of blueprint.npcPlacements) {
      expect(world.npcs[npc.id]?.pos, npc.id).toEqual(npc.pos);
    }

    const runtimeDecor = world.props.decorProps?.filter(insideBounds) ?? [];
    const runtimeAuthoredDecor = runtimeDecor.filter(
      (placement) =>
        !(
          placement.key === 'gardenArch' &&
          placement.x === blueprint.portalIn.x &&
          placement.z === blueprint.portalIn.z
        ),
    );
    const authoredDecor = blueprint.decorPlacements
      .filter((placement) => placement.key !== 'bonfire')
      .map(({ poiId: _poiId, origin: _origin, ...placement }) => placement);
    expect(runtimeAuthoredDecor).toEqual(authoredDecor);
    expect(runtimeDecor.filter((placement) => placement.key === 'bonfire')).toHaveLength(0);
    expect(world.props.campfires.filter(([x, z]) => insideBounds({ x, z }))).toEqual(
      blueprint.decorPlacements
        .filter((placement) => placement.key === 'bonfire')
        .map((placement) => [placement.x, placement.z]),
    );
    expect(world.props.crates.filter(([x, z]) => insideBounds({ x, z }))).toEqual([]);
    expect(world.services?.noticeboards?.filter(insideBounds)).toEqual([
      expect.objectContaining({ x: blueprint.noticeboard.x, z: blueprint.noticeboard.z }),
    ]);
  });

  it('places unique named residents only inside the defended city terraces', () => {
    const { hub, hubRadius, npcPlacements } = M04_RUINAS_DA_ENCOSTA_BLUEPRINT;
    const world = buildMir4ArcWorld(4);
    expect(npcPlacements).toHaveLength(16);
    expect(new Set(npcPlacements.map((npc) => npc.id)).size).toBe(16);
    expect(new Set(npcPlacements.map((npc) => npc.name)).size).toBe(16);
    expect(npcPlacements.filter((npc) => npc.campaign)).toHaveLength(4);
    expect(world.npcs['m04-ruinas-da-encosta-capita-maela']?.name).toBe('Capitã Maela');
    expect(
      npcPlacements.every((npc) => Math.hypot(npc.pos.x - hub.x, npc.pos.z - hub.z) <= hubRadius),
    ).toBe(true);
    setActiveWorldContent(world);
    for (const npc of npcPlacements) {
      expect(
        isBlocked(WORLD_SEED, npc.pos.x, npc.pos.z, PLAYER_BODY_RADIUS),
        `${npc.name} stands in open space`,
      ).toBe(false);
    }
  });

  it('builds independent runtime copies of authored NPC positions and ruin rings', () => {
    const first = buildMir4ArcWorld(4);
    const npcId = 'm04-ruinas-da-encosta-capita-maela';
    const runtimeNpc = first.npcs[npcId]!;
    const runtimeRing = first.props.ruinRings.find((ring) => ring.x === 5285 && ring.z === 105)!;
    runtimeNpc.pos.x = 0;
    runtimeRing.x = 0;

    expect(
      M04_RUINAS_DA_ENCOSTA_BLUEPRINT.npcPlacements.find((npc) => npc.id === npcId)?.pos,
    ).toEqual({ x: 5374, z: 258 });
    expect(M04_RUINAS_DA_ENCOSTA_BLUEPRINT.ruinRings[0]).toEqual({
      x: 5285,
      z: 105,
      ringR: 18,
      columns: 8,
    });
    const second = buildMir4ArcWorld(4);
    expect(second.npcs[npcId]?.pos).toEqual({ x: 5374, z: 258 });
    expect(second.props.ruinRings).toContainEqual({ x: 5285, z: 105, ringR: 18, columns: 8 });
  });

  it('opens the M03 to M04 passage but exposes no unfinished M05 exit', () => {
    const world = buildMir4ArcWorld(4);
    expect(mir4ArcPortalsForWorld(world).map((portal) => portal.id)).toEqual([
      'mir4_m01-vila-do-vau_to_m02-trilha-dos-juncos',
      'mir4_m02-trilha-dos-juncos_to_m03-bosque-do-vale',
      'mir4_m03-bosque-do-vale_to_m04-ruinas-da-encosta',
    ]);
    expect(
      world.props.decorProps?.some(
        (prop) =>
          prop.key === 'gardenArch' &&
          prop.x === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.portalOut.x &&
          prop.z === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.portalOut.z,
      ),
    ).toBe(false);
  });

  it('replaces only the M04 scaffold layout and keeps every earlier map coordinate frozen', () => {
    expect(MIR4_ARC_REGION_LAYOUTS.slice(0, 3).map((region) => region.mapId)).toEqual([
      'm01-vila-do-vau',
      'm02-trilha-dos-juncos',
      'm03-bosque-do-vale',
    ]);
    expect(MIR4_ARC_REGION_LAYOUTS[3]).toMatchObject({
      mapId: M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId,
      ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.bounds,
      hub: M04_RUINAS_DA_ENCOSTA_BLUEPRINT.hub,
      portalIn: M04_RUINAS_DA_ENCOSTA_BLUEPRINT.portalIn,
      portalOut: M04_RUINAS_DA_ENCOSTA_BLUEPRINT.portalOut,
    });
  });
});
