import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeIndicator } from '../../src/sim/mir4/native_skill_indicator';

describe('MIR4 native skill indicator policy', () => {
  it('preserves the exact 1103 direct targeting footprint without inventing a timed guide', () => {
    expect(mir4NativeRuntimeIndicator(1103)).toEqual({
      skillId: 1103,
      shape: 'direct',
      index: 103,
      angleDegrees: 0,
      nativeMin: 0,
      nativeMax: 1_200,
      nativeWidth: 500,
      nativeHeight: 400,
      nativeOffset: 0,
      presentation: 'targeting-metadata',
    });
  });

  it('preserves the exact 1401 circle targeting footprint without inventing a timed guide', () => {
    expect(mir4NativeRuntimeIndicator(1401)).toEqual({
      skillId: 1401,
      shape: 'circle',
      index: 102,
      angleDegrees: 360,
      nativeMin: 0,
      nativeMax: 500,
      nativeWidth: 0,
      nativeHeight: 400,
      nativeOffset: 600,
      presentation: 'targeting-metadata',
    });
  });

  it('preserves the exact 1501 circle targeting footprint independently from its row guides', () => {
    expect(mir4NativeRuntimeIndicator(1501)).toEqual({
      skillId: 1501,
      shape: 'circle',
      index: 102,
      angleDegrees: 360,
      nativeMin: 0,
      nativeMax: 700,
      nativeWidth: 0,
      nativeHeight: 400,
      nativeOffset: 0,
      presentation: 'targeting-metadata',
    });
  });

  it('projects reviewed generated metadata while keeping unknown or drifted actions closed', () => {
    expect(mir4NativeRuntimeIndicator(2101)).toEqual({
      skillId: 2101,
      shape: 'none',
      index: 0,
      angleDegrees: 40,
      nativeMin: 0,
      nativeMax: 1_450,
      nativeWidth: 0,
      nativeHeight: 700,
      nativeOffset: 0,
      presentation: 'targeting-metadata',
    });
    expect(mir4NativeRuntimeIndicator(999_999)).toBeNull();
    const action = mir4NativeSkillActionById(1103);
    if (!action) throw new Error('Missing MIR4 skill 1103');
    expect(
      mir4NativeRuntimeIndicator(1103, {
        ...action,
        indicator: { ...action.indicator, nativeWidth: 501 },
      }),
    ).toBeNull();
  });
});
