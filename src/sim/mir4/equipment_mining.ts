import type { Mir4EquipmentMetal, Mir4EquipmentRarity } from '../content/mir4/item_progression';
import { MIR4_WORLD_ARC } from '../content/mir4/world_arc';
import type { GatherNodeDef } from '../types';
import { MIR4_WOC_CHAPTER_LAYOUTS } from './woc_campaign_layout';

export interface Mir4EquipmentMiningDistrict {
  readonly mapId: string;
  readonly sequence: number;
  readonly levelMin: number;
  readonly levelMax: number;
  readonly zoneId: string;
  readonly metals: readonly Mir4EquipmentMetal[];
}

const RARITY_BY_METAL: Readonly<Record<Mir4EquipmentMetal, Mir4EquipmentRarity>> = {
  metalCommon: 'common',
  metalUncommon: 'uncommon',
  metalRare: 'rare',
  metalEpic: 'epic',
  metalLegendary: 'legendary',
  metalMythic: 'mythic',
};

function metalsForSequence(sequence: number): readonly Mir4EquipmentMetal[] {
  if (sequence <= 4) return ['metalCommon', 'metalUncommon'];
  if (sequence <= 8) return ['metalUncommon', 'metalRare'];
  if (sequence <= 12) return ['metalRare', 'metalEpic'];
  if (sequence <= 16) return ['metalEpic', 'metalLegendary'];
  return ['metalEpic', 'metalLegendary', 'metalMythic'];
}

export const MIR4_EQUIPMENT_MINING_DISTRICTS: readonly Mir4EquipmentMiningDistrict[] =
  Object.freeze(
    MIR4_WOC_CHAPTER_LAYOUTS.map((layout, index) => {
      const map = MIR4_WORLD_ARC[index];
      if (!map || map.mapId !== layout.mapId) {
        throw new Error(`Missing MIR4 mining chapter metadata for ${layout.mapId}`);
      }
      return Object.freeze({
        mapId: map.mapId,
        sequence: map.sequence,
        levelMin: map.levelMin,
        levelMax: map.levelMax,
        zoneId: layout.targetZoneId,
        metals: Object.freeze([...metalsForSequence(map.sequence)]),
      });
    }),
  );

function chapterDistance(
  node: Pick<GatherNodeDef, 'pos'>,
  layout: (typeof MIR4_WOC_CHAPTER_LAYOUTS)[number],
): number {
  return Math.min(
    ...[layout.hub, ...layout.sites].map((point) =>
      Math.hypot(node.pos.x - point.x, node.pos.z - point.z),
    ),
  );
}

function stableNodeOrdinal(nodeId: string): number {
  const suffix = Number(nodeId.match(/(\d+)$/)?.[1]);
  if (Number.isSafeInteger(suffix) && suffix > 0) return suffix - 1;
  let hash = 0;
  for (let index = 0; index < nodeId.length; index += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function mir4MiningDistrictForNode(
  node: Pick<GatherNodeDef, 'zoneId' | 'pos'>,
): Mir4EquipmentMiningDistrict | null {
  const candidates = MIR4_WOC_CHAPTER_LAYOUTS.map((layout, index) => ({
    layout,
    district: MIR4_EQUIPMENT_MINING_DISTRICTS[index],
  })).filter(
    (
      entry,
    ): entry is {
      layout: (typeof MIR4_WOC_CHAPTER_LAYOUTS)[number];
      district: Mir4EquipmentMiningDistrict;
    } => entry.layout.targetZoneId === node.zoneId && entry.district !== undefined,
  );
  candidates.sort(
    (left, right) => chapterDistance(node, left.layout) - chapterDistance(node, right.layout),
  );
  return candidates[0]?.district ?? null;
}

export function mir4MetalForNode(node: Pick<GatherNodeDef, 'id' | 'zoneId' | 'pos'>): Readonly<{
  mapId: string;
  material: Mir4EquipmentMetal;
  rarity: Mir4EquipmentRarity;
}> | null {
  const district = mir4MiningDistrictForNode(node);
  if (!district || district.metals.length === 0) return null;
  const material = district.metals[stableNodeOrdinal(node.id) % district.metals.length];
  return material ? { mapId: district.mapId, material, rarity: RARITY_BY_METAL[material] } : null;
}
