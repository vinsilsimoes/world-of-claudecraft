import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Phoenix Embrace tooltip', () => {
  it('describes the exact party buff and every recovered rank milestone', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2204).toEqual({
      name: 'Phoenix Embrace',
      description:
        'After 0.85 sec, increases the Spell ATK of you and up to 4 nearby party members within 7 yards by 25, plus 5 per skill level, for 60 sec. At skill level 5, also reduces your Skill Cooldowns by 25% for 16 sec. At level 8, this becomes 40%, raises your MP Potion Efficiency by 20% for 16 sec, and permanently raises your Skill Damage by 4%. At level 10, these bonuses become 60%, 30%, and 8%.',
    });
  });
});
