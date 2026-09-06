import { describe, expect, it } from 'vitest';
import { mir4ActionAbilities } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

function description(rank: number): string {
  const ability = mir4ActionAbilities(3, 120, { 3201: rank }, 0).find(
    (candidate) => candidate.def.id === 'mir4_skill_3201',
  );
  if (!ability) throw new Error('missing Tai Chi action');
  return ability.def.description ?? '';
}

describe('MIR4 Taoist 3201 Tai Chi tooltip fidelity', () => {
  it('describes only the active native rank package', () => {
    const rank1 = description(1);
    expect(rank1).toContain('6 contacts to up to 8 enemies');
    expect(rank1).toContain('100% base chance and players with a 10% base chance');
    expect(rank1).toContain('immune to Knockdown and Stun while casting');
    expect(rank1).not.toContain('Broken Weapon');

    const rank8 = description(8);
    expect(rank8).toContain('additional 500 Evasion');
    expect(rank8).toContain('15% Skill Damage Reduction if they are monsters or 10% if they are players');
    expect(rank8).toContain('30% Skill Healing');
    expect(rank8).toContain('65% chance to suffer Broken Weapon');
    expect(rank8).not.toContain('lose 300 Accuracy');

    const rank10 = description(10);
    expect(rank10).toContain('players with a 100% base chance');
    expect(rank10).toContain('reducing Physical Attack, Spell Attack, Accuracy, and Evasion by 80');
    expect(rank10).toContain('lose 300 Accuracy for 15 sec');
  });

  it('keeps the full progression ladder in the static catalog', () => {
    const text = classAbilityNamesEn.entities.abilities.mir4_skill_3201.description;
    expect(text).toContain('At ranks 5/8/10');
    expect(text).toContain('250/500/750 Evasion');
    expect(text).toContain('15%/30%/50%');
    expect(text).toContain('At rank 8');
    expect(text).toContain('At rank 10');
  });
});
