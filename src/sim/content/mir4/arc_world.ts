// Builds the production-authored MIR4 maps and, when explicitly requested by
// development tooling, the unfinished campaign scaffolds. A map enters the
// default world only after its map-specific blueprint passes the authoring
// gate; the campaign table never implies that generic geometry is shippable.

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
import { MIR4_QUESTS_ARC, mir4ArcNpcIdentity, mir4ArcNpcTemplateId } from './arc_campaign';
import { MIR4_ARC_MOB_IDS } from './arc_mob_ids';
import { mir4ArcMapDressing } from './arc_world_dressing';
import { MIR4_ARC_REGION_LAYOUTS, type Mir4ArcRegionLayout } from './arc_world_layout';
import { composeMir4AuthoredBiomePaint } from './authored_biome_paint';
import { MIR4_AUTHORED_MAP_IDS } from './authored_maps';
import { M01_VILA_DO_VAU_BLUEPRINT } from './m01_vila_do_vau_world';
import { M02_TRILHA_DOS_JUNCOS_BLUEPRINT } from './m02_trilha_dos_juncos_world';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from './m03_bosque_do_vale_world';
import { M04_RUINAS_DA_ENCOSTA_BLUEPRINT } from './m04_ruinas_da_encosta_world';
import { mir4PotionStockForMap } from './potions';
import { MIR4_VILLAGE_GENERAL_GOODS } from './village_provisioner';
import { MIR4_WORLD_ARC, type Mir4ArcMap } from './world_arc';

export { mir4ArcNpcTemplateId } from './arc_campaign';
export { MIR4_MAP_DEPTH, MIR4_MAP_WIDTH } from './arc_world_layout';

// Five off-road positions around each hub. Keeping the contacts away from the
// north/south travel lane prevents an NPC collider from becoming a fake route
// obstruction while preserving a short, readable walk from the central plaza.
const CAMPAIGN_NPC_HUB_SLOTS = [
  { x: 10, z: 10 },
  { x: -7, z: 13 },
  { x: 12, z: -9 },
  { x: -12, z: -9 },
  { x: 0, z: -15 },
] as const;

// One named field supplier per chapter. The campaign crosses remote and very
// dangerous biomes, so healing and mana consumables cannot disappear after
// the tutorial village. These are existing story NPCs placed on the normal
// quest route, not synthetic shops or inventory grants.
const CAMPAIGN_POTION_SUPPLIER_IDS = new Set([
  'm01-vila-do-vau-sara-das-ervas',
  'm02-trilha-dos-juncos-nara-dos-juncos',
  'm03-bosque-do-vale-selene-folhavera',
  'm04-ruinas-da-encosta-capita-maela',
  'm05-clareira-da-fenda-guarda-lenna',
  'm06-criptas-de-pedra-vela-prior-elian',
  'm07-galerias-do-ossario-arquivista-nomes',
  'm08-fortaleza-de-brumapedra-capitao-brum',
  'm09-pantano-das-lanternas-guia-pavio',
  'm10-charcos-do-rei-bog-chefe-tabua',
  'm11-mangue-das-sanguessugas-mae-salina',
  'm12-porto-dos-juncos-capita-cais',
  'm13-dunas-de-vidro-matriarca-safira',
  'm14-necropole-de-akhet-khemet-de-akhet',
  'm15-caldeira-de-cinerita-comandante-cinza',
  'm16-forja-do-sol-partido-capita-escoria',
  'm17-tundra-dos-uivos-edda-aurora',
  'm18-passo-do-jarl-astrid-aurora',
  'm19-veu-da-noite-sigrid-aurora',
  'm20-bastilha-do-eclipse-alva-aurora',
]);

export interface Mir4ArcBand extends Mir4ArcRegionLayout {}

/** The band geometry for every map, derived once from the arc order. */
export function mir4ArcBands(): Mir4ArcBand[] {
  return MIR4_ARC_REGION_LAYOUTS.map((region) => ({
    ...region,
    hub: { ...region.hub },
    portalIn: { ...region.portalIn },
    portalOut: { ...region.portalOut },
    sites: region.sites.map((site) => ({ ...site, pos: { ...site.pos } })),
  }));
}

/** Five hostile grounds, escalating from open hunts to the stronghold. */
function mapCamps(
  mapId: string,
  mobIds: readonly string[],
  region: Readonly<Mir4ArcRegionLayout>,
): CampDef[] {
  if (mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId) {
    return M01_VILA_DO_VAU_BLUEPRINT.camps.map((camp) => ({
      mobId: `mir4_${mapId}_${camp.mobId}`,
      center: { ...camp.center },
      radius: camp.radius,
      count: camp.count,
      minLevel: camp.levelRange[0],
      maxLevel: camp.levelRange[1],
      offStream: true,
    }));
  }
  if (mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId) {
    return M02_TRILHA_DOS_JUNCOS_BLUEPRINT.camps.map((camp) => ({
      mobId: `mir4_${mapId}_${camp.mobId}`,
      center: { ...camp.center },
      radius: camp.radius,
      count: camp.count,
      minLevel: camp.levelRange[0],
      maxLevel: camp.levelRange[1],
      offStream: true,
    }));
  }
  if (mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId) {
    return M03_BOSQUE_DO_VALE_BLUEPRINT.camps.map((camp) => ({
      mobId: `mir4_${mapId}_${camp.mobId}`,
      center: { ...camp.center },
      radius: camp.radius,
      count: camp.count,
      minLevel: camp.levelRange[0],
      maxLevel: camp.levelRange[1],
      offStream: true,
    }));
  }
  if (mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId) {
    return M04_RUINAS_DA_ENCOSTA_BLUEPRINT.camps.map((camp) => ({
      mobId: `mir4_${mapId}_${camp.mobId}`,
      center: { ...camp.center },
      radius: camp.radius,
      count: camp.count,
      minLevel: camp.levelRange[0],
      maxLevel: camp.levelRange[1],
      offStream: true,
    }));
  }
  const sites = [
    region.sites[1],
    region.sites[2],
    region.sites[3],
    region.sites[4],
    region.sites[5],
  ];
  return sites.map((site, index) => ({
    mobId: `mir4_${mapId}_${mobIds[index] ?? mobIds[0] ?? 'forest_wolf'}`,
    center: { ...site!.pos },
    radius: index < 2 ? 25 : index < 4 ? 28 : 20,
    count: index < 2 ? 7 : index < 4 ? 8 : 9,
    offStream: true,
  }));
}

function appendNativeMapProps(props: ZonePropsDef, band: Mir4ArcBand, map: Mir4ArcMap): void {
  if (map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId) {
    props.buildings.push(...M01_VILA_DO_VAU_BLUEPRINT.buildings);
    props.wells.push({ x: 2607, z: -18, r: 1.5 });
    props.stalls.push({ x: 2597, z: 14, rot: 0.4, r: 1.6 }, { x: 2617, z: 11, rot: -0.6, r: 1.6 });
    props.tents.push(
      { x: 2478, z: 105, rot: 1.1, scale: 1 },
      { x: 2510, z: 128, rot: -1.4, scale: 1 },
    );
    props.crates.push([2484, 111], [2506, 107], [2634, 2]);
    props.campfires.push([2507, 123], [2592, -1]);
    props.ruinRings.push(
      { x: 2590, z: 120, ringR: 8, columns: 5 },
      { x: 2498, z: 205, ringR: 10, columns: 6 },
    );
    props.fences.push(
      { x1: 2564, z1: -35, x2: 2562, z2: 18, kind: 'stone' },
      { x1: 2638, z1: -30, x2: 2641, z2: 22, kind: 'stone' },
    );
    props.graveyards.push({ x: 2498, z: 205 }, { ...M01_VILA_DO_VAU_BLUEPRINT.graveyard });
    return;
  }
  if (map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId) {
    props.marshReeds.push(
      [2960, 48],
      [3000, 92],
      [3078, 54],
      [3205, 25],
      [3288, 112],
      [3330, 145],
      [3110, 218],
      [3225, 205],
    );
    props.crates.push([2925, 76], [2938, 101], [3110, -88]);
    props.campfires.push([3110, 190], [3175, 202], [3130, 202]);
    props.graveyards.push({ ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.graveyard });
    return;
  }
  if (map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId) {
    const { hub } = M03_BOSQUE_DO_VALE_BLUEPRINT;
    props.campfires.push([hub.x, hub.z - 17]);
    props.crates.push([hub.x - 17, hub.z + 31], [hub.x + 33, hub.z + 30]);
    props.ruinRings.push(...M03_BOSQUE_DO_VALE_BLUEPRINT.ruinRings.map((ring) => ({ ...ring })));
    props.graveyards.push({ ...M03_BOSQUE_DO_VALE_BLUEPRINT.graveyard });
    return;
  }
  if (map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId) {
    props.campfires.push(
      ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.decorPlacements
        .filter((placement) => placement.key === 'bonfire')
        .map((placement): [number, number] => [placement.x, placement.z]),
    );
    props.ruinRings.push(...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.ruinRings.map((ring) => ({ ...ring })));
    props.graveyards.push({ ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.graveyard });
    return;
  }
  const x = band.hub.x;
  const z = band.hub.z;
  const eastHunt = band.sites[1]!.pos;
  const westHunt = band.sites[2]!.pos;
  const cave = band.sites[4]!.pos;
  if (map.isCity) {
    props.buildings.push(
      { kind: 'inn', x: x - 22, z: z + 12, w: 6, d: 7, rot: 0.45 },
      { kind: 'house', x: x + 22, z: z + 12, w: 6, d: 6, rot: -0.45 },
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
    props.wells.push({ x: x + 16, z: z - 18, r: 1.5 });
  }
  props.tents.push(
    { x: eastHunt.x + 9, z: eastHunt.z - 7, rot: -1.2, scale: 1 },
    { x: westHunt.x - 9, z: westHunt.z - 7, rot: 1.2, scale: 1 },
  );
  props.crates.push([eastHunt.x + 6, eastHunt.z - 9], [westHunt.x - 6, westHunt.z - 9]);
  const eastSide = Math.sign(eastHunt.x - x) || 1;
  const westSide = Math.sign(westHunt.x - x) || -1;
  props.campfires.push(
    [x + 6, z + 2],
    [eastHunt.x + eastSide * 6, eastHunt.z],
    [westHunt.x + westSide * 6, westHunt.z],
  );
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
  }
  if (['cave', 'haunt', 'desert', 'volcano', 'night'].includes(map.biome)) {
    props.ruinRings.push({ x: x + 45, z: z + 110, ringR: 7, columns: 6 });
    props.mines.push({
      x: cave.x - 8,
      z: cave.z + 6,
      rot: Math.atan2(x - cave.x, z - cave.z),
    });
  }
}

/**
 * Build the full arc world (or a prefix of it): regions with a safe hub,
 * branched roads, dangerous sites, and the forward portal chain. The slice consumer passes maps=1 for
 * the Vila do Vau-only world; growing it is a data decision, not new code.
 */
export function buildMir4ArcWorld(maps: number = MIR4_AUTHORED_MAP_IDS.length): WorldContent {
  const bands = mir4ArcBands().slice(0, Math.max(1, maps));
  const firstBand = bands[0];
  if (!firstBand) throw new Error('MIR4 arc world requires at least one map band');
  const zones: ZoneDef[] = [];
  const camps: CampDef[] = [];
  const roads: { x: number; z: number }[][] = [];
  const litRoads: { x: number; z: number }[][] = [];
  const dryCrossings: NonNullable<WorldContent['dryCrossings']> = [];
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
    // Positional portals must have a world-space landmark. The trigger remains
    // collider-free through the arch opening, while the existing WoC model
    // makes the map exit readable instead of teleporting from empty ground.
    const portalFacing = (portal: Readonly<{ x: number; z: number }>) =>
      Math.atan2(band.hub.x - portal.x, band.hub.z - portal.z);
    if (i > 0) {
      props.decorProps.push({
        key: 'gardenArch',
        x: band.portalIn.x,
        z: band.portalIn.z,
        rot: portalFacing(band.portalIn),
        scale: 2.8,
      });
    }
    if (i + 1 < bands.length && map.portalTo.length > 0) {
      props.decorProps.push({
        key: 'gardenArch',
        x: band.portalOut.x,
        z: band.portalOut.z,
        rot: portalFacing(band.portalOut),
        scale: 2.8,
      });
    }
    props.mines.push(...dressing.mines);
    props.docks.push(...dressing.docks);
    terrainEdits.push(...dressing.terrainEdits);
    zones.push({
      id: `mir4_${map.mapId}`,
      name: map.name,
      zMin: band.zMin,
      zMax: band.zMax,
      xMin: band.xMin,
      xMax: band.xMax,
      levelRange: [map.levelMin, map.levelMax],
      biome: map.biome,
      hub: {
        x: band.hub.x,
        z: band.hub.z,
        radius:
          map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId
            ? M01_VILA_DO_VAU_BLUEPRINT.hubRadius
            : map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId
              ? M02_TRILHA_DOS_JUNCOS_BLUEPRINT.hubRadius
              : map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId
                ? M03_BOSQUE_DO_VALE_BLUEPRINT.hubRadius
                : map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId
                  ? M04_RUINAS_DA_ENCOSTA_BLUEPRINT.hubRadius
                  : 30,
        name: map.name,
      },
      graveyard:
        map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId
          ? { ...M01_VILA_DO_VAU_BLUEPRINT.graveyard }
          : map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId
            ? { ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.graveyard }
            : map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId
              ? { ...M03_BOSQUE_DO_VALE_BLUEPRINT.graveyard }
              : map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId
                ? { ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.graveyard }
                : { x: band.hub.x + 5, z: band.hub.z - 10 },
      lakes: dressing.lakes,
      pois:
        map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId
          ? M01_VILA_DO_VAU_BLUEPRINT.pointsOfInterest.map((poi) => ({
              id: poi.id,
              x: poi.pos.x,
              z: poi.pos.z,
              label: poi.label,
            }))
          : map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId
            ? M02_TRILHA_DOS_JUNCOS_BLUEPRINT.pointsOfInterest.map((poi) => ({
                id: poi.id,
                x: poi.pos.x,
                z: poi.pos.z,
                label: poi.label,
              }))
            : map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId
              ? M03_BOSQUE_DO_VALE_BLUEPRINT.pointsOfInterest.map((poi) => ({
                  id: poi.id,
                  x: poi.pos.x,
                  z: poi.pos.z,
                  label: poi.label,
                }))
              : map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId
                ? M04_RUINAS_DA_ENCOSTA_BLUEPRINT.pointsOfInterest.map((poi) => ({
                    id: poi.id,
                    x: poi.pos.x,
                    z: poi.pos.z,
                    label: poi.label,
                    ...(poi.diagnosticSpawn ? { diagnosticSpawn: { ...poi.diagnosticSpawn } } : {}),
                  }))
                : [
                    { x: band.hub.x, z: band.hub.z, label: map.name },
                    {
                      x: band.portalOut.x,
                      z: band.portalOut.z,
                      label: `${map.name} Portal`,
                    },
                  ],
      welcome: `${map.name} (Act ${map.act}).`,
      // The MIR4 profile is built around continuous hunting pressure. Camps
      // sit outside the safe hub, so the short cadence cannot spawn on top of
      // arrivals or service NPCs.
      trashRespawnSeconds: Math.max(10, 19 - Math.ceil(map.sequence / 3)),
    });
    camps.push(...mapCamps(map.mapId, MIR4_ARC_MOB_IDS[i] ?? ['forest_wolf'], band));
    const outskirts = band.sites[0]!.pos;
    const eastHunt = band.sites[1]!.pos;
    const westHunt = band.sites[2]!.pos;
    const ruins = band.sites[3]!.pos;
    const cave = band.sites[4]!.pos;
    const stronghold = band.sites[5]!.pos;
    if (map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId) {
      roads.push(
        ...M01_VILA_DO_VAU_BLUEPRINT.roads.map((road) => road.map((point) => ({ ...point }))),
      );
      litRoads.push(
        ...M01_VILA_DO_VAU_BLUEPRINT.litRoads.map((road) => road.map((point) => ({ ...point }))),
      );
      dryCrossings.push(
        ...M01_VILA_DO_VAU_BLUEPRINT.dryCrossings.map((crossing) => ({
          ...crossing,
        })),
      );
    } else if (map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId) {
      roads.push(
        ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.roads.map((road) => road.map((point) => ({ ...point }))),
      );
      litRoads.push(
        ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.litRoads.map((road) =>
          road.map((point) => ({ ...point })),
        ),
      );
      dryCrossings.push(
        ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.dryCrossings.map((crossing) => ({
          ...crossing,
        })),
      );
    } else if (map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId) {
      roads.push(
        ...M03_BOSQUE_DO_VALE_BLUEPRINT.roads.map((road) => road.map((point) => ({ ...point }))),
      );
      litRoads.push(
        ...M03_BOSQUE_DO_VALE_BLUEPRINT.litRoads.map((road) => road.map((point) => ({ ...point }))),
      );
      dryCrossings.push(
        ...M03_BOSQUE_DO_VALE_BLUEPRINT.dryCrossings.map((crossing) => ({
          ...crossing,
        })),
      );
    } else if (map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId) {
      roads.push(
        ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.roads.map((road) => road.map((point) => ({ ...point }))),
      );
      litRoads.push(
        ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.litRoads.map((road) =>
          road.map((point) => ({ ...point })),
        ),
      );
      dryCrossings.push(
        ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.dryCrossings.map((crossing) => ({
          ...crossing,
        })),
      );
    } else {
      roads.push([
        { ...band.portalIn },
        { ...band.hub },
        { ...outskirts },
        { ...stronghold },
        { ...band.portalOut },
      ]);
      roads.push([
        { ...outskirts },
        { x: (outskirts.x + eastHunt.x) / 2, z: outskirts.z + 24 },
        { ...eastHunt },
        { ...ruins },
        { ...stronghold },
      ]);
      roads.push([
        { ...outskirts },
        { x: (outskirts.x + westHunt.x) / 2, z: outskirts.z + 31 },
        { ...westHunt },
        { ...cave },
        { ...stronghold },
      ]);
    }
    const noticeboardPos =
      map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId
        ? M01_VILA_DO_VAU_BLUEPRINT.noticeboard
        : map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId
          ? M02_TRILHA_DOS_JUNCOS_BLUEPRINT.noticeboard
          : map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId
            ? M03_BOSQUE_DO_VALE_BLUEPRINT.noticeboard
            : map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId
              ? M04_RUINAS_DA_ENCOSTA_BLUEPRINT.noticeboard
              : { x: band.hub.x - 18, z: band.hub.z + 8 };
    noticeboards.push({
      id: `mir4_contract_board_${map.mapId}`,
      entityId: 2_100_000_000 + i,
      templateId: EASTBROOK_NOTICEBOARD_TEMPLATE_ID,
      assetId: EASTBROOK_NOTICEBOARD_ASSET_ID,
      name: 'Quadro de Contratos',
      x: noticeboardPos.x,
      z: noticeboardPos.z,
      rotation: Math.PI,
      ...EASTBROOK_NOTICEBOARD_NATIVE_DIMENSIONS,
      interactionRadius: EASTBROOK_NOTICEBOARD_INTERACTION_RADIUS,
      frontStandingPoint: { x: noticeboardPos.x, z: noticeboardPos.z - 3 },
    });
    const npcIds = [
      ...new Set(
        MIR4_QUESTS_ARC.filter((quest) => quest.mapId === map.mapId)
          .flatMap((quest) => [
            quest.giverNpcId,
            quest.turnInNpcId,
            ...quest.stages.flatMap((stage) => {
              if (stage.kind !== 'talk' && stage.kind !== 'deliver') return [];
              return Array.isArray(stage.target)
                ? [...stage.target]
                : typeof stage.target === 'string'
                  ? [stage.target]
                  : [];
            }),
          ])
          .filter(Boolean),
      ),
    ];
    for (let npcIndex = 0; npcIndex < npcIds.length; npcIndex++) {
      const npcId = npcIds[npcIndex]!;
      const identity = mir4ArcNpcIdentity(npcId);
      if (!identity || identity.mapId !== map.mapId) {
        throw new Error(`Missing canonical MIR4 NPC identity for ${map.mapId}:${npcId}`);
      }
      const slot = CAMPAIGN_NPC_HUB_SLOTS[npcIndex];
      if (!slot) throw new Error(`No campaign NPC placement ${npcIndex} for ${map.mapId}`);
      const authoredNpc =
        map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId
          ? M01_VILA_DO_VAU_BLUEPRINT.npcPlacements.find(
              (candidate) => candidate.campaign && candidate.id === npcId,
            )
          : map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId
            ? M02_TRILHA_DOS_JUNCOS_BLUEPRINT.npcPlacements.find(
                (candidate) => candidate.campaign && candidate.id === npcId,
              )
            : map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId
              ? M03_BOSQUE_DO_VALE_BLUEPRINT.npcPlacements.find(
                  (candidate) => candidate.campaign && candidate.id === npcId,
                )
              : map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId
                ? M04_RUINAS_DA_ENCOSTA_BLUEPRINT.npcPlacements.find(
                    (candidate) => candidate.campaign && candidate.id === npcId,
                  )
                : undefined;
      const placement = authoredNpc
        ? authoredNpc.pos
        : npcIndex < 2
          ? { x: band.hub.x + slot.x, z: band.hub.z + slot.z }
          : npcIndex === 2
            ? { x: outskirts.x + slot.x, z: outskirts.z + slot.z * 0.5 }
            : { x: ruins.x + slot.x, z: ruins.z + slot.z * 0.5 };
      const templateId = mir4ArcNpcTemplateId(npcId);
      npcs[npcId] = {
        id: templateId,
        name: identity.name,
        title: authoredNpc?.title ?? 'Campanha',
        pos: { ...placement },
        facing:
          authoredNpc?.facing ?? Math.atan2(band.hub.x - placement.x, band.hub.z - placement.z),
        color: 0x4f7f9f,
        questIds: [],
        ...(CAMPAIGN_POTION_SUPPLIER_IDS.has(npcId)
          ? {
              vendorItems:
                npcId === 'm01-vila-do-vau-sara-das-ervas'
                  ? [...MIR4_VILLAGE_GENERAL_GOODS]
                  : mir4PotionStockForMap(map.sequence),
            }
          : {}),
        greeting: authoredNpc?.greeting ?? `${map.name}, Act ${map.act}.`,
      };
    }
    if (map.mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId) {
      for (const ambient of M01_VILA_DO_VAU_BLUEPRINT.npcPlacements.filter(
        (candidate) => !candidate.campaign,
      )) {
        npcs[ambient.id] = {
          id: `mir4_${ambient.id}`,
          name: ambient.name,
          title: ambient.title,
          pos: { ...ambient.pos },
          facing: ambient.facing,
          color: 0x6f8f72,
          questIds: [],
          greeting: ambient.greeting,
        };
      }
    }
    if (map.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId) {
      for (const ambient of M02_TRILHA_DOS_JUNCOS_BLUEPRINT.npcPlacements.filter(
        (candidate) => !candidate.campaign,
      )) {
        npcs[ambient.id] = {
          id: `mir4_${ambient.id}`,
          name: ambient.name,
          title: ambient.title,
          pos: { ...ambient.pos },
          facing: ambient.facing,
          color: 0x557c68,
          questIds: [],
          greeting: ambient.greeting,
        };
      }
    }
    if (map.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId) {
      for (const ambient of M03_BOSQUE_DO_VALE_BLUEPRINT.npcPlacements.filter(
        (candidate) => !candidate.campaign,
      )) {
        npcs[ambient.id] = {
          id: `mir4_${ambient.id}`,
          name: ambient.name,
          title: ambient.title,
          pos: { ...ambient.pos },
          facing: ambient.facing,
          color: 0x4f7657,
          questIds: [],
          greeting: ambient.greeting,
        };
      }
    }
    if (map.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId) {
      for (const ambient of M04_RUINAS_DA_ENCOSTA_BLUEPRINT.npcPlacements.filter(
        (candidate) => !candidate.campaign,
      )) {
        npcs[ambient.id] = {
          id: `mir4_${ambient.id}`,
          name: ambient.name,
          title: ambient.title,
          pos: { ...ambient.pos },
          facing: ambient.facing,
          color: 0x8f7a4f,
          questIds: [],
          greeting: ambient.greeting,
        };
      }
    }
  }
  return {
    zones,
    camps,
    npcs,
    groundObjects: [],
    roads,
    litRoads,
    dryCrossings,
    props,
    terrainEdits,
    biomePaint: composeMir4AuthoredBiomePaint([
      ...(bands.some((band) => band.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId)
        ? [M03_BOSQUE_DO_VALE_BLUEPRINT.biomePaint]
        : []),
      ...(bands.some((band) => band.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId)
        ? [M04_RUINAS_DA_ENCOSTA_BLUEPRINT.biomePaint]
        : []),
    ]),
    // Enter on the road's south approach rather than at the hub anchor. The
    // hub's centre fire is solid, so spawning there blocked the first forward
    // input after less than one yard and made a fresh character appear stuck.
    playerStart: { ...firstBand.portalIn },
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
