import { describe, expect, it } from 'vitest';
import {
  mir4ActionId,
  mir4ActionRawDamage,
} from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Dark Vortex tooltip', () => {
  it('shows the same six-contact damage total as the approved runtime plan', () => {
    expect(mir4ActionRawDamage(mir4ActionId(2501), 1, 0, 1_000)).toBe(2_600);
    expect(mir4ActionRawDamage(mir4ActionId(2501), 15, 0, 1_000)).toBe(3_300);
  });

  it('describes the fixed vortex, target cap, alternating movement, and final knockdown', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2501).toEqual({
      name: 'Dark Vortex',
      description:
        "Creates a vortex at the selected enemy's location. Deals {damage} total Spell damage over 6 hits to up to 6 enemies. Four pulses alternately shift enemies toward and away from its center, and the final hit knocks them down.",
    });
  });
});
