import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5202 Blitz Strike tooltip fidelity', () => {
  it('uses the exact one-contact Physical coefficient in live damage', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5202), 1, 1_000, 1_000)).toBe(2_800);
    expect(mir4ActionRawDamage(mir4ActionId(5202), 10, 1_000, 1_000)).toBe(3_340);
  });

  it('describes the rush, hurl, control branches and permanent milestone', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5202).toEqual({
      name: 'Blitz Strike',
      description:
        "Rushes through the selected target in 0.5 sec, then pierces up to 8 enemies in a 6.5-yard-long, 4-yard-wide frontal path, dealing {damage} Physical damage. Knocks Down monsters for 3 sec; the chance against players is 10%/30%/60%/100% at ranks 1/5/8/10. A successful Knockdown hurls the affected enemy 11 yards behind you. If Knockdown fails at ranks 5/8/10, reduces the target's Knockdown Resistance by 10%/15%/20% for 10/15/20 sec. A successful Knockdown at those ranks Bleeds for 20%/35%/50% Physical ATK for 2 sec and has a 20%/50%/70% chance plus Stun Success to Stun for an additional 2/3/4 sec. Learning ranks 5/8/10 increases Skill Damage Reduction by 3%/6%/10%.",
    });
  });
});
