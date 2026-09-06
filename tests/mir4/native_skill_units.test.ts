import { describe, expect, it } from 'vitest';
import {
  MIR4_NATIVE_UNITS_PER_YARD,
  mir4NativeDistanceToYards,
} from '../../src/sim/mir4/native_skill_units';

describe('MIR4 native skill spatial homologation policy', () => {
  it('uses the explicit 100-native-units-per-yard policy', () => {
    expect(MIR4_NATIVE_UNITS_PER_YARD).toBe(100);
    expect(
      [0, 50, 80, 250, 400, 500, 700].map((value) => mir4NativeDistanceToYards(value)),
    ).toEqual([0, 0.5, 0.8, 2.5, 4, 5, 7]);
  });

  it('preserves authored signs instead of normalizing movement ranges', () => {
    expect(mir4NativeDistanceToYards(-150)).toBe(-1.5);
    expect(mir4NativeDistanceToYards(0)).toBe(0);
  });
});
