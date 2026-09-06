import { describe, expect, it } from 'vitest';
import {
  mir4NativeRuntimeSkillPresentationFacets,
  mir4NativeRuntimeSkillSourceFacets,
} from '../../src/sim/mir4/native_skill_source_facets';

describe('MIR4 native skill source facets', () => {
  it.each([1102, 1103, 1304])(
    'classifies skill %i DarkChange as option-controlled presentation metadata',
    (skillId) => {
      expect(mir4NativeRuntimeSkillSourceFacets(skillId)?.darkChange).toEqual({
        nativeMode: 1,
        presentationOnly: true,
        clientOption: 'G_SkillDarkChange',
      });
    },
  );

  it('preserves the fourth zero-typed ability payload without activating an effect', () => {
    const policy = mir4NativeRuntimeSkillSourceFacets(1102);
    expect(policy?.abilities).toHaveLength(4);
    expect(policy?.abilities[3]).toEqual({
      slotIndex: 3,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 20,
      active: false,
      inactiveReason: 'zero-type',
    });
    expect(policy?.abilities.some((ability) => ability.active)).toBe(false);
  });

  it('keeps SKILL.Passive as eligibility metadata and grants none automatically', () => {
    const policy = mir4NativeRuntimeSkillSourceFacets(1102);
    expect(policy?.passiveEligibilityIds).toHaveLength(89);
    expect(policy?.passiveEligibilityIds.slice(0, 6)).toEqual([
      204001, 204002, 204003, 204004, 204005, 204006,
    ]);
    expect(policy?.smiteBuffIds).toEqual([]);
    expect(policy?.autoLearnPassiveIds).toEqual([]);
    expect(policy?.skillModPassiveIds).toEqual([]);
  });

  it('preserves the identical native source facets for Barbaric Charge without inventing effects', () => {
    const policy = mir4NativeRuntimeSkillSourceFacets(1103);
    expect(policy?.skillId).toBe(1103);
    expect(policy?.abilities).toEqual(mir4NativeRuntimeSkillSourceFacets(1102)?.abilities);
    expect(policy?.passiveEligibilityIds).toEqual(
      mir4NativeRuntimeSkillSourceFacets(1102)?.passiveEligibilityIds,
    );
    expect(policy?.smiteBuffIds).toEqual([]);
    expect(policy?.autoLearnPassiveIds).toEqual([]);
    expect(policy?.skillModPassiveIds).toEqual([]);
  });

  it('preserves the identical native source facets for Body Check without inventing effects', () => {
    const policy = mir4NativeRuntimeSkillSourceFacets(1304);
    expect(policy?.skillId).toBe(1304);
    expect(policy?.abilities).toEqual(mir4NativeRuntimeSkillSourceFacets(1102)?.abilities);
    expect(policy?.passiveEligibilityIds).toEqual(
      mir4NativeRuntimeSkillSourceFacets(1102)?.passiveEligibilityIds,
    );
    expect(policy?.smiteBuffIds).toEqual([]);
    expect(policy?.autoLearnPassiveIds).toEqual([]);
    expect(policy?.skillModPassiveIds).toEqual([]);
  });

  it('admits the exact 1104 Smite source chain without granting its external hook', () => {
    expect(mir4NativeRuntimeSkillPresentationFacets(1104)).toEqual({
      darkChange: {
        nativeMode: 1,
        presentationOnly: true,
        clientOption: 'G_SkillDarkChange',
      },
      abilities: [
        {
          slotIndex: 0,
          type: 0,
          value: 0,
          levelUpValue: 0,
          time: 0,
          active: false,
          inactiveReason: 'zero-type',
        },
        {
          slotIndex: 1,
          type: 0,
          value: 0,
          levelUpValue: 0,
          time: 0,
          active: false,
          inactiveReason: 'zero-type',
        },
        {
          slotIndex: 2,
          type: 0,
          value: 0,
          levelUpValue: 0,
          time: 0,
          active: false,
          inactiveReason: 'zero-type',
        },
        {
          slotIndex: 3,
          type: 0,
          value: 0,
          levelUpValue: 0,
          time: 20,
          active: false,
          inactiveReason: 'zero-type',
        },
      ],
    });
    const policy = mir4NativeRuntimeSkillSourceFacets(1104);
    expect(policy).not.toBeNull();
    expect(policy).toMatchObject({
      skillId: 1104,
      smiteBuffIds: [10010],
      autoLearnPassiveIds: [101001],
      skillModPassiveIds: [],
    });
    expect(policy?.passiveEligibilityIds).toHaveLength(91);
    expect(policy?.passiveEligibilityIds.slice(0, 4)).toEqual([101001, 204001, 204002, 204003]);
    expect(policy?.passiveEligibilityIds).toContain(706005);
    expect(policy?.autoLearnPassiveIds).not.toContain(706005);
  });

  it('admits Ground Smash dark mode 3 and its exact Smite source chain', () => {
    expect(mir4NativeRuntimeSkillPresentationFacets(1401)).toEqual({
      darkChange: {
        nativeMode: 3,
        presentationOnly: true,
        clientOption: 'G_SkillDarkChange',
      },
      abilities: [0, 1, 2, 3].map((slotIndex) => ({
        slotIndex,
        type: 0,
        value: 0,
        levelUpValue: 0,
        time: 0,
        active: false,
        inactiveReason: 'zero-type',
      })),
    });
    const policy = mir4NativeRuntimeSkillSourceFacets(1401);
    expect(policy).toMatchObject({
      skillId: 1401,
      smiteBuffIds: [10010],
      autoLearnPassiveIds: [101001],
      skillModPassiveIds: [],
    });
    expect(policy?.passiveEligibilityIds).toHaveLength(91);
    expect(policy?.passiveEligibilityIds).toContain(101001);
    expect(policy?.passiveEligibilityIds).toContain(706005);
  });

  it('admits Gale Slash dark mode 3 and the distinct 101002 -> 10020 chain', () => {
    expect(mir4NativeRuntimeSkillPresentationFacets(1501)).toEqual(
      mir4NativeRuntimeSkillPresentationFacets(1401),
    );
    const policy = mir4NativeRuntimeSkillSourceFacets(1501);
    expect(policy).toMatchObject({
      skillId: 1501,
      smiteBuffIds: [10020],
      autoLearnPassiveIds: [101002],
      skillModPassiveIds: [],
    });
    expect(policy?.passiveEligibilityIds).toHaveLength(91);
    expect(policy?.passiveEligibilityIds.slice(0, 4)).toEqual([101002, 204001, 204002, 204003]);
    expect(policy?.passiveEligibilityIds).toContain(706005);
    expect(policy?.autoLearnPassiveIds).not.toContain(706005);
  });

  it('admits Flame Orb source facets only after its exact Quell chain is reviewed', () => {
    expect(mir4NativeRuntimeSkillSourceFacets(2101)).toMatchObject({
      skillId: 2101,
      smiteBuffIds: [30010],
      autoLearnPassiveIds: [103001],
      skillModPassiveIds: [],
    });
    expect(mir4NativeRuntimeSkillPresentationFacets(2101)).toMatchObject({
      darkChange: {
        nativeMode: 1,
        presentationOnly: true,
        clientOption: 'G_SkillDarkChange',
      },
    });
    expect(mir4NativeRuntimeSkillSourceFacets(2501)).toBeNull();
  });
});
