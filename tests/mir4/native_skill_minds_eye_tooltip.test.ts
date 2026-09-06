import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe("MIR4 Mind's Eye tooltip", () => {
  it('describes the reviewed party buff, Focus, milestones and persistent bonuses', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4111.description).toBe(
      'Empowers you and up to 4 nearby party members within 15 yards, increasing Physical ATK by 10 at rank 1 plus 10 per additional skill rank for 30 sec, and grants 1 Focus. At rank 5, also grants 100 Accuracy and 50 CRIT for 10 sec. At rank 8, those bonuses become 160 Accuracy and 80 CRIT, dispels Blind, and increases MP Potion Efficiency by 20% for 10 sec; learning the rank also grants 10% Boss ATK DMG and 10% All DMG Reduction. At rank 10, the temporary bonuses become 240 Accuracy, 120 CRIT, and 30% MP Potion Efficiency for 15 sec; the persistent bonuses become 15% Boss ATK DMG and 20% All DMG Reduction.',
    );
  });
});
