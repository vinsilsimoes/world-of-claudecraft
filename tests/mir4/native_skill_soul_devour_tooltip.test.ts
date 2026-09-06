import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Soul Devour tooltip', () => {
  it('states the live target anchor, five-hit geometry and caps plainly', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2502).toEqual({
      name: 'Soul Devour',
      description:
        "Launches darkness at the selected enemy and fixes its area at that position. Deals {damage} total Spell damage over 5 hits: one 4.5-yard target-centred hit and four expanding pulses with 3.5, 4.5, 6, and 7-yard radii. Each hit can strike up to 6 enemies.",
    });
  });
});
