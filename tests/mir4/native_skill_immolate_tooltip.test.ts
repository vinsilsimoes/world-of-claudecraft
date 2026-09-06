import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Immolate tooltip', () => {
  it('uses the row-total 400% Spell ATK value across ten contacts', () => {
    expect(mir4ActionRawDamage(mir4ActionId(2_103), 1, 0, 1_000)).toBe(4_000);
    expect(mir4ActionRawDamage(mir4ActionId(2_103), 10, 0, 1_000)).toBe(4_720);
  });

  it('describes only the extracted selected-target laser and Fire Flare contract', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2103).toEqual({
      name: 'Immolate',
      description:
        'Strikes the selected enemy 10 times for {damage} total Spell damage. The third contact applies Fire Flare for 5 sec, dealing {burnPerTick} Spell damage on each native periodic pulse. Against Quelled enemies, Bash and its damage bonus are increased by 50%.',
    });
  });
});
