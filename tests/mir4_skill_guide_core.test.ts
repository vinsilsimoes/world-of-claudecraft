import { describe, expect, it } from 'vitest';
import { mir4SkillGuideFrame } from '../src/render/mir4_skill_guide_core';

describe('MIR4 skill-guide presentation core', () => {
  it.each([
    { elapsedMs: -1, visible: true, insideProgress: 0 },
    { elapsedMs: 0, visible: true, insideProgress: 0 },
    { elapsedMs: 125, visible: true, insideProgress: 0.5 },
    { elapsedMs: 250, visible: true, insideProgress: 1 },
    { elapsedMs: 449, visible: true, insideProgress: 1 },
    { elapsedMs: 450, visible: true, insideProgress: 1 },
    { elapsedMs: 451, visible: false, insideProgress: 1 },
  ])(
    'matches the native Inside material scalar at $elapsedMs ms',
    ({ elapsedMs, visible, insideProgress }) => {
      expect(mir4SkillGuideFrame(elapsedMs, 250, 450)).toEqual({
        visible,
        insideProgress,
      });
    },
  );

  it('fails closed for invalid native timing', () => {
    expect(mir4SkillGuideFrame(100, 0, 450)).toEqual({ visible: false, insideProgress: 0 });
    expect(mir4SkillGuideFrame(100, 250, 0)).toEqual({ visible: false, insideProgress: 0 });
    expect(mir4SkillGuideFrame(Number.NaN, 250, 450)).toEqual({
      visible: false,
      insideProgress: 0,
    });
  });
});
