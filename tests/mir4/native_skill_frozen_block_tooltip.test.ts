import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Frozen Block tooltip', () => {
  it('reports the exact 220% + 4% per rank Spell ATK summary', () => {
    expect(mir4ActionRawDamage(mir4ActionId(2202), 1, 0, 1_000)).toBe(2_200);
    expect(mir4ActionRawDamage(mir4ActionId(2202), 10, 0, 1_000)).toBe(2_560);
  });

  it('describes its source-backed self stasis without the removed fake enemy freeze', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_2202).toEqual({
      name: 'Frozen Block',
      description:
        'Deals {damage} Spell damage over 3 impacts to up to 5 enemies within 7 yards. At the first impact, encases you in ice for 3 sec: you cannot move or act, ignore all damage, remove removable debuffs, and cannot receive new removable debuffs. Each impact briefly interrupts enemies it hits.',
    });
  });
});
