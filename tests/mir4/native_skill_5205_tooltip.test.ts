import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5205 Piercing Spear tooltip fidelity', () => {
  it('uses the maximum two-hit hybrid total from live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5205), 1, 1_000, 1_000)).toBe(4_200);
    expect(mir4ActionRawDamage(mir4ActionId(5205), 10, 1_000, 1_000)).toBe(4_920);
  });

  it('describes the conditional far hit, approach, geometry and rank branches', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5205).toEqual({
      name: 'Piercing Spear',
      description:
        'Approaches the selected target, then hurls spear energy through up to 8 enemies in a 20-by-4-yard line for up to {damage} total Physical and Spell damage. Enemies near the far end receive the second hit; all others receive one hit. Each hit Knocks Down monsters at 100% chance and players at 10%/30%/60%/100% chance at ranks 1/5/8/10 for 3 sec, moving them 2.5 yards. At ranks 5/8/10, a failed Knockdown on the first hit reduces Knockdown Resistance by 10%/15%/20% for 10/15/20 sec. If the enemy has 1, 2, or 3 Darkness stacks, the first hit also has a 40%/45%/50%, 60%/65%/70%, or 80%/90%/100% chance to Blind for 2/4/5 sec at ranks 5/8/10.',
    });
  });
});
