// The mir4 arc world generator (Phase 5.1): turns the 20-map progression
// table (world_arc.ts) into procedural WorldContent zone bands. Semantics
// follow the source's compiled runtime - each map is a z-band with its level
// range, biome, hub settlement, hunting camps, and a portal to the next map -
// while the geometry is authored fresh for the 3D world (the TMX polygons
// stay design reference, never runtime). Band layout: bands run south ->
// north in map order, each map WIDTH x DEPTH yards with the hub at its south
// edge; portals sit at the band border so consecutive maps touch exactly like
// the source's reciprocal portal pairs.

import type { CampDef, WorldContent, ZoneDef } from '../../types';
import { MIR4_M01_RECOMMENDED_COMBAT_POWER } from './mobs';
import { MIR4_WORLD_ARC } from './world_arc';

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
function mapCamps(mapId: string, levelMin: number, levelMax: number, rcp: number): CampDef[] {
  void mapId;
  const lvl = Math.max(1, levelMin);
  void levelMax;
  void rcp;
  return [
    { mobId: 'mir4_forest_wolf', center: { x: 70, z: 0 }, radius: 24, count: 5 },
    { mobId: 'mir4_forest_wolf', center: { x: -70, z: 0 }, radius: 24, count: 4 },
  ];
}

/**
 * Build the full arc world (or a prefix of it): zone bands with hub, camps,
 * roads, and the forward portal chain. The slice consumer passes maps=1 for
 * the Vila do Vau-only world; growing it is a data decision, not new code.
 */
export function buildMir4ArcWorld(maps: number = MIR4_WORLD_ARC.length): WorldContent {
  const bands = mir4ArcBands().slice(0, Math.max(1, maps));
  const zones: ZoneDef[] = [];
  const camps: CampDef[] = [];
  const roads: { x: number; z: number }[][] = [];
  const npcs: WorldContent['npcs'] = {};
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!;
    const map = MIR4_WORLD_ARC[i]!;
    zones.push({
      id: `mir4_${map.mapId}`,
      name: map.name,
      zMin: band.zMin,
      zMax: band.zMax,
      levelRange: [map.levelMin, map.levelMax],
      biome: map.biome,
      hub: { x: band.hub.x, z: band.hub.z, radius: 30, name: map.name },
      graveyard: { x: band.hub.x + 5, z: band.hub.z - 10 },
      lakes: [],
      pois: [
        { x: band.hub.x, z: band.hub.z, label: map.name },
        { x: band.portalOut.x, z: band.portalOut.z, label: `${map.name} Portal` },
      ],
      welcome: `${map.name} (Act ${map.act}).`,
    });
    for (const camp of mapCamps(
      map.mapId,
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
    // One quest NPC per band (the campaign giver; names port with the quest
    // chain slice) plus the city-service block on city maps.
    npcs[`mir4_${map.mapId}_giver`] = {
      id: `mir4_${map.mapId}_giver`,
      name: map.isCity ? `Governante de ${map.name}` : `Guarda de ${map.name}`,
      title: 'Campanha',
      pos: { x: band.hub.x + 3, z: band.hub.z + 2 },
      facing: 0,
      color: 0x4f7f9f,
      questIds: [],
      greeting: `${map.name}, Act ${map.act}.`,
    };
  }
  return {
    zones,
    camps,
    npcs,
    groundObjects: [],
    roads,
    props: {
      buildings: [],
      wells: [],
      stalls: [],
      mines: [],
      docks: [],
      tents: [],
      marshReeds: [],
      crates: [],
      campfires: bands.map((b) => [1, b.hub.z + 1] as [number, number]),
      mudHuts: [],
      ruinRings: [],
      fences: [],
      graveyards: [],
    },
    playerStart: { x: 0, z: bands[0]!.hub.z },
  };
}
