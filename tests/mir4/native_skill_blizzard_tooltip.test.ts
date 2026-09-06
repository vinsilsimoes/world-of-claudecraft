import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Blizzard tooltip', () => {
  it('shows the direct plus six-field-contact damage total from the approved runtime plan', () => {
    expect(mir4ActionRawDamage(mir4ActionId(2203), 1, 0, 1_000)).toBe(2_550);
    expect(mir4ActionRawDamage(mir4ActionId(2203), 15, 0, 1_000)).toBe(3_250);
  });

  it('describes only the fixed field, contact count, target cap, and selected-target strike', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2203).toEqual({
      name: 'Blizzard',
      description:
        "Creates a blizzard at the selected enemy's location for 6 sec. It deals {damage} total Spell damage over 7 impacts. Six field impacts can each strike up to 10 enemies within 7 yards; one direct impact strikes the selected enemy near the end of the cast.",
    });
  });
});
