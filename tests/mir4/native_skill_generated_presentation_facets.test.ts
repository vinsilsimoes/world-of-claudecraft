import { describe, expect, it } from 'vitest';
import { mir4NativeGeneratedPresentationFacets } from '../../src/sim/mir4/native_skill_generated_presentation_facets';

describe('MIR4 generated presentation-only skill facets', () => {
  it('preserves Sorcerer DarkChange and zero-type ability payloads without activating effects', () => {
    expect(mir4NativeGeneratedPresentationFacets(2101)).toEqual({
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
          time: 2,
          active: false,
          inactiveReason: 'zero-type',
        },
        ...[1, 2, 3].map((slotIndex) => ({
          slotIndex,
          type: 0,
          value: 0,
          levelUpValue: 0,
          time: 0,
          active: false,
          inactiveReason: 'zero-type',
        })),
      ],
    });
    expect(mir4NativeGeneratedPresentationFacets(2501)?.abilities[3]).toEqual({
      slotIndex: 3,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 20,
      active: false,
      inactiveReason: 'zero-type',
    });
  });

  it.each([2101, 2111, 2501, 2301, 2203, 2303, 2201, 2502, 2202])(
    'admits reviewed all-zero-type Sorcerer skill %i',
    (skillId) => {
      const facets = mir4NativeGeneratedPresentationFacets(skillId);
      expect(facets).not.toBeNull();
      expect(facets?.abilities.every((ability) => ability.active === false)).toBe(true);
    },
  );

  it.each([2103])(
    'keeps Sorcerer skill %i closed while a nonzero ability discriminator remains',
    (skillId) => {
      expect(mir4NativeGeneratedPresentationFacets(skillId)).toBeNull();
    },
  );

  it('admits Phoenix Embrace ability metadata after its exact row-buff policy is present', () => {
    expect(mir4NativeGeneratedPresentationFacets(2204)?.abilities[0]).toMatchObject({
      type: 22,
      value: 25,
      levelUpValue: 5,
      time: 60,
      active: false,
      inactiveReason: 'attack-row-buff-metadata',
      sourceAttackId: 220402,
      sourceBuffId: 22042,
    });
  });
});
