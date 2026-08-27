import { describe, expect, it } from 'vitest';
import { MIR4_QUESTS_ARC } from '../../src/sim/content/mir4/arc_campaign';
import { MIR4_EQUIPMENT_CATALOG } from '../../src/sim/content/mir4/equipment_catalog';
import {
  MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS,
  mir4M01QuestEquipmentRewards,
} from '../../src/sim/content/mir4/starter_quest_equipment';

describe('MIR4 initial quest equipment rewards', () => {
  it('never awards crafted Common equipment from the first six main quests', () => {
    for (const classId of [1, 2, 3, 4, 5] as const) {
      const rewards = MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS.flatMap((questId) =>
        mir4M01QuestEquipmentRewards(questId, classId),
      );

      expect(rewards, `class ${classId}`).toEqual([]);
    }
  });

  it('does not award initial equipment outside the M01 main sequence', () => {
    expect(mir4M01QuestEquipmentRewards('M02-Q01', 1)).toEqual([]);
  });

  it('contains no crafted-equipment item grant anywhere in the campaign catalog', () => {
    const craftedIds = new Set(MIR4_EQUIPMENT_CATALOG.map((item) => String(item.itemId)));
    for (const quest of MIR4_QUESTS_ARC) {
      const rows = [
        ...(Array.isArray(quest.rewards.items) ? quest.rewards.items : []),
        ...(Array.isArray(quest.rewards.materials) ? quest.rewards.materials : []),
        ...(Array.isArray(quest.onAcceptGrants.items) ? quest.onAcceptGrants.items : []),
      ];
      for (const row of rows) {
        if (!row || typeof row !== 'object' || !('itemId' in row)) continue;
        expect(craftedIds, `${quest.questId} grants crafted equipment`).not.toContain(
          String(row.itemId),
        );
      }
    }
  });
});
