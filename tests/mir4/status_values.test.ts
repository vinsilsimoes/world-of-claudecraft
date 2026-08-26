import { describe, expect, it } from 'vitest';
import { MIR4_STATUS_REGISTRY, mir4StatusDefinition } from '../../src/sim/content/mir4/statuses';
import {
  Mir4StatusAccumulator,
  mir4ApplyRate,
  mir4StatusValue,
} from '../../src/sim/mir4/status_values';

describe('the canonical MIR4 status registry', () => {
  it('contains every extracted status exactly once in stable numeric order', () => {
    expect(MIR4_STATUS_REGISTRY).toHaveLength(164);
    expect(MIR4_STATUS_REGISTRY.map((status) => status.id)).toEqual(
      Array.from({ length: 164 }, (_, index) => index + 1),
    );
    expect(new Set(MIR4_STATUS_REGISTRY.map((status) => status.key)).size).toBe(164);
  });

  it('pins the currently important combat, economy and control identifiers', () => {
    expect(mir4StatusDefinition(38)?.name).toBe('PvP ATK DMG Boost');
    expect(mir4StatusDefinition(42)?.name).toBe('Monster DMG Reduction');
    expect(mir4StatusDefinition(48)?.name).toBe('Stun Success Boost');
    expect(mir4StatusDefinition(94)?.name).toBe('Recovery Potion Boost');
    expect(mir4StatusDefinition(161)?.name).toBe('Hunting EXP Boost');
    expect(mir4StatusDefinition(165)).toBeNull();
  });
});

describe('the single MIR4 status accumulator', () => {
  it('adds every source once and returns immutable snapshots', () => {
    const accumulator = new Mir4StatusAccumulator();
    accumulator.add(42, 10);
    accumulator.addAll([
      [42, 15],
      [38, 200],
      [0, 999],
      [165, 999],
      [42, Number.NaN],
    ]);
    const first = accumulator.snapshot();
    accumulator.add(42, 5);

    expect(mir4StatusValue(first, 42)).toBe(25);
    expect(mir4StatusValue(first, 38)).toBe(200);
    expect(mir4StatusValue(first, 0)).toBe(0);
    expect(accumulator.value(42)).toBe(30);
  });

  it('applies additive rates with deterministic integer flooring', () => {
    expect(mir4ApplyRate(1_000, 2_500)).toBe(1_250);
    expect(mir4ApplyRate(5, -10_000)).toBe(0);
    expect(mir4ApplyRate(1, -10_000, 1)).toBe(1);
  });
});
