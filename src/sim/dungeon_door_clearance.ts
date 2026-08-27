// Overworld half of "never aggro on entry": keep a clear ring around every
// dungeon's overworld door so a player walking up to (or zoning out of) a dungeon
// is never standing inside a camp mob's aggro radius. The interior half (the
// arrival point and interior packs) is handled by the dungeon entry/spawn data +
// the aggro-radius clamp; this covers the OUTSIDE door.
//
// Pure and deterministic (no rng, no clock): the camp spawner projects each rolled
// mob position out of any door's clear ring BEFORE resolving safe ground, so the
// draw order is untouched and only the resulting position changes.

import { DUNGEONS } from './data';
import { MAX_AGGRO_RADIUS } from './mob/locomotion';
import type { PortalDef } from './types';

// The clear radius around a door is exactly the aggro-radius clamp (imported, not a
// re-typed literal), so a mob spawned strictly outside this ring can never aggro a
// player standing on the door. Retuning the clamp in locomotion.ts moves this in
// lockstep, and the guard test pins the same imported constant.
export const DOOR_CLEAR_RADIUS = MAX_AGGRO_RADIUS;
// Inter-map arrivals get a wider authored buffer than ordinary dungeon doors:
// the extra four yards keep dense grind packs and their nameplates out of the
// portal presentation even when their aggro clamp itself remains 20 yards.
export const PORTAL_CLEAR_RADIUS = 24;

// Every dungeon's overworld door, deduped (some share one entrance, e.g. the
// Nythraxis crypt + raid arena). Computed once at module load from the merged table.
export const DUNGEON_DOORS: ReadonlyArray<{ x: number; z: number }> = (() => {
  const seen = new Set<string>();
  const doors: { x: number; z: number }[] = [];
  for (const d of Object.values(DUNGEONS)) {
    if (d.overworldDoor === false) continue;
    const door = d.doorPos;
    if (!door) continue;
    const key = `${door.x},${door.z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    doors.push({ x: door.x, z: door.z });
  }
  return doors;
})();

// If (x,z) falls inside any door's clear ring, push it straight out to the ring's
// edge (along the door-to-point direction); a point exactly on a door is pushed
// along +x so the result is deterministic. Points already clear are returned as-is.
export function projectOutsideDungeonDoors(x: number, z: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const door of DUNGEON_DOORS) {
    const dx = px - door.x;
    const dz = pz - door.z;
    const dist = Math.hypot(dx, dz);
    if (dist >= DOOR_CLEAR_RADIUS) continue;
    if (dist < 1e-6) {
      px = door.x + DOOR_CLEAR_RADIUS;
      pz = door.z;
    } else {
      const s = DOOR_CLEAR_RADIUS / dist;
      px = door.x + dx * s;
      pz = door.z + dz * s;
    }
  }
  return { x: px, z: pz };
}

export function portalClearancePoints(
  portals: readonly PortalDef[] | undefined,
): ReadonlyArray<{ x: number; z: number }> {
  return (portals ?? []).flatMap((portal) => [
    portal.a,
    portal.a.landing,
    portal.b,
    portal.b.landing,
  ]);
}

// Camp centers are filtered before construction, but the final sunflower jitter
// and findSafePos shore recovery can still move an individual spawn into a portal
// approach. Project the final authored position outside every endpoint and arrival
// ring so the safety rule holds for the entity the player actually encounters.
export function projectOutsideWorldTransit(
  x: number,
  z: number,
  portals: readonly PortalDef[] | undefined,
): { x: number; z: number } {
  const clearances = [
    ...DUNGEON_DOORS.map((point) => ({ point, radius: DOOR_CLEAR_RADIUS })),
    ...portalClearancePoints(portals).map((point) => ({ point, radius: PORTAL_CLEAR_RADIUS })),
  ];
  let px = x;
  let pz = z;

  // Overlapping rings can push a point into a ring already visited. Iterate to a
  // fixed point with a deterministic upper bound; no rng or clock is involved.
  for (let pass = 0; pass < Math.max(1, clearances.length * 2); pass++) {
    let changed = false;
    for (const { point, radius } of clearances) {
      const dx = px - point.x;
      const dz = pz - point.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= radius) continue;
      changed = true;
      if (dist < 1e-6) {
        px = point.x + radius;
        pz = point.z;
      } else {
        const scale = radius / dist;
        px = point.x + dx * scale;
        pz = point.z + dz * scale;
      }
    }
    if (!changed) break;
  }

  return { x: px, z: pz };
}
