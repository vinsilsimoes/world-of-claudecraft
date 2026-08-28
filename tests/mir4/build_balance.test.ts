import { describe, expect, it } from 'vitest';
import {
  MIR4_BUILD_ACCURACY_RULES,
  MIR4_BUILD_CONTROL_RULES,
  MIR4_BUILD_CRITICAL_RULES,
  MIR4_BUILD_DAMAGE_RULES,
  MIR4_BUILD_LEVEL_LIMITS,
  MIR4_BUILD_PENETRATION_RULES,
  MIR4_BUILD_RATE_CAPS,
  MIR4_BUILD_RATING_CURVES,
  MIR4_BUILD_RATING_LIMITS,
  MIR4_BUILD_STATUS_REGISTRY,
  mir4BuildAccuracyVsEvasion,
  mir4BuildAttackIntervalMs,
  mir4BuildBudgetCost,
  mir4BuildCapTempoAndDrain,
  mir4BuildControl,
  mir4BuildCooldownMs,
  mir4BuildCriticalChance,
  mir4BuildCriticalMultiplier,
  mir4BuildDamageBucket,
  mir4BuildDirectPenetration,
  mir4BuildPenetration,
  mir4BuildRatingK,
  mir4BuildRatingToBps,
  mir4BuildSignedRatingDeltaBps,
  mir4BuildTotalBudgetCost,
} from '../../src/sim/mir4/build_balance';

describe('MIR4 build balance', () => {
  it('pins every shared curve and cap as a balance contract', () => {
    expect(MIR4_BUILD_LEVEL_LIMITS).toEqual({ minimum: 1, maximum: 1_000 });
    expect(MIR4_BUILD_RATING_LIMITS).toEqual({ minimum: 0, maximum: 1_000_000_000 });
    expect(MIR4_BUILD_RATING_CURVES).toEqual({
      precision: { baseK: 120, kPerLevel: 8, capBps: 7_500 },
      criticalChance: { baseK: 140, kPerLevel: 10, capBps: 6_000 },
      criticalEvasion: { baseK: 140, kPerLevel: 10, capBps: 7_500 },
      criticalDamage: { baseK: 160, kPerLevel: 12, capBps: 10_000 },
      criticalProtection: { baseK: 160, kPerLevel: 12, capBps: 7_500 },
      damageReduction: { baseK: 180, kPerLevel: 12, capBps: 8_000 },
      penetration: { baseK: 160, kPerLevel: 10, capBps: 8_000 },
      controlSuccess: { baseK: 150, kPerLevel: 10, capBps: 4_000 },
      controlResistance: { baseK: 150, kPerLevel: 10, capBps: 7_500 },
      controlDuration: { baseK: 180, kPerLevel: 12, capBps: 5_000 },
      tenacity: { baseK: 180, kPerLevel: 12, capBps: 7_500 },
    });
    expect(MIR4_BUILD_ACCURACY_RULES).toEqual({
      legacyNeutralHitBps: 10_000,
      contestedBaseHitBps: 9_500,
      minimumHitBps: 5_000,
      maximumHitBps: 9_950,
    });
    expect(MIR4_BUILD_CRITICAL_RULES).toEqual({
      baseMultiplierBps: 15_000,
      minimumMultiplierBps: 10_000,
      maximumMultiplierPveBps: 25_000,
      maximumMultiplierPvpBps: 17_500,
    });
    expect(MIR4_BUILD_DAMAGE_RULES).toEqual({
      minimumOffensiveAddendBps: -8_000,
      maximumOffensiveAddendPveBps: 15_000,
      maximumOffensiveAddendPvpBps: 10_000,
      maximumReductionPveBps: 7_000,
      maximumReductionPvpBps: 6_000,
      minimumFinalMultiplierBps: 2_500,
    });
    expect(MIR4_BUILD_PENETRATION_RULES).toEqual({
      maximumPveBps: 5_000,
      maximumPvpBps: 3_500,
    });
    expect(MIR4_BUILD_CONTROL_RULES).toEqual({
      tenacityChanceWeightBps: 5_000,
      maximumChancePveBps: 10_000,
      maximumChancePvpBps: 9_500,
      maximumDurationMultiplierPveBps: 15_000,
      maximumDurationMultiplierPvpBps: 12_500,
      minimumDurationMultiplierBps: 3_500,
    });
    expect(MIR4_BUILD_RATE_CAPS).toEqual({
      pve: {
        attackSpeedBps: 10_000,
        cooldownReductionBps: 4_000,
        healthDrainBps: 2_000,
        manaDrainBps: 1_500,
      },
      pvp: {
        attackSpeedBps: 6_000,
        cooldownReductionBps: 3_000,
        healthDrainBps: 800,
        manaDrainBps: 600,
      },
    });
  });

  it('scales hyperbolic rating K with level and preserves zero', () => {
    const curve = { baseK: 100, kPerLevel: 10, capBps: 10_000 } as const;

    expect(mir4BuildRatingK(1, curve)).toBe(100);
    expect(mir4BuildRatingK(11, curve)).toBe(200);
    expect(mir4BuildRatingToBps(0, 1, curve)).toBe(0);
    expect(mir4BuildRatingToBps(100, 1, curve)).toBe(5_000);
    expect(mir4BuildRatingToBps(100, 11, curve)).toBe(3_333);
    expect(mir4BuildRatingK(0, curve)).toBe(100);
    expect(mir4BuildRatingK(1_001, curve)).toBe(10_090);
    expect(mir4BuildRatingK(Number.NaN, curve)).toBe(100);
    expect(mir4BuildRatingToBps(-1, 1, curve)).toBe(0);
    expect(mir4BuildRatingToBps(1_000_000_001, 1, curve)).toBe(
      mir4BuildRatingToBps(MIR4_BUILD_RATING_LIMITS.maximum, 1, curve),
    );
    expect(mir4BuildRatingToBps(Number.NaN, 1, curve)).toBe(0);
  });

  it('keeps the precision contest symmetric before hit limits', () => {
    const curve = { baseK: 100, kPerLevel: 5, capBps: 4_000 } as const;
    const advantage = mir4BuildSignedRatingDeltaBps(240, 120, 50, curve);
    const disadvantage = mir4BuildSignedRatingDeltaBps(120, 240, 50, curve);

    expect(advantage).toBeGreaterThan(0);
    expect(disadvantage).toBe(-advantage);
    expect(mir4BuildSignedRatingDeltaBps(240, 240, 50, curve)).toBe(0);
  });

  it('preserves legacy neutral hits while rating contests obey the shared floor and ceiling', () => {
    expect(mir4BuildAccuracyVsEvasion(0, 0, 1)).toEqual({
      hitChanceBps: MIR4_BUILD_ACCURACY_RULES.legacyNeutralHitBps,
      contestDeltaBps: 0,
    });
    expect(mir4BuildAccuracyVsEvasion(1_000_000, 0, 1).hitChanceBps).toBe(
      MIR4_BUILD_ACCURACY_RULES.legacyNeutralHitBps,
    );
    expect(mir4BuildAccuracyVsEvasion(0, 1_000_000, 1).hitChanceBps).toBeGreaterThanOrEqual(
      MIR4_BUILD_ACCURACY_RULES.minimumHitBps,
    );
    expect(MIR4_BUILD_ACCURACY_RULES.minimumHitBps).toBe(5_000);
    expect(mir4BuildAccuracyVsEvasion(1, 0, 1).hitChanceBps).toBe(10_000);
  });

  it('never lowers hit chance when Accuracy increases', () => {
    for (const evasion of [0, 1, 10, 100, 1_000, 1_000_000]) {
      let previous = 0;
      for (const accuracy of [0, 1, 10, 100, 1_000, 1_000_000]) {
        const current = mir4BuildAccuracyVsEvasion(accuracy, evasion, 80, 80).hitChanceBps;
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });

  it('never raises hit chance when Evasion increases', () => {
    for (const accuracy of [0, 1, 10, 100, 1_000, 1_000_000]) {
      let previous = Number.POSITIVE_INFINITY;
      for (const evasion of [0, 1, 10, 100, 1_000, 1_000_000]) {
        const current = mir4BuildAccuracyVsEvasion(accuracy, evasion, 80, 80).hitChanceBps;
        expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
    }
  });

  it('converts each precision rating at its owner level before comparing saturated ratings', () => {
    expect(mir4BuildAccuracyVsEvasion(1_000_000, 999_000, 200, 200).contestDeltaBps).toBe(0);
    expect(mir4BuildAccuracyVsEvasion(1_000, 1_000, 1, 100).contestDeltaBps).toBeGreaterThan(0);
    expect(mir4BuildAccuracyVsEvasion(1_000, 1_000, 100, 1).contestDeltaBps).toBeLessThan(0);
  });

  it('applies critical evasion as a second multiplicative layer', () => {
    expect(mir4BuildCriticalChance(140, 140, 1)).toEqual({
      chanceBeforeEvasionBps: 3_000,
      criticalEvasionBps: 3_750,
      chanceBps: 1_875,
    });
    expect(mir4BuildCriticalChance(0, 1_000, 100).chanceBps).toBe(0);
  });

  it('protects only the critical bonus and enforces the PvP multiplier ceiling', () => {
    expect(mir4BuildCriticalMultiplier(0, 0, 1, 'pve').multiplierBps).toBe(
      MIR4_BUILD_CRITICAL_RULES.baseMultiplierBps,
    );
    expect(mir4BuildCriticalMultiplier(160, 160, 1, 'pve')).toEqual({
      unprotectedMultiplierBps: 20_000,
      criticalProtectionBps: 3_750,
      multiplierBps: 16_250,
    });
    expect(mir4BuildCriticalMultiplier(1_000_000, 0, 1, 'pvp').multiplierBps).toBe(
      MIR4_BUILD_CRITICAL_RULES.maximumMultiplierPvpBps,
    );
    expect(MIR4_BUILD_CRITICAL_RULES.maximumMultiplierPvpBps).toBe(17_500);
  });

  it('combines additive offense with multiplicative diminishing defense', () => {
    expect(
      mir4BuildDamageBucket({
        offensiveAddendsBps: [2_000, 1_000],
        defensiveRating: 180,
        level: 1,
        context: 'pve',
      }),
    ).toEqual({
      offensiveAddendBps: 3_000,
      offensiveMultiplierBps: 13_000,
      damageReductionBps: 3_500,
      finalMultiplierBps: 8_450,
    });
    expect(
      mir4BuildDamageBucket({
        offensiveAddendsBps: [],
        defensiveRating: 0,
        level: 200,
        context: 'pvp',
      }).finalMultiplierBps,
    ).toBe(10_000);

    const authoredReduction = mir4BuildDamageBucket({
      offensiveAddendsBps: [2_000],
      defensiveReductionBps: 1_000,
      level: 80,
      context: 'pve',
    });
    expect(authoredReduction.damageReductionBps).toBe(1_000);
    expect(authoredReduction.finalMultiplierBps).toBe(10_800);
    expect(
      mir4BuildDamageBucket({
        defensiveReductionBps: 10_001,
        level: 80,
        context: 'pve',
      }).damageReductionBps,
    ).toBe(7_000);

    const combined = mir4BuildDamageBucket({
      defensiveReductionBps: 2_000,
      defensiveRating: 180,
      level: 1,
      context: 'pve',
    });
    expect(combined).toMatchObject({
      damageReductionBps: 4_800,
      finalMultiplierBps: 5_200,
    });
  });

  it('gives strictly positive independent gains to both defense lanes in PvE and PvP', () => {
    const cases = [
      {
        context: 'pve' as const,
        ratingOracle: [
          [0, 10_000],
          [570, 9_430],
          [2_149, 7_851],
          [3_289, 6_711],
          [5_711, 4_289],
        ],
      },
      {
        context: 'pvp' as const,
        ratingOracle: [
          [0, 10_000],
          [488, 9_512],
          [1_842, 8_158],
          [2_819, 7_181],
          [4_895, 5_105],
        ],
      },
    ];
    const ratingInputs = [0, 100, 500, 1_000, 5_000];
    const directInputs = [0, 250, 500, 1_000, 2_000];
    const directOracle = [
      [0, 10_000],
      [250, 9_750],
      [500, 9_500],
      [1_000, 9_000],
      [2_000, 8_000],
    ];

    for (const { context, ratingOracle } of cases) {
      const ratingResults = ratingInputs.map((defensiveRating) => {
        const result = mir4BuildDamageBucket({ defensiveRating, level: 80, context });
        return [result.damageReductionBps, result.finalMultiplierBps];
      });
      expect(ratingResults).toEqual(ratingOracle);

      const directResults = directInputs.map((defensiveReductionBps) => {
        const result = mir4BuildDamageBucket({ defensiveReductionBps, level: 80, context });
        return [result.damageReductionBps, result.finalMultiplierBps];
      });
      expect(directResults).toEqual(directOracle);

      for (const results of [ratingResults, directResults]) {
        for (let index = 1; index < results.length; index += 1) {
          expect(results[index][0] - results[index - 1][0]).toBeGreaterThan(0);
          expect(results[index - 1][1] - results[index][1]).toBeGreaterThan(0);
        }
      }
    }
  });

  it('clamps direct reduction at the distinct literal PvE and PvP caps', () => {
    const pveInputs = [6_999, 7_000, 7_001, 100_000];
    const pvpInputs = [5_999, 6_000, 6_001, 7_000];

    expect(
      pveInputs.map((defensiveReductionBps) => {
        const result = mir4BuildDamageBucket({
          defensiveReductionBps,
          level: 80,
          context: 'pve',
        });
        return [result.damageReductionBps, result.finalMultiplierBps];
      }),
    ).toEqual([
      [6_999, 3_001],
      [7_000, 3_000],
      [7_000, 3_000],
      [7_000, 3_000],
    ]);
    expect(
      pvpInputs.map((defensiveReductionBps) => {
        const result = mir4BuildDamageBucket({
          defensiveReductionBps,
          level: 80,
          context: 'pvp',
        });
        return [result.damageReductionBps, result.finalMultiplierBps];
      }),
    ).toEqual([
      [5_999, 4_001],
      [6_000, 4_000],
      [6_000, 4_000],
      [6_000, 4_000],
    ]);
  });

  it('lets penetration protection cancel equal ratings and uses context caps', () => {
    expect(mir4BuildPenetration(160, 160, 1, 'pve').netPenetrationBps).toBe(0);
    expect(mir4BuildPenetration(1_000_000, 0, 1, 'pve').netPenetrationBps).toBeLessThanOrEqual(
      MIR4_BUILD_PENETRATION_RULES.maximumPveBps,
    );
    expect(mir4BuildPenetration(1_000_000, 0, 1, 'pvp').netPenetrationBps).toBeLessThanOrEqual(
      MIR4_BUILD_PENETRATION_RULES.maximumPvpBps,
    );
    expect(mir4BuildDirectPenetration(5_000, 1_500, 'pvp').netPenetrationBps).toBe(3_500);
    expect(mir4BuildDirectPenetration(2_000, 2_000, 'pve').netPenetrationBps).toBe(0);
  });

  it('uses resistance and tenacity for control chance and duration without changing neutral casts', () => {
    const neutral = mir4BuildControl({
      baseChanceBps: 6_500,
      baseDurationMs: 2_000,
      level: 80,
      context: 'pvp',
    });
    const resistant = mir4BuildControl({
      baseChanceBps: 6_500,
      baseDurationMs: 2_000,
      resistanceRating: 800,
      tenacityRating: 800,
      level: 80,
      context: 'pvp',
    });

    expect(neutral.chanceBps).toBe(6_500);
    expect(neutral.durationMs).toBe(2_000);
    expect(resistant.chanceBps).toBeLessThan(neutral.chanceBps);
    expect(resistant.durationMs).toBeLessThan(neutral.durationMs);
    expect(
      mir4BuildControl({
        baseChanceBps: 6_500,
        baseDurationMs: 2_000,
        tenacityRating: 1_000_000_000,
        level: 1,
        context: 'pve',
      }).durationMs,
    ).toBe(700);
    expect(
      mir4BuildControl({
        baseChanceBps: 6_500,
        baseDurationMs: 2_000,
        tenacityRating: 1_000_000_000,
        level: 1,
        context: 'pvp',
      }).durationMs,
    ).toBe(700);
  });

  it('never lets resistance or tenacity increase control chance or duration', () => {
    for (const lane of ['resistanceRating', 'tenacityRating'] as const) {
      let previousChance = Number.POSITIVE_INFINITY;
      let previousDuration = Number.POSITIVE_INFINITY;
      for (const rating of [0, 1, 10, 100, 1_000, 1_000_000]) {
        const current = mir4BuildControl({
          baseChanceBps: 8_000,
          baseDurationMs: 2_000,
          [lane]: rating,
          level: 80,
          context: 'pvp',
        });
        expect(current.chanceBps).toBeLessThanOrEqual(previousChance);
        expect(current.durationMs).toBeLessThanOrEqual(previousDuration);
        previousChance = current.chanceBps;
        previousDuration = current.durationMs;
      }
    }
  });

  it('caps tempo and drain after aggregation and resolves their timings', () => {
    expect(
      mir4BuildCapTempoAndDrain(
        {
          attackSpeedBps: 50_000,
          cooldownReductionBps: 50_000,
          healthDrainBps: 50_000,
          manaDrainBps: 50_000,
        },
        'pvp',
      ),
    ).toEqual(MIR4_BUILD_RATE_CAPS.pvp);
    expect(mir4BuildAttackIntervalMs(1_000, MIR4_BUILD_RATE_CAPS.pve.attackSpeedBps)).toBe(500);
    expect(mir4BuildCooldownMs(1_000, MIR4_BUILD_RATE_CAPS.pve.cooldownReductionBps)).toBe(600);
  });

  it('keeps the compact build registry unique, technical, and budgeted', () => {
    const keys = MIR4_BUILD_STATUS_REGISTRY.map((status) => status.key);
    const canonicalIds = MIR4_BUILD_STATUS_REGISTRY.flatMap((status) =>
      status.canonicalStatusId === null ? [] : [status.canonicalStatusId],
    );

    expect(MIR4_BUILD_STATUS_REGISTRY).toHaveLength(30);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(canonicalIds).size).toBe(canonicalIds.length);
    for (const status of MIR4_BUILD_STATUS_REGISTRY) {
      expect(status.key).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(status.budgetWeight).toBeGreaterThan(0);
      expect(status.budgetUnit).toBeGreaterThan(0);
      expect(status.sources.length).toBeGreaterThan(0);
      expect(status.slots.length).toBeGreaterThan(0);
    }
    expect(
      MIR4_BUILD_STATUS_REGISTRY.map((status) => ({
        key: status.key,
        canonicalStatusId: status.canonicalStatusId,
        family: status.family,
        valueKind: status.valueKind,
        budgetWeight: status.budgetWeight,
        budgetUnit: status.budgetUnit,
        sources: status.sources,
        slots: status.slots,
      })),
    ).toMatchSnapshot('complete opportunity-cost registry');
  });

  it('prices lateral stat choices in deterministic budget thousandths', () => {
    expect(mir4BuildBudgetCost('max-health', 12)).toEqual({
      statusKey: 'max-health',
      admittedValue: 12,
      milliPoints: 1_000,
    });
    expect(mir4BuildBudgetCost('physical-attack', 1).milliPoints).toBe(1_000);
    expect(mir4BuildBudgetCost('attack-speed', 10).milliPoints).toBe(1_400);
    expect(
      mir4BuildTotalBudgetCost([
        ['max-health', 12],
        ['physical-attack', 1],
        ['attack-speed', 10],
      ]),
    ).toBe(3_400);
    expect(mir4BuildBudgetCost('not-a-status', 999).milliPoints).toBe(0);
    expect(mir4BuildBudgetCost('physical-attack', Number.NaN).milliPoints).toBe(0);
    expect(mir4BuildBudgetCost('all-damage', 100).milliPoints).toBe(16_000);
    expect(mir4BuildBudgetCost('all-damage-reduction', 100).milliPoints).toBe(18_000);
    expect(mir4BuildBudgetCost('skill-damage', 100).milliPoints).toBe(12_000);
    expect(mir4BuildBudgetCost('skill-damage-reduction', 100).milliPoints).toBe(13_500);
    expect(mir4BuildBudgetCost('pvp-damage', 100).milliPoints).toBe(14_000);
    expect(mir4BuildBudgetCost('pvp-damage-reduction', 100).milliPoints).toBe(15_500);
  });
});
