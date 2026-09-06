import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5102 Dragon Tail tooltip fidelity', () => {
  it('uses the three native damage contacts', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5102), 1, 1_000, 1_000)).toBe(3_600);
    expect(mir4ActionRawDamage(mir4ActionId(5102), 10, 1_000, 1_000)).toBe(4_230);
  });

  it('describes movement, footprint, reactions and every rank branch', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5102).toEqual({
      name: 'Dragon Tail',
      description:
        "Advances 6 yards while sweeping the spear, striking up to 8 enemies in a 160-degree frontal sector over 3 impacts for {damage} total Physical damage. The first two impacts each have a 10% chance to Knock Back enemies by 0.5 and 1.5 yards; the final impact has a 10% chance to make enemies flinch. Deals 30%/50%/70%/100% more Skill damage to monsters at ranks 1/5/8/10. At ranks 5/8/10, reduces targets' Skill Recovery by 10%/20%/30% for 10/15/20 sec and permanently increases Boss Damage Reduction by 5%/10%/15%. At ranks 8/10, also applies 1 Darkness stack for 10 sec, up to 3 stacks, and reduces MP Potion Recovery by 30% for 15/30 sec.",
    });
  });
});
