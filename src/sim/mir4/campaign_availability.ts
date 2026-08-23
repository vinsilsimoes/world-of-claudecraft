// One world-owned capability projection for the progressively authored MIR4
// campaign. Content may define all source quests, but gameplay must expose only
// maps whose authored zones are present in this Sim's WorldContent.

import { MIR4_WORLD_ARC } from '../content/mir4/world_arc';
import type { WorldContent } from '../types';

const EMPTY_MAP_IDS: readonly string[] = Object.freeze([]);
const cachedMapIds = new WeakMap<WorldContent, readonly string[]>();

export function mir4CampaignMapIdsForWorld(
  world: Pick<WorldContent, 'zones' | 'mir4ArcMapProjections'> | undefined,
): readonly string[] {
  if (!world) return EMPTY_MAP_IDS;
  if ('camps' in world) {
    const cached = cachedMapIds.get(world as WorldContent);
    if (cached) return cached;
  }
  const zoneIds = new Set(world.zones.map((zone) => zone.id));
  const projectedMapIds = new Set(
    world.mir4ArcMapProjections?.map((projection) => projection.mapId) ?? [],
  );
  const mapIds = Object.freeze(
    MIR4_WORLD_ARC.map((map) => map.mapId).filter(
      (mapId) => zoneIds.has(`mir4_${mapId}`) || projectedMapIds.has(mapId),
    ),
  );
  if ('camps' in world) cachedMapIds.set(world as WorldContent, mapIds);
  return mapIds;
}

export function mir4CampaignMapAvailable(
  mapId: string,
  campaignMapIds: readonly string[] | undefined,
): boolean {
  return campaignMapIds === undefined || campaignMapIds.includes(mapId);
}

export function mir4WorldHasFullCampaign(
  world: Pick<WorldContent, 'zones' | 'mir4ArcMapProjections'> | undefined,
): boolean {
  return mir4CampaignMapIdsForWorld(world).length === MIR4_WORLD_ARC.length;
}
