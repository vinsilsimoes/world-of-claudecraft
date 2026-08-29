import { describe, expect, it } from 'vitest';
import {
  MIR4_SKILL_MAX_LEVEL,
  MIR4_ULTIMATE_UNLOCK_LEVEL,
  mir4KnowledgeTomeForUpgrade,
  mir4SkillUnlockLevel,
} from '../../src/sim/mir4/skill_progression';

describe('MIR4 authored skill progression', () => {
  it('starts with one skill and unlocks the remaining class kit every ten levels', () => {
    expect(Array.from({ length: 12 }, (_, index) => mir4SkillUnlockLevel(index + 1))).toEqual([
      1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110,
    ]);
    expect(MIR4_ULTIMATE_UNLOCK_LEVEL).toBe(50);
  });

  it('caps every regular skill at level 15 and removes the ambiguous level-10 overlap', () => {
    expect(MIR4_SKILL_MAX_LEVEL).toBe(15);
    expect(mir4KnowledgeTomeForUpgrade(1)?.key).toBe('knowledgeTomeCommon');
    expect(mir4KnowledgeTomeForUpgrade(3)?.key).toBe('knowledgeTomeCommon');
    expect(mir4KnowledgeTomeForUpgrade(4)?.key).toBe('knowledgeTomeRare');
    expect(mir4KnowledgeTomeForUpgrade(6)?.key).toBe('knowledgeTomeRare');
    expect(mir4KnowledgeTomeForUpgrade(7)?.key).toBe('knowledgeTomeEpic');
    expect(mir4KnowledgeTomeForUpgrade(9)?.key).toBe('knowledgeTomeEpic');
    expect(mir4KnowledgeTomeForUpgrade(10)?.key).toBe('knowledgeTomeLegendary');
    expect(mir4KnowledgeTomeForUpgrade(14)?.key).toBe('knowledgeTomeLegendary');
    expect(mir4KnowledgeTomeForUpgrade(15)).toBeNull();
  });
});
