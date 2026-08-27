import { describe, expect, it } from 'vitest';
import { GATHER_NODES } from '../../src/sim/content/gather_nodes';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import {
  MIR4_EQUIPMENT_MINING_DISTRICTS,
  mir4MetalForNode,
  mir4MiningDistrictForNode,
} from '../../src/sim/mir4/equipment_mining';

describe('MIR4 equipment metal mining districts', () => {
  it('assigns every campaign map physical veins for every authored metal rarity', () => {
    expect(MIR4_EQUIPMENT_MINING_DISTRICTS).toHaveLength(20);
    expect(MIR4_EQUIPMENT_MINING_DISTRICTS.map((district) => district.mapId)).toEqual(
      MIR4_WORLD_ARC.map((map) => map.mapId),
    );
    const oreNodes = GATHER_NODES.filter((node) => node.type === 'ore');
    for (const district of MIR4_EQUIPMENT_MINING_DISTRICTS) {
      const nodes = oreNodes.filter(
        (node) => mir4MiningDistrictForNode(node)?.mapId === district.mapId,
      );
      expect(nodes.length, `${district.mapId} must contain physical ore veins`).toBeGreaterThan(0);
      const materials = new Set(nodes.map((node) => mir4MetalForNode(node)?.material));
      for (const metal of district.metals) {
        expect(materials, `${district.mapId} must expose ${metal}`).toContain(metal);
      }
      expect(
        [...materials].every((metal) => metal === undefined || district.metals.includes(metal)),
      ).toBe(true);
    }
  });

  it('keeps low maps on low metals and reserves Mythic for the final maps', () => {
    expect(MIR4_EQUIPMENT_MINING_DISTRICTS.map((district) => district.metals)).toEqual([
      ...Array.from({ length: 4 }, () => ['metalCommon', 'metalUncommon']),
      ...Array.from({ length: 4 }, () => ['metalUncommon', 'metalRare']),
      ...Array.from({ length: 4 }, () => ['metalRare', 'metalEpic']),
      ...Array.from({ length: 4 }, () => ['metalEpic', 'metalLegendary']),
      ...Array.from({ length: 4 }, () => ['metalEpic', 'metalLegendary', 'metalMythic']),
    ]);
  });
});
