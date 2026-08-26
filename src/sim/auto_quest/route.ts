// Session-only route following shared by MIR4 Auto Journey and Auto Battle.
// The owning automation state keeps the small route cursor; this leaf computes
// it without retaining module-global state, drawing RNG, or changing the
// save/wire projection.

import {
  findPlayerPath,
  findReachablePlayerPath,
  PLAYER_MAX_CLIMB_SLOPE,
  resolvePlayerDestination,
} from '../pathfind';
import type { ZoneDef } from '../types';
import { groundHeight, waterLevelAt } from '../world';

const ROUTE_REACHED_YARDS = 0.75;
const ROUTE_STALL_TICKS = 20;
const ROUTE_LOCAL_SPAN_YARDS = 96;
const ROUTE_AUTHORED_LEG_MAX_SPAN = 192;
const AUTOMATION_PROBE_STEP_YARDS = 0.35;
const ROUTE_NEARBY_AUTHORED_RECOVERY_YARDS = 24;

export interface Mir4AutoQuestRouteState {
  goalX: number;
  goalZ: number;
  waypoints: { x: number; z: number }[];
  lastX: number;
  lastZ: number;
  stalledTicks: number;
  /** Best distance reached toward the current first waypoint. Sideways
   * collision jitter must not reset the blocked-route detector. */
  bestWaypointDistance?: number;
}

/** Generic alias for new automation users; retained quest name is wire-neutral. */
export type Mir4AutomationRouteState = Mir4AutoQuestRouteState;

type RouteFinder = (
  seed: number,
  from: { x: number; z: number },
  to: { x: number; z: number },
  maxSpan: number,
  ignoreFences: boolean,
  swim: boolean,
  riftToken: number,
) => { x: number; z: number }[];

interface RoadNode {
  x: number;
  z: number;
  neighbors: Map<number, number>;
}

const ROAD_SNAP_YARDS = 40;
const WOC_ROAD_SNAP_YARDS = 140;
// WoC road groups are authored per biome. At physical zone exits their
// polylines intentionally stop on opposite sides of a short tract of open
// ground (for example Fenbridge -> Willowfen), so exact vertex equality does
// not describe the complete walkable network.
const ROAD_EXIT_JOIN_YARDS = 110;
const ROAD_LOCAL_JOIN_YARDS = 12;

function roadNodeKey(point: Readonly<{ x: number; z: number }>): string {
  return `${point.x.toFixed(3)},${point.z.toFixed(3)}`;
}

/** Shortest route over authored road vertices. Null means either endpoint is
 * too far from the road network, so callers should retain local A* behavior. */
export function authoredRoadRoute(
  current: Readonly<{ x: number; z: number }>,
  goal: Readonly<{ x: number; z: number }>,
  roads: readonly (readonly { x: number; z: number }[])[],
  zones: readonly ZoneDef[] = [],
): { x: number; z: number }[] | null {
  const nodes: RoadNode[] = [];
  const byKey = new Map<string, number>();
  const endpoints: { node: number; road: number }[] = [];
  const nodeAt = (point: Readonly<{ x: number; z: number }>): number => {
    const key = roadNodeKey(point);
    const existing = byKey.get(key);
    if (existing !== undefined) return existing;
    const index = nodes.length;
    nodes.push({ x: point.x, z: point.z, neighbors: new Map() });
    byKey.set(key, index);
    return index;
  };
  for (let roadIndex = 0; roadIndex < roads.length; roadIndex += 1) {
    const road = roads[roadIndex]!;
    if (road.length === 0) continue;
    endpoints.push({ node: nodeAt(road[0]!), road: roadIndex });
    endpoints.push({ node: nodeAt(road.at(-1)!), road: roadIndex });
    for (let index = 0; index + 1 < road.length; index += 1) {
      const a = nodeAt(road[index]!);
      const b = nodeAt(road[index + 1]!);
      const weight = Math.hypot(nodes[a]!.x - nodes[b]!.x, nodes[a]!.z - nodes[b]!.z);
      nodes[a]!.neighbors.set(b, Math.min(nodes[a]!.neighbors.get(b) ?? Infinity, weight));
      nodes[b]!.neighbors.set(a, Math.min(nodes[b]!.neighbors.get(a) ?? Infinity, weight));
    }
  }
  const zoneAt = (node: RoadNode) =>
    zones.find(
      (zone) =>
        node.x >= (zone.xMin ?? -180) &&
        node.x < (zone.xMax ?? 180) &&
        node.z >= zone.zMin &&
        node.z < zone.zMax,
    );
  const isBorderGateway = (node: RoadNode, zone: ZoneDef | undefined): boolean => {
    if (!zone) return false;
    const xMin = zone.xMin ?? -180;
    const xMax = zone.xMax ?? 180;
    const borderDistance = Math.min(
      Math.abs(node.x - xMin),
      Math.abs(node.x - xMax),
      Math.abs(node.z - zone.zMin),
      Math.abs(node.z - zone.zMax),
    );
    return borderDistance <= 30;
  };
  const join = (left: number, right: number, limit: number) => {
    if (left === right) return;
    const weight = Math.hypot(nodes[left]!.x - nodes[right]!.x, nodes[left]!.z - nodes[right]!.z);
    if (weight > limit) return;
    nodes[left]!.neighbors.set(
      right,
      Math.min(nodes[left]!.neighbors.get(right) ?? Infinity, weight),
    );
    nodes[right]!.neighbors.set(
      left,
      Math.min(nodes[right]!.neighbors.get(left) ?? Infinity, weight),
    );
  };
  if (zones.length > 0) {
    // Join short same-biome drafting gaps (an endpoint can meet the middle of a
    // separately authored road), but never bridge a lake or wall with a broad
    // same-zone shortcut.
    for (const endpoint of endpoints) {
      for (let node = 0; node < nodes.length; node += 1) {
        join(endpoint.node, node, ROAD_LOCAL_JOIN_YARDS);
      }
    }
    // Larger unpainted tracts are valid only across two adjacent biome files.
    // Their endpoint pair represents the physical pass between those zones.
    for (let left = 0; left < endpoints.length; left += 1) {
      const a = endpoints[left]!;
      for (let right = left + 1; right < endpoints.length; right += 1) {
        const b = endpoints[right]!;
        if (a.road === b.road || a.node === b.node) continue;
        const aZone = zoneAt(nodes[a.node]!);
        const bZone = zoneAt(nodes[b.node]!);
        if (!aZone || !bZone) continue;
        // Some WoC roads deliberately begin inside the previous zone because
        // the intervening open ground is itself the named passage. The
        // Ferrywalk starts at the Farshore Causeway POI 30 yards before the
        // zone boundary, for example. Treat an endpoint on a declared border
        // POI as a physical gateway even when both endpoint coordinates are
        // classified in the same zone. Requiring border proximity avoids
        // inventing shortcuts between ordinary same-biome road spokes. The
        // campaign replaces WoC POI labels, so geometry, rather than a
        // particular cartography label, is the stable gateway authority.
        if (
          aZone.id === bZone.id &&
          !isBorderGateway(nodes[a.node]!, aZone) &&
          !isBorderGateway(nodes[b.node]!, bZone)
        ) {
          continue;
        }
        join(a.node, b.node, ROAD_EXIT_JOIN_YARDS);
      }
    }
  }
  if (nodes.length === 0) return null;
  const nearest = (point: Readonly<{ x: number; z: number }>) => {
    let index = -1;
    let distance = Infinity;
    for (let candidate = 0; candidate < nodes.length; candidate += 1) {
      const node = nodes[candidate]!;
      const next = Math.hypot(point.x - node.x, point.z - node.z);
      if (next < distance) {
        index = candidate;
        distance = next;
      }
    }
    return { index, distance };
  };
  const start = nearest(current);
  const end = nearest(goal);
  const snapYards = zones.length > 0 ? WOC_ROAD_SNAP_YARDS : ROAD_SNAP_YARDS;
  if (start.distance > snapYards || end.distance > snapYards) return null;

  const distance = new Float64Array(nodes.length);
  distance.fill(Infinity);
  distance[start.index] = 0;
  const previous = new Int32Array(nodes.length);
  previous.fill(-1);
  const visited = new Uint8Array(nodes.length);
  for (;;) {
    let at = -1;
    let best = Infinity;
    for (let index = 0; index < nodes.length; index += 1) {
      if (!visited[index] && distance[index] < best) {
        at = index;
        best = distance[index];
      }
    }
    if (at < 0 || at === end.index) break;
    visited[at] = 1;
    for (const [neighbor, weight] of nodes[at]!.neighbors) {
      const candidate = best + weight;
      if (candidate < distance[neighbor]) {
        distance[neighbor] = candidate;
        previous[neighbor] = at;
      }
    }
  }
  if (!Number.isFinite(distance[end.index])) return null;
  const indices: number[] = [];
  for (let at = end.index; at >= 0; at = previous[at]!) {
    indices.push(at);
    if (at === start.index) break;
  }
  if (indices.at(-1) !== start.index) return null;
  indices.reverse();
  const skipSnappedStart = start.distance <= ROAD_LOCAL_JOIN_YARDS;
  const skipSnappedEnd = end.distance <= ROAD_LOCAL_JOIN_YARDS;
  const route = indices
    .map((index) => ({ x: nodes[index]!.x, z: nodes[index]!.z }))
    // Portal landings intentionally sit a few yards past their road endpoint;
    // returning to that nearby vertex would immediately re-enter the portal.
    // A player far from the graph is different: the snapped vertex is the
    // authored entrance or exit around a maze, wall or lake and must remain in
    // the route before following the road network.
    // The same rule applies at the destination. A quest NPC or objective can
    // stand a few yards past a road endpoint, and the endpoint itself may be
    // occupied by the visible arch, sign or landmark that explains the turn.
    // Walking onto that decoration before the actual goal can cause a portal
    // loop or a collision stall even though the goal is directly reachable.
    .filter(
      (_point, index) =>
        (index > 0 || !skipSnappedStart) && (index < indices.length - 1 || !skipSnappedEnd),
    );
  const last = route.at(-1);
  if (!last || Math.hypot(last.x - goal.x, last.z - goal.z) > 0.5) {
    route.push({ x: goal.x, z: goal.z });
  }
  return route;
}

function sameGoal(
  route: Mir4AutoQuestRouteState,
  goal: { x: number; z: number },
  repathGoalDistance: number,
): boolean {
  return Math.hypot(route.goalX - goal.x, route.goalZ - goal.z) < repathGoalDistance;
}

function localRouteGoal(
  from: { x: number; z: number },
  goal: { x: number; z: number },
): { x: number; z: number } {
  const dx = goal.x - from.x;
  const dz = goal.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= ROUTE_LOCAL_SPAN_YARDS) return goal;
  const scale = ROUTE_LOCAL_SPAN_YARDS / distance;
  return { x: from.x + dx * scale, z: from.z + dz * scale };
}

/** The shared automated mover rejects an uphill sample inside a steep-wall
 * cell even when coarse A* found a nominal path. Validate each compressed A*
 * segment at the live movement step before committing to an authored-road
 * approach, otherwise both layers can rebuild the same unusable route forever.
 * Authored switchbacks and ramps provide the physical alternative when this
 * conservative check rejects a shortcut across their surrounding relief. */
function automationApproachStartsWalkable(
  seed: number,
  current: Readonly<{ x: number; z: number }>,
  approach: readonly { x: number; z: number }[],
): boolean {
  const rideHeight = (x: number, z: number) =>
    Math.max(groundHeight(x, z, seed), waterLevelAt(x, z, seed));
  let fromX = current.x;
  let fromZ = current.z;
  for (const waypoint of approach) {
    const dx = waypoint.x - fromX;
    const dz = waypoint.z - fromZ;
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / AUTOMATION_PROBE_STEP_YARDS));
    let previousX = fromX;
    let previousZ = fromZ;
    for (let index = 1; index <= steps; index += 1) {
      const ratio = index / steps;
      const nextX = fromX + dx * ratio;
      const nextZ = fromZ + dz * ratio;
      const stepRun = Math.hypot(nextX - previousX, nextZ - previousZ);
      if (
        rideHeight(nextX, nextZ) - rideHeight(previousX, previousZ) >
        PLAYER_MAX_CLIMB_SLOPE * stepRun + 1e-6
      ) {
        return false;
      }
      previousX = nextX;
      previousZ = nextZ;
    }
    fromX = waypoint.x;
    fromZ = waypoint.z;
  }
  return approach.length > 0;
}

function reachableRoadDetour(
  seed: number,
  current: { x: number; z: number },
  goal: { x: number; z: number },
  roads: readonly (readonly { x: number; z: number }[])[],
  zones: readonly ZoneDef[],
  riftToken: number,
  swim: boolean,
): { x: number; z: number }[] | null {
  const seen = new Set<string>();
  const candidates = roads
    .flatMap((road) => road)
    .filter((point) => {
      const key = roadNodeKey(point);
      if (seen.has(key)) return false;
      seen.add(key);
      return Math.hypot(point.x - current.x, point.z - current.z) <= WOC_ROAD_SNAP_YARDS;
    })
    .sort(
      (left, right) =>
        Math.hypot(left.x - current.x, left.z - current.z) -
        Math.hypot(right.x - current.x, right.z - current.z),
    )
    .slice(0, 16);

  for (const candidate of candidates) {
    let approach = findReachablePlayerPath(
      seed,
      current,
      candidate,
      ROUTE_AUTHORED_LEG_MAX_SPAN,
      false,
      swim,
      riftToken,
    );
    // A character already down inside a swimmable authored ramp can be closer
    // to its road endpoint than the coarse land A* can represent. Admit that
    // short direct leg only after the same per-step physical grade probe used
    // for normal approaches. The live mover still handles water and colliders;
    // this merely reconnects it to the visible authored escape.
    if (
      approach.length === 0 &&
      Math.hypot(candidate.x - current.x, candidate.z - current.z) <=
        ROUTE_NEARBY_AUTHORED_RECOVERY_YARDS &&
      automationApproachStartsWalkable(seed, current, [candidate])
    ) {
      approach = [candidate];
    }
    if (approach.length === 0 || !automationApproachStartsWalkable(seed, current, approach)) {
      continue;
    }
    const road = authoredRoadRoute(candidate, goal, roads, zones);
    if (!road) continue;
    return [...approach, ...road];
  }
  return null;
}

export function advanceMir4AutomationRoute(
  seed: number,
  current: { x: number; z: number },
  goal: { x: number; z: number },
  previous: Mir4AutoQuestRouteState | undefined,
  riftToken: number,
  findRoute: RouteFinder = findPlayerPath,
  preferAuthoredRoads = false,
  roads: readonly (readonly { x: number; z: number }[])[] = [],
  zones: readonly ZoneDef[] = [],
  swim = false,
  repathGoalDistance = 0.5,
): { route: Mir4AutoQuestRouteState; waypoint: { x: number; z: number } } {
  let route = previous;
  let stalledTicks = 0;
  if (route) {
    const waypoint = route.waypoints[0];
    if (waypoint) {
      const distance = Math.hypot(current.x - waypoint.x, current.z - waypoint.z);
      const previousBest = route.bestWaypointDistance ?? distance;
      if (distance < previousBest - 0.05) {
        route.bestWaypointDistance = distance;
      } else {
        stalledTicks = route.stalledTicks + 1;
      }
    }
  }
  const goalChanged = route ? !sameGoal(route, goal, repathGoalDistance) : true;

  if (route && !goalChanged) {
    while (
      route.waypoints.length > 0 &&
      Math.hypot(current.x - route.waypoints[0].x, current.z - route.waypoints[0].z) <=
        ROUTE_REACHED_YARDS
    ) {
      route.waypoints.shift();
      route.stalledTicks = 0;
      const next = route.waypoints[0];
      route.bestWaypointDistance = next
        ? Math.hypot(current.x - next.x, current.z - next.z)
        : undefined;
    }
  }

  // The pathfinder and live swept collision intentionally use different
  // resolutions. If the avatar only jitters around a micro-waypoint, discard
  // that blocked sample and try the next authored/A* point before rebuilding
  // the same path forever.
  if (route && !goalChanged && stalledTicks >= ROUTE_STALL_TICKS && route.waypoints.length > 1) {
    route.waypoints.shift();
    route.lastX = current.x;
    route.lastZ = current.z;
    route.stalledTicks = 0;
    const next = route.waypoints[0]!;
    route.bestWaypointDistance = Math.hypot(current.x - next.x, current.z - next.z);
    return { route, waypoint: next };
  }

  if (goalChanged || !route || route.waypoints.length === 0 || stalledTicks >= ROUTE_STALL_TICKS) {
    // A dialogue, portal landing or crowd collision can leave the player's
    // centre a few inches inside a static prop. A* deliberately treats a
    // blocked start as a fallback case, which used to collapse the route to a
    // straight segment through that same prop forever. Plan from the nearest
    // collision-safe point instead. The returned path still starts close
    // enough for ordinary swept movement to escape physically; this does not
    // teleport or phase the player through geometry.
    const planningStart = resolvePlayerDestination(seed, current, swim, riftToken);
    let authored = preferAuthoredRoads
      ? authoredRoadRoute(planningStart, goal, roads, zones)
      : null;
    // A shallow beach inside a declared lake can be technically dry while
    // still lying below an impassable carved rim. When the destination is
    // outside that water body, retain the nearest authored shore/ramp vertex
    // instead of skipping it as a normal close road snap. This is what leads
    // Glacier Tarn waders to the visible slipway before climbing the bench.
    const leavingWaterBody =
      Number.isFinite(waterLevelAt(planningStart.x, planningStart.z, seed)) &&
      !Number.isFinite(waterLevelAt(goal.x, goal.z, seed));
    if (authored && leavingWaterBody) {
      authored =
        reachableRoadDetour(seed, planningStart, goal, roads, zones, riftToken, swim) ?? authored;
    }
    if (authored?.[0]) {
      const directApproach = findReachablePlayerPath(
        seed,
        planningStart,
        authored[0],
        ROUTE_AUTHORED_LEG_MAX_SPAN,
        false,
        swim,
        riftToken,
      );
      if (
        directApproach.length === 0 ||
        !automationApproachStartsWalkable(seed, planningStart, directApproach)
      ) {
        authored = reachableRoadDetour(seed, planningStart, goal, roads, zones, riftToken, swim);
      }
    }
    const checkpoints = authored ?? [localRouteGoal(current, goal)];
    const maxSpan = authored ? ROUTE_AUTHORED_LEG_MAX_SPAN : 128;
    const waypoints: { x: number; z: number }[] = [];
    let legStart = planningStart;
    for (const checkpoint of checkpoints) {
      for (const waypoint of findRoute(
        seed,
        legStart,
        checkpoint,
        maxSpan,
        false,
        swim,
        riftToken,
      )) {
        const prior = waypoints.at(-1);
        if (!prior || Math.hypot(prior.x - waypoint.x, prior.z - waypoint.z) > 0.05) {
          waypoints.push(waypoint);
        }
      }
      legStart = checkpoint;
    }
    route = {
      goalX: goal.x,
      goalZ: goal.z,
      waypoints,
      lastX: current.x,
      lastZ: current.z,
      stalledTicks: 0,
      bestWaypointDistance: waypoints[0]
        ? Math.hypot(current.x - waypoints[0].x, current.z - waypoints[0].z)
        : undefined,
    };
  } else {
    route.lastX = current.x;
    route.lastZ = current.z;
    route.stalledTicks = stalledTicks;
  }

  return { route, waypoint: route.waypoints[0] ?? goal };
}

/** Compatibility export for the Auto Journey call sites and focused tests. */
export const advanceMir4AutoQuestRoute = advanceMir4AutomationRoute;
