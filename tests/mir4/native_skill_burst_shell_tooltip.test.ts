import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Burst Shell tooltip', () => {
  it('describes the reviewed runtime instead of the obsolete prototype', () => {
    const text = classAbilityNamesEn.entities.abilities.mir4_skill_4103.description;
    expect(text).toBe(
      'Fires an explosive shell at the selected target, creating a device for 3 sec that deals {damage} total Physical damage over 5 explosions to up to 5 enemies within 8 yards. Grants 1 Focus. Enemies hit lose 50/80/100/200 Physical and Spell Defense for 10 sec at ranks 1/5/8/10. At ranks 8/10, they also burn for 10%/20% of your Physical ATK each second for 10 sec and take 10%/25% more damage, while this skill deals 8%/12% more damage to monsters.',
    );
    expect(text).not.toContain('7.5 yards');
    expect(text).not.toContain('65% damage');
  });
});
