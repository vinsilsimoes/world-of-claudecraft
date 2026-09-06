import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Flame Strike tooltip', () => {
  it('uses the exact row-total 230% Spell ATK value instead of counting the two final contacts twice', () => {
    expect(mir4ActionRawDamage(mir4ActionId(2201), 1, 0, 1_000)).toBe(2_300);
    expect(mir4ActionRawDamage(mir4ActionId(2201), 10, 0, 1_000)).toBe(2_750);
  });

  it('describes the actor-centred native volume without the removed WoC knockback and daze', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2201).toEqual({
      name: 'Flame Strike',
      description:
        'Strikes up to 8 enemies within 7.5 yards around you for {damage} total Spell damage over 3 impacts. Each landed impact briefly interrupts the target.',
    });
  });
});
