import { describe, expect, it } from 'vitest';
import { mir4NativeUltimateReactionProbabilityBasisPoints } from '../../src/sim/mir4/native_ultimate_reactions';

describe('MIR4 native ultimate reactions', () => {
  it('admits only Dragon Flame reaction contacts at their exact native probability', () => {
    expect(mir4NativeUltimateReactionProbabilityBasisPoints(1403, 140301, 0)).toBeNull();
    expect(mir4NativeUltimateReactionProbabilityBasisPoints(1403, 140302, 0)).toBe(10_000);
    expect(mir4NativeUltimateReactionProbabilityBasisPoints(1403, 140303, 0)).toBe(10_000);
    expect(mir4NativeUltimateReactionProbabilityBasisPoints(1403, 140303, 1)).toBe(10_000);
    expect(mir4NativeUltimateReactionProbabilityBasisPoints(1403, 140304, 0)).toBe(10_000);
    expect(mir4NativeUltimateReactionProbabilityBasisPoints(1403, 140304, 1)).toBeNull();
    expect(mir4NativeUltimateReactionProbabilityBasisPoints(1103, 110106, 0)).toBeNull();
  });
});
