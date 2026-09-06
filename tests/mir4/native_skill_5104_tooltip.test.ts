import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5104 Nirvana Kick tooltip fidelity', () => {
  it('uses the exact one-contact physical coefficient in live damage', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5104), 1, 1_000, 1_000)).toBe(1_600);
    expect(mir4ActionRawDamage(mir4ActionId(5104), 10, 1_000, 1_000)).toBe(1_870);
  });

  it('describes movement, footprint, target cap, control and every rank branch', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5104).toEqual({
      name: 'Nirvana Kick',
      description:
        "Charges through the selected target to 1 yard beyond it in 0.35 sec, then turns back and strikes up to 8 enemies in a 4.5-yard-long, 5-yard-wide frontal path, dealing {damage} Physical damage. Knocks Down monsters for 3 sec; the chance against players is 10%/30%/60%/100% at ranks 1/5/8/10. If Knockdown fails at ranks 5/8/10, reduces the target's Knockdown Resistance by 10%/15%/20% for 10/15/20 sec. A target Knocked Down at those ranks Bleeds for 30%/50%/80% Physical ATK for 2 sec. Learning ranks 8/10 increases damage to monsters by 8%/12% and to bosses by 10%/15%.",
    });
  });
});
