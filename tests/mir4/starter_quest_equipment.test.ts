import { describe, expect, it } from 'vitest';
import {
  MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS,
  mir4M01QuestEquipmentRewards,
} from '../../src/sim/content/mir4/starter_quest_equipment';

describe('MIR4 initial quest equipment rewards', () => {
  it('spreads one complete rank-one loadout across the first six main quests', () => {
    for (const classId of [1, 2, 3, 4, 5] as const) {
      const rewards = MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS.flatMap((questId) =>
        mir4M01QuestEquipmentRewards(questId, classId),
      );

      expect(
        rewards.map((item) => item.equipSlot),
        `class ${classId}`,
      ).toEqual([8, 5, 1, 4, 6, 7, 2, 3]);
      expect(new Set(rewards.map((item) => item.itemId)).size, `class ${classId}`).toBe(8);
      expect(rewards.every((item) => item.classId === classId && item.catalogRank === 1)).toBe(
        true,
      );
    }
  });

  it('does not award initial equipment outside the M01 main sequence', () => {
    expect(mir4M01QuestEquipmentRewards('M02-Q01', 1)).toEqual([]);
  });
});
