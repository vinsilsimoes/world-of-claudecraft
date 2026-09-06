import { describe, expect, it } from 'vitest';
import { mir4ActionAbilities } from '../../src/sim/mir4/action_abilities';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { mir4NativeGuardianCirclePolicy } from '../../src/sim/mir4/native_skill_guardian_circle';
import { Sim } from '../../src/sim/sim';
import {
  abilityDisplayDescription,
  abilityEffectText,
  formatAbilityNumber,
} from '../../src/ui/ability_description';
import { setLanguage } from '../../src/ui/i18n';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function taoistAt(rank: number): Sim {
  const sim = new Sim({
    seed: 35_010 + rank,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Guardian Circle Tooltip QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.spellPower = 1_000;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Taoist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3501: rank };
  sim.drainEvents();
  return sim;
}

describe('MIR4 Taoist 3501 Guardian Circle tooltip fidelity', () => {
  it.each([1, 8, 10, 15])('matches the rank-%i scheduled damage and base party buffs', (rank) => {
    setLanguage('en');
    const sim = taoistAt(rank);
    const resolved = mir4ActionAbilities(3, 120, { 3501: rank }, 0).find(
      (ability) => ability.def.id === 'mir4_skill_3501',
    );
    const policy = mir4NativeGuardianCirclePolicy(rank);
    if (!resolved || !policy) throw new Error('missing Guardian Circle projection');

    expect(castMir4Skill(sim.ctx, sim.playerId, 3501)).toEqual({ ok: true });
    const scheduledDamage = (sim.player.mir4PendingImpacts ?? []).find(
      (impact) => impact.skillId === 3501 && impact.attackId === 350102,
    )?.rawDamage;
    expect(scheduledDamage).toBeGreaterThan(0);

    const scaling = { spellPower: 1_000, rangedPower: 0, attackPower: 0 };
    const description = abilityDisplayDescription(
      resolved,
      abilityEffectText(resolved, scaling),
      scaling,
    );
    expect(description).toContain(
      `Deals ${formatAbilityNumber(Number(scheduledDamage))} Spell damage to up to 5 enemies within 6 yards of you.`,
    );
    expect(description).toContain(
      `gain ${formatAbilityNumber(policy.basePhysicalDefense)} Physical Defense and ${formatAbilityNumber(policy.baseBashDamageReductionBasisPoints / 100)}% Bash Damage Reduction for 60 sec`,
    );

    sim.time = 0.55;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeStatusBonus(sim.player, 24)).toBe(
      policy.basePhysicalDefense + (policy.milestone?.physicalDefense ?? 0),
    );
    expect(mir4NativeStatusBonus(sim.player, 35)).toBe(
      policy.baseBashDamageReductionBasisPoints +
        (policy.milestone?.bashDamageReductionBasisPoints ?? 0),
    );
  });

  it('describes every native rank milestone without promising Magic Defense', () => {
    const entry = classAbilityNamesEn.entities.abilities.mir4_skill_3501;
    expect(entry.description).toContain('At rank 5');
    expect(entry.description).toContain('At rank 8');
    expect(entry.description).toContain('At rank 10');
    expect(entry.description).toContain('can then be cast while Stunned');
    expect(entry.description).toContain('lowest health percentage');
    expect(entry.description).not.toContain('Magic Defense');
  });
});
