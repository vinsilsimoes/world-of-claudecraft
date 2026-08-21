import { describe, expect, it } from 'vitest';
import { deriveMir4PlayerStats } from '../../src/sim/mir4/derived_stats';

describe('mir4 derived character stats', () => {
  it('projects the sealed level-one warrior stats and Combat Power', () => {
    expect(deriveMir4PlayerStats(1, 1)).toEqual({
      maxHp: 4000,
      maxMana: 600,
      physicalAttack: 50,
      magicAttack: 0,
      physicalDefense: 0,
      magicDefense: 0,
      accuracy: 0,
      dodge: 0,
      critical: 0,
      avoidCritical: 0,
      criticalOutcome: 0,
      bossDamageBps: 0,
      skillDamageBps: 0,
      manaCost: 204,
      penetrationBps: 0,
      mountMoveSpeedBps: 0,
      combatPower: 2040,
    });
  });

  it('applies equipped base, enhancement, enchantment and blessing attributes once', () => {
    const stats = deriveMir4PlayerStats(
      1,
      1,
      { 1: 991010101, 5: 991050101 },
      {
        991010101: {
          itemId: 991010101,
          enhancement: 1,
          affixes: { enchantment: [[20, 7]], blessing: [[30, 2]] },
        },
        991050101: {
          itemId: 991050101,
          enhancement: 0,
          affixes: { blessing: [[29, 3]] },
        },
      },
    );

    expect(stats.physicalAttack).toBeGreaterThan(50);
    expect(stats.physicalDefense).toBeGreaterThan(0);
    expect(stats.dodge).toBe(3);
    expect(stats.critical).toBe(2);
    expect(stats.bossDamageBps).toBe(0);
    expect(stats.skillDamageBps).toBe(0);
    expect(stats.combatPower).toBeGreaterThan(2040);
  });

  it('uses the class-specific physical/magic Combat Power weights', () => {
    const elementalist = deriveMir4PlayerStats(
      2,
      1,
      { 1: 991010201 },
      {
        991010201: { itemId: 991010201, enhancement: 0 },
      },
    );
    const arbalist = deriveMir4PlayerStats(
      4,
      1,
      { 1: 991010401 },
      {
        991010401: { itemId: 991010401, enhancement: 0 },
      },
    );

    expect(elementalist.magicAttack).toBeGreaterThan(0);
    expect(arbalist.physicalAttack).toBeGreaterThan(0);
    expect(elementalist.combatPower).toBeGreaterThan(0);
    expect(arbalist.combatPower).toBeGreaterThan(0);
  });

  it('projects the source level-table boss-damage status on its 10,000-point scale', () => {
    expect(deriveMir4PlayerStats(1, 10).bossDamageBps).toBe(41);
  });
});
