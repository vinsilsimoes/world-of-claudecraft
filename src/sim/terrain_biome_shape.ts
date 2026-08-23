import type { BiomeId } from './types';

export interface TerrainBiomeShape {
  hill: number;
  base: number;
  hubHeight: number;
  crag: number;
}

/** Shared terrain vocabulary for the built-in world and injected WorldContent. */
export const BIOME_SHAPE: Readonly<Record<BiomeId, TerrainBiomeShape>> = {
  vale: { hill: 26, base: 0, hubHeight: 1.5, crag: 5 },
  marsh: { hill: 11, base: -1.0, hubHeight: 1.2, crag: 0 },
  peaks: { hill: 34, base: 7, hubHeight: 9, crag: 26 },
  dusk: { hill: 14, base: 2, hubHeight: 2.5, crag: 4 },
  ember: { hill: 16, base: 2.5, hubHeight: 2.5, crag: 8 },
  frost: { hill: 26, base: 6, hubHeight: 3, crag: 10 },
  amber: { hill: 15, base: 2, hubHeight: 2.5, crag: 4 },
  fen: { hill: 8, base: -0.3, hubHeight: 2, crag: 0 },
  night: { hill: 12, base: 1, hubHeight: 2.5, crag: 4 },
  haunt: { hill: 13, base: 1.5, hubHeight: 2.5, crag: 5 },
  jungle: { hill: 11, base: 1.2, hubHeight: 2, crag: 4 },
  garden: { hill: 9, base: 1.8, hubHeight: 2, crag: 0 },
  gale: { hill: 14, base: 2.4, hubHeight: 2.5, crag: 8 },
  beach: { hill: 5, base: -2.4, hubHeight: 0.8, crag: 0 },
  desert: { hill: 15, base: 2.5, hubHeight: 2, crag: 12 },
  volcano: { hill: 42, base: 9, hubHeight: 6, crag: 30 },
  cave: { hill: 9, base: 1, hubHeight: 1, crag: 6 },
};
