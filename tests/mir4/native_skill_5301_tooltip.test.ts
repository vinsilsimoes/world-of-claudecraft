import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5301 Double Strike tooltip fidelity', () => {
  it('uses the same three-contact Physical allocation as live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5301), 1, 1_000, 1_000)).toBe(2_500);
    expect(mir4ActionRawDamage(mir4ActionId(5301), 10, 1_000, 1_000)).toBe(2_950);
  });

  it('describes movement, footprint, target cap, reactions and every rank branch', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5301).toEqual({
      name: 'Double Strike',
      description:
        'Advances 3.5 yards, then crosses through the selected target to 1.2 yards beyond it. Strikes up to 8 enemies in a 7-yard-long, 5-yard-wide frontal path over 3 impacts, dealing {damage} total Physical damage. The first and third impacts Knock Back enemies by 2.5 and 2 yards; the third also lifts them 0.5 yards. Against Chilled targets, Bash increases damage by 50%/65%/80%/100% at ranks 1/5/8/10. At ranks 5/8/10, 1, 2 or 3 Chill stacks increase Skill damage by 20%/25%/30%, 50%/60%/70% or 90%/100%/110%. Learning ranks 8/10 also increases Bash damage by 10%/15%.',
    });
  });
});
