import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Quick Shot tooltip', () => {
  it('uses the six authoritative row totals instead of multiplying the visual arrow pairs', () => {
    expect(mir4ActionRawDamage(mir4ActionId(4101), 1, 1000, 0)).toBe(2200);
    // The six row channels round independently in the live resolver.
    expect(mir4ActionRawDamage(mir4ActionId(4101), 15, 1000, 0)).toBe(2812);
  });

  it('describes the target circle, paired arrows, full multi-target damage and Focus', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4101).toEqual({
      name: 'Quick Shot',
      description:
        'Fires 12 arrows in 6 rapid pairs, dealing {damage} total Physical damage in 6 damage resolutions to up to 5 enemies within 4 yards of the selected target. Every enemy receives full damage. Quick Shot grants 1 Focus for 30 sec, up to 10 stacks; at 3/6/9 Focus, Weakness Analysis grants 50/100/150 CRIT. Focus is removed when combat ends or you are Knocked Down, Stunned, or Blinded.',
    });
  });
});
