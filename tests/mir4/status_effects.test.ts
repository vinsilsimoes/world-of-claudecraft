import { describe, expect, it } from 'vitest';
import {
  mir4DrainOnDamage,
  mir4ManaRecoveredFromHealing,
  mir4ModifiedDropChance,
  mir4ModifiedEnhancementChance,
  mir4ModifiedGatherDurationSeconds,
  mir4ModifiedManaCost,
  mir4ModifiedPotionAmount,
  mir4ModifiedProgressionReward,
  mir4ModifiedSkillCooldownSeconds,
  mir4ModifiedSkillHealing,
  mir4RecoveryPerTenSeconds,
} from '../../src/sim/mir4/status_effects';

describe('MIR4 recovery and action modifiers', () => {
  it('combines global and potion-specific recovery rates', () => {
    expect(mir4ModifiedPotionAmount(500, 'hp', { 94: 1_000, 146: 2_000 })).toBe(650);
    expect(mir4ModifiedPotionAmount(120, 'mp', { 94: 1_000, 147: 1_500 })).toBe(150);
  });

  it('caps skill cooldown and MP cost reduction without touching basic attacks', () => {
    expect(mir4ModifiedSkillCooldownSeconds(10, { 95: 2_500 })).toBe(7.5);
    expect(mir4ModifiedSkillCooldownSeconds(10, { 95: 99_999 })).toBe(2);
    expect(mir4ModifiedManaCost(101, { 97: 2_500 })).toBe(75);
    expect(mir4ModifiedManaCost(101, { 97: 99_999 })).toBe(10);
  });

  it('calculates ten-second recovery and attack drain with integer flooring', () => {
    expect(
      mir4RecoveryPerTenSeconds(4_000, 600, {
        3: 100,
        4: 2_000,
        5: 500,
        8: 20,
        9: 5_000,
        10: 1_000,
        18: 10,
      }),
    ).toEqual({ hp: 330, mp: 100 });
    expect(mir4DrainOnDamage(999, { 80: 500, 81: 250 })).toEqual({ hp: 49, mp: 24 });
    expect(mir4ModifiedSkillHealing(1_000, { 148: 2_500 })).toBe(1_250);
    expect(mir4ManaRecoveredFromHealing(1_250, { 149: 1_000 })).toBe(125);
  });
});

describe('MIR4 progression modifiers', () => {
  it('keeps hunting and reward lanes separate and combines both hunting XP statuses', () => {
    const statuses = { 82: 1_000, 83: 3_000, 84: 500, 161: 2_000 };
    expect(mir4ModifiedProgressionReward(1_000, 'hunting-xp', statuses)).toBe(1_300);
    expect(mir4ModifiedProgressionReward(1_000, 'reward-xp', statuses)).toBe(1_300);
    expect(mir4ModifiedProgressionReward(1_000, 'hunting-copper', statuses)).toBe(1_050);
    expect(mir4ModifiedProgressionReward(1_000, 'reward-copper', statuses)).toBe(1_000);
  });

  it('boosts drop chance and gathering speed without exceeding probability one', () => {
    expect(mir4ModifiedDropChance(0.25, { 88: 2_000 })).toBeCloseTo(0.3, 10);
    expect(mir4ModifiedDropChance(0.25, { 89: 300 })).toBeCloseTo(0.2575, 10);
    expect(mir4ModifiedDropChance(0.25, { 88: 2_000, 89: 300 })).toBeCloseTo(0.3075, 10);
    expect(mir4ModifiedDropChance(0.9, { 88: 5_000 })).toBe(1);
    expect(mir4ModifiedGatherDurationSeconds(5, 'mining', { 93: 2_500 })).toBe(4);
  });

  it('boosts only the matching weapon or armor enhancement chance and caps certainty', () => {
    const statuses = { 110: 1_000, 111: 2_000 };

    expect(mir4ModifiedEnhancementChance(50_000, 1, statuses)).toBe(55_000);
    expect(mir4ModifiedEnhancementChance(50_000, 5, statuses)).toBe(60_000);
    expect(mir4ModifiedEnhancementChance(90_000, 5, statuses)).toBe(100_000);
  });
});
