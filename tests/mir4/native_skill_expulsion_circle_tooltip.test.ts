import { describe, expect, it } from 'vitest';
import { mir4ActionAbilities } from '../../src/sim/mir4/action_abilities';
import { mir4NativeExpulsionCirclePolicy } from '../../src/sim/mir4/native_skill_expulsion_circle';
import { abilityDisplayDescription, abilityEffectText } from '../../src/ui/ability_description';
import { setLanguage } from '../../src/ui/i18n';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

function descriptionAt(rank: number): string {
  const resolved = mir4ActionAbilities(3, 120, { 3404: rank }, 0).find(
    (ability) => ability.def.id === 'mir4_skill_3404',
  );
  const policy = mir4NativeExpulsionCirclePolicy(rank);
  if (!resolved || !policy) throw new Error('missing Expulsion Circle projection');
  const scaling = { spellPower: 1_000, rangedPower: 0, attackPower: 0 };
  return abilityDisplayDescription(resolved, abilityEffectText(resolved, scaling), scaling);
}

describe('MIR4 Taoist 3404 Expulsion Circle tooltip fidelity', () => {
  it('projects the live base Spell DEF and each active rank package', () => {
    setLanguage('en');
    expect(descriptionAt(1)).toContain(
      'You and up to 4 party members within 15 yards gain 25 Spell Defense for 60 sec.',
    );
    expect(descriptionAt(5)).toContain(
      'also gains 50 Spell Defense and 6% Skill Damage Reduction for 15 sec, plus 10% Boss Damage Reduction for 20 sec',
    );
    const rank8 = descriptionAt(8);
    expect(rank8).toContain(
      'those bonuses become 100 Spell Defense and 12% Skill Damage Reduction for 20 sec, plus 15% Boss Damage Reduction for 30 sec',
    );
    expect(rank8).toContain('can then be cast while Silenced');
    expect(rank8).toContain('10% Debilitation and Silence Resistance');
    expect(rank8).toContain('party members gain 20%');
    const rank10 = descriptionAt(10);
    expect(rank10).toContain('150 Spell Defense and 20% Skill Damage Reduction for 30 sec');
    expect(rank10).toContain('50% Debilitation Resistance and 70% Silence Resistance');
    expect(rank10).toContain('other party members gain 25% and 35%, respectively');
  });

  it('describes the complete rank ladder without promising Physical Defense', () => {
    const entry = classAbilityNamesEn.entities.abilities.mir4_skill_3404;
    expect(entry.description).toContain('At rank 5');
    expect(entry.description).toContain('At rank 8');
    expect(entry.description).toContain('At rank 10');
    expect(entry.description).toContain('can then be cast while Silenced');
    expect(entry.description).not.toContain('Physical Defense');
  });
});
