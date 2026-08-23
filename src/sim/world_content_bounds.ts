import type { WorldContent } from './types';

export interface WorldContentBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * The authored outer rectangle of a WorldContent zone set. Custom worlds may
 * omit x extents for strip zones, so callers supply the strip fallback owned
 * by their host. Returns null for an empty document instead of inventing a
 * playable extent.
 */
export function worldContentBounds(
  content: Pick<WorldContent, 'zones'>,
  fallbackMinX: number,
  fallbackMaxX: number,
): WorldContentBounds | null {
  if (content.zones.length === 0) return null;
  return {
    minX: Math.min(...content.zones.map((zone) => zone.xMin ?? fallbackMinX)),
    maxX: Math.max(...content.zones.map((zone) => zone.xMax ?? fallbackMaxX)),
    minZ: Math.min(...content.zones.map((zone) => zone.zMin)),
    maxZ: Math.max(...content.zones.map((zone) => zone.zMax)),
  };
}
