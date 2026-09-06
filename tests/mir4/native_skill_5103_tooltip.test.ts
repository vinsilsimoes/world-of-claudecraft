import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Lancer 5103 Ascending Dragon tooltip fidelity', () => {
  it('uses all six native physical and magic damage channels', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5103), 1, 1_000, 1_000)).toBe(2_800);
    expect(mir4ActionRawDamage(mir4ActionId(5103), 10, 1_000, 1_000)).toBe(3_250);
  });

  it('describes the footprint, contacts, Chill graph and permanent rank bonus', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5103).toEqual({
      name: 'Ascending Dragon',
      description:
        'Strikes up to 8 enemies in a 6-yard-radius circle centered 4 yards ahead over 3 contacts, dealing {damage} total Physical and Spell damage. The first and third contacts Knock Back enemies by 0.1 yards. The first damage contact applies 1 Chill stack for 5/8/10/10 sec at ranks 1/5/8/10, up to 3 stacks, reducing Skill DMG Reduction by 25% per stack. At ranks 5/8/10, monsters also lose 0.5/1/1.5 yd/s movement speed for 5 sec. Against Chilled targets, Severe Cold has a 30%/35%/40%, 40%/45%/50%, or 60%/65%/70% chance based on 1/2/3 Chill stacks to Freeze for 2/5/7 sec at ranks 5/8/10. Learning ranks 5/8/10 permanently increases damage to monsters by 4%/8%/12%.',
    });
  });
});
