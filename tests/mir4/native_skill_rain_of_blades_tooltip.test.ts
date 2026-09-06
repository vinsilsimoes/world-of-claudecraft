import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { mir4NativeRainOfBladesPolicy } from '../../src/sim/mir4/native_skill_rain_of_blades';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Rain of Blades tooltip', () => {
  it('resolves all three hybrid contacts from their matching power stat', () => {
    const abilityId = mir4ActionId(3104);

    expect(mir4ActionRawDamage(abilityId, 1, 1_000, 1_000)).toBe(3_000);
    expect(mir4ActionRawDamage(abilityId, 1, 2_000, 1_000)).toBe(4_900);
    expect(mir4ActionRawDamage(abilityId, 1, 1_000, 2_000)).toBe(4_100);
    expect(mir4ActionRawDamage(abilityId, 15, 1_000, 1_000)).toBe(3_840);
  });

  it('describes the exact impacts, cap, Bash condition, direct debuffs, and party passive', () => {
    expect(mir4NativeRainOfBladesPolicy(10)).toMatchObject({
      unavoidable: true,
      bashBonusBasisPoints: 10_000,
      refreshDebilitationDurationMs: 10_000,
      damagedWeapon: { attackLoss: 30, durationMs: 180_000 },
      evasionLoss: { chanceBasisPoints: 6_000, amount: 800, durationMs: 6_000 },
      silence: { curseChanceBasisPoints: 6_000, durationMs: 6_000 },
      bashDamageReductionLossBasisPoints: 5_000,
      partySkillDamageReductionBasisPoints: 1_200,
    });
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_3104).toEqual({
      name: 'Rain of Blades',
      description:
        "Calls down blades at the selected enemy's location, dealing {damage} total hybrid damage over 3 impacts to up to 8 enemies within 6 yards. The direct impact Bashes Confused or Chilled enemies for 50%/65%/80%/100% bonus damage at ranks 1/5/8/10; from rank 8, all impacts cannot be evaded. At ranks 5/8/10, the direct impact adds one stack to existing Chaos or Chill and refreshes it to 10 sec; a critical hit applies unremovable Damaged Weapon, reducing PHYS and Spell ATK by 10/20/30 for 60/120/180 sec; and it has a 30%/40%/60% chance to reduce Evasion by 300/500/800 for 4/4/6 sec. At ranks 8/10, it also has a 40%/60% chance to Silence for 4/6 sec and reduces Bash DMG Reduction by 20%/50% for 10 sec. Learning ranks 5/8/10 grants you and your party 4%/8%/12% Skill DMG Reduction.",
    });
  });
});
