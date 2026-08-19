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

/** The source's basis-point scale: 10000 bps = 100%. */
export const MIR4_BASIS_POINTS = 10_000;
/** The source's mitigation scale: damage * 100 / (100 + effectiveDefense). */
export const MIR4_DEFENSE_SCALE = 100;

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
  pvpDamage: 38,
  bossDamage: 41,
  bossDamageReduction: 43,
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
  penetrationBps: number;
  penetrationDefenseBps: number;
  pvpDamageBps: number;
  pvpDamageReductionBps: number;
  bossDamageBps: number;
  bossDamageReductionBps: number;
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
  'penetrationBps',
  'penetrationDefenseBps',
  'pvpDamageBps',
  'pvpDamageReductionBps',
  'bossDamageBps',
  'bossDamageReductionBps',
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

/** Crit multiplier in bps: 15000 + criticalOutcome * 100, clamped 15000..25000. */
export function mir4CriticalMultiplierBps(criticalOutcome = MIR4_NEUTRAL_CRITICAL_OUTCOME): number {
  return clamp(
    15_000 + integer(criticalOutcome, MIR4_NEUTRAL_CRITICAL_OUTCOME) * 100,
    15_000,
    25_000,
  );
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

/** Context (PvP/boss) multiplier in bps, clamped 1000..30000; monsters are neutral. */
export function mir4ContextualMultiplierBps(
  attacker: Pick<Mir4CombatStats, 'pvpDamageBps' | 'bossDamageBps'>,
  defender: Pick<Mir4CombatStats, 'pvpDamageReductionBps' | 'bossDamageReductionBps'>,
  targetKind: Mir4TargetKind,
): number {
  if (targetKind === 'player') {
    return clamp(
      MIR4_BASIS_POINTS + attacker.pvpDamageBps - defender.pvpDamageReductionBps,
      1000,
      30_000,
    );
  }
  if (targetKind === 'boss') {
    return clamp(
      MIR4_BASIS_POINTS + attacker.bossDamageBps - defender.bossDamageReductionBps,
      1000,
      30_000,
    );
  }
  return MIR4_BASIS_POINTS;
}

export interface Mir4ResolveDamageInput {
  rawDamage: number;
  channel?: 'physical' | 'magic';
  attacker: Partial<Mir4CombatStats>;
  defender: Partial<Mir4CombatStats>;
  targetKind?: Mir4TargetKind;
  /** Caller-drawn 0..9999 rolls; forceHit/forceCritical pin the outcome for tests. */
  hitRoll?: number;
  criticalRoll?: number;
  forceHit?: boolean;
  forceCritical?: boolean;
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
 * The full source resolution pipeline with caller-supplied rolls. Order of
 * operations is source-faithful: hit gate, crit multiplier, context multiplier,
 * then channel-keyed defense mitigation.
 */
export function mir4ResolveDamage(input: Mir4ResolveDamageInput): Mir4ResolvedDamage {
  const rawDamage = integer(input.rawDamage);
  const channel = input.channel === 'magic' ? 'magic' : 'physical';
  const attacker = mir4NormalizeCombatStats(input.attacker);
  const defender = mir4NormalizeCombatStats(input.defender);
  const hitChance = mir4HitChanceBps(attacker.accuracy, defender.dodge);
  const hitRoll =
    input.forceHit === true
      ? 0
      : input.forceHit === false
        ? MIR4_BASIS_POINTS - 1
        : integer(input.hitRoll ?? 0, 0, 0, MIR4_BASIS_POINTS - 1);
  const hit = rawDamage > 0 && hitRoll < hitChance;
  const criticalChance = mir4CriticalChanceBps(attacker.critical, defender.avoidCritical);
  const criticalRoll =
    input.forceCritical === true
      ? 0
      : input.forceCritical === false
        ? MIR4_BASIS_POINTS - 1
        : integer(input.criticalRoll ?? 0, 0, 0, MIR4_BASIS_POINTS - 1);
  const critical = hit && criticalChance > 0 && criticalRoll < criticalChance;
  const criticalMultiplier = mir4CriticalMultiplierBps(attacker.criticalOutcome);
  const criticalDamage = critical
    ? Math.max(1, Math.floor((rawDamage * criticalMultiplier) / MIR4_BASIS_POINTS))
    : rawDamage;
  const targetKind: Mir4TargetKind =
    input.targetKind === 'player' || input.targetKind === 'boss' ? input.targetKind : 'monster';
  const contextMultiplier = mir4ContextualMultiplierBps(attacker, defender, targetKind);
  const contextualDamage = hit
    ? Math.max(1, Math.floor((criticalDamage * contextMultiplier) / MIR4_BASIS_POINTS))
    : 0;
  const mitigation = mir4DamageAfterDefense(
    contextualDamage,
    channel === 'magic' ? defender.magicDefense : defender.physicalDefense,
    attacker.penetrationBps,
    defender.penetrationDefenseBps,
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

/** Effective stun chance in bps: clamp(base + success - resistance, 0, 10000). */
export function mir4StunChanceBps(
  baseBps: number,
  successBps: number,
  resistanceBps: number,
): number {
  return clamp(integer(baseBps) + integer(successBps) - integer(resistanceBps), 0, 10_000);
}
