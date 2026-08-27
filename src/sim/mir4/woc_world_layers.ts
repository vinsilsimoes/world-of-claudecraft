import type { WorldContent } from '../types';

/** Fields that may follow WoC updates after asset, collision, and route review. */
export const WORLD_GEOMETRY_LAYER_KEYS = [
  'roads',
  'litRoads',
  'dryCrossings',
  'props',
  'terrainEdits',
  'placements',
  'blockers',
  'biomePaint',
  'waterLevel',
  'terrainModel',
  'presentationModel',
] as const satisfies readonly (keyof WorldContent)[];

/** Fields that always remain authored or explicitly adapted by Aeldrune. */
export const WORLD_GAMEPLAY_LAYER_KEYS = [
  'zones',
  'camps',
  'npcs',
  'groundObjects',
  'travelPortals',
  'playerStart',
  'services',
  'mir4ArcMapProjections',
] as const satisfies readonly (keyof WorldContent)[];

type WorldGeometryKey = (typeof WORLD_GEOMETRY_LAYER_KEYS)[number];
type WorldGameplayKey = (typeof WORLD_GAMEPLAY_LAYER_KEYS)[number];
type UnclassifiedWorldKey = Exclude<keyof WorldContent, WorldGeometryKey | WorldGameplayKey>;
type DuplicatedWorldKey = Extract<WorldGeometryKey, WorldGameplayKey>;

// Adding a WorldContent field must make the ownership decision explicit here.
const WORLD_LAYER_CLASSIFICATION_IS_EXHAUSTIVE: [UnclassifiedWorldKey, DuplicatedWorldKey] extends [
  never,
  never,
]
  ? true
  : never = true;
void WORLD_LAYER_CLASSIFICATION_IS_EXHAUSTIVE;

export type WocWorldGeometryLayer = Pick<WorldContent, WorldGeometryKey>;
export type AeldruneWorldGameplayLayer = Pick<WorldContent, WorldGameplayKey>;

export interface AeldruneWorldComposition {
  geometry: Readonly<WorldContent>;
  gameplay: AeldruneWorldGameplayLayer;
  geometryOverrides?: Partial<WocWorldGeometryLayer>;
}

/**
 * Copy the reviewed spatial and presentation vocabulary only. WoC mobs, NPCs,
 * services, zones, portals, and spawn ordering cannot cross this boundary.
 */
export function extractWocWorldGeometry(world: Readonly<WorldContent>): WocWorldGeometryLayer {
  return {
    roads: world.roads,
    litRoads: world.litRoads,
    dryCrossings: world.dryCrossings,
    props: world.props,
    terrainEdits: world.terrainEdits,
    placements: world.placements,
    blockers: world.blockers,
    biomePaint: world.biomePaint,
    waterLevel: world.waterLevel,
    terrainModel: world.terrainModel,
    presentationModel: world.presentationModel,
  };
}

/** Copy only fields owned by Aeldrune, even when a caller passes a full world. */
export function extractAeldruneWorldGameplay(
  world: Readonly<AeldruneWorldGameplayLayer>,
): AeldruneWorldGameplayLayer {
  return {
    zones: world.zones,
    camps: world.camps,
    npcs: world.npcs,
    groundObjects: world.groundObjects,
    travelPortals: world.travelPortals,
    playerStart: world.playerStart,
    services: world.services,
    mir4ArcMapProjections: world.mir4ArcMapProjections,
  };
}

/** Compose a world whose gameplay side can never be populated by a WoC spread. */
export function composeAeldruneWorld({
  geometry,
  gameplay,
  geometryOverrides,
}: AeldruneWorldComposition): WorldContent {
  return {
    ...extractWocWorldGeometry(geometry),
    ...geometryOverrides,
    ...extractAeldruneWorldGameplay(gameplay),
  };
}
