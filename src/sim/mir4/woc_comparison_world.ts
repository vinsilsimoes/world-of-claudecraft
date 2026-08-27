// Production MIR4 campaign world on the original Aeldrune terrain,
// roads and scenery. Story actors and objectives are transplanted onto curated
// physical anchors while the WoC map remains the single world authority.

import { MIR4_QUESTS_ARC } from '../content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../content/mir4/arc_world';
import {
  MIR4_ARC_REGION_LAYOUTS,
  mir4ArcRegionAt,
  projectMir4ArcPoint,
} from '../content/mir4/arc_world_layout';
import { BUILTIN_WORLD, DUNGEON_LIST, MOBS, PORTALS } from '../data';
import type {
  CampDef,
  GroundObjectDef,
  Mir4ArcMapProjection,
  NoticeboardDef,
  NpcDef,
  WorldContent,
  ZoneDef,
} from '../types';
import { terrainHeight, waterLevelAt, withWorldTerrainContent } from '../world';
import { WORLD_SEED } from '../world_seed';
import { mir4ArcStageAnchor } from './arc_quest_runtime';
import { mir4EnergyGroundObjects } from './energy';
import { mir4WocEscortObjectiveAnchors } from './woc_campaign_escort_routes';
import { buildMir4WocCampaignZones } from './woc_campaign_landmarks';
import { MIR4_WOC_CHAPTER_LAYOUTS } from './woc_campaign_layout';
import { buildMir4GrindPopulation, seatMir4NpcsOnWocWorld } from './woc_campaign_population';
import {
  MIR4_WOC_CAMPAIGN_TRANSIT_PORTAL_ARCHES,
  MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS,
  MIR4_WOC_TUTORIAL_PORTAL_ARCHES,
  MIR4_WOC_TUTORIAL_PORTALS,
} from './woc_campaign_portals';
import { composeAeldruneWorld } from './woc_world_layers';

const CENTRAL_WORLD_X_MIN = -180;
const CENTRAL_WORLD_X_MAX = 180;
const CHAPTER_LOCAL_SCALE = 0.08;

export const AELDRUNE_EASTBROOK_HARBOR_POI = Object.freeze({
  id: 'aeldrune-eastbrook-harbor',
  x: -62,
  z: 88,
  label: 'Porto do Lago do Espelho',
});

interface Point2 {
  x: number;
  z: number;
}

function storyOffsetsByControl(
  region: (typeof MIR4_ARC_REGION_LAYOUTS)[number],
): readonly (readonly Point2[])[] {
  const controlSources = [
    region.hub,
    region.portalIn,
    region.portalOut,
    ...region.sites.map((site) => site.pos),
  ];
  const offsets = controlSources.map((): Point2[] => [{ x: 0, z: 0 }]);
  for (const quest of MIR4_QUESTS_ARC) {
    if (quest.mapId !== region.mapId) continue;
    for (const stage of quest.stages) {
      const objectiveCount = Math.max(1, Array.isArray(stage.target) ? stage.target.length : 1);
      for (let objectiveIndex = 0; objectiveIndex < objectiveCount; objectiveIndex += 1) {
        const anchor = mir4ArcStageAnchor(quest.questId, stage, objectiveIndex);
        if (!anchor) continue;
        let controlIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < controlSources.length; index += 1) {
          const source = controlSources[index];
          if (!source) continue;
          const distance = Math.hypot(anchor.x - source.x, anchor.z - source.z);
          if (distance < bestDistance) {
            bestDistance = distance;
            controlIndex = index;
          }
        }
        const source = controlSources[controlIndex];
        const controlOffsets = offsets[controlIndex];
        if (!source || !controlOffsets) continue;
        controlOffsets.push({
          x: (anchor.x - source.x) * CHAPTER_LOCAL_SCALE,
          z: (anchor.z - source.z) * CHAPTER_LOCAL_SCALE,
        });
      }
    }
  }
  return offsets;
}

function zoneBounds(zone: Readonly<ZoneDef>): Mir4ArcMapProjection['target'] {
  return {
    xMin: zone.xMin ?? CENTRAL_WORLD_X_MIN,
    xMax: zone.xMax ?? CENTRAL_WORLD_X_MAX,
    zMin: zone.zMin,
    zMax: zone.zMax,
  };
}

function nearestWoCRoadPoint(
  desired: Readonly<{ x: number; z: number }>,
  zone: Readonly<ZoneDef>,
  terrainSeed: number,
  storyOffsets: readonly Readonly<Point2>[],
): { x: number; z: number } {
  const bounds = zoneBounds(zone);
  let best: Point2 | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const road of BUILTIN_WORLD.roads) {
    for (const point of road) {
      if (
        point.x < bounds.xMin ||
        point.x >= bounds.xMax ||
        point.z < bounds.zMin ||
        point.z >= bounds.zMax
      ) {
        continue;
      }
      const keepsStoryDry = storyOffsets.every((offset) => {
        const x = point.x + offset.x;
        const z = point.z + offset.z;
        return terrainHeight(x, z, terrainSeed) >= waterLevelAt(x, z, terrainSeed) + 0.2;
      });
      if (!keepsStoryDry) {
        continue;
      }
      const distance = Math.hypot(point.x - desired.x, point.z - desired.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x: point.x, z: point.z };
      }
    }
  }
  if (!best) {
    throw new Error(`WoC zone ${zone.id} has no dry road footprint for campaign story anchors`);
  }
  return best;
}

function buildProjections(mapCount: number, terrainSeed: number): readonly Mir4ArcMapProjection[] {
  const count = Math.min(Math.max(1, mapCount), MIR4_ARC_REGION_LAYOUTS.length);
  return Object.freeze(
    MIR4_ARC_REGION_LAYOUTS.slice(0, count).map((region, index) => {
      const chapter = MIR4_WOC_CHAPTER_LAYOUTS[index];
      if (!chapter || chapter.mapId !== region.mapId) {
        throw new Error(`Missing WoC campaign placement for ${region.mapId}`);
      }
      const targetZone = BUILTIN_WORLD.zones.find((zone) => zone.id === chapter.targetZoneId);
      if (!targetZone) throw new Error(`Missing WoC zone ${chapter.targetZoneId}`);
      if (chapter.sites.length !== region.sites.length) {
        throw new Error(`WoC campaign placement ${region.mapId} must define six mission sites`);
      }
      const storyOffsets = storyOffsetsByControl(region);
      const hubTarget = nearestWoCRoadPoint(chapter.hub, targetZone, terrainSeed, [
        ...(storyOffsets[0] ?? []),
        ...(storyOffsets[1] ?? []),
      ]);
      const finalSiteIndex = chapter.sites.length - 1;
      const siteTargets = chapter.sites.map((site, siteIndex) =>
        nearestWoCRoadPoint(site, targetZone, terrainSeed, [
          ...(storyOffsets[3 + siteIndex] ?? []),
          ...(siteIndex === finalSiteIndex ? (storyOffsets[2] ?? []) : []),
        ]),
      );
      const portalOutTarget = siteTargets.at(-1);
      if (!portalOutTarget) throw new Error(`${region.mapId} requires a final mission site`);
      const siteControlPoints = region.sites.map((site, siteIndex) => {
        const target = siteTargets[siteIndex];
        if (!target) throw new Error(`${region.mapId} is missing mission site ${siteIndex + 1}`);
        return Object.freeze({ source: site.pos, target });
      });
      const objectiveAnchors = [
        ...(chapter.objectiveAnchors ?? []),
        ...mir4WocEscortObjectiveAnchors(region.mapId),
      ];
      return Object.freeze({
        mapId: region.mapId,
        targetZoneId: targetZone.id,
        source: Object.freeze({
          xMin: region.xMin,
          xMax: region.xMax,
          zMin: region.zMin,
          zMax: region.zMax,
        }),
        target: Object.freeze(zoneBounds(targetZone)),
        controlPoints: Object.freeze([
          Object.freeze({ source: region.hub, target: hubTarget }),
          Object.freeze({ source: region.portalIn, target: hubTarget }),
          Object.freeze({ source: region.portalOut, target: portalOutTarget }),
          ...siteControlPoints,
        ]),
        localScale: CHAPTER_LOCAL_SCALE,
        objectiveAnchors:
          objectiveAnchors.length > 0
            ? Object.freeze(
                objectiveAnchors.map((plan) =>
                  Object.freeze({
                    ...plan,
                    points: Object.freeze(plan.points.map((point) => Object.freeze({ ...point }))),
                  }),
                ),
              )
            : undefined,
        portalIn: hubTarget,
        portalOut: portalOutTarget,
      });
    }),
  );
}

function projectionMapIdAt(point: Readonly<{ x: number; z: number }>): string | null {
  return mir4ArcRegionAt(point)?.mapId ?? null;
}

function projectPoint(
  projections: readonly Mir4ArcMapProjection[],
  point: Readonly<{ x: number; z: number }>,
): { x: number; z: number } | null {
  const mapId = projectionMapIdAt(point);
  return mapId ? projectMir4ArcPoint(projections, mapId, point) : null;
}

function projectNpcs(
  source: Readonly<Record<string, NpcDef>>,
  projections: readonly Mir4ArcMapProjection[],
): Record<string, NpcDef> {
  const projected: Record<string, NpcDef> = {};
  for (const [key, npc] of Object.entries(source)) {
    const pos = projectPoint(projections, npc.pos);
    if (!pos) continue;
    projected[key] = { ...npc, pos };
  }
  return projected;
}

function projectCamps(
  source: readonly CampDef[],
  projections: readonly Mir4ArcMapProjection[],
): CampDef[] {
  const projected: CampDef[] = [];
  for (const camp of source) {
    const mapId = projectionMapIdAt(camp.center);
    const projection = projections.find((candidate) => candidate.mapId === mapId);
    if (!mapId || !projection) continue;
    const contentTarget = projection.contentTarget ?? projection.target;
    const xScale =
      projection.localScale ??
      (contentTarget.xMax - contentTarget.xMin) / (projection.source.xMax - projection.source.xMin);
    const zScale =
      projection.localScale ??
      (contentTarget.zMax - contentTarget.zMin) / (projection.source.zMax - projection.source.zMin);
    projected.push({
      ...camp,
      center: projectMir4ArcPoint(projections, mapId, camp.center),
      radius: camp.radius * Math.min(xScale, zScale),
    });
  }
  return projected;
}

function projectGroundObjects(
  source: readonly GroundObjectDef[],
  projections: readonly Mir4ArcMapProjection[],
): GroundObjectDef[] {
  return source
    .map((object) => ({
      ...object,
      positions: object.positions
        .map((position) => projectPoint(projections, position))
        .filter((position) => position !== null),
    }))
    .filter((object) => object.positions.length > 0);
}

function projectNoticeboards(
  source: readonly NoticeboardDef[],
  projections: readonly Mir4ArcMapProjection[],
): NoticeboardDef[] {
  const projected: NoticeboardDef[] = [];
  for (const board of source) {
    const pos = projectPoint(projections, board);
    const frontStandingPoint = projectPoint(projections, board.frontStandingPoint);
    if (!pos || !frontStandingPoint) continue;
    projected.push({ ...board, ...pos, frontStandingPoint });
  }
  return projected;
}

/** Build the MIR4 campaign on the untouched original WoC map vocabulary. */
function buildMir4WocCampaignWorldFromBuiltinTerrain(
  mapCount = MIR4_ARC_REGION_LAYOUTS.length,
  terrainSeed = WORLD_SEED,
): WorldContent {
  const projections = buildProjections(mapCount, terrainSeed);
  const source = buildMir4ArcWorld(projections.length);
  const firstZoneHub = BUILTIN_WORLD.zones[0]?.hub;
  if (!firstZoneHub) throw new Error('MIR4 WoC comparison world requires the WoC starter hub');
  const playerStart = { x: firstZoneHub.x, z: firstZoneHub.z };
  const noticeboards = projectNoticeboards(source.services?.noticeboards ?? [], projections);
  const projectedNpcs = projectNpcs(source.npcs, projections);
  const npcs = seatMir4NpcsOnWocWorld(
    projectedNpcs,
    BUILTIN_WORLD.npcs,
    BUILTIN_WORLD.zones,
    BUILTIN_WORLD.roads,
  );
  const dungeonDoors = DUNGEON_LIST.filter((dungeon) => dungeon.overworldDoor !== false).map(
    (dungeon) => dungeon.doorPos,
  );
  const travelPortals = Object.freeze([
    ...PORTALS,
    ...MIR4_WOC_TUTORIAL_PORTALS,
    ...MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS,
  ]);
  const protectedTransitPoints = [
    ...dungeonDoors,
    ...travelPortals.flatMap((portal) => [portal.a, portal.a.landing, portal.b, portal.b.landing]),
  ];
  const graveyards = (source.services?.graveyards ?? []).flatMap((graveyard) => {
    const pos = projectPoint(projections, graveyard);
    return pos ? [{ ...graveyard, ...pos }] : [];
  });
  const protectedServices = [
    ...graveyards.map((graveyard) => ({ x: graveyard.x, z: graveyard.z })),
    ...noticeboards.flatMap((board) => [{ x: board.x, z: board.z }, board.frontStandingPoint]),
  ];
  const interactionSites = [
    ...projections.flatMap(
      (projection) => projection.controlPoints?.slice(3).map((control) => control.target) ?? [],
    ),
    // M04-S01's two western resource patches sit beyond the Wolf-Briar road.
    // Five doubled native packs overlapped the only physical approach, so a
    // level-34 character met 12-14 simultaneous attackers and died before it
    // could reduce the group. Keep one six-creature guard pack: collection is
    // still interrupted until the player intervenes, but a successful clear
    // now creates the intended five-second gathering window.
    { x: -96, z: 724, clearRadius: 40 },
    // The M16 westbound road narrows between three overlapping Drakelands
    // camps (20 hounds inside one acquisition radius). Preserve one guard pack
    // while keeping the corridor clearable before its 60-second respawn.
    { x: 390, z: 2264, clearRadius: 20 },
    // The northward M16-Q04 leg repeats the same problem with two hound packs
    // and one obsidian-guard pack directly on the single road.
    { x: 351, z: 2294, clearRadius: 18 },
  ];
  const camps = buildMir4GrindPopulation(
    projectCamps(source.camps, projections),
    BUILTIN_WORLD.camps,
    MOBS,
    BUILTIN_WORLD.zones,
    npcs,
    protectedServices,
    protectedTransitPoints,
    (point) =>
      terrainHeight(point.x, point.z, terrainSeed) >=
      waterLevelAt(point.x, point.z, terrainSeed) + 0.2,
    interactionSites,
  );
  const zones = buildMir4WocCampaignZones(BUILTIN_WORLD.zones, source.zones, projections).map(
    (zone) =>
      zone.id === 'eastbrook_vale'
        ? { ...zone, pois: [...zone.pois, AELDRUNE_EASTBROOK_HARBOR_POI] }
        : zone,
  );

  return composeAeldruneWorld({
    geometry: BUILTIN_WORLD,
    geometryOverrides: {
      props: {
        ...BUILTIN_WORLD.props,
        decorProps: [
          ...(BUILTIN_WORLD.props.decorProps ?? []),
          ...MIR4_WOC_TUTORIAL_PORTAL_ARCHES,
          ...MIR4_WOC_CAMPAIGN_TRANSIT_PORTAL_ARCHES,
        ],
      },
      terrainModel: 'builtin',
      presentationModel: 'builtin',
    },
    gameplay: {
      // Bounds stay tied to WoC geometry, while names, levels, and campaign
      // landmarks are explicitly adapted by buildMir4WocCampaignZones.
      zones,
      camps,
      npcs,
      groundObjects: [
        ...projectGroundObjects(source.groundObjects, projections),
        ...mir4EnergyGroundObjects(projections),
      ],
      travelPortals,
      playerStart,
      services: {
        noticeboards,
        musterBoards: BUILTIN_WORLD.services?.musterBoards,
        graveyards,
      },
      mir4ArcMapProjections: projections,
    },
  });
}

export function buildMir4WocCampaignWorld(
  mapCount = MIR4_ARC_REGION_LAYOUTS.length,
  terrainSeed = WORLD_SEED,
): WorldContent {
  return withWorldTerrainContent(BUILTIN_WORLD, () =>
    buildMir4WocCampaignWorldFromBuiltinTerrain(mapCount, terrainSeed),
  );
}

/** Compatibility name retained for existing diagnostic links and focused QA. */
export const buildMir4WocComparisonWorld = buildMir4WocCampaignWorld;
