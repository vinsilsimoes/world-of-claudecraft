import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5304 Absorption tooltip fidelity', () => {
  it('uses the same single-contact Physical damage as live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5304), 1, 1_000, 1_000)).toBe(1_100);
    expect(mir4ActionRawDamage(mir4ActionId(5304), 10, 1_000, 1_000)).toBe(1_280);
  });

  it('describes targeting, footprint, healing, conditional penalties and every rank branch', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5304).toEqual({
      name: 'Absorption',
      description:
        "Approaches the selected target, then drains up to 8 enemies in an 8-yard-radius area around it, dealing {damage} Physical damage and restoring 100%/250%/500%/800% of damage dealt as HP at ranks 1/5/8/10. If an enemy hit is Chilled, you become Chilled for 5/10/15/30 sec. At ranks 5/8/10, enemies hit take 25%/50%/75% more damage for 5 sec. At ranks 8/10, removes Shield and prevents receiving Shield for 30 sec, with a 70%/100% chance each to remove Magic Shield and Cloaking. At rank 10, hitting an enemy with 1, 2, or 3 Darkness stacks has a 70%/85%/100% chance to deal 20% Spell Attack per sec for 5 sec. Learning ranks 8/10 restores 10%/30% HP when you defeat a character, once every 30 sec.",
    });
  });
});
