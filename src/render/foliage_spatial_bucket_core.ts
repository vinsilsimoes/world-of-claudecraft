// Spatial grouping for foliage instance batches. Full-detail tiers preserve
// the established two-column layout and 240-yard depth bands. The lean tier
// uses local square cells so one nearby tree cannot submit a half-world slab
// of off-screen instances on an integrated GPU.

export const FOLIAGE_BUCKET_DEPTH = 240;
export const LEAN_FOLIAGE_CELL_SIZE = 192;

export interface FoliageSpatialBucket {
  band: number;
  col: number;
  key: string;
}

export function foliageSpatialBucket(
  x: number,
  z: number,
  worldMinZ: number,
  leanFoliage: boolean,
): FoliageSpatialBucket {
  const bandSize = leanFoliage ? LEAN_FOLIAGE_CELL_SIZE : FOLIAGE_BUCKET_DEPTH;
  const band = Math.floor((z - worldMinZ) / bandSize);
  const col = leanFoliage ? Math.floor(x / LEAN_FOLIAGE_CELL_SIZE) : x < 0 ? 0 : 1;
  return { band, col, key: `${band}:${col}` };
}
