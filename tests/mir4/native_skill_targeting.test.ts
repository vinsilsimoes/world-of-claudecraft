import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTargetingMatches } from '../../src/sim/mir4/native_skill_targeting';

describe('MIR4 native targeting interpretation', () => {
  it('admits only the two reviewed Sorcerer actor-area overrides', () => {
    expect(mir4NativeRuntimeTargetingMatches(2201, true, false)).toBe(true);
    expect(mir4NativeRuntimeTargetingMatches(2202, true, false)).toBe(true);
    expect(mir4NativeRuntimeTargetingMatches(2101, true, false)).toBe(false);
    expect(mir4NativeRuntimeTargetingMatches(2201, false, true)).toBe(false);
    expect(mir4NativeRuntimeTargetingMatches(2101, true, true)).toBe(true);
  });
});
