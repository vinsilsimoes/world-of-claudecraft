import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5401 Sweeping Storm tooltip fidelity', () => {
  it('uses the same six-contact hybrid allocation as live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5401), 1, 1_000, 1_000)).toBe(2_900);
    expect(mir4ActionRawDamage(mir4ActionId(5401), 10, 1_000, 1_000)).toBe(3_440);
  });

  it('describes footprint, reactions, control immunity, Darkness and every rank branch', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5401).toEqual({
      name: 'Sweeping Storm',
      description:
        "Spins the spear around you, striking up to 8 enemies over 6 contacts for {damage} total Physical and Spell damage. The second, fourth, and sixth contacts Knock Back enemies by 0.8 yards. You are immune to control effects for 1.5 sec while casting. The second contact applies 1 Darkness stack for 5/8/10/10 sec at ranks 1/5/8/10, up to 3 stacks; each stack reduces Silence Resistance by 2.5%. At ranks 8/10, it has independent 40%/70% and 20%/35% chances to apply 1 additional Darkness stack. It reduces monsters' Physical and Spell Attack by 100/150/200/300 for 5/10/15/20 sec at ranks 1/5/8/10. At ranks 5/8/10, it reduces players' Physical and Spell Attack by 100/150/200 for 10/15/20 sec. With 1, 2, or 3 Darkness stacks, it reduces Skill Cooldown Reduction by 30%/35%/40% for 10 sec at rank 5, 50%/55%/60% for 15 sec at rank 8, or 80%/90%/100% for 20 sec at rank 10.",
    });
  });
});
