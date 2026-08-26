import { describe, expect, it } from 'vitest';
import { MIR4_CLASS_IDS } from '../../src/sim/content/mir4/classes';
import { MIR4_ITEM_PROGRESSION_RANKS } from '../../src/sim/content/mir4/item_progression';

describe('MIR4 item progression', () => {
  it('authors all six equipment ranks with increasing level requirements', () => {
    expect(MIR4_ITEM_PROGRESSION_RANKS.map((rank) => rank.catalogRank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(MIR4_ITEM_PROGRESSION_RANKS.map((rank) => rank.requiredLevel)).toEqual([
      1, 10, 25, 40, 60, 80,
    ]);
  });

  it('gives every class exactly eight unique items at every rank', () => {
    const everyItemId: number[] = [];
    for (const rank of MIR4_ITEM_PROGRESSION_RANKS) {
      for (const classId of MIR4_CLASS_IDS) {
        const set = rank.itemsByClass[classId];
        everyItemId.push(...set.map((item) => item.itemId));
        expect(set).toHaveLength(8);
        expect(new Set(set.map((item) => item.itemId)).size).toBe(8);
        expect(set.map((item) => item.classId)).toEqual(Array(8).fill(classId));
        expect(set.map((item) => item.equipSlot).sort((a, b) => a - b)).toEqual([
          1, 2, 3, 4, 5, 6, 7, 8,
        ]);
        expect(set.every((item) => item.catalogRank === rank.catalogRank)).toBe(true);
      }
    }
    expect(everyItemId).toHaveLength(240);
    expect(new Set(everyItemId).size).toBe(240);
  });

  it('pins the imported class-specific rank-two identities', () => {
    const rankTwo = MIR4_ITEM_PROGRESSION_RANKS[1];
    expect(rankTwo?.itemsByClass[1].map((item) => item.itemId)).toEqual([
      991010102, 991020102, 991030102, 991040102, 991050102, 991060102, 991070102, 991080102,
    ]);
    expect(rankTwo?.itemsByClass[2].map((item) => item.itemId)).toEqual([
      991010202, 991020202, 991030202, 991040202, 991050202, 991060202, 991070202, 991080202,
    ]);
  });
});
