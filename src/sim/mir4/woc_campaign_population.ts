// Population adapter for the MIR4 campaign on the evolving WoC overworld.
// WoC owns physical seating and ecology anchors. MIR4 owns actor identity,
// combat templates, levels, drops, quests and progression.

import type { CampDef, MobTemplate, NpcDef, ZoneDef } from '../types';

const NPC_MIN_SPACING = 5;
const NPC_SAFE_RADIUS = 18;
const DUNGEON_SAFE_RADIUS = 24;
const GRIND_COUNT_MULTIPLIER = 2;
const GRIND_MIN_PER_CAMP = 6;
const GRIND_MIN_RADIUS = 6;
const GRIND_MAX_RADIUS = 30;
const OBJECTIVE_INTERACTION_CLEAR_RADIUS = 4;
const OBJECTIVE_GUARD_MAX_COUNT = 6;

// Chapter-strengthening quests must be offered before the danger they prepare
// the player to face. Ulf used to inherit Icemantle's southern seat, behind the
// two Glacier Tarn grind camps that block an underpowered M17 character.
const CAMPAIGN_NPC_SEAT_OVERRIDES: Readonly<Record<string, Readonly<{ x: number; z: number }>>> = {
  'm17-tundra-dos-uivos-rastreador-ulf': { x: 40, z: 1700 },
  'm17-tundra-dos-uivos-edda-aurora': { x: 32, z: 1720 },
  'm17-tundra-dos-uivos-ferreira-yrsa': { x: 27, z: 1738 },
  // Lumen inherited the lodge's interior Hearthkeeper seat. Interaction was
  // possible through the wall, but the player then could not leave for Q03.
  'm18-passo-do-jarl-astrid-aurora': { x: -10, z: 1580 },
  'm18-passo-do-jarl-abade-lumen': { x: 0, z: 1590 },
  'm18-passo-do-jarl-ferreira-svala': { x: -120, z: 1860 },
  // M07 and M19 share Nightbloom physically, but not chronologically. Keep
  // the Ossuary cast on the northern burial roads; the native southern seats
  // put M07 turn-ins through a level-140 M19 camp at (-320, 1446).
  'm07-galerias-do-ossario-vigia-sino': { x: -364, z: 1584 },
  'm07-galerias-do-ossario-arquivista-nomes': { x: -376, z: 1620 },
  'm07-galerias-do-ossario-ossia-da-centelha': { x: -380, z: 1700 },
  'm07-galerias-do-ossario-mestra-ossa': { x: -330, z: 1740 },
};

function zoneContains(zone: Readonly<ZoneDef>, point: Readonly<{ x: number; z: number }>): boolean {
  const xMin = zone.xMin ?? -180;
  const xMax = zone.xMax ?? 180;
  return point.x >= xMin && point.x < xMax && point.z >= zone.zMin && point.z < zone.zMax;
}

function zoneForPoint(
  zones: readonly ZoneDef[],
  point: Readonly<{ x: number; z: number }>,
): ZoneDef | null {
  return zones.find((zone) => zoneContains(zone, point)) ?? null;
}

function pointKey(point: Readonly<{ x: number; z: number }>): string {
  return `${point.x}:${point.z}`;
}

function distance(
  a: Readonly<{ x: number; z: number }>,
  b: Readonly<{ x: number; z: number }>,
): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function nearestUnusedPoint(
  desired: Readonly<{ x: number; z: number }>,
  candidates: readonly Readonly<{ x: number; z: number }>[],
  used: ReadonlySet<string>,
): { x: number; z: number } | null {
  let best: { x: number; z: number } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (used.has(pointKey(candidate))) continue;
    const candidateDistance = distance(desired, candidate);
    if (candidateDistance >= bestDistance) continue;
    best = { x: candidate.x, z: candidate.z };
    bestDistance = candidateDistance;
  }
  return best;
}

function spacedRoadPoints(
  roads: readonly (readonly { x: number; z: number }[])[],
  zone: Readonly<ZoneDef>,
): { x: number; z: number }[] {
  const accepted: { x: number; z: number }[] = [];
  for (const road of roads) {
    for (const point of road) {
      if (!zoneContains(zone, point)) continue;
      if (accepted.some((candidate) => distance(candidate, point) < NPC_MIN_SPACING)) continue;
      accepted.push({ x: point.x, z: point.z });
    }
  }
  return accepted;
}

/**
 * Seat MIR4 identities on WoC-authored NPC and road anchors. Native NPC seats
 * win; road vertices are the overflow for chapters sharing one physical zone.
 */
export function seatMir4NpcsOnWocWorld(
  projected: Readonly<Record<string, NpcDef>>,
  wocNpcs: Readonly<Record<string, NpcDef>>,
  zones: readonly ZoneDef[],
  roads: readonly (readonly { x: number; z: number }[])[],
): Record<string, NpcDef> {
  const result: Record<string, NpcDef> = {};
  // Reserve authored campaign seats so an earlier projected actor cannot take
  // one through the generic nearest-road fallback.
  const used = new Set(Object.values(CAMPAIGN_NPC_SEAT_OVERRIDES).map(pointKey));
  const nativeSeats = Object.values(wocNpcs)
    .filter((npc) => !npc.dynamic)
    .map((npc) => npc.pos);

  for (const [key, npc] of Object.entries(projected)) {
    const zone = zoneForPoint(zones, npc.pos);
    if (!zone) {
      result[key] = { ...npc };
      continue;
    }
    const campaignSeat = CAMPAIGN_NPC_SEAT_OVERRIDES[key];
    const zoneNativeSeats = nativeSeats.filter((seat) => zoneContains(zone, seat));
    const nativeSeat = campaignSeat ? null : nearestUnusedPoint(npc.pos, zoneNativeSeats, used);
    const roadSeat =
      (campaignSeat ?? nativeSeat)
        ? null
        : nearestUnusedPoint(npc.pos, spacedRoadPoints(roads, zone), used);
    const pos = campaignSeat ?? nativeSeat ?? roadSeat ?? { x: npc.pos.x, z: npc.pos.z };
    used.add(pointKey(pos));
    result[key] = { ...npc, pos };
  }

  return result;
}

function isCombatAnchor(template: MobTemplate | undefined): boolean {
  return !!template && !template.dummy && !template.ambient && !template.friendlyPracticeTarget;
}

function clearOf(
  point: Readonly<{ x: number; z: number }>,
  others: readonly Readonly<{ x: number; z: number }>[],
  radius: number,
): boolean {
  return others.every((other) => distance(point, other) >= radius);
}

function maximumSafeFootprintRadius(
  point: Readonly<{ x: number; z: number }>,
  protectedActors: readonly Readonly<{ x: number; z: number }>[],
  dungeonDoors: readonly Readonly<{ x: number; z: number }>[],
): number {
  let maximum = GRIND_MAX_RADIUS;
  for (const actor of protectedActors) {
    maximum = Math.min(maximum, distance(point, actor) - NPC_SAFE_RADIUS);
  }
  for (const door of dungeonDoors) {
    maximum = Math.min(maximum, distance(point, door) - DUNGEON_SAFE_RADIUS);
  }
  return maximum;
}

/**
 * Reuse WoC's authored monster ecology as placement slots, while assigning the
 * nearest chapter-appropriate MIR4 monster template to every safe slot.
 */
export function buildMir4GrindPopulation(
  projected: readonly CampDef[],
  wocCamps: readonly CampDef[],
  wocMobTemplates: Readonly<Record<string, MobTemplate>>,
  zones: readonly ZoneDef[],
  storyNpcs: Readonly<Record<string, NpcDef>>,
  protectedServices: readonly Readonly<{ x: number; z: number }>[],
  dungeonDoors: readonly Readonly<{ x: number; z: number }>[],
  isPlayableAnchor: (point: Readonly<{ x: number; z: number }>) => boolean = () => true,
  interactionSites: readonly Readonly<{ x: number; z: number; clearRadius?: number }>[] = [],
): CampDef[] {
  const protectedActors = [...Object.values(storyNpcs).map((npc) => npc.pos), ...protectedServices];
  const candidatesByZone = new Map<string, CampDef[]>();
  for (const camp of projected) {
    const zone = zoneForPoint(zones, camp.center);
    if (!zone) continue;
    const candidates = candidatesByZone.get(zone.id) ?? [];
    candidates.push(camp);
    candidatesByZone.set(zone.id, candidates);
  }

  const result: CampDef[] = [];
  const usedCenters = new Set<string>();
  const guardedInteractionSites = new Set<number>();
  for (const anchor of wocCamps) {
    if (!isCombatAnchor(wocMobTemplates[anchor.mobId])) continue;
    if (!isPlayableAnchor(anchor.center)) continue;
    const centerKey = pointKey(anchor.center);
    if (usedCenters.has(centerKey)) continue;
    usedCenters.add(centerKey);
    if (!clearOf(anchor.center, protectedActors, NPC_SAFE_RADIUS)) continue;
    if (!clearOf(anchor.center, dungeonDoors, DUNGEON_SAFE_RADIUS)) continue;
    const zone = zoneForPoint(zones, anchor.center);
    const candidates = zone ? candidatesByZone.get(zone.id) : undefined;
    if (!candidates || candidates.length === 0) continue;
    let source = candidates[0];
    for (const candidate of candidates.slice(1)) {
      if (distance(candidate.center, anchor.center) < distance(source.center, anchor.center)) {
        source = candidate;
      }
    }
    const desiredRadius = Math.min(
      GRIND_MAX_RADIUS,
      Math.max(GRIND_MIN_RADIUS, anchor.radius * 1.35),
    );
    const radius = Math.min(
      desiredRadius,
      maximumSafeFootprintRadius(anchor.center, protectedActors, dungeonDoors),
    );
    if (radius < GRIND_MIN_RADIUS) continue;
    const overlappingInteractionSites = interactionSites.flatMap((site, index) =>
      distance(anchor.center, site) <=
      radius + (site.clearRadius ?? OBJECTIVE_INTERACTION_CLEAR_RADIUS)
        ? [index]
        : [],
    );
    // A mission object may be guarded, but not by several doubled WoC camps
    // whose aggregate kill time exceeds the 60-second trash respawn. Keep one
    // six-creature guard pack: weak players still must intervene, while a
    // successful clear creates a real two/five-second interaction window.
    if (overlappingInteractionSites.some((index) => guardedInteractionSites.has(index))) continue;
    overlappingInteractionSites.forEach((index) => {
      guardedInteractionSites.add(index);
    });
    const count = Math.max(GRIND_MIN_PER_CAMP, Math.ceil(anchor.count * GRIND_COUNT_MULTIPLIER));
    result.push({
      ...source,
      center: { x: anchor.center.x, z: anchor.center.z },
      radius,
      count:
        overlappingInteractionSites.length > 0 ? Math.min(OBJECTIVE_GUARD_MAX_COUNT, count) : count,
      offStream: true,
    });
  }

  return result;
}

export const MIR4_WOC_POPULATION_RULES = Object.freeze({
  npcMinSpacing: NPC_MIN_SPACING,
  npcSafeRadius: NPC_SAFE_RADIUS,
  dungeonSafeRadius: DUNGEON_SAFE_RADIUS,
  grindCountMultiplier: GRIND_COUNT_MULTIPLIER,
  grindMinPerCamp: GRIND_MIN_PER_CAMP,
  grindMinRadius: GRIND_MIN_RADIUS,
  grindMaxRadius: GRIND_MAX_RADIUS,
  objectiveInteractionClearRadius: OBJECTIVE_INTERACTION_CLEAR_RADIUS,
  objectiveGuardMaxCount: OBJECTIVE_GUARD_MAX_COUNT,
});
