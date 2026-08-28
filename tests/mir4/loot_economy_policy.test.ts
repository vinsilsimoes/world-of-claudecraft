import { describe, expect, it } from 'vitest';
import {
  MIR4_EPIC_EQUIPMENT_DROP_CHANCE,
  MIR4_EQUIPMENT_DROP_RULES,
  mir4EquipmentDropRank,
} from '../../src/sim/mir4/equipment_loot';
import { mir4AeldruneLootEntries } from '../../src/sim/mir4/loot_policy';
import type { LootEntry } from '../../src/sim/types';

describe('Aeldrune loot isolation', () => {
  it('keeps currency but removes every WoC item and quest drop from a reused mob template', () => {
    const classicLoot: LootEntry[] = [
      { copper: 80, chance: 1 },
      { itemId: 'woc_profession_reagent', chance: 1 },
      { itemId: 'woc_equipment', chance: 1, rollGroup: 'classic-gear' },
      { itemId: 'woc_quest_item', chance: 1, questId: 'woc-quest' },
    ];

    expect(mir4AeldruneLootEntries(classicLoot)).toEqual([{ copper: 80, chance: 1 }]);
  });

  it('strips an item id from a mixed currency row instead of leaking it into Aeldrune', () => {
    expect(mir4AeldruneLootEntries([{ copper: 40, itemId: 'woc_item', chance: 0.5 }])).toEqual([
      { copper: 40, chance: 0.5 },
    ]);
  });
});

describe('ready-made Aeldrune equipment drops', () => {
  it('allows only common through epic and reserves epic for final-map bosses', () => {
    expect(MIR4_EQUIPMENT_DROP_RULES.map((rule) => rule.catalogRank)).toEqual([4, 3, 2, 1]);
    expect(MIR4_EPIC_EQUIPMENT_DROP_CHANCE).toBe(0.0000001);

    expect(
      mir4EquipmentDropRank(
        {
          level: 190,
          elite: false,
          boss: true,
          templateId: 'mir4_quest_m19-q06_4_0_regente-velado',
        },
        0.00000005,
      ),
    ).toBe(4);
    expect(
      mir4EquipmentDropRank(
        {
          level: 200,
          elite: false,
          boss: true,
          templateId: 'mir4_quest_m20-q06_4_0_frost-jarl-hrim',
        },
        0.00000005,
      ),
    ).toBe(4);
    expect(
      mir4EquipmentDropRank(
        {
          level: 190,
          elite: false,
          boss: true,
          templateId: 'mir4_quest_m19-q02_2_0_incidental-guardian',
        },
        0.00000005,
      ),
    ).not.toBe(4);
    expect(mir4EquipmentDropRank({ level: 180, elite: false, boss: true }, 0.00000005)).not.toBe(4);
    expect(mir4EquipmentDropRank({ level: 200, elite: true, boss: false }, 0.00000005)).not.toBe(4);
  });

  it('unlocks lower ready-made ranks gradually and awards at most one rank per kill', () => {
    expect(mir4EquipmentDropRank({ level: 1, elite: false, boss: false }, 0.005)).toBe(1);
    expect(mir4EquipmentDropRank({ level: 1, elite: false, boss: false }, 0.02)).toBeNull();
    expect(mir4EquipmentDropRank({ level: 29, elite: false, boss: false }, 0.0005)).toBe(1);
    expect(mir4EquipmentDropRank({ level: 30, elite: false, boss: false }, 0.0005)).toBe(2);
    expect(mir4EquipmentDropRank({ level: 70, elite: false, boss: false }, 0.00001)).toBe(3);
  });
});
