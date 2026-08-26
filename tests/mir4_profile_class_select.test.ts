import { describe, expect, it } from 'vitest';
import { MIR4_CLASSES } from '../src/sim/content/mir4/classes';
import { mir4ClassDetailsView } from '../src/ui/profile_class_select';

describe('MIR4 class-select progression copy', () => {
  it('advertises the one active skill the character actually starts with', () => {
    for (const classDef of MIR4_CLASSES) {
      expect(mir4ClassDetailsView(classDef.key).startingSkills).toBe(1);
    }
  });
});
