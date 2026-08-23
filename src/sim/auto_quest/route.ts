// Session-only route following shared by MIR4 Auto Journey and Auto Battle.
// The owning automation state keeps the small route cursor; this leaf computes
// it without retaining module-global state, drawing RNG, or changing the
// save/wire projection.

import { findPlayerPath } from '../pathfind';
import type { ZoneDef } from '../types';

const ROUTE_REACHED_YARDS = 0.75;
const ROUTE_STALL_TICKS = 20;
const ROUTE_LOCAL_SPAN_YARDS = 96;
const ROUTE_AUTHORED_LEG_MAX_SPAN = 192;

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
    )?.id;
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
        if (!aZone || !bZone || aZone === bZone) continue;
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
  const route = indices
    .map((index) => ({ x: nodes[index]!.x, z: nodes[index]!.z }))
    // Never walk back to the snapped start vertex. Portal landings intentionally
    // sit a few yards past their road endpoint; returning to the closest vertex
    // would immediately re-enter the portal and ping-pong between maps.
    .filter((_point, index) => index > 0);
  const last = route.at(-1);
  if (!last || Math.hypot(last.x - goal.x, last.z - goal.z) > 0.5) {
    route.push({ x: goal.x, z: goal.z });
  }
  return route;
}

function sameGoal(route: Mir4AutoQuestRouteState, goal: { x: number; z: number }): boolean {
  return Math.hypot(route.goalX - goal.x, route.goalZ - goal.z) < 0.5;
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
  const goalChanged = route ? !sameGoal(route, goal) : true;

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
    const authored = preferAuthoredRoads ? authoredRoadRoute(current, goal, roads, zones) : null;
    const checkpoints = authored ?? [localRouteGoal(current, goal)];
    const maxSpan = authored ? ROUTE_AUTHORED_LEG_MAX_SPAN : 128;
    const waypoints: { x: number; z: number }[] = [];
    let legStart = { x: current.x, z: current.z };
    for (const checkpoint of checkpoints) {
      for (const waypoint of findRoute(
        seed,
        legStart,
        checkpoint,
        maxSpan,
        false,
        false,
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
