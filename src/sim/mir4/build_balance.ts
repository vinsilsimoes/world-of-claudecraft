// Pure build-balance primitives for the mir4-gameplay-port profile.
//
// Every function in this module is deterministic and host-neutral. Ratings are
// intentionally separate from basis-point effects: content can grant large
// level-scaled ratings without letting a single source bypass the shared caps.

/** Integer scale used by all percentages in this module. */
export const MIR4_BUILD_BASIS_POINTS = 10_000;

export type Mir4BuildCombatContext = 'pve' | 'pvp';

export interface Mir4BuildRatingCurve {
  readonly baseK: number;
  readonly kPerLevel: number;
  readonly capBps: number;
}

export const MIR4_BUILD_LEVEL_LIMITS = Object.freeze({
  minimum: 1,
  maximum: 1_000,
});

export const MIR4_BUILD_RATING_LIMITS = Object.freeze({
  minimum: 0,
  maximum: 1_000_000_000,
});

/**
 * K grows with level so ratings must keep growing with content, while the
 * hyperbola prevents an old source from becoming a permanent linear bonus.
 */
export const MIR4_BUILD_RATING_CURVES = Object.freeze({
  precision: Object.freeze({ baseK: 120, kPerLevel: 8, capBps: 7_500 }),
  criticalChance: Object.freeze({ baseK: 140, kPerLevel: 10, capBps: 6_000 }),
  criticalEvasion: Object.freeze({ baseK: 140, kPerLevel: 10, capBps: 7_500 }),
  criticalDamage: Object.freeze({ baseK: 160, kPerLevel: 12, capBps: 10_000 }),
  criticalProtection: Object.freeze({ baseK: 160, kPerLevel: 12, capBps: 7_500 }),
  damageReduction: Object.freeze({ baseK: 180, kPerLevel: 12, capBps: 8_000 }),
  penetration: Object.freeze({ baseK: 160, kPerLevel: 10, capBps: 8_000 }),
  controlSuccess: Object.freeze({ baseK: 150, kPerLevel: 10, capBps: 4_000 }),
  controlResistance: Object.freeze({ baseK: 150, kPerLevel: 10, capBps: 7_500 }),
  controlDuration: Object.freeze({ baseK: 180, kPerLevel: 12, capBps: 5_000 }),
  tenacity: Object.freeze({ baseK: 180, kPerLevel: 12, capBps: 7_500 }),
} as const satisfies Readonly<Record<string, Mir4BuildRatingCurve>>);

export const MIR4_BUILD_ACCURACY_RULES = Object.freeze({
  legacyNeutralHitBps: MIR4_BUILD_BASIS_POINTS,
  contestedBaseHitBps: 9_500,
  minimumHitBps: 5_000,
  maximumHitBps: 9_950,
});

export const MIR4_BUILD_CRITICAL_RULES = Object.freeze({
  baseMultiplierBps: 15_000,
  minimumMultiplierBps: MIR4_BUILD_BASIS_POINTS,
  maximumMultiplierPveBps: 25_000,
  maximumMultiplierPvpBps: 17_500,
});

export const MIR4_BUILD_DAMAGE_RULES = Object.freeze({
  minimumOffensiveAddendBps: -8_000,
  maximumOffensiveAddendPveBps: 15_000,
  maximumOffensiveAddendPvpBps: 10_000,
  maximumReductionPveBps: 7_000,
  maximumReductionPvpBps: 6_000,
  minimumFinalMultiplierBps: 2_500,
});

export const MIR4_BUILD_PENETRATION_RULES = Object.freeze({
  maximumPveBps: 5_000,
  maximumPvpBps: 3_500,
});

export const MIR4_BUILD_CONTROL_RULES = Object.freeze({
  tenacityChanceWeightBps: 5_000,
  maximumChancePveBps: MIR4_BUILD_BASIS_POINTS,
  maximumChancePvpBps: 9_500,
  maximumDurationMultiplierPveBps: 15_000,
  maximumDurationMultiplierPvpBps: 12_500,
  minimumDurationMultiplierBps: 3_500,
});

export const MIR4_BUILD_RATE_CAPS = Object.freeze({
  pve: Object.freeze({
    attackSpeedBps: 10_000,
    cooldownReductionBps: 4_000,
    healthDrainBps: 2_000,
    manaDrainBps: 1_500,
  }),
  pvp: Object.freeze({
    attackSpeedBps: 6_000,
    cooldownReductionBps: 3_000,
    healthDrainBps: 800,
    manaDrainBps: 600,
  }),
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function integer(
  value: number | undefined | null,
  fallback = 0,
  minimum = Number.MIN_SAFE_INTEGER,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = Math.floor(Number(value));
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function admittedLevel(level: number): number {
  const parsed = Math.floor(Number(level));
  return Number.isFinite(parsed)
    ? clamp(parsed, MIR4_BUILD_LEVEL_LIMITS.minimum, MIR4_BUILD_LEVEL_LIMITS.maximum)
    : MIR4_BUILD_LEVEL_LIMITS.minimum;
}

function admittedRating(rating: number): number {
  const parsed = Math.floor(Number(rating));
  return Number.isFinite(parsed)
    ? clamp(parsed, MIR4_BUILD_RATING_LIMITS.minimum, MIR4_BUILD_RATING_LIMITS.maximum)
    : MIR4_BUILD_RATING_LIMITS.minimum;
}

function admittedCurve(curve: Mir4BuildRatingCurve): Mir4BuildRatingCurve {
  return {
    baseK: integer(curve.baseK, 1, 1, MIR4_BUILD_RATING_LIMITS.maximum),
    kPerLevel: integer(curve.kPerLevel, 0, 0, MIR4_BUILD_RATING_LIMITS.maximum),
    capBps: integer(curve.capBps, 0, 0, MIR4_BUILD_BASIS_POINTS * 3),
  };
}

/** K for a rating curve at a clamped character level. */
export function mir4BuildRatingK(level: number, curve: Mir4BuildRatingCurve): number {
  const admitted = admittedCurve(curve);
  return Math.min(
    MIR4_BUILD_RATING_LIMITS.maximum,
    admitted.baseK + (admittedLevel(level) - MIR4_BUILD_LEVEL_LIMITS.minimum) * admitted.kPerLevel,
  );
}

/** floor(cap * rating / (rating + K(level))). Zero rating always returns zero. */
export function mir4BuildRatingToBps(
  rating: number,
  level: number,
  curve: Mir4BuildRatingCurve,
): number {
  const admitted = admittedRating(rating);
  if (admitted === 0) return 0;
  const safeCurve = admittedCurve(curve);
  const k = mir4BuildRatingK(level, safeCurve);
  return Math.floor((safeCurve.capBps * admitted) / (admitted + k));
}

/**
 * Symmetric rating contest. Swapping the two ratings negates the result before
 * any caller-specific chance floor or ceiling is applied.
 */
export function mir4BuildSignedRatingDeltaBps(
  positiveRating: number,
  negativeRating: number,
  level: number,
  curve: Mir4BuildRatingCurve,
): number {
  const delta = admittedRating(positiveRating) - admittedRating(negativeRating);
  if (delta === 0) return 0;
  const magnitude = mir4BuildRatingToBps(Math.abs(delta), level, curve);
  return delta > 0 ? magnitude : -magnitude;
}

export interface Mir4BuildAccuracyResult {
  readonly hitChanceBps: number;
  readonly contestDeltaBps: number;
}

/**
 * Accuracy and evasion are converted independently at their owner's level,
 * then compared inside the MIR4 hit limits. Converting the raw difference
 * would make two saturated end-game ratings behave like a fresh level-one
 * rating and would let the higher-level actor borrow the opponent's curve.
 */
export function mir4BuildAccuracyVsEvasion(
  accuracyRating: number,
  evasionRating: number,
  attackerLevel: number,
  defenderLevel = attackerLevel,
): Mir4BuildAccuracyResult {
  const accuracy = admittedRating(accuracyRating);
  const evasion = admittedRating(evasionRating);
  // The legacy contract guarantees hits against zero Evasion. Entering the
  // contested 9,500 base when Accuracy rises from 0 to 1 would otherwise make
  // a positive stat upgrade reduce hit chance.
  if (evasion === 0) {
    return {
      hitChanceBps: MIR4_BUILD_ACCURACY_RULES.legacyNeutralHitBps,
      contestDeltaBps: mir4BuildRatingToBps(
        accuracy,
        attackerLevel,
        MIR4_BUILD_RATING_CURVES.precision,
      ),
    };
  }
  const accuracyBps = mir4BuildRatingToBps(
    accuracy,
    attackerLevel,
    MIR4_BUILD_RATING_CURVES.precision,
  );
  const evasionBps = mir4BuildRatingToBps(
    evasion,
    defenderLevel,
    MIR4_BUILD_RATING_CURVES.precision,
  );
  const contestDeltaBps = accuracyBps - evasionBps;
  return {
    hitChanceBps: clamp(
      MIR4_BUILD_ACCURACY_RULES.contestedBaseHitBps + contestDeltaBps,
      MIR4_BUILD_ACCURACY_RULES.minimumHitBps,
      MIR4_BUILD_ACCURACY_RULES.maximumHitBps,
    ),
    contestDeltaBps,
  };
}

export interface Mir4BuildCriticalChanceResult {
  readonly chanceBeforeEvasionBps: number;
  readonly criticalEvasionBps: number;
  readonly chanceBps: number;
}

/** Critical evasion is an independent multiplicative layer, not a flat subtraction. */
export function mir4BuildCriticalChance(
  criticalRating: number,
  criticalEvasionRating: number,
  attackerLevel: number,
  defenderLevel = attackerLevel,
): Mir4BuildCriticalChanceResult {
  const chanceBeforeEvasionBps = mir4BuildRatingToBps(
    criticalRating,
    attackerLevel,
    MIR4_BUILD_RATING_CURVES.criticalChance,
  );
  const criticalEvasionBps = mir4BuildRatingToBps(
    criticalEvasionRating,
    defenderLevel,
    MIR4_BUILD_RATING_CURVES.criticalEvasion,
  );
  return {
    chanceBeforeEvasionBps,
    criticalEvasionBps,
    chanceBps: Math.floor(
      (chanceBeforeEvasionBps * (MIR4_BUILD_BASIS_POINTS - criticalEvasionBps)) /
        MIR4_BUILD_BASIS_POINTS,
    ),
  };
}

export interface Mir4BuildCriticalMultiplierResult {
  readonly unprotectedMultiplierBps: number;
  readonly criticalProtectionBps: number;
  readonly multiplierBps: number;
}

/**
 * Critical protection reduces only damage above a normal 1.0 hit. This keeps
 * it valuable against the 1.5 critical floor while never turning a critical
 * hit into less than a normal hit.
 */
export function mir4BuildCriticalMultiplier(
  criticalDamageRating: number,
  criticalProtectionRating: number,
  attackerLevel: number,
  context: Mir4BuildCombatContext,
  defenderLevel = attackerLevel,
): Mir4BuildCriticalMultiplierResult {
  const maximumMultiplierBps =
    context === 'pvp'
      ? MIR4_BUILD_CRITICAL_RULES.maximumMultiplierPvpBps
      : MIR4_BUILD_CRITICAL_RULES.maximumMultiplierPveBps;
  const criticalDamageBonusBps = mir4BuildRatingToBps(
    criticalDamageRating,
    attackerLevel,
    MIR4_BUILD_RATING_CURVES.criticalDamage,
  );
  const unprotectedMultiplierBps = Math.min(
    maximumMultiplierBps,
    MIR4_BUILD_CRITICAL_RULES.baseMultiplierBps + criticalDamageBonusBps,
  );
  const criticalProtectionBps = mir4BuildRatingToBps(
    criticalProtectionRating,
    defenderLevel,
    MIR4_BUILD_RATING_CURVES.criticalProtection,
  );
  const protectedBonusBps = Math.floor(
    ((unprotectedMultiplierBps - MIR4_BUILD_BASIS_POINTS) *
      (MIR4_BUILD_BASIS_POINTS - criticalProtectionBps)) /
      MIR4_BUILD_BASIS_POINTS,
  );
  return {
    unprotectedMultiplierBps,
    criticalProtectionBps,
    multiplierBps: clamp(
      MIR4_BUILD_BASIS_POINTS + protectedBonusBps,
      MIR4_BUILD_CRITICAL_RULES.minimumMultiplierBps,
      maximumMultiplierBps,
    ),
  };
}

export interface Mir4BuildDamageBucketInput {
  readonly offensiveAddendsBps?: readonly number[];
  /** Existing official reductions are authored percentages, not ratings. */
  readonly defensiveReductionBps?: number;
  /** Optional future rating lane, combined multiplicatively with direct reduction. */
  readonly defensiveRating?: number;
  readonly level: number;
  readonly context: Mir4BuildCombatContext;
}

export interface Mir4BuildDamageBucketResult {
  readonly offensiveAddendBps: number;
  readonly offensiveMultiplierBps: number;
  readonly damageReductionBps: number;
  readonly finalMultiplierBps: number;
}

/**
 * Offense shares one additive bucket. Defense is then applied as a separate
 * multiplicative layer whose rating has diminishing returns.
 */
export function mir4BuildDamageBucket(
  input: Mir4BuildDamageBucketInput,
): Mir4BuildDamageBucketResult {
  const maximumOffensiveAddendBps =
    input.context === 'pvp'
      ? MIR4_BUILD_DAMAGE_RULES.maximumOffensiveAddendPvpBps
      : MIR4_BUILD_DAMAGE_RULES.maximumOffensiveAddendPveBps;
  const offensiveAddendBps = clamp(
    (input.offensiveAddendsBps ?? []).reduce(
      (sum, value) =>
        sum + integer(value, 0, -MIR4_BUILD_BASIS_POINTS, MIR4_BUILD_BASIS_POINTS * 10),
      0,
    ),
    MIR4_BUILD_DAMAGE_RULES.minimumOffensiveAddendBps,
    maximumOffensiveAddendBps,
  );
  const offensiveMultiplierBps = MIR4_BUILD_BASIS_POINTS + offensiveAddendBps;
  const maximumReductionBps =
    input.context === 'pvp'
      ? MIR4_BUILD_DAMAGE_RULES.maximumReductionPvpBps
      : MIR4_BUILD_DAMAGE_RULES.maximumReductionPveBps;
  // Saturate authored sums. Rejecting 10_001 bps to the fallback zero would
  // make adding one defensive point remove every prior reduction.
  const directReductionBps = clamp(integer(input.defensiveReductionBps), 0, maximumReductionBps);
  const ratingReductionBps = mir4BuildRatingToBps(input.defensiveRating ?? 0, input.level, {
    ...MIR4_BUILD_RATING_CURVES.damageReduction,
    capBps: maximumReductionBps,
  });
  const damageReductionBps = Math.min(
    maximumReductionBps,
    MIR4_BUILD_BASIS_POINTS -
      Math.floor(
        ((MIR4_BUILD_BASIS_POINTS - directReductionBps) *
          (MIR4_BUILD_BASIS_POINTS - ratingReductionBps)) /
          MIR4_BUILD_BASIS_POINTS,
      ),
  );
  const finalMultiplierBps = Math.max(
    MIR4_BUILD_DAMAGE_RULES.minimumFinalMultiplierBps,
    Math.floor(
      (offensiveMultiplierBps * (MIR4_BUILD_BASIS_POINTS - damageReductionBps)) /
        MIR4_BUILD_BASIS_POINTS,
    ),
  );
  return {
    offensiveAddendBps,
    offensiveMultiplierBps,
    damageReductionBps,
    finalMultiplierBps,
  };
}

export interface Mir4BuildPenetrationResult {
  readonly penetrationBps: number;
  readonly protectionBps: number;
  readonly netPenetrationBps: number;
  readonly remainingDefenseBps: number;
}

/** Equal-level penetration and protection ratings cancel because they share one curve. */
export function mir4BuildPenetration(
  penetrationRating: number,
  penetrationProtectionRating: number,
  attackerLevel: number,
  context: Mir4BuildCombatContext,
  defenderLevel = attackerLevel,
): Mir4BuildPenetrationResult {
  const maximumBps =
    context === 'pvp'
      ? MIR4_BUILD_PENETRATION_RULES.maximumPvpBps
      : MIR4_BUILD_PENETRATION_RULES.maximumPveBps;
  const curve = { ...MIR4_BUILD_RATING_CURVES.penetration, capBps: maximumBps };
  const penetrationBps = mir4BuildRatingToBps(penetrationRating, attackerLevel, curve);
  const protectionBps = mir4BuildRatingToBps(penetrationProtectionRating, defenderLevel, curve);
  const netPenetrationBps = clamp(penetrationBps - protectionBps, 0, maximumBps);
  return {
    penetrationBps,
    protectionBps,
    netPenetrationBps,
    remainingDefenseBps: MIR4_BUILD_BASIS_POINTS - netPenetrationBps,
  };
}

/**
 * Compatibility lane for the currently authored percentage-based penetration
 * sources. Future rating sources use mir4BuildPenetration instead.
 */
export function mir4BuildDirectPenetration(
  penetrationBps: number,
  penetrationProtectionBps: number,
  context: Mir4BuildCombatContext,
): Mir4BuildPenetrationResult {
  const maximumBps =
    context === 'pvp'
      ? MIR4_BUILD_PENETRATION_RULES.maximumPvpBps
      : MIR4_BUILD_PENETRATION_RULES.maximumPveBps;
  const offense = clamp(integer(penetrationBps), 0, MIR4_BUILD_BASIS_POINTS);
  const protection = clamp(integer(penetrationProtectionBps), 0, MIR4_BUILD_BASIS_POINTS);
  const netPenetrationBps = clamp(offense - protection, 0, maximumBps);
  return {
    penetrationBps: offense,
    protectionBps: protection,
    netPenetrationBps,
    remainingDefenseBps: MIR4_BUILD_BASIS_POINTS - netPenetrationBps,
  };
}

export interface Mir4BuildControlInput {
  readonly baseChanceBps: number;
  readonly baseDurationMs: number;
  readonly successRating?: number;
  readonly resistanceRating?: number;
  readonly durationRating?: number;
  readonly tenacityRating?: number;
  readonly level: number;
  readonly context: Mir4BuildCombatContext;
}

export interface Mir4BuildControlResult {
  readonly chanceBeforeResistanceBps: number;
  readonly resistanceBps: number;
  readonly tenacityBps: number;
  readonly chanceBps: number;
  readonly durationBonusBps: number;
  readonly durationMultiplierBps: number;
  readonly durationMs: number;
}

/**
 * Resistance and tenacity are separate multiplicative chance layers. Tenacity
 * has half weight against application chance and full weight against duration.
 */
export function mir4BuildControl(input: Mir4BuildControlInput): Mir4BuildControlResult {
  const maximumChanceBps =
    input.context === 'pvp'
      ? MIR4_BUILD_CONTROL_RULES.maximumChancePvpBps
      : MIR4_BUILD_CONTROL_RULES.maximumChancePveBps;
  const successBps = mir4BuildRatingToBps(
    input.successRating ?? 0,
    input.level,
    MIR4_BUILD_RATING_CURVES.controlSuccess,
  );
  const chanceBeforeResistanceBps = clamp(
    integer(input.baseChanceBps, 0, 0, MIR4_BUILD_BASIS_POINTS) + successBps,
    0,
    maximumChanceBps,
  );
  const resistanceBps = mir4BuildRatingToBps(
    input.resistanceRating ?? 0,
    input.level,
    MIR4_BUILD_RATING_CURVES.controlResistance,
  );
  const tenacityBps = mir4BuildRatingToBps(
    input.tenacityRating ?? 0,
    input.level,
    MIR4_BUILD_RATING_CURVES.tenacity,
  );
  const tenacityChanceBps = Math.floor(
    (tenacityBps * MIR4_BUILD_CONTROL_RULES.tenacityChanceWeightBps) / MIR4_BUILD_BASIS_POINTS,
  );
  const afterResistanceBps = Math.floor(
    (chanceBeforeResistanceBps * (MIR4_BUILD_BASIS_POINTS - resistanceBps)) /
      MIR4_BUILD_BASIS_POINTS,
  );
  const chanceBps = Math.floor(
    (afterResistanceBps * (MIR4_BUILD_BASIS_POINTS - tenacityChanceBps)) / MIR4_BUILD_BASIS_POINTS,
  );
  const durationBonusBps = mir4BuildRatingToBps(
    input.durationRating ?? 0,
    input.level,
    MIR4_BUILD_RATING_CURVES.controlDuration,
  );
  const maximumDurationMultiplierBps =
    input.context === 'pvp'
      ? MIR4_BUILD_CONTROL_RULES.maximumDurationMultiplierPvpBps
      : MIR4_BUILD_CONTROL_RULES.maximumDurationMultiplierPveBps;
  const durationBeforeTenacityBps = Math.min(
    maximumDurationMultiplierBps,
    MIR4_BUILD_BASIS_POINTS + durationBonusBps,
  );
  const durationMultiplierBps = clamp(
    Math.floor(
      (durationBeforeTenacityBps * (MIR4_BUILD_BASIS_POINTS - tenacityBps)) /
        MIR4_BUILD_BASIS_POINTS,
    ),
    MIR4_BUILD_CONTROL_RULES.minimumDurationMultiplierBps,
    maximumDurationMultiplierBps,
  );
  const baseDurationMs = integer(input.baseDurationMs, 0, 0, Number.MAX_SAFE_INTEGER);
  return {
    chanceBeforeResistanceBps,
    resistanceBps,
    tenacityBps,
    chanceBps,
    durationBonusBps,
    durationMultiplierBps,
    durationMs:
      baseDurationMs === 0
        ? 0
        : Math.max(
            1,
            Math.floor((baseDurationMs * durationMultiplierBps) / MIR4_BUILD_BASIS_POINTS),
          ),
  };
}

export interface Mir4BuildRateInput {
  readonly attackSpeedBps?: number;
  readonly cooldownReductionBps?: number;
  readonly healthDrainBps?: number;
  readonly manaDrainBps?: number;
}

export interface Mir4BuildCappedRates {
  readonly attackSpeedBps: number;
  readonly cooldownReductionBps: number;
  readonly healthDrainBps: number;
  readonly manaDrainBps: number;
}

/** Apply PvE or PvP hard caps after every source has been aggregated. */
export function mir4BuildCapTempoAndDrain(
  input: Mir4BuildRateInput,
  context: Mir4BuildCombatContext,
): Mir4BuildCappedRates {
  const caps = MIR4_BUILD_RATE_CAPS[context];
  return {
    attackSpeedBps: clamp(integer(input.attackSpeedBps), 0, caps.attackSpeedBps),
    cooldownReductionBps: clamp(integer(input.cooldownReductionBps), 0, caps.cooldownReductionBps),
    healthDrainBps: clamp(integer(input.healthDrainBps), 0, caps.healthDrainBps),
    manaDrainBps: clamp(integer(input.manaDrainBps), 0, caps.manaDrainBps),
  };
}

/** Attack speed is additive speed, so +10000 bps halves the base interval. */
export function mir4BuildAttackIntervalMs(baseIntervalMs: number, attackSpeedBps: number): number {
  const base = integer(baseIntervalMs, 0, 0, Number.MAX_SAFE_INTEGER);
  if (base === 0) return 0;
  const speed = integer(attackSpeedBps, 0, 0, MIR4_BUILD_RATE_CAPS.pve.attackSpeedBps);
  return Math.max(
    1,
    Math.floor((base * MIR4_BUILD_BASIS_POINTS) / (MIR4_BUILD_BASIS_POINTS + speed)),
  );
}

/** Cooldown reduction subtracts from the base cooldown after its shared cap. */
export function mir4BuildCooldownMs(baseCooldownMs: number, cooldownReductionBps: number): number {
  const base = integer(baseCooldownMs, 0, 0, Number.MAX_SAFE_INTEGER);
  if (base === 0) return 0;
  const reduction = integer(
    cooldownReductionBps,
    0,
    0,
    MIR4_BUILD_RATE_CAPS.pve.cooldownReductionBps,
  );
  return Math.max(
    1,
    Math.floor((base * (MIR4_BUILD_BASIS_POINTS - reduction)) / MIR4_BUILD_BASIS_POINTS),
  );
}

export type Mir4BuildStatusFamily =
  | 'resource'
  | 'power'
  | 'defense'
  | 'precision'
  | 'critical'
  | 'amplification'
  | 'penetration'
  | 'control'
  | 'tempo'
  | 'sustain';

export type Mir4BuildStatusValueKind = 'flat' | 'rating' | 'basis-points';
export type Mir4BuildStatusSource =
  | 'class'
  | 'level'
  | 'equipment'
  | 'mount'
  | 'spirit'
  | 'codex'
  | 'training'
  | 'collection';
export type Mir4BuildStatusSlot =
  | 'weapon'
  | 'accessory'
  | 'armor'
  | 'protection'
  | 'mount'
  | 'spirit'
  | 'codex'
  | 'training';

export interface Mir4BuildStatusDefinition {
  readonly key: string;
  readonly canonicalStatusId: number | null;
  readonly family: Mir4BuildStatusFamily;
  readonly valueKind: Mir4BuildStatusValueKind;
  /** Relative opportunity cost after the value is normalized by budgetUnit. */
  readonly budgetWeight: number;
  /** Raw status units represented by one budget unit. */
  readonly budgetUnit: number;
  readonly sources: readonly Mir4BuildStatusSource[];
  readonly slots: readonly Mir4BuildStatusSlot[];
}

export interface Mir4BuildBudgetResult {
  readonly statusKey: string;
  readonly admittedValue: number;
  /** Thousandths of one budget point, kept integral for deterministic generation. */
  readonly milliPoints: number;
}

const CORE_SOURCES = [
  'class',
  'level',
  'equipment',
  'mount',
  'spirit',
  'codex',
  'training',
  'collection',
] as const;
const SYSTEM_SOURCES = ['equipment', 'mount', 'spirit', 'codex', 'training', 'collection'] as const;
const OFFENSE_SLOTS = ['weapon', 'accessory', 'spirit', 'codex', 'training'] as const;
const DEFENSE_SLOTS = ['armor', 'protection', 'mount', 'codex', 'training'] as const;
const FLEX_SLOTS = [
  'weapon',
  'accessory',
  'armor',
  'protection',
  'mount',
  'spirit',
  'codex',
  'training',
] as const;

/**
 * Compact registry for build generation. Keys are technical contracts, not UI
 * text. A null status id marks a derived field that needs an aggregation seam.
 */
export const MIR4_BUILD_STATUS_REGISTRY: readonly Mir4BuildStatusDefinition[] = Object.freeze([
  {
    key: 'max-health',
    canonicalStatusId: 1,
    family: 'resource',
    valueKind: 'flat',
    budgetWeight: 1,
    budgetUnit: 12,
    sources: CORE_SOURCES,
    slots: FLEX_SLOTS,
  },
  {
    key: 'max-mana',
    canonicalStatusId: 6,
    family: 'resource',
    valueKind: 'flat',
    budgetWeight: 0.75,
    budgetUnit: 8,
    sources: CORE_SOURCES,
    slots: ['accessory', 'armor', 'spirit', 'codex', 'training'],
  },
  {
    key: 'physical-attack',
    canonicalStatusId: 20,
    family: 'power',
    valueKind: 'flat',
    budgetWeight: 1,
    budgetUnit: 1,
    sources: CORE_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'magic-attack',
    canonicalStatusId: 22,
    family: 'power',
    valueKind: 'flat',
    budgetWeight: 1,
    budgetUnit: 1,
    sources: CORE_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'physical-defense',
    canonicalStatusId: 24,
    family: 'defense',
    valueKind: 'flat',
    budgetWeight: 0.9,
    budgetUnit: 1,
    sources: CORE_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'magic-defense',
    canonicalStatusId: 26,
    family: 'defense',
    valueKind: 'flat',
    budgetWeight: 0.9,
    budgetUnit: 1,
    sources: CORE_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'accuracy',
    canonicalStatusId: 28,
    family: 'precision',
    valueKind: 'rating',
    budgetWeight: 0.8,
    budgetUnit: 1,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'evasion',
    canonicalStatusId: 29,
    family: 'precision',
    valueKind: 'rating',
    budgetWeight: 1,
    budgetUnit: 1,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'critical-chance',
    canonicalStatusId: 30,
    family: 'critical',
    valueKind: 'rating',
    budgetWeight: 1,
    budgetUnit: 1,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'critical-evasion',
    canonicalStatusId: 31,
    family: 'critical',
    valueKind: 'rating',
    budgetWeight: 1.1,
    budgetUnit: 1,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'critical-damage',
    canonicalStatusId: 32,
    family: 'critical',
    valueKind: 'rating',
    budgetWeight: 1.25,
    budgetUnit: 1,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'critical-damage-protection',
    canonicalStatusId: 33,
    family: 'critical',
    valueKind: 'rating',
    budgetWeight: 1.25,
    budgetUnit: 1,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'all-damage',
    canonicalStatusId: 46,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.6,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'all-damage-reduction',
    canonicalStatusId: 47,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.8,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'skill-damage',
    canonicalStatusId: 44,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.2,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'skill-damage-reduction',
    canonicalStatusId: 45,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.35,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'basic-damage',
    canonicalStatusId: 159,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.1,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'basic-damage-reduction',
    canonicalStatusId: 160,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.25,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'pvp-damage',
    canonicalStatusId: 38,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.4,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'pvp-damage-reduction',
    canonicalStatusId: 39,
    family: 'amplification',
    valueKind: 'basis-points',
    budgetWeight: 1.55,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'penetration',
    canonicalStatusId: null,
    family: 'penetration',
    valueKind: 'basis-points',
    budgetWeight: 1.4,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'penetration-protection',
    canonicalStatusId: null,
    family: 'penetration',
    valueKind: 'basis-points',
    budgetWeight: 1.5,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'control-success',
    canonicalStatusId: 48,
    family: 'control',
    valueKind: 'basis-points',
    budgetWeight: 1.25,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'control-resistance',
    canonicalStatusId: 49,
    family: 'control',
    valueKind: 'basis-points',
    budgetWeight: 1.25,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'control-duration',
    canonicalStatusId: 153,
    family: 'control',
    valueKind: 'basis-points',
    budgetWeight: 1.35,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: OFFENSE_SLOTS,
  },
  {
    key: 'tenacity',
    canonicalStatusId: null,
    family: 'control',
    valueKind: 'rating',
    budgetWeight: 1.5,
    budgetUnit: 1,
    sources: SYSTEM_SOURCES,
    slots: DEFENSE_SLOTS,
  },
  {
    key: 'attack-speed',
    canonicalStatusId: null,
    family: 'tempo',
    valueKind: 'basis-points',
    budgetWeight: 1.4,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: ['weapon', 'accessory', 'mount', 'spirit', 'codex', 'training'],
  },
  {
    key: 'cooldown-reduction',
    canonicalStatusId: 95,
    family: 'tempo',
    valueKind: 'basis-points',
    budgetWeight: 1.7,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: ['accessory', 'spirit', 'codex', 'training'],
  },
  {
    key: 'health-drain',
    canonicalStatusId: 80,
    family: 'sustain',
    valueKind: 'basis-points',
    budgetWeight: 1.8,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: ['weapon', 'accessory', 'spirit', 'codex'],
  },
  {
    key: 'mana-drain',
    canonicalStatusId: 81,
    family: 'sustain',
    valueKind: 'basis-points',
    budgetWeight: 1.5,
    budgetUnit: 10,
    sources: SYSTEM_SOURCES,
    slots: ['weapon', 'accessory', 'spirit', 'codex'],
  },
]);

const MIR4_BUILD_STATUS_BY_KEY = new Map(
  MIR4_BUILD_STATUS_REGISTRY.map((definition) => [definition.key, definition] as const),
);

/**
 * Convert one raw stat amount into deterministic item-budget thousandths.
 * Unknown keys and non-positive values spend nothing, so content validators
 * can fail closed without propagating NaN into generated equipment.
 */
export function mir4BuildBudgetCost(statusKey: string, rawValue: number): Mir4BuildBudgetResult {
  const definition = MIR4_BUILD_STATUS_BY_KEY.get(statusKey);
  const admittedValue = integer(rawValue, 0, 0, MIR4_BUILD_RATING_LIMITS.maximum);
  if (!definition || admittedValue === 0) {
    return { statusKey, admittedValue: 0, milliPoints: 0 };
  }
  const milliWeight = Math.max(1, Math.round(definition.budgetWeight * 1_000));
  return {
    statusKey,
    admittedValue,
    milliPoints: Math.ceil((admittedValue * milliWeight) / definition.budgetUnit),
  };
}

/** Sum a prospective roll or item variant through the shared build budget. */
export function mir4BuildTotalBudgetCost(
  values: Iterable<readonly [statusKey: string, rawValue: number]>,
): number {
  let milliPoints = 0;
  for (const [statusKey, rawValue] of values) {
    milliPoints += mir4BuildBudgetCost(statusKey, rawValue).milliPoints;
  }
  return milliPoints;
}
