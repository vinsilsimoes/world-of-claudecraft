import { describe, expect, it } from 'vitest';
import { MIR4_MOUNTS_CATALOG } from '../../src/sim/content/mir4/mounts_catalog';
import { MIR4_SPIRITS_CATALOG } from '../../src/sim/content/mir4/spirits_catalog';
import { deriveMir4PlayerStats, MIR4_RUNTIME_STATUS_IDS } from '../../src/sim/mir4/derived_stats';

describe('mir4 derived character stats', () => {
  it('marks both Energy modifiers as active runtime statuses', () => {
    expect(MIR4_RUNTIME_STATUS_IDS.has(86)).toBe(true);
    expect(MIR4_RUNTIME_STATUS_IDS.has(92)).toBe(true);
  });

  it('projects the sealed level-one warrior stats and Combat Power', () => {
    expect(deriveMir4PlayerStats(1, 1)).toEqual({
      statusValues: { 1: 4000, 6: 600, 19: 204, 20: 50 },
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
      bossDamageReductionBps: 0,
      pvpDamageBps: 0,
      pvpDamageReductionBps: 0,
      monsterDamageBps: 0,
      monsterDamageReductionBps: 0,
      skillDamageBps: 0,
      skillDamageReductionBps: 0,
      allDamageBps: 0,
      allDamageReductionBps: 0,
      stunSuccessBps: 0,
      stunResistanceBps: 0,
      manaCost: 204,
      penetrationBps: 0,
      penetrationDefenseBps: 0,
      mountMoveSpeedBps: 0,
      mountBasicAttackSpeedBps: 0,
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

  it('projects every contextual level-table status instead of counting ghost Combat Power', () => {
    expect(deriveMir4PlayerStats(1, 10)).toMatchObject({
      pvpDamageBps: 9,
      bossDamageBps: 41,
      bossDamageReductionBps: 41,
    });
  });

  it('projects starter armor Monster Damage Reduction into the live status bag', () => {
    const stats = deriveMir4PlayerStats(
      1,
      1,
      { 5: 301201000 },
      { 301201000: { itemId: 301201000, enhancement: 0 } },
    );

    expect(stats.monsterDamageReductionBps).toBe(10);
    expect(stats.statusValues[42]).toBe(10);
  });

  it('applies every Mount album stat to live derived stats and Combat Power', () => {
    const stats = deriveMir4PlayerStats(1, 1, undefined, undefined, undefined, {
      discovered: MIR4_MOUNTS_CATALOG.slice(0, 14).map((mount) => mount.id),
    });

    expect(stats).toMatchObject({
      maxHp: 4_025,
      maxMana: 610,
      physicalAttack: 52,
      magicAttack: 2,
      physicalDefense: 2,
      magicDefense: 2,
      accuracy: 1,
      dodge: 1,
      critical: 1,
      avoidCritical: 1,
      criticalOutcome: 1,
      penetrationBps: 10,
      bossDamageBps: 10,
      skillDamageBps: 10,
      combatPower: 2_107,
    });
  });

  it('applies every Spirit album stat to live derived stats and Combat Power', () => {
    const stats = deriveMir4PlayerStats(1, 1, undefined, undefined, {
      discovered: MIR4_SPIRITS_CATALOG.slice(0, 14).map((spirit) => spirit.id),
    });

    expect(stats).toMatchObject({
      maxHp: 4_025,
      maxMana: 610,
      physicalAttack: 52,
      magicAttack: 2,
      physicalDefense: 4,
      magicDefense: 4,
      accuracy: 2,
      dodge: 2,
      critical: 3,
      avoidCritical: 3,
      criticalOutcome: 3,
      penetrationBps: 30,
      bossDamageBps: 40,
      skillDamageBps: 40,
      combatPower: 2_189,
    });
  });
});
