// Pure, host-agnostic draw model for the world map's CONTINENT overview level:
// the WoW-style "zoom out to the whole world" surface reached by right-clicking
// the per-zone map (or the level-toggle button). It maps the static world layout
// (every ZoneDef rect + the world bounds) plus the player's position to a flat
// geometry model in canvas-pixel space: the contain-fit rect where the painted
// continent art blits, one clickable/hoverable rect per zone (already projected),
// the "you are here" marker, a dot per party member, and which zone the player
// currently stands in.
//
// The pure-core half of the pure-core + canvas-painter split (root CLAUDE.md
// Conventions; reference map_window_view.ts / map_window_painter.ts). No DOM, no
// Three, no 2D context, no i18n, no color: the painter (continent_map_painter.ts)
// owns the context, resolves the --color-map-* tokens, and localizes the zone
// labels. Regions carry the zone id (never the resolved name) so the painter
// resolves localized text and the hover/click hit-tests key on identity.
//
// DOM-free / i18n-free / deterministic so tests/continent_map_view.test.ts can
// drive it directly with both a Sim-shaped and a ClientWorld-mirror-shaped stub.

import {
  STRIP_MAX_X,
  STRIP_MIN_X,
  WORLD_MAX_X,
  WORLD_MAX_Z,
  WORLD_MIN_X,
  WORLD_MIN_Z,
  ZONES,
  type ZoneDef,
} from '../sim/data';
import type { IWorld } from '../world_api';

/** An axis-aligned rectangle in canvas-pixel space. */
export interface ContinentRect {
  mx: number;
  my: number;
  w: number;
  h: number;
}

/** One zone's clickable/hoverable area on the continent overview. */
export interface ContinentZoneRegion {
  zoneId: string;
  /** The zone's rect in canvas pixels (the hit-test + highlight area). */
  rect: ContinentRect;
  /** Label anchor: the rect center (the painter localizes + strokes the name). */
  labelX: number;
  labelY: number;
  /** The zone the player currently stands in (drawn emphasized). */
  isCurrent: boolean;
  /** Matches the hovered zone id passed in (drawn highlighted). */
  isHovered: boolean;
  /** Inclusive suggested level band, for the painter's hover tooltip. */
  levelMin: number;
  levelMax: number;
}

/** A party member's dot on the continent overview (issue 2652). Identity is the
 *  class plus the dead state only, both resolved to colors by the painter, and
 *  deliberately carries no name: at this scale a zone cell is under 100px wide
 *  and already holds its own zone label, so per-member names would collide with
 *  it and with each other. The per-zone map (map_window_view.ts) is the surface
 *  that names them. */
export interface ContinentPartyMarker {
  mx: number;
  my: number;
  cls: string;
  dead: boolean;
}

/** Everything the painter draws for one continent-overview frame, all in
 *  canvas-pixel space and derived purely from the world layout + the player. */
export interface ContinentMapModel {
  /** Contain-fit dest rect where the continent art blits (world bounds mapped
   *  into the square canvas, aspect preserved, ocean letterbox on the short axis). */
  image: ContinentRect;
  regions: ContinentZoneRegion[];
  /** The player's projected position ("you are here"), or null if off the world. */
  player: { mx: number; my: number } | null;
  /** Party members other than self, at their live world position (issue 2652).
   *  Empty solo, with no party formed, or when every member is off the world. */
  party: ContinentPartyMarker[];
  /** The zone id the player currently stands in (the on-canvas subtitle). */
  currentZoneId: string;
  /** Classic uses the shipped continent plate; MIR4 uses a generated atlas grid. */
  usesArt: boolean;
}

export interface ContinentMapInput {
  world: IWorld;
  /** World layout supplied by the host that owns the active content. */
  zones?: readonly ZoneDef[];
  /** The square map-canvas side in px. */
  canvasSize: number;
  /** The displayed continent plate's aspect (width / height). The dest rect
   *  contain-fits this into the square canvas and the world bounds are mapped to
   *  FILL it (independent X and Z scale), so the zone regions overlay the painted
   *  land instead of the world's true (very tall) aspect. The painter passes the
   *  loaded art's natural aspect, or CONTINENT_FALLBACK_ASPECT when it is absent. */
  contentAspect: number;
  /** The zone id under the cursor (hover), or null. */
  hoveredZoneId: string | null;
}

/** Aspect (width / height) used to lay out the regions when no art has decoded
 *  yet (matches the shipped world_overview.webp so the layout does not jump when
 *  the plate arrives; pinned to the file's real pixel size by
 *  tests/continent_map_view.test.ts, so re-cropping the plate must update this). */
export const CONTINENT_FALLBACK_ASPECT = 543 / 1100;

/** The retired authored MIR4 bands use a generated 4x5 atlas. The production
 * transplant keeps the original WoC continent art even though its gameplay
 * profile remains MIR4. */
export function usesMir4CampaignAtlas(world: IWorld, zones: readonly ZoneDef[] = ZONES): boolean {
  return (
    world.cfg.gameProfile === 'mir4-gameplay-port' &&
    zones.some((zone) => zone.id.startsWith('mir4_'))
  );
}

/** A zone's east-west extent: its own column, or the original full-width strip. */
function zoneXBounds(zone: ZoneDef): [number, number] {
  return [zone.xMin ?? STRIP_MIN_X, zone.xMax ?? STRIP_MAX_X];
}

function zoneAtFrom(zones: readonly ZoneDef[], x: number, z: number): ZoneDef {
  const resolved = zones.length > 0 ? zones : ZONES;
  let fallback: ZoneDef | null = null;
  for (const zone of resolved) {
    if (z >= zone.zMax) continue;
    if (fallback === null || zone.zMax < fallback.zMax) fallback = zone;
    const [xMin, xMax] = zoneXBounds(zone);
    if (z >= zone.zMin && x >= xMin && x < xMax) return zone;
  }
  return fallback ?? resolved.reduce((a, b) => (b.zMax > a.zMax ? b : a));
}

/**
 * Build the continent-overview draw model. Reads only the static world layout
 * (ZONES rects + WORLD_* bounds) and the player's position off IWorld, so the
 * offline Sim and the online ClientWorld mirror produce identical output. The
 * projection matches the per-zone map's toMap convention: +X is map-left
 * (east = -X), +Z is map-up (north at the top).
 */
export function buildContinentMapModel(input: ContinentMapInput): ContinentMapModel {
  const { world, canvasSize: S, contentAspect, hoveredZoneId, zones = ZONES } = input;
  if (usesMir4CampaignAtlas(world, zones)) {
    const columns = 4;
    const rows = Math.max(1, Math.ceil(zones.length / columns));
    const top = 30;
    const gap = 4;
    const cellW = (S - gap * (columns + 1)) / columns;
    const cellH = (S - top - gap * (rows + 1)) / rows;
    const currentZoneId = zoneAtFrom(zones, world.player.pos.x, world.player.pos.z).id;
    const regions = zones.map((zone, index): ContinentZoneRegion => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const rect = {
        mx: gap + column * (cellW + gap),
        my: top + gap + row * (cellH + gap),
        w: cellW,
        h: cellH,
      };
      return {
        zoneId: zone.id,
        rect,
        labelX: rect.mx + rect.w / 2,
        labelY: rect.my + rect.h / 2,
        isCurrent: zone.id === currentZoneId,
        isHovered: zone.id === hoveredZoneId,
        levelMin: zone.levelRange[0],
        levelMax: zone.levelRange[1],
      };
    });
    const centerOf = (zoneId: string) => {
      const region = regions.find((candidate) => candidate.zoneId === zoneId);
      return region
        ? { mx: region.labelX, my: region.labelY + Math.min(14, region.rect.h / 4) }
        : null;
    };
    const party: ContinentPartyMarker[] = [];
    for (const member of world.partyInfo?.members ?? []) {
      if (member.pid === world.player.id) continue;
      const marker = centerOf(zoneAtFrom(zones, member.x, member.z).id);
      if (marker) party.push({ ...marker, cls: member.cls, dead: member.dead !== 0 });
    }
    return {
      image: { mx: 0, my: top, w: S, h: S - top },
      regions,
      player: centerOf(currentZoneId),
      party,
      currentZoneId,
      usesArt: false,
    };
  }
  const worldSpanX = WORLD_MAX_X - WORLD_MIN_X;
  const worldSpanZ = WORLD_MAX_Z - WORLD_MIN_Z;
  // Contain-fit the art plate's aspect into the square canvas (ocean letterbox on
  // its short axis), then map the world bounds to FILL that rect: X and Z scale
  // independently so every zone rect lands over the painted continent rather than
  // being squeezed into the world's true 1:2.4 aspect. Guard a non-finite aspect.
  const aspect = contentAspect > 0 && Number.isFinite(contentAspect) ? contentAspect : 1;
  const imageW = aspect >= 1 ? S : S * aspect;
  const imageH = aspect >= 1 ? S / aspect : S;
  const imageX = (S - imageW) / 2;
  const imageY = (S - imageH) / 2;
  const toMap = (x: number, z: number): { mx: number; my: number } => ({
    mx: imageX + ((WORLD_MAX_X - x) / worldSpanX) * imageW,
    my: imageY + ((WORLD_MAX_Z - z) / worldSpanZ) * imageH,
  });

  const p = world.player;
  const currentZoneId = zoneAtFrom(zones, p.pos.x, p.pos.z).id;

  const regions: ContinentZoneRegion[] = zones.map((zone) => {
    const [xMin, xMax] = zoneXBounds(zone);
    // +X maps left and +Z maps up, so the rect's top-left corner sits at
    // (xMax, zMax) and its bottom-right at (xMin, zMin); both spans are positive.
    const topLeft = toMap(xMax, zone.zMax);
    const bottomRight = toMap(xMin, zone.zMin);
    const rect: ContinentRect = {
      mx: topLeft.mx,
      my: topLeft.my,
      w: bottomRight.mx - topLeft.mx,
      h: bottomRight.my - topLeft.my,
    };
    return {
      zoneId: zone.id,
      rect,
      labelX: rect.mx + rect.w / 2,
      labelY: rect.my + rect.h / 2,
      isCurrent: zone.id === currentZoneId,
      isHovered: zone.id === hoveredZoneId,
      levelMin: zone.levelRange[0],
      levelMax: zone.levelRange[1],
    };
  });

  const inWorld = (x: number, z: number): boolean =>
    x >= WORLD_MIN_X && x <= WORLD_MAX_X && z >= WORLD_MIN_Z && z <= WORLD_MAX_Z;
  const player = inWorld(p.pos.x, p.pos.z) ? toMap(p.pos.x, p.pos.z) : null;

  // Party members (issue 2652): the same partyInfo.members the minimap and the
  // per-zone map already consume, projected through this level's toMap. Self is
  // skipped (it has its own "you are here" marker) and anyone off the world rect
  // is dropped, on the same bounds test as the player marker above. Not gated on
  // the zone: telling you a member is two zones north is the whole point of this
  // level, and it is what the per-zone map (which drops out-of-zone members)
  // cannot answer.
  const party: ContinentPartyMarker[] = [];
  const partyInfo = world.partyInfo;
  if (partyInfo) {
    for (const m of partyInfo.members) {
      if (m.pid === p.id) continue;
      if (!inWorld(m.x, m.z)) continue;
      const { mx, my } = toMap(m.x, m.z);
      party.push({ mx, my, cls: m.cls, dead: m.dead !== 0 });
    }
  }

  return {
    image: { mx: imageX, my: imageY, w: imageW, h: imageH },
    regions,
    player,
    party,
    currentZoneId,
    usesArt: true,
  };
}

/** The zone id whose region rect contains the canvas point, or null (the zones
 *  are disjoint rects, so at most one contains any point; first match wins). */
export function continentZoneAt(
  regions: readonly ContinentZoneRegion[],
  mx: number,
  my: number,
): string | null {
  for (const region of regions) {
    const { rect } = region;
    if (mx >= rect.mx && mx <= rect.mx + rect.w && my >= rect.my && my <= rect.my + rect.h) {
      return region.zoneId;
    }
  }
  return null;
}

/** Keys accepted by the focusable continent canvas. Kept here, beside the
 * region geometry, so keyboard navigation follows the painted layout instead
 * of duplicating MIR4's current 4x5 ordering in the DOM host. */
export type ContinentNavigationKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End';

/** Resolve the next focused zone from the region centres. This works for both
 * MIR4's generated atlas and the classic irregular continent layout: arrows
 * choose the nearest region in the requested half-plane, while Home/End use
 * visual reading order. At an outer edge the current region remains selected. */
export function continentZoneForKeyboard(
  regions: readonly ContinentZoneRegion[],
  currentZoneId: string | null,
  key: ContinentNavigationKey,
): string | null {
  if (regions.length === 0) return null;

  const readingOrder = [...regions].sort(
    (a, b) => a.labelY - b.labelY || a.labelX - b.labelX || a.zoneId.localeCompare(b.zoneId),
  );
  if (key === 'Home') return readingOrder[0]?.zoneId ?? null;
  if (key === 'End') return readingOrder.at(-1)?.zoneId ?? null;

  const origin =
    regions.find((region) => region.zoneId === currentZoneId) ??
    regions.find((region) => region.isCurrent) ??
    readingOrder[0];
  if (!origin) return null;

  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const sign = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  let winner: ContinentZoneRegion | null = null;
  let winnerScore = Number.POSITIVE_INFINITY;
  for (const candidate of regions) {
    if (candidate === origin) continue;
    const dx = candidate.labelX - origin.labelX;
    const dy = candidate.labelY - origin.labelY;
    const primary = horizontal ? dx : dy;
    if (primary * sign <= 0) continue;
    const cross = horizontal ? dy : dx;
    // Prefer staying in the same row/column, then the closest forward cell.
    const score = Math.abs(primary) + Math.abs(cross) * 4;
    if (score < winnerScore) {
      winner = candidate;
      winnerScore = score;
    }
  }
  return winner?.zoneId ?? origin.zoneId;
}
