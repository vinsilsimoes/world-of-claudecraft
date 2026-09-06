import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeMultiImpactPolicy } from '../../src/sim/mir4/native_skill_multi_impact';

describe('MIR4 native multi-impact damage allocation', () => {
  it('admits Gale Slash as five row totals distributed across nine contacts', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(1501)).toEqual({
      skillId: 1501,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 380,
      summaryLevelUpCoefficient: 8,
      rowCoefficientScale: 100,
      rows: [
        { attackId: 150101, coefficient: 9_000, levelUpCoefficient: 180, impactCount: 3 },
        { attackId: 150102, coefficient: 8_000, levelUpCoefficient: 160, impactCount: 2 },
        { attackId: 150103, coefficient: 8_000, levelUpCoefficient: 160, impactCount: 2 },
        { attackId: 150104, coefficient: 6_000, levelUpCoefficient: 150, impactCount: 1 },
        { attackId: 150105, coefficient: 7_000, levelUpCoefficient: 150, impactCount: 1 },
      ],
      totalImpactCount: 9,
    });
  });

  it('admits Flame Strike as two magic row totals distributed across three contacts', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(2201)).toEqual({
      skillId: 2201,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 230,
      summaryLevelUpCoefficient: 5,
      rowCoefficientScale: 100,
      rows: [
        { attackId: 220102, coefficient: 8_000, levelUpCoefficient: 180, impactCount: 1 },
        { attackId: 220103, coefficient: 15_000, levelUpCoefficient: 320, impactCount: 2 },
      ],
      totalImpactCount: 3,
    });
  });

  it('admits Immolate as five magic row totals distributed across ten contacts', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(2103)).toEqual({
      skillId: 2103,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 400,
      summaryLevelUpCoefficient: 8,
      rowCoefficientScale: 100,
      rows: [
        { attackId: 210301, coefficient: 7_000, levelUpCoefficient: 140, impactCount: 2 },
        { attackId: 210302, coefficient: 7_000, levelUpCoefficient: 140, impactCount: 2 },
        { attackId: 210303, coefficient: 8_000, levelUpCoefficient: 160, impactCount: 2 },
        { attackId: 210304, coefficient: 8_000, levelUpCoefficient: 160, impactCount: 2 },
        { attackId: 210305, coefficient: 10_000, levelUpCoefficient: 200, impactCount: 2 },
      ],
      totalImpactCount: 10,
    });
  });

  it('admits Chain Lightning as seven diminishing per-target contacts', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(2303)).toEqual({
      skillId: 2303,
      allocationMode: 'per-impact',
      summaryCoefficient: 352,
      summaryLevelUpCoefficient: 6,
      rowCoefficientScale: 50,
      contactCoefficientScaleBasisPoints: [20_000, 18_750, 17_500, 16_250, 15_000, 13_750, 12_500],
      rows: [{ attackId: 230301, coefficient: 17_600, levelUpCoefficient: 300, impactCount: 7 }],
      totalImpactCount: 7,
    });
  });

  it('admits Sunbeam Sword as four physical row totals distributed across seven contacts', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(3101)).toEqual({
      skillId: 3101,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 200,
      summaryLevelUpCoefficient: 4,
      rowCoefficientScale: 100,
      rows: [
        { attackId: 310101, coefficient: 5_000, levelUpCoefficient: 100, impactCount: 1 },
        { attackId: 310102, coefficient: 5_000, levelUpCoefficient: 100, impactCount: 2 },
        { attackId: 310103, coefficient: 5_000, levelUpCoefficient: 100, impactCount: 2 },
        { attackId: 310104, coefficient: 5_000, levelUpCoefficient: 100, impactCount: 2 },
      ],
      totalImpactCount: 7,
    });
  });

  it('admits Piercing Blades as two physical row totals distributed across five contacts', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(3103)).toEqual({
      skillId: 3103,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 200,
      summaryLevelUpCoefficient: 4,
      rowCoefficientScale: 100,
      rows: [
        { attackId: 310302, coefficient: 10_000, levelUpCoefficient: 200, impactCount: 3 },
        { attackId: 310303, coefficient: 10_000, levelUpCoefficient: 200, impactCount: 2 },
      ],
      totalImpactCount: 5,
    });
  });

  it('keeps unproved multi-impact skills closed', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(1102)).toBeNull();
    expect(mir4NativeRuntimeMultiImpactPolicy(2101)).toBeNull();
  });
});
