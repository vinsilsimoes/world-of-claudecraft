// Campaign cartography for the MIR4 story transplanted onto the original WoC
// terrain. The physical zone bounds and painted map remain WoC-owned; only the
// point names and their projected coordinates come from the active campaign.

import { projectMir4ArcPoint } from '../content/mir4/arc_world_layout';
import type { Mir4ArcMapProjection, ZoneDef } from '../types';

function sourceZoneId(mapId: string): string {
  return `mir4_${mapId}`;
}

/**
 * Clone the WoC zone table with campaign POIs for every projected chapter.
 * Chapters that share one physical biome contribute separate, namespaced
 * landmarks. Unmapped zones keep their original POIs and every other zone
 * field remains byte-for-byte equivalent to the WoC definition.
 */
export function buildMir4WocCampaignZones(
  wocZones: readonly ZoneDef[],
  campaignZones: readonly ZoneDef[],
  projections: readonly Mir4ArcMapProjection[],
): ZoneDef[] {
  const poisByTargetZone = new Map<string, ZoneDef['pois']>();

  for (const projection of projections) {
    const source = campaignZones.find((zone) => zone.id === sourceZoneId(projection.mapId));
    if (!source) continue;
    const targetPois = poisByTargetZone.get(projection.targetZoneId) ?? [];
    for (const [poiIndex, poi] of source.pois.entries()) {
      const projected = projectMir4ArcPoint(projections, projection.mapId, poi);
      targetPois.push({
        ...poi,
        id: poi.id ?? `mir4_${projection.mapId}_poi_${poiIndex}`,
        ...projected,
        ...(poi.diagnosticSpawn
          ? {
              diagnosticSpawn: projectMir4ArcPoint(
                projections,
                projection.mapId,
                poi.diagnosticSpawn,
              ),
            }
          : {}),
      });
    }
    poisByTargetZone.set(projection.targetZoneId, targetPois);
  }

  return wocZones.map((zone) => {
    const campaignPois = poisByTargetZone.get(zone.id);
    return campaignPois ? { ...zone, pois: campaignPois } : zone;
  });
}
