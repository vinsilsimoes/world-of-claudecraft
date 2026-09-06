import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Moonlight Wave tooltip', () => {
  it('shows the direct strike plus four field contacts as one exact total', () => {
    expect(mir4ActionRawDamage(mir4ActionId(3506), 1, 0, 1000)).toBe(2600);
    expect(mir4ActionRawDamage(mir4ActionId(3506), 15, 0, 1000)).toBe(3300);
  });

  it('describes the fixed field, five impacts, target cap, and reaction without a fake slow', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_3506).toEqual({
      name: 'Moonlight Wave',
      description:
        "Creates a lunar field at the selected enemy's location. It deals {damage} total Spell damage over 5 rapid impacts to up to 8 enemies within 6 yards. Each impact briefly interrupts enemies it hits.",
    });
  });
});
