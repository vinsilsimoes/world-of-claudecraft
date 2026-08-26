// Authored regional topology for the MIR4 campaign. The source project only
// contributes progression and content semantics. Every coordinate here is a
// fresh 3D layout built from the Aeldrune runtime vocabulary.

import type { Mir4ArcMapProjection } from '../../types';
import { M01_VILA_DO_VAU_BLUEPRINT } from './m01_vila_do_vau_world';
import { M02_TRILHA_DOS_JUNCOS_BLUEPRINT } from './m02_trilha_dos_juncos_world';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from './m03_bosque_do_vale_world';
import { M04_RUINAS_DA_ENCOSTA_BLUEPRINT } from './m04_ruinas_da_encosta_world';
import { MIR4_WORLD_ARC } from './world_arc';

export const MIR4_MAP_WIDTH = 280;
export const MIR4_MAP_DEPTH = 240;
const REGION_GAP = 72;
// Keep this injected world clear of the classic topology's authored moat and
// strait coordinates. It remains far below the instance-plane threshold.
const WORLD_ORIGIN_X = 2_500;

export interface Mir4ArcSite {
  id:
    | 'outskirts'
    | 'east-hunt'
    | 'west-hunt'
    | 'ruins'
    | 'cave'
    | 'stronghold'
    | 'trail-clearing'
    | 'boar-meadow'
    | 'broken-caravan'
    | 'moss-cemetery'
    | 'seven-marks-bridge'
    | 'alpha-grove'
    | 'three-flames-reeds'
    | 'scout-crossing'
    | 'four-voices-islands'
    | 'sunken-depot'
    | 'three-tide-shelters'
    | 'guardian-root'
    | 'erased-mark-ruins'
    | 'wounded-herb-garden'
    | 'broken-bell'
    | 'feather-watch-den'
    | 'four-totems'
    | 'howling-gorge'
    | 'ownerless-walls'
    | 'breathing-quarry'
    | 'night-rampart'
    | 'golden-ascent'
    | 'root-crypt'
    | 'root-beacon';
  pos: { x: number; z: number };
  dangerTier: 0 | 1 | 2 | 3;
  questId?: string;
  label?: string;
  gameplay?: string;
}

export interface Mir4ArcRegionLayout {
  mapId: string;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  hub: { x: number; z: number };
  portalIn: { x: number; z: number };
  portalOut: { x: number; z: number };
  sites: readonly Mir4ArcSite[];
}

// Each act occupies a compact four-region province. The provinces bend around
// the continent instead of stacking into one northbound corridor.
const ACT_ORIGINS = [
  { col: 0, row: 0 },
  { col: 3, row: 0 },
  { col: 3, row: 3 },
  { col: 0, row: 3 },
  { col: -3, row: 3 },
] as const;

const PROVINCE_CELLS = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 1, row: 1 },
  { col: 0, row: 1 },
] as const;

const SITE_OFFSETS = [
  { id: 'outskirts', dx: 0, dz: 48, dangerTier: 0 },
  { id: 'east-hunt', dx: 82, dz: 62, dangerTier: 1 },
  { id: 'west-hunt', dx: -65, dz: 75, dangerTier: 1 },
  { id: 'ruins', dx: 54, dz: 126, dangerTier: 2 },
  { id: 'cave', dx: -65, dz: 145, dangerTier: 2 },
  { id: 'stronghold', dx: 8, dz: 150, dangerTier: 3 },
] as const;

function buildRegionLayout(sequence: number, mapId: string): Mir4ArcRegionLayout {
  if (mapId === M01_VILA_DO_VAU_BLUEPRINT.mapId) {
    return {
      mapId,
      ...M01_VILA_DO_VAU_BLUEPRINT.bounds,
      hub: { ...M01_VILA_DO_VAU_BLUEPRINT.hub },
      portalIn: { ...M01_VILA_DO_VAU_BLUEPRINT.portalIn },
      portalOut: { ...M01_VILA_DO_VAU_BLUEPRINT.portalOut },
      sites: M01_VILA_DO_VAU_BLUEPRINT.missionSites.map((site) => ({
        id: site.id,
        pos: { ...site.pos },
        dangerTier: site.dangerTier,
        questId: site.questId,
        label: site.label,
        gameplay: site.gameplay,
      })),
    };
  }
  if (mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId) {
    return {
      mapId,
      ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.bounds,
      hub: { ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.hub },
      portalIn: { ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.portalIn },
      portalOut: { ...M02_TRILHA_DOS_JUNCOS_BLUEPRINT.portalOut },
      sites: M02_TRILHA_DOS_JUNCOS_BLUEPRINT.missionSites.map((site) => ({
        id: site.id,
        pos: { ...site.pos },
        dangerTier: site.dangerTier,
        questId: site.questId,
        label: site.label,
        gameplay: site.gameplay,
      })),
    };
  }
  if (mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId) {
    return {
      mapId,
      ...M03_BOSQUE_DO_VALE_BLUEPRINT.bounds,
      hub: { ...M03_BOSQUE_DO_VALE_BLUEPRINT.hub },
      portalIn: { ...M03_BOSQUE_DO_VALE_BLUEPRINT.portalIn },
      portalOut: { ...M03_BOSQUE_DO_VALE_BLUEPRINT.portalOut },
      sites: M03_BOSQUE_DO_VALE_BLUEPRINT.missionSites.map((site) => ({
        id: site.id,
        pos: { ...site.pos },
        dangerTier: site.dangerTier,
        questId: site.questId,
        label: site.label,
        gameplay: site.gameplay,
      })),
    };
  }
  if (mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId) {
    return {
      mapId,
      ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.bounds,
      hub: { ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.hub },
      portalIn: { ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.portalIn },
      portalOut: { ...M04_RUINAS_DA_ENCOSTA_BLUEPRINT.portalOut },
      sites: M04_RUINAS_DA_ENCOSTA_BLUEPRINT.missionSites.map((site) => ({
        id: site.id,
        pos: { ...site.pos },
        dangerTier: site.dangerTier,
        questId: site.questId,
        label: site.label,
        gameplay: site.gameplay,
      })),
    };
  }
  const actIndex = Math.floor((sequence - 1) / 4);
  const provinceIndex = (sequence - 1) % 4;
  const act = ACT_ORIGINS[actIndex]!;
  const cell = PROVINCE_CELLS[provinceIndex]!;
  const strideX = MIR4_MAP_WIDTH + REGION_GAP;
  const strideZ = MIR4_MAP_DEPTH + REGION_GAP;
  const xMin = WORLD_ORIGIN_X + (act.col + cell.col) * strideX;
  const zMin = (act.row + cell.row) * strideZ;
  const hub = { x: xMin + MIR4_MAP_WIDTH / 2, z: zMin + 38 };
  const mirror = sequence % 2 === 0 ? -1 : 1;
  const sites = SITE_OFFSETS.map(
    (site): Mir4ArcSite => ({
      id: site.id,
      pos: { x: hub.x + site.dx * mirror, z: hub.z + site.dz },
      dangerTier: site.dangerTier,
    }),
  );
  const stronghold = sites[5]!;
  return {
    mapId,
    xMin,
    xMax: xMin + MIR4_MAP_WIDTH,
    zMin,
    zMax: zMin + MIR4_MAP_DEPTH,
    hub,
    portalIn: { x: hub.x, z: hub.z - 22 },
    portalOut: { x: stronghold.pos.x, z: stronghold.pos.z + 14 },
    sites,
  };
}

export const MIR4_ARC_REGION_LAYOUTS: readonly Mir4ArcRegionLayout[] = Object.freeze(
  MIR4_WORLD_ARC.map((map) => Object.freeze(buildRegionLayout(map.sequence, map.mapId))),
);

const REGION_BY_MAP = new Map(
  MIR4_ARC_REGION_LAYOUTS.map((region) => [region.mapId, region] as const),
);

function projectionFor(
  projections: readonly Mir4ArcMapProjection[] | undefined,
  mapId: string,
): Mir4ArcMapProjection | undefined {
  return projections?.find((projection) => projection.mapId === mapId);
}

/** Apply one world's campaign-coordinate projection without mutating either
 * the authored point or the projection record. */
export function projectMir4ArcPoint(
  projections: readonly Mir4ArcMapProjection[] | undefined,
  mapId: string,
  point: Readonly<{ x: number; z: number }>,
): { x: number; z: number } {
  const projection = projectionFor(projections, mapId);
  if (!projection) return { x: point.x, z: point.z };
  if (projection.controlPoints?.length) {
    let control = projection.controlPoints[0]!;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of projection.controlPoints) {
      const distance = Math.hypot(point.x - candidate.source.x, point.z - candidate.source.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        control = candidate;
      }
    }
    const scale = projection.localScale ?? 0.1;
    return {
      x: control.target.x + (point.x - control.source.x) * scale,
      z: control.target.z + (point.z - control.source.z) * scale,
    };
  }
  const target = projection.contentTarget ?? projection.target;
  const sourceWidth = projection.source.xMax - projection.source.xMin;
  const sourceDepth = projection.source.zMax - projection.source.zMin;
  const xRatio = sourceWidth === 0 ? 0.5 : (point.x - projection.source.xMin) / sourceWidth;
  const zRatio = sourceDepth === 0 ? 0.5 : (point.z - projection.source.zMin) / sourceDepth;
  return {
    x: target.xMin + xRatio * (target.xMax - target.xMin),
    z: target.zMin + zRatio * (target.zMax - target.zMin),
  };
}

export function mir4ArcRegionLayout(
  mapId: string,
  projections?: readonly Mir4ArcMapProjection[],
): Mir4ArcRegionLayout | null {
  const region = REGION_BY_MAP.get(mapId);
  if (!region) return null;
  const projection = projectionFor(projections, mapId);
  if (!projection) return region;
  return {
    ...region,
    ...projection.target,
    hub: projectMir4ArcPoint(projections, mapId, region.hub),
    portalIn: projection.portalIn ?? projectMir4ArcPoint(projections, mapId, region.portalIn),
    portalOut: projection.portalOut ?? projectMir4ArcPoint(projections, mapId, region.portalOut),
    sites: region.sites.map((site) => ({
      ...site,
      pos: projectMir4ArcPoint(projections, mapId, site.pos),
    })),
  };
}

export function mir4ArcRegionAt(
  pos: Readonly<{ x: number; z: number }>,
  projections?: readonly Mir4ArcMapProjection[],
): Mir4ArcRegionLayout | null {
  if (projections?.length) {
    const projection = projections.find(
      (candidate) =>
        pos.x >= candidate.target.xMin &&
        pos.x < candidate.target.xMax &&
        pos.z >= candidate.target.zMin &&
        pos.z < candidate.target.zMax,
    );
    return projection ? mir4ArcRegionLayout(projection.mapId, projections) : null;
  }
  return (
    MIR4_ARC_REGION_LAYOUTS.find(
      (region) =>
        pos.x >= region.xMin && pos.x < region.xMax && pos.z >= region.zMin && pos.z < region.zMax,
    ) ?? null
  );
}

export function mir4ArcQuestSite(
  mapId: string,
  questOrder: number | null,
  questId: string,
  projections?: readonly Mir4ArcMapProjection[],
): Mir4ArcSite | null {
  const region = mir4ArcRegionLayout(mapId, projections);
  if (!region) return null;
  if (questOrder !== null && questOrder >= 1 && questOrder <= region.sites.length) {
    return region.sites[questOrder - 1] ?? null;
  }
  let hash = 2166136261;
  for (let index = 0; index < questId.length; index++) {
    hash ^= questId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return region.sites[(hash >>> 0) % region.sites.length] ?? null;
}
