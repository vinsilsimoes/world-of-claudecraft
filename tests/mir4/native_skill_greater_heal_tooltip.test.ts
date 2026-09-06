import { describe, expect, it } from 'vitest';
import { mir4ActionAbilities } from '../../src/sim/mir4/action_abilities';
import {
  mir4NativeGreaterHealAmount,
  mir4NativeGreaterHealPolicy,
} from '../../src/sim/mir4/native_skill_greater_heal';
import { abilityDisplayDescription, abilityEffectText } from '../../src/ui/ability_description';
import { setLanguage } from '../../src/ui/i18n';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Taoist 3504 Greater Heal tooltip fidelity', () => {
  it.each([1, 5, 8, 10, 15])('projects the rank-%i flat and maximum-Health healing', (rank) => {
    setLanguage('en');
    const resolved = mir4ActionAbilities(3, 120, { 3504: rank }, 0).find(
      (ability) => ability.def.id === 'mir4_skill_3504',
    );
    const policy = mir4NativeGreaterHealPolicy(rank);
    if (!resolved || !policy) throw new Error('missing Greater Heal projection');

    const scaling = { spellPower: 1_000, rangedPower: 0, attackPower: 0 };
    const description = abilityDisplayDescription(
      resolved,
      abilityEffectText(resolved, scaling),
      scaling,
    );
    expect(description).toContain(
      `Restores 10% of maximum Health plus ${policy.flatHealing} Health`,
    );
    expect(mir4NativeGreaterHealAmount(100_000, rank, true)).toBe(
      10_000 + policy.flatHealing + policy.selfBonusMaxHpBasisPoints * 10,
    );
    expect(mir4NativeGreaterHealAmount(100_000, rank, false)).toBe(
      10_000 + policy.flatHealing + policy.partyBonusMaxHpBasisPoints * 10,
    );
  });

  it('discloses every native milestone and does not retain the old 45% promise', () => {
    const description = classAbilityNamesEn.entities.abilities.mir4_skill_3504.description;
    expect(description).toContain('At rank 5');
    expect(description).toContain('At rank 8');
    expect(description).toContain('At rank 10');
    expect(description).toContain('cast while Silenced or Stunned');
    expect(description).toContain('revives one dead party member with 20% Health');
    expect(description).toContain('up to 4 dead party members revive with 50% Health');
    expect(description).toContain('Death delay has a 120 sec cooldown');
    expect(description).not.toContain('45%');
  });
});
