import { describe, expect, it } from 'vitest';
import {
  MIR4_NEUTRAL_CRITICAL_OUTCOME,
  mir4CoefficientDamage,
  mir4ContextualMultiplierBps,
  mir4CriticalChanceBps,
  mir4CriticalMultiplierBps,
  mir4DamageAfterDefense,
  mir4HitChanceBps,
  mir4ResolveDamage,
  mir4SkillManaCost,
  mir4StunChanceBps,
} from '../../src/sim/mir4/math';

// Every pinned number below is observed source-project behavior
// (F:\Dev\Survival-Game server/mir4-authoritative-damage-v1.js and
// server/mir4-combat-data.js), not a derived value.

describe('mir4HitChanceBps', () => {
  it('treats a zero/zero accuracy+dodge pair as a guaranteed hit', () => {
    expect(mir4HitChanceBps(0, 0)).toBe(10_000);
  });
  it('applies the 9500 + delta*20 formula once either side owns the stat', () => {
    expect(mir4HitChanceBps(10, 4)).toBe(9620);
    expect(mir4HitChanceBps(4, 10)).toBe(9380);
  });
  it('clamps to the 2000..9950 band', () => {
    expect(mir4HitChanceBps(1000, 0)).toBe(9950);
    expect(mir4HitChanceBps(0, 1000)).toBe(2000);
  });
});

describe('mir4CriticalChanceBps / mir4CriticalMultiplierBps', () => {
  it('chance is (critical - avoidCritical) * 75 clamped 0..6000', () => {
    expect(mir4CriticalChanceBps(0, 0)).toBe(0);
    expect(mir4CriticalChanceBps(10, 4)).toBe(450);
    expect(mir4CriticalChanceBps(1000, 0)).toBe(6000);
    expect(mir4CriticalChanceBps(0, 100)).toBe(0);
  });
  it('multiplier is 15000 + criticalOutcome * 100 clamped 15000..25000', () => {
    expect(mir4CriticalMultiplierBps(0)).toBe(15_000);
    expect(mir4CriticalMultiplierBps(MIR4_NEUTRAL_CRITICAL_OUTCOME)).toBe(16_000);
    expect(mir4CriticalMultiplierBps(100)).toBe(25_000);
    expect(mir4CriticalMultiplierBps(200)).toBe(25_000);
    expect(mir4CriticalMultiplierBps(30, 20)).toBe(16_000);
    expect(mir4CriticalMultiplierBps(10, 100)).toBe(15_000);
  });
});

describe('mir4DamageAfterDefense', () => {
  it('zero raw damage short-circuits to zero', () => {
    expect(mir4DamageAfterDefense(0, 100)).toMatchObject({ damage: 0, effectiveDefense: 0 });
  });
  it('raw * 100 / (100 + effectiveDefense), floored, minimum 1', () => {
    expect(mir4DamageAfterDefense(100, 0).damage).toBe(100);
    expect(mir4DamageAfterDefense(100, 100).damage).toBe(50);
    expect(mir4DamageAfterDefense(1, 1000).damage).toBe(1);
  });
  it('net penetration is clamped to 8000 bps and scales defense down', () => {
    expect(mir4DamageAfterDefense(100, 100, 8000, 0)).toMatchObject({
      netPenetrationBps: 8000,
      effectiveDefense: 20,
      damage: 83,
    });
    expect(mir4DamageAfterDefense(100, 100, 9000, 0).netPenetrationBps).toBe(8000);
    expect(mir4DamageAfterDefense(100, 100, 5000, 3000).netPenetrationBps).toBe(2000);
  });
});

describe('mir4ContextualMultiplierBps', () => {
  it('monsters are neutral', () => {
    expect(
      mir4ContextualMultiplierBps(
        { pvpDamageBps: 5000, bossDamageBps: 5000 },
        { pvpDamageReductionBps: 0, bossDamageReductionBps: 0 },
        'monster',
      ),
    ).toBe(10_000);
  });
  it('applies monster, all-damage and attack-kind modifiers without leaking lanes', () => {
    expect(
      mir4ContextualMultiplierBps(
        { monsterDamageBps: 2_000, allDamageBps: 500, basicDamageBps: 300 },
        {
          monsterDamageReductionBps: 1_000,
          allDamageReductionBps: 200,
          basicDamageReductionBps: 100,
        },
        'monster',
        'basic',
      ),
    ).toBe(11_500);
    expect(
      mir4ContextualMultiplierBps(
        { monsterDamageBps: 2_000, skillDamageBps: 800 },
        { monsterDamageReductionBps: 500, skillDamageReductionBps: 300 },
        'player',
        'skill',
      ),
    ).toBe(9_700);
  });
  it('player and boss lanes add attack and subtract reduction, clamped 1000..30000', () => {
    expect(
      mir4ContextualMultiplierBps(
        { pvpDamageBps: 2000, bossDamageBps: 0 },
        { pvpDamageReductionBps: 500, bossDamageReductionBps: 0 },
        'player',
      ),
    ).toBe(11_500);
    expect(
      mir4ContextualMultiplierBps(
        { pvpDamageBps: 0, bossDamageBps: 3000 },
        { pvpDamageReductionBps: 0, bossDamageReductionBps: 1000 },
        'boss',
      ),
    ).toBe(12_000);
    expect(
      mir4ContextualMultiplierBps(
        { pvpDamageBps: 0, bossDamageBps: 0 },
        { pvpDamageReductionBps: 20_000, bossDamageReductionBps: 0 },
        'player',
      ),
    ).toBe(1000);
  });
});

describe('mir4ResolveDamage (pipeline order)', () => {
  it('no crit stats means a plain forced hit carries raw damage through zero defense', () => {
    const out = mir4ResolveDamage({
      rawDamage: 125,
      attacker: {},
      defender: {},
      forceHit: true,
      forceCritical: false,
    });
    expect(out.hit).toBe(true);
    expect(out.critical).toBe(false);
    expect(out.damage).toBe(125);
  });
  it('a forced miss deals zero damage even through zero defense', () => {
    // Stats must be nonzero on at least one side: the 0/0 pair is the
    // guaranteed-contact rule, where even the max roll (9999) still hits.
    const out = mir4ResolveDamage({
      rawDamage: 125,
      attacker: { accuracy: 0 },
      defender: { dodge: 10 },
      forceHit: false,
    });
    expect(out.hitChanceBps).toBe(9300);
    expect(out.hit).toBe(false);
    expect(out.damage).toBe(0);
  });
  it('crit applies the multiplier before context and defense', () => {
    const out = mir4ResolveDamage({
      rawDamage: 125,
      attacker: { critical: 100, criticalOutcome: 10 },
      defender: { physicalDefense: 100 },
      forceHit: true,
      forceCritical: true,
    });
    // 125 -> crit x1.6 = 200 -> context x1 -> floor(200*100/200) = 100
    expect(out.criticalMultiplierBps).toBe(16_000);
    expect(out.damage).toBe(100);
  });
  it('rolls below the chance land the hit/crit', () => {
    const out = mir4ResolveDamage({
      rawDamage: 50,
      attacker: { accuracy: 10, critical: 10 },
      defender: {},
      hitRoll: 0,
      criticalRoll: 0,
    });
    expect(out.hitChanceBps).toBe(9700);
    expect(out.hit).toBe(true);
    expect(out.criticalChanceBps).toBe(750);
    expect(out.critical).toBe(true);
  });
});

describe('mir4SkillManaCost / mir4CoefficientDamage / mir4StunChanceBps', () => {
  it('cost type 2 scales the manaCost stat: the live 1102/3101/4106 costs', () => {
    expect(mir4SkillManaCost(204, 1800, 2)).toBe(36);
    expect(mir4SkillManaCost(204, 1600, 2)).toBe(32);
    expect(mir4SkillManaCost(204, 2600, 2)).toBe(53);
  });
  it('other cost types are flat', () => {
    expect(mir4SkillManaCost(0, 97, 1)).toBe(97);
  });
  it('coefficient damage is floor(attackPower * coefficient / 10000), minimum 1', () => {
    expect(mir4CoefficientDamage(50, 8000)).toBe(40);
    expect(mir4CoefficientDamage(50, 9000)).toBe(45);
    expect(mir4CoefficientDamage(50, 17000)).toBe(85);
    expect(mir4CoefficientDamage(50, 0)).toBe(1);
  });
  it('stun chance is clamp(base + success - resistance, 0, 10000)', () => {
    expect(mir4StunChanceBps(10_000, 0, 0)).toBe(10_000);
    expect(mir4StunChanceBps(1000, 0, 0)).toBe(1000);
    expect(mir4StunChanceBps(5000, 3000, 2000)).toBe(6000);
    expect(mir4StunChanceBps(100, 0, 5000)).toBe(0);
  });
});
