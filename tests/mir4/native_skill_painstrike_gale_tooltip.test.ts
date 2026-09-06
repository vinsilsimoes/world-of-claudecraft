import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Painstrike Gale tooltip', () => {
  it('shows the single authoritative kick damage resolution at the current skill rank', () => {
    expect(mir4ActionRawDamage(mir4ActionId(4106), 1, 1_000, 0)).toBe(1_700);
    expect(mir4ActionRawDamage(mir4ActionId(4106), 15, 1_000, 0)).toBe(2_260);
  });

  it('discloses movement, contact area, Focus, protection and every rank milestone', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4106).toEqual({
      name: 'Painstrike Gale',
      description:
        'Rushes through the selected target, then retreats 8 yards, dealing {damage} Physical damage to up to 5 enemies in a 6-yard frontal line. Grants 1 Focus and Invincibility for 1 sec. Hit enemies are Marked, reducing CRIT EVA by 25, for 5/8/10/10 sec at ranks 1/5/8/10. Monsters are Stunned for 2 sec, increasing to 3 sec at rank 10. Players have a 10%/30%/50%/70% chance to be Stunned for 1/1/1/2 sec at ranks 1/5/8/10. At ranks 5/8/10, also reduces CRIT DMG Reduction by 100/200/400 for 5/5/8 sec. At ranks 8/10, also reduces CRIT EVA by a further 200/400 for 5/8 sec.',
    });
  });
});
