import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';

describe('MIR4 native skill guide policy', () => {
  it('preserves the exact Air Slash setup guide and indicator contract', () => {
    expect(mir4NativeRuntimeGuidePolicy(1102, 110201)).toEqual({
      skillId: 1102,
      attackId: 110201,
      nativeApplyType: 0,
      applyTo: 'self',
      guideEffectId: 103,
      guideEffectType: 3,
      guideShape: 'direct',
      materialPathId: 100013,
      materialAssetPath: '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
      aliveMs: 450,
      scalingMs: 250,
      materialScalarCurve: 'inside-linear-grow-then-hold',
      indicatorIndex: 103,
      indicatorNativeLength: 850,
      indicatorNativeWidth: 500,
      colors: {
        primary: [0.091146, 0.217937, 0.729167],
        secondary: [0.358803, 0.40595, 0.828125],
        emissive: [0, 5.375199, 10],
      },
    });
  });

  it('preserves the exact Splitting Slash setup guide and indicator contract', () => {
    expect(mir4NativeRuntimeGuidePolicy(1104, 110401)).toEqual({
      skillId: 1104,
      attackId: 110401,
      nativeApplyType: 0,
      applyTo: 'self',
      guideEffectId: 103,
      guideEffectType: 3,
      guideShape: 'direct',
      materialPathId: 100013,
      materialAssetPath: '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
      aliveMs: 850,
      scalingMs: 650,
      materialScalarCurve: 'inside-linear-grow-then-hold',
      indicatorIndex: 103,
      indicatorNativeLength: 700,
      indicatorNativeWidth: 550,
      colors: {
        primary: [0.091146, 0.217937, 0.729167],
        secondary: [0.358803, 0.40595, 0.828125],
        emissive: [0, 5.375199, 10],
      },
    });
  });

  it('preserves the exact Body Check setup guide and indicator contract', () => {
    expect(mir4NativeRuntimeGuidePolicy(1304, 130401)).toEqual({
      skillId: 1304,
      attackId: 130401,
      nativeApplyType: 0,
      applyTo: 'self',
      guideEffectId: 103,
      guideEffectType: 3,
      guideShape: 'direct',
      materialPathId: 100013,
      materialAssetPath: '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
      aliveMs: 500,
      scalingMs: 300,
      materialScalarCurve: 'inside-linear-grow-then-hold',
      indicatorIndex: 103,
      indicatorNativeLength: 600,
      indicatorNativeWidth: 500,
      colors: {
        primary: [0.091146, 0.217937, 0.729167],
        secondary: [0.358803, 0.40595, 0.828125],
        emissive: [0, 5.375199, 10],
      },
    });
  });

  it('preserves the exact Sunbeam Sword setup guide and indicator contract', () => {
    expect(mir4NativeRuntimeGuidePolicy(3101, 310101)).toMatchObject({
      skillId: 3101,
      attackId: 310101,
      nativeApplyType: 0,
      applyTo: 'self',
      guideEffectId: 103,
      guideEffectType: 3,
      guideShape: 'direct',
      materialPathId: 100013,
      aliveMs: 580,
      scalingMs: 380,
      indicatorIndex: 103,
      indicatorNativeLength: 800,
      indicatorNativeWidth: 500,
    });
  });

  it('preserves the exact Piercing Blades setup guide and indicator contract', () => {
    expect(mir4NativeRuntimeGuidePolicy(3103, 310301)).toMatchObject({
      skillId: 3103,
      attackId: 310301,
      nativeApplyType: 0,
      applyTo: 'self',
      guideEffectId: 103,
      guideEffectType: 3,
      guideShape: 'direct',
      materialPathId: 100013,
      aliveMs: 1_380,
      scalingMs: 1_180,
      indicatorIndex: 103,
      indicatorNativeLength: 1_100,
      indicatorNativeWidth: 500,
    });
  });

  it('preserves all five Gale Slash circle guides and their independent lifetimes', () => {
    const expectedTimings = [
      [150101, 720, 150, 700],
      [150102, 420, 220, 700],
      [150103, 470, 270, 700],
      [150104, 400, 200, 700],
      [150105, 500, 300, 750],
    ] as const;

    for (const [attackId, aliveMs, scalingMs, indicatorNativeRadius] of expectedTimings) {
      expect(mir4NativeRuntimeGuidePolicy(1501, attackId)).toEqual({
        skillId: 1501,
        attackId,
        nativeApplyType: 0,
        applyTo: 'self',
        guideEffectId: 102,
        guideEffectType: 2,
        guideShape: 'circle',
        materialPathId: 100012,
        materialAssetPath: '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
        aliveMs,
        scalingMs,
        materialScalarCurve: 'inside-linear-grow-then-hold',
        indicatorIndex: 102,
        indicatorNativeRadius,
        colors: {
          primary: [0.091146, 0.217937, 0.729167],
          secondary: [0.358803, 0.40595, 0.828125],
          emissive: [0, 5.375199, 10],
        },
      });
    }
  });

  it('does not infer guide semantics for other rows or skills', () => {
    expect(mir4NativeRuntimeGuidePolicy(1102, 110202)).toBeNull();
    expect(mir4NativeRuntimeGuidePolicy(1304, 130402)).toBeNull();
    expect(mir4NativeRuntimeGuidePolicy(1101, 110101)).toBeNull();
  });
});
