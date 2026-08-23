import { describe, expect, it } from 'vitest';

import { mir4ArcTargetSlug } from '../../src/sim/mir4/arc_target_identity';

describe('MIR4 campaign target identity', () => {
  it.each([
    ['Acólito Carmesim', 'acolito_carmesim'],
    ['Campeão Ósseo', 'campeao_osseo'],
    ['Guardião da Ponte', 'guardiao_da_ponte'],
    ['  Coração---Fúngico  ', 'coracao_fungico'],
  ])('normalizes %s to %s', (source, expected) => {
    expect(mir4ArcTargetSlug(source)).toBe(expected);
    expect(mir4ArcTargetSlug(mir4ArcTargetSlug(source))).toBe(expected);
  });
});
