import { describe, expect, it } from 'vitest';
import { mir4ActionAbilities } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

function description(rank: number): string {
  const ability = mir4ActionAbilities(3, 120, { 3505: rank }, 0).find(
    (candidate) => candidate.def.id === 'mir4_skill_3505',
  );
  if (!ability) throw new Error('missing Blasting Charm action');
  return ability.def.description ?? '';
}

describe('MIR4 Taoist 3505 Blasting Charm tooltip fidelity', () => {
  it('describes only the active native rank package', () => {
    const rank1 = description(1);
    expect(rank1).toContain('homing talisman');
    expect(rank1).toContain('up to 5 enemies within 6 yards');
    expect(rank1).toContain('Silence Resistance by 2.5% for 8 sec');
    expect(rank1).toContain('lose 50 Physical Defense for 15 sec');
    expect(rank1).not.toContain('All Damage Reduction');

    const rank5 = description(5);
    expect(rank5).toContain('Darkness');
    expect(rank5).toContain('for 10 sec');
    expect(rank5).toContain('Monsters lose 15% All Damage Reduction');
    expect(rank5).toContain('players lose 15% Monster Damage Reduction');
    expect(rank5).not.toContain('PvP Damage Reduction');

    const rank8 = description(8);
    expect(rank8).toContain('15% PvP Damage Reduction');
    expect(rank8).toContain('10% Stun Resistance');
    expect(rank8).toContain('15% Debilitation and Silence Resistance');

    const rank10 = description(10);
    expect(rank10).toContain('Monsters lose 30% All Damage Reduction');
    expect(rank10).toContain('20% PvP Damage Reduction');
    expect(rank10).toContain('20% Stun Resistance');
    expect(rank10).toContain('30% Debilitation and Silence Resistance');
  });

  it('keeps the complete rank ladder in the static catalog', () => {
    const text = classAbilityNamesEn.entities.abilities.mir4_skill_3505.description;
    expect(text).toContain('8/10/12/15 sec');
    expect(text).toContain('ranks 1/5/8/10');
    expect(text).toContain('At rank 5');
    expect(text).toContain('At rank 8');
    expect(text).toContain('At rank 10');
    expect(text).not.toContain('Magic Defense');
  });
});
