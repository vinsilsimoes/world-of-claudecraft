import { describe, expect, it } from 'vitest';
import { mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Obliterate Shell tooltip', () => {
  it.each([1_000, 2_000])('shows the same two-hit total as combat at %i Attack Power', (power) => {
    expect(mir4ActionRawDamage('mir4_skill_4109', 1, power, 0)).toBe(power * 2.2);
  });

  it('describes the native line, Focus, Bash, Knockdown and rank packages', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4109.description).toBe(
      'Fires an annihilating shell in a 20-yard-long, 4-yard-wide frontal line, dealing {damage} total Physical damage over 2 hits to up to 8 enemies and granting 1 Focus. Against Marked enemies, Bash increases both hits by 50%/65%/80%/100% at ranks 1/5/8/10. The first hit Knocks Down monsters for 2.1 sec and has a 10%/30%/60%/100% base chance to Knock Down players at ranks 1/5/8/10. At ranks 5/8/10, both hits deal 30%/60%/90% more damage to bosses and 40%/80%/120% more damage to Stunned enemies.',
    );
  });
});
