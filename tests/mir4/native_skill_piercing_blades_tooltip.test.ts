import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Piercing Blades tooltip fidelity', () => {
  it('uses the same five-contact total as live combat at ranks 1 and 15', () => {
    expect(mir4ActionRawDamage(mir4ActionId(3103), 1, 1_000, 0)).toBe(1_999);
    expect(mir4ActionRawDamage(mir4ActionId(3103), 15, 1_000, 0)).toBe(2_558);
  });

  it('describes the exact footprint, reactions, Bash and rank milestones', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_3103).toEqual({
      name: 'Piercing Blades',
      description:
        'Deals {damage} total Physical damage over 5 hits to up to 8 enemies in a frontal 12-by-5-yard area. The first attack sequence knocks enemies back; the final sequence causes a brief hit reaction. Targets affected by Quell, Chaos, or Chill are Bashed for 50%/65%/80%/100% bonus damage at ranks 1/5/8/10. At ranks 5/8/10, the first three hits Stun monsters for 2/3/5 sec and have a 20%/40%/60% base chance to Stun players; learning those ranks also grants 10%/15%/20% Boss ATK DMG. At ranks 8/10, the first three hits reduce Skill DMG Reduction by 20%/30% against monsters or 15%/20% against players for 30 sec. When one of those hits Bashes, it also applies Chaos and Chill for 8/16 sec, reducing PHYS ATK and Skill DMG Reduction by 25%.',
    });
  });
});
