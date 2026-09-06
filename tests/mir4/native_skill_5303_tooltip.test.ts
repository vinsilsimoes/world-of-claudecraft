import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5303 Crushing Blow tooltip fidelity', () => {
  it('uses the same four-contact Physical allocation as live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5303), 1, 1_000, 1_000)).toBe(2_400);
    expect(mir4ActionRawDamage(mir4ActionId(5303), 10, 1_000, 1_000)).toBe(2_850);
  });

  it('describes movement, footprint, target cap, reactions and every rank branch', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5303).toEqual({
      name: 'Crushing Blow',
      description:
        'Rushes through the selected target to 3 yards beyond it, then crosses back through it to 1 yard beyond the other side. Strikes up to 8 enemies in two 5-yard-radius areas over 4 impacts, dealing {damage} total Physical damage. Grants Invincible for 1 sec after casting. The first impact Knocks Back enemies by 0.9 yards; the final impact Knocks Down monsters at 100% chance and players at 10%/30%/60%/100% chance at ranks 1/5/8/10, moving them 3 yards and lifting them 1.5 yards. At ranks 5/8/10, failed Knockdown reduces Knockdown Resistance by 10%/15%/20% for 10/15/20 sec, Boss Skill damage increases by 25%/50%/100%, Skill damage increases by 10%/20%/30% for 15 sec, and Skill Cooldown Reduction increases by 20% for 15 sec or 30%/50% for 20 sec.',
    });
  });
});
