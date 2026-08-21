// The mir4 arc world generator (Phase 5.1): turns the 20-map progression
// table (world_arc.ts) into procedural WorldContent zone bands. Semantics
// follow the source's compiled runtime - each map is a z-band with its level
// range, biome, hub settlement, hunting camps, and a portal to the next map -
// while the geometry is authored fresh for the 3D world (the TMX polygons
// stay design reference, never runtime). Band layout: bands run south ->
// north in map order, each map WIDTH x DEPTH yards with the hub at its south
// edge; portals sit at the band border so consecutive maps touch exactly like
// the source's reciprocal portal pairs.

import {
  type CampDef,
  EASTBROOK_NOTICEBOARD_ASSET_ID,
  EASTBROOK_NOTICEBOARD_INTERACTION_RADIUS,
  EASTBROOK_NOTICEBOARD_NATIVE_DIMENSIONS,
  EASTBROOK_NOTICEBOARD_TEMPLATE_ID,
  emptyZoneProps,
  type NoticeboardDef,
  type WorldContent,
  type ZoneDef,
  type ZonePropsDef,
} from '../../types';
import { MIR4_ARC_MOB_IDS } from './arc_mob_ids';
import { mir4ArcMapDressing } from './arc_world_dressing';
import { MIR4_M01_RECOMMENDED_COMBAT_POWER } from './mobs';
import { MIR4_QUESTS_ARC } from './quests_arc';
import { MIR4_WORLD_ARC, type Mir4ArcMap } from './world_arc';

/** Each map band's world footprint (yards). */
export const MIR4_MAP_WIDTH = 240;
export const MIR4_MAP_DEPTH = 200;

export interface Mir4ArcBand {
  mapId: string;
  zMin: number;
  zMax: number;
  hub: { x: number; z: number };
  portalOut: { x: number; z: number };
}

/** The band geometry for every map, derived once from the arc order. */
export function mir4ArcBands(): Mir4ArcBand[] {
  const bands: Mir4ArcBand[] = [];
  let z = 0;
  for (const map of MIR4_WORLD_ARC) {
    bands.push({
      mapId: map.mapId,
      zMin: z,
      zMax: z + MIR4_MAP_DEPTH,
      hub: { x: 0, z: z + 40 },
      portalOut: { x: 0, z: z + MIR4_MAP_DEPTH - 10 },
    });
    z += MIR4_MAP_DEPTH;
  }
  return bands;
}

/** One map's hunting camps: two packs flanking the road north of the hub. */
function mapCamps(
  mapId: string,
  mobIds: readonly string[],
  levelMin: number,
  _levelMax: number,
  _rcp: number,
): CampDef[] {
  void _levelMax;
  void _rcp;
  // Pick this environment's first two mob ids for the flanking packs.
  const east = `mir4_${mapId}_${mobIds[0] ?? 'forest_wolf'}`;
  const west = `mir4_${mapId}_${mobIds[1] ?? mobIds[0] ?? 'forest_wolf'}`;
  void levelMin;
  return [
    { mobId: east, center: { x: 70, z: 0 }, radius: 24, count: 5 },
    { mobId: west, center: { x: -70, z: 0 }, radius: 24, count: 4 },
  ];
}

export function mir4ArcNpcTemplateId(sourceNpcId: string): string {
  return `mir4_${sourceNpcId.replace(/-/g, '_')}`;
}

function sourceNpcName(sourceNpcId: string): string {
  return sourceNpcId
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function appendNativeMapProps(props: ZonePropsDef, band: Mir4ArcBand, map: Mir4ArcMap): void {
  const x = band.hub.x;
  const z = band.hub.z;
  props.buildings.push(
    { kind: 'inn', x: x - 22, z: z + 12, w: 6, d: 7, rot: 0.45 },
    { kind: 'house', x: x + 22, z: z + 12, w: 6, d: 6, rot: -0.45 },
  );
  if (map.isCity) {
    props.buildings.push(
      { kind: 'chapel', x: x - 22, z: z - 12, w: 5, d: 7, rot: 2.7 },
      { kind: 'house', x: x + 22, z: z - 12, w: 6, d: 6, rot: -2.7 },
      { kind: 'house', x: x + 14, z: z + 22, w: 5, d: 5, rot: 0.2 },
    );
    props.stalls.push(
      { x: x - 13, z: z + 20, rot: 0.4, r: 1.6 },
      { x: x + 13, z: z + 20, rot: -0.4, r: 1.6 },
    );
    props.fences.push(
      { x1: x - 31, z1: z - 22, x2: x - 31, z2: z + 24, kind: 'stone' },
      { x1: x + 31, z1: z - 22, x2: x + 31, z2: z + 24, kind: 'stone' },
    );
  }
  props.wells.push({ x: x + 16, z: z - 18, r: 1.5 });
  props.tents.push(
    { x: x + 86, z: z + 36, rot: -1.2, scale: 1 },
    { x: x - 86, z: z + 36, rot: 1.2, scale: 1 },
  );
  props.crates.push([x + 82, z + 34], [x - 82, z + 34]);
  props.campfires.push([x, z + 2], [x + 78, z + 44], [x - 78, z + 44]);
  props.graveyards.push({ x: x + 5, z: z - 10 });

  if (map.biome === 'marsh' || map.biome === 'fen') {
    props.marshReeds.push(
      [x - 104, z + 74],
      [x - 98, z + 108],
      [x - 92, z + 142],
      [x + 92, z + 72],
      [x + 100, z + 112],
      [x + 104, z + 146],
    );
    props.mudHuts.push([x - 25, z + 20], [x + 25, z + 20]);
  }
  if (['cave', 'haunt', 'desert', 'volcano', 'night'].includes(map.biome)) {
    props.ruinRings.push({ x: x + 45, z: z + 110, ringR: 7, columns: 6 });
  }
}

/**
 * Build the full arc world (or a prefix of it): zone bands with hub, camps,
 * roads, and the forward portal chain. The slice consumer passes maps=1 for
 * the Vila do Vau-only world; growing it is a data decision, not new code.
 */
export function buildMir4ArcWorld(maps: number = MIR4_WORLD_ARC.length): WorldContent {
  const bands = mir4ArcBands().slice(0, Math.max(1, maps));
  const firstBand = bands[0];
  if (!firstBand) throw new Error('MIR4 arc world requires at least one map band');
  const zones: ZoneDef[] = [];
  const camps: CampDef[] = [];
  const roads: { x: number; z: number }[][] = [];
  const npcs: WorldContent['npcs'] = {};
  const noticeboards: NoticeboardDef[] = [];
  const props = emptyZoneProps();
  const terrainEdits: NonNullable<WorldContent['terrainEdits']> = [];
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!;
    const map = MIR4_WORLD_ARC[i]!;
    appendNativeMapProps(props, band, map);
    const dressing = mir4ArcMapDressing(map.mapId, band.hub);
    props.decorProps ??= [];
    props.decorProps.push(...dressing.decorProps);
    props.mines.push(...dressing.mines);
    props.docks.push(...dressing.docks);
    terrainEdits.push(...dressing.terrainEdits);
    zones.push({
      id: `mir4_${map.mapId}`,
      name: map.name,
      zMin: band.zMin,
      zMax: band.zMax,
      xMin: -MIR4_MAP_WIDTH / 2,
      xMax: MIR4_MAP_WIDTH / 2,
      levelRange: [map.levelMin, map.levelMax],
      biome: map.biome,
      hub: { x: band.hub.x, z: band.hub.z, radius: 30, name: map.name },
      graveyard: { x: band.hub.x + 5, z: band.hub.z - 10 },
      lakes: dressing.lakes,
      pois: [
        { x: band.hub.x, z: band.hub.z, label: map.name },
        { x: band.portalOut.x, z: band.portalOut.z, label: `${map.name} Portal` },
      ],
      welcome: `${map.name} (Act ${map.act}).`,
    });
    for (const camp of mapCamps(
      map.mapId,
      MIR4_ARC_MOB_IDS[i] ?? ['forest_wolf'],
      map.levelMin,
      map.levelMax,
      MIR4_M01_RECOMMENDED_COMBAT_POWER,
    )) {
      camps.push({
        ...camp,
        center: { x: camp.center.x, z: band.hub.z + 40 + camp.center.z },
      });
    }
    roads.push([
      { x: 0, z: band.hub.z - 20 },
      { x: 0, z: band.portalOut.z },
    ]);
    noticeboards.push({
      id: `mir4_contract_board_${map.mapId}`,
      entityId: 2_100_000_000 + i,
      templateId: EASTBROOK_NOTICEBOARD_TEMPLATE_ID,
      assetId: EASTBROOK_NOTICEBOARD_ASSET_ID,
      name: 'Quadro de Contratos',
      x: band.hub.x - 18,
      z: band.hub.z + 8,
      rotation: Math.PI,
      ...EASTBROOK_NOTICEBOARD_NATIVE_DIMENSIONS,
      interactionRadius: EASTBROOK_NOTICEBOARD_INTERACTION_RADIUS,
      frontStandingPoint: { x: band.hub.x - 18, z: band.hub.z + 5 },
    });
    const sourceNpcIds = [
      ...new Set(
        MIR4_QUESTS_ARC.filter((quest) => quest.mapId === map.mapId)
          .flatMap((quest) => [quest.giverNpcId, quest.turnInNpcId])
          .filter(Boolean),
      ),
    ];
    for (let npcIndex = 0; npcIndex < sourceNpcIds.length; npcIndex++) {
      const sourceNpcId = sourceNpcIds[npcIndex]!;
      const angle = (npcIndex / Math.max(1, sourceNpcIds.length)) * Math.PI * 2;
      const templateId = mir4ArcNpcTemplateId(sourceNpcId);
      npcs[`${map.mapId}:${sourceNpcId}`] = {
        id: templateId,
        name: sourceNpcName(sourceNpcId),
        title: 'Campanha',
        pos: { x: band.hub.x + Math.cos(angle) * 12, z: band.hub.z + Math.sin(angle) * 12 },
        facing: angle + Math.PI,
        color: 0x4f7f9f,
        questIds: [],
        greeting: `${map.name}, Act ${map.act}.`,
      };
    }
  }
  return {
    zones,
    camps,
    npcs,
    groundObjects: [],
    roads,
    props,
    terrainEdits,
    // Enter on the road's south approach rather than at the hub anchor. The
    // hub's centre fire is solid, so spawning there blocked the first forward
    // input after less than one yard and made a fresh character appear stuck.
    playerStart: { x: firstBand.hub.x, z: firstBand.hub.z - 20 },
    services: {
      noticeboards,
      // ZoneDef.graveyard drives map presentation; the service registry is the
      // authoritative death-loop input that also spawns the native Spirit
      // Healer. Keep both projections derived from the same zone records.
      graveyards: zones.map((zone) => ({
        id: `${zone.id}_graveyard`,
        name: `${zone.name} Graveyard`,
        ...zone.graveyard,
      })),
    },
  };
}
