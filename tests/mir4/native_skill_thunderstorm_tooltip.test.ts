import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Thunderstorm tooltip', () => {
  it('shows the same four-contact damage total as the approved runtime plan', () => {
    expect(mir4ActionRawDamage(mir4ActionId(2301), 1, 0, 1_000)).toBe(2_920);
    expect(mir4ActionRawDamage(mir4ActionId(2301), 15, 0, 1_000)).toBe(3_760);
  });

  it('describes the fixed field, contact count, target caps, and tighter final strike', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2301).toEqual({
      name: 'Thunderstorm',
      description:
        "Creates a lightning field at the selected enemy's location. After a brief warning, it deals {damage} total Spell damage over 4 rapid hits. Each hit refreshes Chill, reducing Skill DMG Reduction by 25% for {chillDuration} sec. The first 3 hits strike up to 10 enemies within 7 yards; the final hit strikes up to 8 enemies within 3.5 yards.",
    });
  });
});
