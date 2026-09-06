import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5101 Crescent Blade tooltip fidelity', () => {
  it('uses the same two-contact physical allocation as live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5101), 1, 1_000, 1_000)).toBe(1_900);
    expect(mir4ActionRawDamage(mir4ActionId(5101), 15, 1_000, 1_000)).toBe(2_460);
  });

  it('describes movement, sector, target cap, rank effects and exact control duration', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5101).toEqual({
      name: 'Crescent Blade',
      description:
        'Advances 2.5 yards, then crosses through the selected target to 1.8 yards beyond it. Strikes up to 8 enemies in a 160-degree frontal sector over 2 impacts, dealing {damage} total Physical damage. The second impact Knocks Down monsters for 3 sec. Its chance to Knock Down players is 10%/30%/60%/100% at ranks 1/5/8/10. If Knockdown fails at ranks 5/8/10, reduces the target\'s Knockdown Resistance by 10%/15%/20% for 10/15/20 sec. At ranks 8/10, deals 50%/100% more Skill damage to monsters; against targets with 2 or 3 Chill stacks, it deals 35%/40% or 60%/70% more damage. Learning ranks 8/10 also increases Bash damage by 15%/20%.',
    });
  });
});
