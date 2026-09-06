import { describe, expect, it } from 'vitest';
import { mir4ActionRawDamage, mir4UltimateActionId } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Dragon Spear tooltip', () => {
  it('adds the exact Physical and Spell damage channels', () => {
    expect(mir4ActionRawDamage(mir4UltimateActionId(5), 1, 1_000, 2_000)).toBe(11_000);
  });

  it('describes the exact footprint, cap, reaction and source protection', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_ultimate_5).toEqual({
      name: 'Dragon Spear',
      description:
        'Strikes up to 8 enemies in a 17-by-4.5-yard frontal path for {damage} total Physical and Spell damage. Knocks Down enemies for 3 sec, hurling them 4 yards and lifting them 1 yard. Grants Invincibility for 2 sec. Requires a full Ultimate gauge.',
    });
  });
});
