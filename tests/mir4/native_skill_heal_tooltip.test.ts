import { describe, expect, it } from 'vitest';
import {
  mir4ActionAbilities,
  mir4ActionHealTooltipHealing,
} from '../../src/sim/mir4/action_abilities';
import { applyMir4NativeHealPulse } from '../../src/sim/mir4/native_skill_heal';
import { Sim } from '../../src/sim/sim';
import {
  abilityDisplayDescription,
  abilityEffectText,
  formatAbilityNumber,
} from '../../src/ui/ability_description';
import { setLanguage } from '../../src/ui/i18n';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function taoistAt(spellPower: number, healingBasisPoints: number): Sim {
  const sim = new Sim({
    seed: 35_030,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Heal Tooltip QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.player.spellPower = spellPower;
  sim.player.maxHp = 100_000;
  sim.player.hp = 1;
  if (!sim.player.mir4) throw new Error('missing MIR4 combat state');
  sim.player.mir4.statusValues = Object.freeze({ 148: healingBasisPoints });
  return sim;
}

describe('MIR4 Taoist 3503 Heal tooltip', () => {
  it.each([
    { spellPower: 1_000, spellAttackBonus: 0, healingBasisPoints: 0 },
    { spellPower: 2_000, spellAttackBonus: 100, healingBasisPoints: 2_500 },
  ])(
    'matches one combat pulse and its five-pulse total at Spell ATK $spellPower',
    ({ spellPower, spellAttackBonus, healingBasisPoints }) => {
      setLanguage('en');
      const sim = taoistAt(spellPower + spellAttackBonus, healingBasisPoints);
      const resolved = mir4ActionAbilities(3, 120, { 3503: 1 }, 0).find(
        (ability) => ability.def.id === 'mir4_skill_3503',
      );
      if (!resolved) throw new Error('missing Heal action');
      const healing = mir4ActionHealTooltipHealing(
        resolved.def.id,
        resolved.rank,
        spellPower,
        spellAttackBonus,
        healingBasisPoints,
      );
      if (!healing) throw new Error('missing Heal tooltip projection');

      const restored = applyMir4NativeHealPulse(sim.player, sim.player, resolved.rank);
      expect(restored).toBe(healing.perPulse);

      const scaling = {
        spellPower,
        rangedPower: 0,
        attackPower: 0,
        mir4SpellAttackBonus: spellAttackBonus,
        mir4SkillHealingBps: healingBasisPoints,
      };
      const description = abilityDisplayDescription(
        resolved,
        abilityEffectText(resolved, scaling),
        scaling,
      );
      expect(description).toContain(
        `Restores ${formatAbilityNumber(healing.perPulse)} health per second`,
      );
      expect(description).toContain(`(${formatAbilityNumber(healing.total)} total)`);
      expect(description).toContain('up to 4 party members within 30 yards');
    },
  );
});
