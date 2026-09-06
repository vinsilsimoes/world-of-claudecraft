// Pure combat math for the mir4-gameplay-port profile, ported verbatim from the
// source project's server/mir4-authoritative-damage-v1.js,
// server/mir4-combat-data.js (skillManaCost/reducedSkillDamage), and
// server/mir4-skill-4106-stun-v1.js. These formulas are the RULE under the
// mir4-gameplay-port profile (docs/migration/survival-game-port-plan.md,
// "Standing decisions"); never rewrite them into the classic-era formulas in
// ../types.ts, and never change a number without a documented decision.
//
// Host-agnostic pure leaf (no SimContext, no DOM, no node imports). The source
// resolved its hit/crit rolls through a sha256 lane hash; that stays
// server-side there, and HERE every roll is a caller-supplied 0..9999 value so
// the sim integration can draw through the one shared Rng stream like every
// other deterministic system.

import {
  MIR4_BUILD_DAMAGE_RULES,
  type Mir4BuildCombatContext,
  type Mir4BuildDamageBucketResult,
  mir4BuildAccuracyVsEvasion,
  mir4BuildCriticalChance,
  mir4BuildCriticalMultiplier,
  mir4BuildDamageBucket,
  mir4BuildDirectPenetration,
} from './build_balance';

/** The source's basis-point scale: 10000 bps = 100%. */
export const MIR4_BASIS_POINTS = 10_000;
/** The source's mitigation scale: damage * 100 / (100 + effectiveDefense). */
export const MIR4_DEFENSE_SCALE = 100;

/**
 * Rank fallback for the seven reconstructed skills whose extracted rows do not
 * carry a native level-up coefficient. Native rows continue to use their own
 * per-component coefficient; these skills gain the same 2% baseline per rank
 * in both combat and the live tooltip projection.
 */
export function mir4AuthorialSkillRankDamage(baseDamage: number, rank: number): number {
  return mir4SkillRankScaledInteger(baseDamage, rank);
}

export function mir4SkillRankScaleBasisPoints(rank: number): number {
  const safeRank = Math.max(1, Math.min(15, Math.floor(rank)));
  return 10_000 + (safeRank - 1) * 200;
}

/** Shared +2% per-rank fallback for integer damage, healing, duration, and mitigation values. */
export function mir4SkillRankScaledInteger(baseValue: number, rank: number): number {
  const safeBase = Math.max(0, Math.floor(baseValue));
  return Math.floor((safeBase * mir4SkillRankScaleBasisPoints(rank)) / 10_000);
}

/** Neutral per-stat defaults: only criticalOutcome has a nonzero floor (10). */
export const MIR4_NEUTRAL_CRITICAL_OUTCOME = 10;

/**
 * Source status ids (characterStatus keys) the combat math reads. Kept for the
 * Phase 3 bridge between fork Entity stats and these MIR4 columns.
 */
export const MIR4_STATUS_IDS = Object.freeze({
  maxHp: 1,
  maxMana: 6,
  physicalAttack: 20,
  magicAttack: 22,
  physicalDefense: 24,
  magicDefense: 26,
  accuracy: 28,
  dodge: 29,
  critical: 30,
  avoidCritical: 31,
  criticalOutcome: 32,
  criticalDamageReduction: 33,
  pvpDamage: 38,
  pvpDamageReduction: 39,
  monsterDamage: 40,
  bossDamage: 41,
  monsterDamageReduction: 42,
  bossDamageReduction: 43,
  skillDamage: 44,
  skillDamageReduction: 45,
  allDamage: 46,
  allDamageReduction: 47,
  stunSuccess: 48,
  stunResistance: 49,
  recoveryPotion: 94,
  skillCooldownReduction: 95,
  mpCostReduction: 97,
  knockdownSuccess: 119,
  knockdownResistance: 120,
  basicDamage: 159,
  basicDamageReduction: 160,
  huntingExperience: 161,
});

export interface Mir4CombatStats {
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  accuracy: number;
  dodge: number;
  critical: number;
  avoidCritical: number;
  criticalOutcome: number;
  criticalDamageReduction: number;
  penetrationBps: number;
  penetrationDefenseBps: number;
  pvpDamageBps: number;
  pvpDamageReductionBps: number;
  monsterDamageBps: number;
  monsterDamageReductionBps: number;
  bossDamageBps: number;
  bossDamageReductionBps: number;
  allDamageBps: number;
  allDamageReductionBps: number;
  skillDamageBps: number;
  skillDamageReductionBps: number;
  basicDamageBps: number;
  basicDamageReductionBps: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function integer(
  value: number | undefined | null,
  fallback = 0,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = Math.floor(Number(value));
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

const MIR4_COMBAT_STAT_KEYS = [
  'physicalAttack',
  'magicAttack',
  'physicalDefense',
  'magicDefense',
  'accuracy',
  'dodge',
  'critical',
  'avoidCritical',
  'criticalOutcome',
  'criticalDamageReduction',
  'penetrationBps',
  'penetrationDefenseBps',
  'pvpDamageBps',
  'pvpDamageReductionBps',
  'monsterDamageBps',
  'monsterDamageReductionBps',
  'bossDamageBps',
  'bossDamageReductionBps',
  'allDamageBps',
  'allDamageReductionBps',
  'skillDamageBps',
  'skillDamageReductionBps',
  'basicDamageBps',
  'basicDamageReductionBps',
] as const satisfies readonly (keyof Mir4CombatStats)[];

/** Clamps a raw stats bag into combat shape (bps fields cap at 10000). */
export function mir4NormalizeCombatStats(input: Partial<Mir4CombatStats> = {}): Mir4CombatStats {
  const source = input && typeof input === 'object' ? input : {};
  const out = {} as Mir4CombatStats;
  for (const key of MIR4_COMBAT_STAT_KEYS) {
    const maximum = key.endsWith('Bps') ? MIR4_BASIS_POINTS : Number.MAX_SAFE_INTEGER;
    out[key] = integer(
      source[key],
      key === 'criticalOutcome' ? MIR4_NEUTRAL_CRITICAL_OUTCOME : 0,
      0,
      maximum,
    );
  }
  return out;
}

/** The all-zero combat stat bag (criticalOutcome at its neutral floor of 10). */
export const MIR4_NEUTRAL_COMBAT_STATS: Readonly<Mir4CombatStats> = mir4NormalizeCombatStats({});

/**
 * Hit chance in bps. A zero/zero accuracy+dodge pair is a guaranteed hit so
 * legacy/source-neutral actors never gain a 5% miss rate; as soon as either
 * side owns the stat the full formula applies.
 */
export function mir4HitChanceBps(accuracy: number, dodge: number): number {
  const admittedAccuracy = integer(accuracy);
  const admittedDodge = integer(dodge);
  if (admittedAccuracy === 0 && admittedDodge === 0) return MIR4_BASIS_POINTS;
  const delta = admittedAccuracy - admittedDodge;
  return clamp(9500 + delta * 20, 2000, 9950);
}

/** Crit chance in bps: (critical - avoidCritical) * 75, clamped 0..6000. */
export function mir4CriticalChanceBps(critical: number, avoidCritical: number): number {
  const delta = integer(critical) - integer(avoidCritical);
  return clamp(delta * 75, 0, 6000);
}

/** Crit multiplier after STATUS 33 counters STATUS 32, clamped 15000..25000. */
export function mir4CriticalMultiplierBps(
  criticalOutcome = MIR4_NEUTRAL_CRITICAL_OUTCOME,
  criticalDamageReduction = 0,
): number {
  const netOutcome = Math.max(
    0,
    integer(criticalOutcome, MIR4_NEUTRAL_CRITICAL_OUTCOME) - integer(criticalDamageReduction),
  );
  return clamp(15_000 + netOutcome * 100, 15_000, 25_000);
}

export interface Mir4Mitigation {
  damage: number;
  defense: number;
  effectiveDefense: number;
  netPenetrationBps: number;
}

/** Post-mitigation damage: raw * 100 / (100 + effDef), floor, minimum 1 when raw > 0. */
export function mir4DamageAfterDefense(
  rawDamage: number,
  defense: number,
  penetrationBps = 0,
  penetrationDefenseBps = 0,
): Mir4Mitigation {
  const raw = integer(rawDamage);
  if (raw <= 0) {
    return { damage: 0, defense: integer(defense), effectiveDefense: 0, netPenetrationBps: 0 };
  }
  const netPenetrationBps = clamp(
    integer(penetrationBps, 0, 0, MIR4_BASIS_POINTS) -
      integer(penetrationDefenseBps, 0, 0, MIR4_BASIS_POINTS),
    0,
    8000,
  );
  const admittedDefense = integer(defense);
  const effectiveDefense = Math.floor(
    (admittedDefense * (MIR4_BASIS_POINTS - netPenetrationBps)) / MIR4_BASIS_POINTS,
  );
  return {
    damage: Math.max(
      1,
      Math.floor((raw * MIR4_DEFENSE_SCALE) / (MIR4_DEFENSE_SCALE + effectiveDefense)),
    ),
    defense: admittedDefense,
    effectiveDefense,
    netPenetrationBps,
  };
}

export type Mir4TargetKind = 'monster' | 'player' | 'boss';
export type Mir4AttackKind = 'basic' | 'skill';

/** Target and attack-kind multiplier in bps, clamped 1000..30000. */
export function mir4ContextualMultiplierBps(
  attacker: Partial<
    Pick<
      Mir4CombatStats,
      | 'pvpDamageBps'
      | 'monsterDamageBps'
      | 'bossDamageBps'
      | 'allDamageBps'
      | 'skillDamageBps'
      | 'basicDamageBps'
    >
  >,
  defender: Partial<
    Pick<
      Mir4CombatStats,
      | 'pvpDamageReductionBps'
      | 'monsterDamageReductionBps'
      | 'bossDamageReductionBps'
      | 'allDamageReductionBps'
      | 'skillDamageReductionBps'
      | 'basicDamageReductionBps'
    >
  >,
  targetKind: Mir4TargetKind,
  attackKind?: Mir4AttackKind,
): number {
  let addend =
    integer(attacker.allDamageBps) -
    integer(defender.allDamageReductionBps) +
    (attackKind === 'basic'
      ? integer(attacker.basicDamageBps) - integer(defender.basicDamageReductionBps)
      : attackKind === 'skill'
        ? -integer(defender.skillDamageReductionBps)
        : 0);
  if (targetKind === 'player') {
    addend += integer(attacker.pvpDamageBps) - integer(defender.pvpDamageReductionBps);
  } else if (targetKind === 'boss') {
    addend += integer(attacker.bossDamageBps) - integer(defender.bossDamageReductionBps);
  } else {
    addend += integer(attacker.monsterDamageBps) - integer(defender.monsterDamageReductionBps);
  }
  return clamp(MIR4_BASIS_POINTS + addend, 1000, 30_000);
}

/**
 * Aeldrune build lane. Permanent offensive bonuses share one additive bucket;
 * authored reduction percentages form a separate multiplicative layer.
 * Skill Damage shares the offensive bucket with All and contextual damage so
 * build bonuses add instead of multiplying one another accidentally.
 */
export function mir4BuildContextualMultiplierBps(
  attacker: Parameters<typeof mir4ContextualMultiplierBps>[0],
  defender: Parameters<typeof mir4ContextualMultiplierBps>[1],
  targetKind: Mir4TargetKind,
  attackKind: Mir4AttackKind | undefined,
  defenderLevel: number,
): number {
  return mir4BuildContextualBucket(attacker, defender, targetKind, attackKind, defenderLevel)
    .finalMultiplierBps;
}

function mir4BuildContextualBucket(
  attacker: Parameters<typeof mir4ContextualMultiplierBps>[0],
  defender: Parameters<typeof mir4ContextualMultiplierBps>[1],
  targetKind: Mir4TargetKind,
  attackKind: Mir4AttackKind | undefined,
  defenderLevel: number,
): Mir4BuildDamageBucketResult {
  const offensiveAddendsBps = [integer(attacker.allDamageBps)];
  let defensiveReductionBps = integer(defender.allDamageReductionBps);
  if (attackKind === 'basic') {
    offensiveAddendsBps.push(integer(attacker.basicDamageBps));
    defensiveReductionBps += integer(defender.basicDamageReductionBps);
  } else if (attackKind === 'skill') {
    offensiveAddendsBps.push(integer(attacker.skillDamageBps));
    defensiveReductionBps += integer(defender.skillDamageReductionBps);
  }
  if (targetKind === 'player') {
    offensiveAddendsBps.push(integer(attacker.pvpDamageBps));
    defensiveReductionBps += integer(defender.pvpDamageReductionBps);
  } else if (targetKind === 'boss') {
    offensiveAddendsBps.push(integer(attacker.bossDamageBps));
    defensiveReductionBps += integer(defender.bossDamageReductionBps);
  } else {
    offensiveAddendsBps.push(integer(attacker.monsterDamageBps));
    defensiveReductionBps += integer(defender.monsterDamageReductionBps);
  }
  return mir4BuildDamageBucket({
    offensiveAddendsBps,
    defensiveReductionBps,
    level: defenderLevel,
    context: targetKind === 'player' ? 'pvp' : 'pve',
  });
}

export interface Mir4BuildDamageContext {
  readonly attackerLevel: number;
  readonly defenderLevel: number;
}

export interface Mir4ResolveDamageInput {
  rawDamage: number;
  channel?: 'physical' | 'magic';
  attacker: Partial<Mir4CombatStats>;
  defender: Partial<Mir4CombatStats>;
  targetKind?: Mir4TargetKind;
  attackKind?: Mir4AttackKind;
  /** Caller-drawn 0..9999 rolls; forceHit/forceCritical pin the outcome for tests. */
  hitRoll?: number;
  criticalRoll?: number;
  forceHit?: boolean;
  forceCritical?: boolean;
  /** Explicit compatibility outcomes for source actors whose final native
   * admission formula is unavailable. Values are still clamped defensively. */
  hitChanceBpsOverride?: number;
  criticalChanceBpsOverride?: number;
  criticalMultiplierBpsOverride?: number;
  /** Opts the live Aeldrune runtime into level-scaled build contests. */
  buildBalance?: Mir4BuildDamageContext;
}

export interface Mir4ResolvedDamage {
  channel: 'physical' | 'magic';
  targetKind: Mir4TargetKind;
  rawDamage: number;
  hit: boolean;
  hitChanceBps: number;
  hitRoll: number;
  critical: boolean;
  criticalChanceBps: number;
  criticalRoll: number;
  criticalMultiplierBps: number;
  contextMultiplierBps: number;
  defense: number;
  effectiveDefense: number;
  netPenetrationBps: number;
  damage: number;
}

/**
 * The full source resolution pipeline with caller-supplied rolls. Legacy
 * callers preserve the source-faithful crit-before-context rounding. The
 * Aeldrune build pipeline resolves its shared additive/context bucket before
 * the critical factor, then applies channel-keyed defense mitigation.
 */
export function mir4ResolveDamage(input: Mir4ResolveDamageInput): Mir4ResolvedDamage {
  const rawDamage = integer(input.rawDamage);
  const channel = input.channel === 'magic' ? 'magic' : 'physical';
  const attacker = mir4NormalizeCombatStats(input.attacker);
  const defender = mir4NormalizeCombatStats(input.defender);
  const targetKind: Mir4TargetKind =
    input.targetKind === 'player' || input.targetKind === 'boss' ? input.targetKind : 'monster';
  const buildContext: Mir4BuildCombatContext = targetKind === 'player' ? 'pvp' : 'pve';
  const attackerLevel = input.buildBalance
    ? integer(input.buildBalance.attackerLevel, 1, 1, 1_000)
    : 1;
  const defenderLevel = input.buildBalance
    ? integer(input.buildBalance.defenderLevel, 1, 1, 1_000)
    : 1;
  const hitChance =
    input.hitChanceBpsOverride === undefined
      ? input.buildBalance
        ? mir4BuildAccuracyVsEvasion(
            attacker.accuracy,
            defender.dodge,
            attackerLevel,
            defenderLevel,
          ).hitChanceBps
        : mir4HitChanceBps(attacker.accuracy, defender.dodge)
      : integer(input.hitChanceBpsOverride, 0, 0, MIR4_BASIS_POINTS);
  const hitRoll =
    input.forceHit === true
      ? 0
      : input.forceHit === false
        ? MIR4_BASIS_POINTS - 1
        : integer(input.hitRoll ?? 0, 0, 0, MIR4_BASIS_POINTS - 1);
  const hit = rawDamage > 0 && hitRoll < hitChance;
  const criticalChance =
    input.criticalChanceBpsOverride === undefined
      ? input.buildBalance
        ? mir4BuildCriticalChance(
            attacker.critical,
            defender.avoidCritical,
            attackerLevel,
            defenderLevel,
          ).chanceBps
        : mir4CriticalChanceBps(attacker.critical, defender.avoidCritical)
      : integer(input.criticalChanceBpsOverride, 0, 0, MIR4_BASIS_POINTS);
  const criticalRoll =
    input.forceCritical === true
      ? 0
      : input.forceCritical === false
        ? MIR4_BASIS_POINTS - 1
        : integer(input.criticalRoll ?? 0, 0, 0, MIR4_BASIS_POINTS - 1);
  const critical =
    hit &&
    (input.forceCritical === true ||
      (input.forceCritical !== false && criticalChance > 0 && criticalRoll < criticalChance));
  const criticalMultiplier =
    input.criticalMultiplierBpsOverride === undefined
      ? input.buildBalance
        ? mir4BuildCriticalMultiplier(
            attacker.criticalOutcome,
            defender.criticalDamageReduction,
            attackerLevel,
            buildContext,
            defenderLevel,
          ).multiplierBps
        : mir4CriticalMultiplierBps(attacker.criticalOutcome, defender.criticalDamageReduction)
      : integer(input.criticalMultiplierBpsOverride, 15_000, 10_000, 50_000);
  const buildContextBucket = input.buildBalance
    ? mir4BuildContextualBucket(
        attacker,
        defender,
        targetKind,
        input.attackKind,
        input.buildBalance.defenderLevel,
      )
    : null;
  const contextMultiplier =
    buildContextBucket?.finalMultiplierBps ??
    mir4ContextualMultiplierBps(attacker, defender, targetKind, input.attackKind);
  const contextualDamage = hit
    ? buildContextBucket
      ? (() => {
          const bucket = buildContextBucket;
          const damageAfterOffense = Math.max(
            1,
            Math.floor((rawDamage * bucket.offensiveMultiplierBps) / MIR4_BASIS_POINTS),
          );
          const damageAfterCritical = critical
            ? Math.max(1, Math.floor((damageAfterOffense * criticalMultiplier) / MIR4_BASIS_POINTS))
            : damageAfterOffense;
          const damageAfterReduction = Math.max(
            1,
            Math.floor(
              (damageAfterCritical * (MIR4_BASIS_POINTS - bucket.damageReductionBps)) /
                MIR4_BASIS_POINTS,
            ),
          );
          if (bucket.finalMultiplierBps > MIR4_BUILD_DAMAGE_RULES.minimumFinalMultiplierBps) {
            return damageAfterReduction;
          }
          // Preserve the shared 25% safety floor without collapsing offense
          // and reduction around the critical rounding stage.
          const minimumContextDamage = Math.max(
            1,
            Math.floor(
              (rawDamage * MIR4_BUILD_DAMAGE_RULES.minimumFinalMultiplierBps) / MIR4_BASIS_POINTS,
            ),
          );
          const minimumAfterCritical = critical
            ? Math.max(
                1,
                Math.floor((minimumContextDamage * criticalMultiplier) / MIR4_BASIS_POINTS),
              )
            : minimumContextDamage;
          return Math.max(damageAfterReduction, minimumAfterCritical);
        })()
      : (() => {
          const criticalDamage = critical
            ? Math.max(1, Math.floor((rawDamage * criticalMultiplier) / MIR4_BASIS_POINTS))
            : rawDamage;
          return Math.max(1, Math.floor((criticalDamage * contextMultiplier) / MIR4_BASIS_POINTS));
        })()
    : 0;
  const penetration = input.buildBalance
    ? mir4BuildDirectPenetration(
        attacker.penetrationBps,
        defender.penetrationDefenseBps,
        buildContext,
      )
    : null;
  const mitigation = mir4DamageAfterDefense(
    contextualDamage,
    channel === 'magic' ? defender.magicDefense : defender.physicalDefense,
    penetration?.netPenetrationBps ?? attacker.penetrationBps,
    penetration ? 0 : defender.penetrationDefenseBps,
  );
  return {
    channel,
    targetKind,
    rawDamage,
    hit,
    hitChanceBps: hitChance,
    hitRoll,
    critical,
    criticalChanceBps: criticalChance,
    criticalRoll,
    criticalMultiplierBps: criticalMultiplier,
    contextMultiplierBps: contextMultiplier,
    defense: mitigation.defense,
    effectiveDefense: mitigation.effectiveDefense,
    netPenetrationBps: mitigation.netPenetrationBps,
    damage: hit ? mitigation.damage : 0,
  };
}

/**
 * MP cost of a skill. skillCostType 2 scales the player's manaCost stat by
 * skillCost/10000; any other cost type is a flat skillCost.
 */
export function mir4SkillManaCost(
  manaCostStat: number,
  skillCost: number,
  skillCostType: number,
): number {
  if (skillCostType === 2) {
    return Math.max(0, Math.floor((integer(manaCostStat) * integer(skillCost)) / 10_000));
  }
  return Math.max(0, integer(skillCost));
}

/** One damage component's coefficient damage: floor(attackPower * coefficient / 10000), min 1. */
export function mir4CoefficientDamage(attackPower: number, coefficient: number): number {
  return Math.max(
    1,
    Math.floor((Math.max(1, integer(attackPower)) * Math.max(0, integer(coefficient))) / 10_000),
  );
}

/** Apply STATUS 44 AddSkillDamage (0..10,000 bps) to a skill's raw damage. */
export function mir4SkillDamageAfterBoost(rawDamage: number, skillDamageBps = 0): number {
  const raw = integer(rawDamage);
  if (raw <= 0) return 0;
  const boost = integer(skillDamageBps, 0, 0, MIR4_BASIS_POINTS);
  const scaled = (BigInt(raw) * BigInt(MIR4_BASIS_POINTS + boost)) / BigInt(MIR4_BASIS_POINTS);
  return scaled > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(scaled);
}

/** Effective stun chance in bps: clamp(base + success - resistance, 0, 10000). */
export function mir4StunChanceBps(
  baseBps: number,
  successBps: number,
  resistanceBps: number,
): number {
  return clamp(integer(baseBps) + integer(successBps) - integer(resistanceBps), 0, 10_000);
}
