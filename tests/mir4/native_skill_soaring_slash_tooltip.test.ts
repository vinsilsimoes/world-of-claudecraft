import { describe, expect, it } from 'vitest';
import {
  mir4ActionAbilities,
  mir4ActionId,
  mir4ActionRawDamage,
} from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

function description(rank: number): string {
  const ability = mir4ActionAbilities(3, 120, { 3203: rank }, 0).find(
    (candidate) => candidate.def.id === 'mir4_skill_3203',
  );
  if (!ability) throw new Error('missing Soaring Slash action');
  return ability.def.description ?? '';
}

describe('MIR4 Taoist 3203 Soaring Slash tooltip fidelity', () => {
  it('uses the same hybrid row allocation as live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(3203), 1, 1_000, 1_000)).toBe(3_996);
    expect(mir4ActionRawDamage(mir4ActionId(3203), 15, 1_000, 1_000)).toBe(5_115);
  });

  it('shows only the effects active at the learned rank', () => {
    const rank1 = description(1);
    expect(rank1).toContain('9 hits');
    expect(rank1).toContain('frontal 12-by-4-yard area');
    expect(rank1).toContain('50% bonus damage');
    expect(rank1).not.toContain('Damaged Armor');

    const rank5 = description(5);
    expect(rank5).toContain('refreshes Confuse and Chill to 10 sec');
    expect(rank5).toContain('reducing Physical and Magic Defense by 10 for 60 sec');
    expect(rank5).toContain('4% Skill Damage Reduction');
    expect(rank5).not.toContain('additional Skill damage');

    const rank8 = description(8);
    expect(rank8).toContain('50% additional Skill damage');
    expect(rank8).toContain('8% Skill Damage Reduction');

    const rank10 = description(10);
    expect(rank10).toContain('100% additional Skill damage');
    expect(rank10).toContain('lose 500 Critical Evasion for 10 sec');
    expect(rank10).toContain('12% Skill Damage Reduction');
  });

  it('keeps the complete native rank ladder in the static catalog', () => {
    const text = classAbilityNamesEn.entities.abilities.mir4_skill_3203.description;
    expect(text).toContain('50%/65%/80%/100%');
    expect(text).toContain('10/20/30');
    expect(text).toContain('4%/8%/12%');
    expect(text).toContain('50%/100%');
    expect(text).toContain('500 Critical Evasion');
  });
});
