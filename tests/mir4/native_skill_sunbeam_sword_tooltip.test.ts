import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Sunbeam Sword tooltip', () => {
  it('shows the seven-contact physical row total without multiplying repeated timestamps', () => {
    expect(mir4ActionRawDamage(mir4ActionId(3101), 1, 1000, 0)).toBe(2000);
    expect(mir4ActionRawDamage(mir4ActionId(3101), 15, 1000, 0)).toBe(2560);
  });

  it('describes the exact footprint, Quell, Bash and rank milestones', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_3101).toEqual({
      name: 'Sunbeam Sword',
      description:
        'Deals {damage} total Physical damage over 7 hits to up to 8 enemies in a frontal 8-by-5-yard area. The first and third attack sequences push enemies forward. The first hit applies Quell for 5 sec, plus 1 sec per skill rank after the first, reducing Spell ATK by 25%; later hits Bash Quelled targets for 50%/65%/80%/100% bonus damage at ranks 1/5/8/10. At ranks 5/8/10, MP potion recovery rises by 5%/10%/15%, and a Bash against a player has 50%/100%/100% chance to reduce Knockdown RES by 10% for 15 sec. At rank 8, a target with both Damaged Weapon and Damaged Armor has a 65% chance to suffer Broken Armor, reducing PHYS and Spell DEF by 50% for 300 sec; rank 10 guarantees it and raises the reduction to 80%.',
    });
  });
});
