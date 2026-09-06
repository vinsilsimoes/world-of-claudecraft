import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Heavenly Bow tooltip', () => {
  it('describes the reviewed eight-hit area, Focus, Bash, Reload and monster passive', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4108.description).toBe(
      "Calls down an arrow rain at the selected target, dealing {damage} total Physical damage over 8 hits to up to 8 enemies within 7 yards. Grants 1 Focus. Against Marked enemies, Bash increases all 8 hits by 50%/65%/80%/100% at ranks 1/5/8/10. At ranks 5/8/10, each direct Bash hit has a 5%/15%/40% chance to reset this skill's cooldown, with a 10 sec internal cooldown. At ranks 8/10, your damage against monsters increases by 8%/12%.",
    );
  });
});
