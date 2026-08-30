import { describe, expect, it } from 'vitest';
import {
  mir4AnimationDurationForContactsMs,
  mir4ContactOffsetsMs,
  mir4ValidatedSkillContactOffsetsMs,
} from '../../src/sim/mir4/attack_timeline';

describe('MIR4 authoritative attack timeline', () => {
  it('places a single impact after the visible windup', () => {
    expect(mir4ContactOffsetsMs(1_200, 1)).toEqual([750]);
  });

  it('spreads a multi-contact basic or ultimate across the authored animation', () => {
    expect(mir4ContactOffsetsMs(1_500, 3)).toEqual([450, 825, 1_200]);
  });

  it('derives a renderer window whose contact fractions match authored offsets', () => {
    expect(mir4AnimationDurationForContactsMs([280])).toBe(448);
    expect(mir4AnimationDurationForContactsMs([520, 760, 1_020])).toBe(1_275);
  });

  it('admits only complete ordered skill timelines inside the authored animation', () => {
    expect(mir4ValidatedSkillContactOffsetsMs([520, 699, 900], 1500, 3)).toEqual([520, 699, 900]);
    expect(mir4ValidatedSkillContactOffsetsMs([520, 900], 1500, 3)).toBeNull();
    expect(mir4ValidatedSkillContactOffsetsMs([520, 499, 900], 1500, 3)).toBeNull();
    expect(mir4ValidatedSkillContactOffsetsMs([520, 1600, 900], 1500, 3)).toBeNull();
  });
});
