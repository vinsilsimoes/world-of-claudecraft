// Target-native art-direction recipes for the 20-map MIR4 campaign. Records
// contain only existing World of ClaudeCraft prop keys and fresh 3D world
// coordinates. Source TMX geometry and source-project assets never enter this
// layer.

import type { HeightStamp, ZonePropsDef } from '../../types';

type DecorProp = NonNullable<ZonePropsDef['decorProps']>[number];
type LocalDecorProp = Omit<DecorProp, 'x' | 'z'> & { dx: number; dz: number };
type LocalLake = { dx: number; dz: number; radius: number };
type LocalHeightStamp = Omit<HeightStamp, 'x' | 'z'> & { dx: number; dz: number };
type LocalMine = Omit<ZonePropsDef['mines'][number], 'x' | 'z'> & { dx: number; dz: number };
type LocalDock = Omit<ZonePropsDef['docks'][number], 'x' | 'z'> & { dx: number; dz: number };
export interface Mir4ArcMapDressingRecipe {
  mapId: string;
  /** Stable authoring identity used by tests and future visual QA tooling. */
  themeId: string;
  decorProps: readonly LocalDecorProp[];
  lakes?: readonly LocalLake[];
  terrainEdits?: readonly LocalHeightStamp[];
  mines?: readonly LocalMine[];
  docks?: readonly LocalDock[];
}

export interface Mir4ArcMapDressing {
  themeId: string;
  decorProps: DecorProp[];
  lakes: { x: number; z: number; radius: number }[];
  terrainEdits: HeightStamp[];
  mines: ZonePropsDef['mines'];
  docks: ZonePropsDef['docks'];
}

// All offsets are relative to the map hub. The central x corridor is kept
// clear for roads, quest anchors and portal travel. Large silhouettes occupy
// the side thirds, beyond the two hunting camps rather than inside them.
export const MIR4_ARC_MAP_DRESSING_RECIPES: readonly Mir4ArcMapDressingRecipe[] = [
  {
    mapId: 'm01-vila-do-vau',
    themeId: 'river-grove',
    decorProps: [
      { key: 'gardenArch', dx: -42, dz: 88, rot: 0.1, scale: 2.8 },
      { key: 'oakTree', dx: -48, dz: 101, rot: 0.7, scale: 1.35, r: 0.8, h: 9 },
      { key: 'oakTree', dx: -37, dz: 108, rot: -1.1, scale: 1.2, r: 0.8, h: 9 },
    ],
    lakes: [
      { dx: -98, dz: 74, radius: 11 },
      { dx: -98, dz: 101, radius: 12 },
    ],
    terrainEdits: [{ dx: 91, dz: 112, radius: 26, delta: 6, falloff: 'smooth' }],
  },
  {
    mapId: 'm02-trilha-dos-juncos',
    themeId: 'reed-crossing',
    decorProps: [
      { key: 'hexBoat', dx: 91, dz: 105, rot: -0.8, scale: 5 },
      { key: 'mushroomGlowCluster', dx: -43, dz: 104, rot: 0.4, scale: 1.8 },
      { key: 'hexbTowerBase', dx: 42, dz: 96, rot: 0.3, scale: 4.5, r: 2.5, h: 7 },
    ],
    lakes: [
      { dx: 96, dz: 96, radius: 14 },
      { dx: -96, dz: 119, radius: 13 },
    ],
    terrainEdits: [{ dx: -88, dz: 76, radius: 24, delta: 3, falloff: 'smooth' }],
  },
  {
    mapId: 'm03-bosque-do-vale',
    themeId: 'ancient-grove',
    decorProps: [
      { key: 'stagShrine', dx: -43, dz: 101, rot: 0.8, r: 2, h: 4.2 },
      { key: 'oakTree', dx: -54, dz: 112, rot: 2.1, scale: 1.5, r: 0.9, h: 10 },
      { key: 'oakTree', dx: -34, dz: 117, rot: -0.2, scale: 1.3, r: 0.8, h: 9 },
    ],
    terrainEdits: [
      { dx: 88, dz: 102, radius: 30, delta: 8, falloff: 'smooth' },
      { dx: -91, dz: 61, radius: 23, delta: 5, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm04-ruinas-da-encosta',
    themeId: 'highland-ruins',
    decorProps: [
      { key: 'hexTower', dx: 46, dz: 98, rot: -0.5, scale: 7, r: 3.6, h: 15 },
      { key: 'hexFlag', dx: 39, dz: 91, rot: 0.2, scale: 3 },
      { key: 'kcasRubbleLarge', dx: -45, dz: 111, rot: 1.4, scale: 1.2 },
    ],
    terrainEdits: [
      { dx: 90, dz: 111, radius: 28, delta: 13, falloff: 'smooth' },
      { dx: -91, dz: 121, radius: 24, delta: 10, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm05-clareira-da-fenda',
    themeId: 'open-crypt',
    decorProps: [
      { key: 'crystalMoundCave', dx: -48, dz: 105, rot: -1.2, r: 4.6, h: 10 },
      { key: 'kkPillar', dx: 42, dz: 102, rot: 0.3, scale: 0.8, r: 0.9, h: 4 },
      { key: 'kcasRubbleHalf', dx: 48, dz: 109, rot: 1.7, scale: 1.1 },
    ],
    terrainEdits: [{ dx: -91, dz: 116, radius: 29, delta: 11, falloff: 'smooth' }],
    mines: [{ dx: -43, dz: 112, rot: 0.7 }],
  },
  {
    mapId: 'm06-criptas-de-pedra-vela',
    themeId: 'fortified-cemetery',
    decorProps: [
      { key: 'kcasShrine', dx: 43, dz: 102, rot: Math.PI, scale: 1.1, r: 1.8, h: 4 },
      { key: 'kkWallCracked', dx: -45, dz: 98, rot: -0.6, scale: 0.8, r: 1.4, h: 3.5 },
      { key: 'kkPillar', dx: -50, dz: 105, rot: -0.6, scale: 0.8, r: 0.9, h: 4 },
    ],
    terrainEdits: [{ dx: 91, dz: 118, radius: 26, delta: 8, falloff: 'smooth' }],
  },
  {
    mapId: 'm07-galerias-do-ossario',
    themeId: 'ossuary-gallery',
    decorProps: [
      { key: 'crystalAmethystCluster', dx: 45, dz: 104, rot: 0.7, r: 2, h: 5 },
      { key: 'kcasRubbleLarge', dx: -47, dz: 106, rot: 2.2, scale: 1.2 },
      { key: 'kkPillar', dx: -41, dz: 98, rot: 0.2, scale: 0.9, r: 1, h: 4.5 },
    ],
    terrainEdits: [
      { dx: 90, dz: 87, radius: 24, delta: 10, falloff: 'smooth' },
      { dx: -91, dz: 126, radius: 25, delta: 12, falloff: 'smooth' },
    ],
    mines: [{ dx: 47, dz: 116, rot: -0.9 }],
  },
  {
    mapId: 'm08-fortaleza-de-brumapedra',
    themeId: 'mist-fortress',
    decorProps: [
      { key: 'hexbTownhall', dx: 45, dz: 4, rot: -1.3, scale: 7, r: 5.8, h: 14 },
      { key: 'hexbTowerBase', dx: 48, dz: 101, rot: 0.6, scale: 5, r: 2.8, h: 8 },
      { key: 'hexbTowerA', dx: -46, dz: 105, rot: -0.4, scale: 5.5, r: 3, h: 11 },
    ],
    terrainEdits: [
      { dx: 91, dz: 112, radius: 30, delta: 14, falloff: 'smooth' },
      { dx: -92, dz: 112, radius: 30, delta: 14, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm09-pantano-das-lanternas',
    themeId: 'lantern-fen',
    decorProps: [
      { key: 'mushroomGiantPurple', dx: -44, dz: 106, rot: 0.8, scale: 8, r: 1.6, h: 8 },
      { key: 'mushroomGlowCluster', dx: -35, dz: 112, rot: -0.5, scale: 2.4 },
      { key: 'flowerGlow', dx: 42, dz: 101, rot: 0.2, scale: 2.2 },
      { key: 'flowerGlow', dx: 75, dz: 130, rot: -0.6, scale: 2.6 },
      { key: 'mushroomGlowCluster', dx: -72, dz: 145, rot: 1.1, scale: 2.8 },
    ],
    lakes: [
      { dx: 95, dz: 101, radius: 15 },
      { dx: -98, dz: 125, radius: 12 },
    ],
    terrainEdits: [{ dx: 88, dz: 63, radius: 22, delta: 3, falloff: 'smooth' }],
  },
  {
    mapId: 'm10-charcos-do-rei-bog',
    themeId: 'deep-bog',
    decorProps: [
      { key: 'pixieMushroomHouse', dx: 44, dz: 105, rot: -0.7, scale: 1.5, r: 3.3, h: 10.5 },
      { key: 'mushroomGiantPurple', dx: -45, dz: 111, rot: 1.5, scale: 9, r: 1.8, h: 9 },
      { key: 'mushroomGlowCluster', dx: 35, dz: 114, scale: 2.5 },
      { key: 'pixieMushroomHouse', dx: -72, dz: 140, rot: 0.8, scale: 2, r: 4.4, h: 14 },
      { key: 'mushroomTan', dx: 75, dz: 125, rot: -0.4, scale: 4 },
    ],
    lakes: [{ dx: -94, dz: 104, radius: 16 }],
    terrainEdits: [{ dx: 91, dz: 121, radius: 23, delta: 4, falloff: 'smooth' }],
  },
  {
    mapId: 'm11-mangue-das-sanguessugas',
    themeId: 'mangrove-channel',
    decorProps: [
      { key: 'hexBoat', dx: 94, dz: 111, rot: -1.1, scale: 5 },
      { key: 'hexBoatrack', dx: 43, dz: 103, rot: 0.9, scale: 5 },
      { key: 'hexbHomeA', dx: -45, dz: 105, rot: 0.4, scale: 6.5, r: 4, h: 7 },
      { key: 'hexAnchor', dx: -73, dz: 135, rot: 0.5, scale: 5 },
      { key: 'rowboat', dx: 74, dz: 125, rot: -1.2, scale: 1.4 },
    ],
    lakes: [
      { dx: 90, dz: 108, radius: 18 },
      { dx: -97, dz: 127, radius: 13 },
    ],
    terrainEdits: [{ dx: -87, dz: 75, radius: 22, delta: 4, falloff: 'smooth' }],
    docks: [{ dx: 82, dz: 109, rot: -1.4, hutLocal: { x: 40, z: 40, hw: 0, hd: 0 } }],
  },
  {
    mapId: 'm12-porto-dos-juncos',
    themeId: 'lumen-harbor',
    decorProps: [
      { key: 'hexbShipyard', dx: 46, dz: 6, rot: 1.3, scale: 7, r: 6.5, h: 10 },
      { key: 'shipMonument', dx: -43, dz: 7, rot: 2.2, scale: 6, r: 3, h: 6 },
      { key: 'hexShipBlue', dx: 82, dz: 112, rot: -1.7, scale: 6, r: 4, h: 9, float: 0.55 },
    ],
    lakes: [{ dx: 82, dz: 112, radius: 22 }],
    terrainEdits: [{ dx: -91, dz: 118, radius: 24, delta: 6, falloff: 'smooth' }],
    docks: [{ dx: 64, dz: 112, rot: -1.7, hutLocal: { x: 40, z: 40, hw: 0, hd: 0 } }],
  },
  {
    mapId: 'm13-dunas-de-vidro',
    themeId: 'glass-oasis',
    decorProps: [
      { key: 'starHeartCrystal', dx: -43, dz: 102, rot: 0.5, r: 2.1, h: 6 },
      { key: 'crystalAmethystCluster', dx: 46, dz: 109, rot: -0.8, r: 2.2, h: 5.5 },
      { key: 'kcasRocks', dx: 38, dz: 99, rot: 1.2, scale: 1.1 },
      { key: 'starHeartCrystal', dx: 73, dz: 135, rot: -0.9, r: 2.1, h: 6 },
      { key: 'crystalAmethystCluster', dx: -72, dz: 140, rot: 1.4, r: 2.2, h: 5.5 },
      { key: 'crystalMoundCave', dx: -75, dz: 125, rot: -0.3, r: 4.2, h: 9 },
    ],
    lakes: [{ dx: -90, dz: 119, radius: 17 }],
    terrainEdits: [
      { dx: 92, dz: 89, radius: 30, delta: 10, falloff: 'smooth' },
      { dx: -88, dz: 65, radius: 24, delta: 7, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm14-necropole-de-akhet',
    themeId: 'moon-necropolis',
    decorProps: [
      { key: 'kcasShrine', dx: -43, dz: 104, rot: Math.PI, scale: 1.2, r: 2, h: 4.5 },
      { key: 'kkPillar', dx: 40, dz: 99, rot: 0.2, scale: 0.9, r: 1, h: 4.5 },
      { key: 'kkPillar', dx: 49, dz: 108, rot: -0.4, scale: 0.8, r: 0.9, h: 4 },
      { key: 'graveRound', dx: 72, dz: 125, rot: 0.4, scale: 1.5 },
      { key: 'graveCross', dx: -72, dz: 130, rot: -0.5, scale: 1.6 },
      { key: 'graveDecor', dx: 74, dz: 145, rot: 0.8, scale: 1.4 },
      { key: 'kcasWallBroken', dx: -74, dz: 145, rot: -0.7, scale: 0.8, r: 1.4, h: 3.5 },
    ],
    terrainEdits: [
      { dx: 91, dz: 121, radius: 28, delta: 12, falloff: 'smooth' },
      { dx: -92, dz: 91, radius: 26, delta: 9, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm15-caldeira-de-cinerita',
    themeId: 'obsidian-caldera',
    decorProps: [
      { key: 'kcasRocks', dx: -44, dz: 101, rot: 0.9, scale: 1.4 },
      { key: 'kcasRubbleLarge', dx: 45, dz: 106, rot: -1.4, scale: 1.3 },
      { key: 'crystalMoundCave', dx: 51, dz: 115, rot: 2.2, r: 4.2, h: 9 },
    ],
    terrainEdits: [
      { dx: 91, dz: 113, radius: 30, delta: 17, falloff: 'smooth' },
      { dx: -91, dz: 119, radius: 30, delta: 16, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm16-forja-do-sol-partido',
    themeId: 'red-forge-citadel',
    decorProps: [
      { key: 'hexrBlacksmith', dx: 44, dz: 5, rot: 1.2, scale: 7, r: 5, h: 7 },
      { key: 'hexrTowerA', dx: -46, dz: 103, rot: -0.4, scale: 6, r: 3.3, h: 12 },
      { key: 'hexFlagRed', dx: -39, dz: 96, rot: 0.3, scale: 5 },
    ],
    terrainEdits: [
      { dx: 92, dz: 117, radius: 31, delta: 18, falloff: 'smooth' },
      { dx: -92, dz: 117, radius: 31, delta: 18, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm17-tundra-dos-uivos',
    themeId: 'whitewood-shelter',
    decorProps: [
      { key: 'oakTree', dx: -44, dz: 105, rot: 0.7, scale: 1.25, r: 0.8, h: 9 },
      { key: 'hexHomeA', dx: 45, dz: 101, rot: -0.6, scale: 6.5, r: 4.5, h: 9 },
      { key: 'hexHaybale', dx: 37, dz: 110, rot: 1.2, scale: 4 },
    ],
    terrainEdits: [
      { dx: 90, dz: 111, radius: 28, delta: 13, falloff: 'smooth' },
      { dx: -91, dz: 126, radius: 25, delta: 11, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm18-passo-do-jarl',
    themeId: 'aurora-watch',
    decorProps: [
      { key: 'hexTower', dx: 45, dz: 102, rot: 0.4, scale: 8, r: 4, h: 17 },
      { key: 'hexWatchtower', dx: -46, dz: 107, rot: -0.8, scale: 6.5, r: 3, h: 8 },
      { key: 'hexFlag', dx: 38, dz: 94, rot: 0.1, scale: 3 },
    ],
    terrainEdits: [
      { dx: 91, dz: 103, radius: 29, delta: 19, falloff: 'smooth' },
      { dx: -91, dz: 121, radius: 29, delta: 17, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm19-veu-da-noite',
    themeId: 'rift-plateau',
    decorProps: [
      { key: 'starHeartCrystal', dx: 44, dz: 103, rot: -0.5, r: 2.2, h: 6 },
      { key: 'crystalAmethystCluster', dx: -46, dz: 107, rot: 1.8, r: 2.4, h: 6 },
      { key: 'mushroomGlowCluster', dx: -38, dz: 114, rot: 0.3, scale: 2.2 },
    ],
    terrainEdits: [
      { dx: 91, dz: 118, radius: 28, delta: 12, falloff: 'smooth' },
      { dx: -91, dz: 118, radius: 28, delta: 12, falloff: 'smooth' },
    ],
  },
  {
    mapId: 'm20-bastilha-do-eclipse',
    themeId: 'eclipse-city',
    decorProps: [
      { key: 'hexrCastle', dx: 47, dz: 6, rot: Math.PI, scale: 7, r: 6.8, h: 28 },
      { key: 'hexrChurch', dx: -46, dz: 7, rot: -1.2, scale: 7, r: 5.2, h: 12 },
      { key: 'crystalAmethystCluster', dx: -43, dz: 105, rot: 0.8, r: 2.6, h: 6.5 },
    ],
    terrainEdits: [
      { dx: 92, dz: 117, radius: 31, delta: 16, falloff: 'smooth' },
      { dx: -92, dz: 117, radius: 31, delta: 16, falloff: 'smooth' },
    ],
  },
] as const;

const DRESSING_BY_MAP = new Map(
  MIR4_ARC_MAP_DRESSING_RECIPES.map((recipe) => [recipe.mapId, recipe] as const),
);

/** Resolve one map's local recipe into fresh world coordinates. */
export function mir4ArcMapDressing(
  mapId: string,
  hub: Readonly<{ x: number; z: number }>,
): Mir4ArcMapDressing {
  const recipe = DRESSING_BY_MAP.get(mapId);
  if (!recipe) throw new Error(`Missing MIR4 native dressing recipe for ${mapId}`);
  return {
    themeId: recipe.themeId,
    decorProps: recipe.decorProps.map(({ dx, dz, ...prop }) => ({
      ...prop,
      x: hub.x + dx,
      z: hub.z + dz,
    })),
    lakes: (recipe.lakes ?? []).map(({ dx, dz, ...lake }) => ({
      ...lake,
      x: hub.x + dx,
      z: hub.z + dz,
    })),
    terrainEdits: (recipe.terrainEdits ?? []).map(({ dx, dz, ...edit }) => ({
      ...edit,
      x: hub.x + dx,
      z: hub.z + dz,
    })),
    mines: (recipe.mines ?? []).map(({ dx, dz, ...mine }) => ({
      ...mine,
      x: hub.x + dx,
      z: hub.z + dz,
    })),
    docks: (recipe.docks ?? []).map(({ dx, dz, ...dock }) => ({
      ...dock,
      x: hub.x + dx,
      z: hub.z + dz,
    })),
  };
}
