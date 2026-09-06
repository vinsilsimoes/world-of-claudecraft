import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Chain Lightning tooltip', () => {
  it('shows first-target damage because the number of acquired jumps is dynamic', () => {
    expect(mir4ActionRawDamage(mir4ActionId(2303), 1, 0, 1_000)).toBe(3_520);
    expect(mir4ActionRawDamage(mir4ActionId(2303), 15, 0, 1_000)).toBe(4_360);
  });

  it('discloses target count, jump radius, diminishing damage and Chill Bash', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2303).toEqual({
      name: 'Chain Lightning',
      description:
        'Strikes up to 7 enemies one by one. The first target takes {damage} Spell damage; each jump reaches an unstruck enemy within 11 yards and deals less damage, down to 62.5% on the seventh target. Against Chilled enemies, Bash and its damage bonus are increased by 50%.',
    });
  });
});
