import { describe, expect, it } from 'vitest';
import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import {
  MIR4_SKILL_MAX_LEVEL,
  MIR4_ULTIMATE_UNLOCK_LEVEL,
  mir4KnowledgeTomeForUpgrade,
  mir4SkillUnlockLevel,
} from '../../src/sim/mir4/skill_progression';

describe('MIR4 authored skill progression', () => {
  it.each([
    [1, [1102, 1104, 1304, 1401, 1501, 1302, 1301, 1201, 1601, 1101, 1103, 1502]],
    [2, [2101, 2111, 2501, 2301, 2503, 2203, 2303, 2201, 2502, 2103, 2204, 2202]],
    [3, [3506, 3101, 3301, 3104, 3503, 3103, 3501, 3201, 3505, 3203, 3404, 3504]],
    [4, [4101, 4106, 4102, 4103, 4107, 4108, 4111, 4105, 4109, 4104, 4110, 4112]],
    [5, [5201, 5101, 5104, 5301, 5401, 5102, 5103, 5303, 5403, 5205, 5304, 5202]],
  ] as const)('uses the official class-level requirements for class %i', (classId, skillIds) => {
    expect(
      mir4SkillsForClass(classId).map((skill) => [skill.skillId, mir4SkillUnlockLevel(skill)]),
    ).toEqual(
      skillIds.map((skillId, index) => [
        skillId,
        [1, 1, 1, 1, 5, 8, 16, 24, 32, 40, 48, 56][index],
      ]),
    );
    expect(MIR4_ULTIMATE_UNLOCK_LEVEL).toBe(1);
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
