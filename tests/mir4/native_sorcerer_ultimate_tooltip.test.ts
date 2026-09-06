import { describe, expect, it } from 'vitest';
import { mir4ActionRawDamage, mir4UltimateActionId } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Dragon Tornado tooltip', () => {
  it('uses Spell Power across the native ten-contact coefficient total', () => {
    expect(mir4ActionRawDamage(mir4UltimateActionId(2), 1, 10_000, 1000)).toBe(6800);
  });

  it('describes the extracted area, contacts, reactions, and source protection', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_ultimate_2).toEqual({
      name: 'Dragon Tornado',
      description: 'Creates a fixed 7-yard tornado that strikes up to 10 enemies at each of 10 contacts for {damage} total Spell damage. The first 5 contacts can Knock Back and the sixth can Knock Down, each with a 10% chance. Grants Invincibility for 3 sec. Requires a full Ultimate gauge.',
    });
  });
});
