// Adaptation of WoC's New Eastbrook harbor for Aeldrune's retained Eastbrook
// layout. WoC moved the whole town before adding its quay; Aeldrune keeps the
// established Vila do Vau quest anchors, so the same four-deck topology is
// seated on Mirror Lake instead of copying incompatible absolute coordinates.
// Pure leaf: render and collision consume these exact rectangles.

import { type GaleDeckDef, galeDeckSurfaceAt } from './gale_harbor';

const DECKS_X1 = -90;
const DECKS_X2 = -58;
const DECKS_Z1 = 68;
const DECKS_Z2 = 110;

export const AELDRUNE_EASTBROOK_HARBOR_DECKS: readonly GaleDeckDef[] = Object.freeze([
  // Shore boardwalk reached by the existing Mirror Lake road and fishing dock.
  { x: -62, z: 88, rot: 0, hl: 18, hw: 1.5, ax: -62, az: 70 },
  // Long ferry berth, matching the central WoC pier's role and proportions.
  { x: -75, z: 94, rot: -Math.PI / 2, hl: 11, hw: 2.2, ax: -62, az: 94 },
  // Two working piers leave navigable water between the three berths.
  { x: -72.5, z: 80, rot: -Math.PI / 2, hl: 8, hw: 1.6, ax: -62, az: 80 },
  { x: -72.5, z: 106, rot: -Math.PI / 2, hl: 8, hw: 1.6, ax: -62, az: 106 },
]);

/** Highest Eastbrook plank plane under `(x, z)`, or `-Infinity` off-deck. */
export function eastbrookDeckSurface(
  x: number,
  z: number,
  terrainAt: (x: number, z: number) => number,
  waterLevel: number,
): number {
  if (x < DECKS_X1 || x > DECKS_X2 || z < DECKS_Z1 || z > DECKS_Z2) return -Infinity;
  let surface = -Infinity;
  for (const deck of AELDRUNE_EASTBROOK_HARBOR_DECKS) {
    const dx = x - deck.x;
    const dz = z - deck.z;
    const dirx = Math.sin(deck.rot);
    const dirz = Math.cos(deck.rot);
    const along = dx * dirx + dz * dirz;
    if (along < -deck.hl || along > deck.hl) continue;
    const across = dx * dirz - dz * dirx;
    if (across < -deck.hw || across > deck.hw) continue;
    surface = Math.max(surface, galeDeckSurfaceAt(deck, along, terrainAt, waterLevel));
  }
  return surface;
}
