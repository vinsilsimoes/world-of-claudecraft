// The mir4-gameplay-port combat pipeline: skill casts and the basic attack,
// resolved with the ported bps formulas (src/sim/mir4/math.ts) against the
// ported datasets (src/sim/content/mir4/), applied through the SHARED classic
// machinery (ctx.dealDamage receives the already-final integer; the stun rides
// the classic stun aura; cooldowns/GCD ride the classic Entity fields in
// seconds). Every roll draws through ctx.rng so offline, server, and headless
// stay byte-identical. Classic characters never reach this module.
//
// Basic attack policy is the source's sealed authorial baseline
// (F:\Dev\Survival-Game server/mir4-durable-combat.js
// createP3bB3DurableCombatSpec invariants): coefficient 6000, one impact,
// 650 ms cadence/cooldown, 80 px source range clamped to the class band. The
// ultimate gauge it builds (12 per impact, ultimate at 100) is Phase 3 scope.

import {
  MIR4_SKILL_GLOBAL_COOLDOWN_MS,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
} from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity, PlayerClass } from '../types';
import { dist2d } from '../types';
import {
  type Mir4CombatStats,
  mir4CoefficientDamage,
  mir4ResolveDamage,
  mir4SkillManaCost,
} from './math';
import { advanceMir4Experience, mir4ClassIdForPlayerClass, recalcMir4PlayerStats } from './stats';

const BASIC_ATTACK_COOLDOWN_SECONDS = 0.65;
const BASIC_ATTACK_COEFFICIENT = 6000;
const BASIC_ATTACK_COOLDOWN_KEY = 'mir4_basic';

function mir4AttackerStats(p: Entity): Partial<Mir4CombatStats> {
  const s = p.mir4;
  return {
    accuracy: s?.accuracy ?? 0,
    critical: s?.critical ?? 0,
    criticalOutcome: s?.criticalOutcome ?? 10,
    penetrationBps: 0,
  };
}

function mir4DefenderStats(target: Entity): Partial<Mir4CombatStats> {
  const s = target.mir4;
  return {
    dodge: s?.dodge ?? 0,
    avoidCritical: s?.avoidCritical ?? 0,
    physicalDefense: s?.physicalDefense ?? 0,
    magicDefense: s?.magicDefense ?? 0,
    penetrationDefenseBps: 0,
  };
}

/** One 0..9999 roll from the shared deterministic stream. */
function rollBps(ctx: SimContext): number {
  return Math.floor(ctx.rng.next() * 10_000);
}

function classRangeYards(p: Entity): number {
  const classId = p.mir4?.classId ?? mir4ClassIdForPlayerClass(p.templateId as PlayerClass);
  const def = mir4ClassById(classId);
  return def ? mir4ClassRangeYards(def) : 4;
}

function resolveLivingMobTarget(
  ctx: SimContext,
  pid: number,
  targetId: number | undefined,
): Entity | null {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return null;
  const target = targetId !== undefined ? ctx.entities.get(targetId) : null;
  if (!target || target.kind !== 'mob' || target.dead) return null;
  return target;
}

export interface Mir4CastResult {
  ok: boolean;
  reason?:
    | 'unknown-skill'
    | 'wrong-class'
    | 'not-unlocked'
    | 'no-target'
    | 'out-of-range'
    | 'no-mp'
    | 'on-cooldown'
    | 'on-gcd';
}

/**
 * Cast a mir4 skill. Gates mirror the source admission list (mp, cooldown,
 * range, target-life; cc-immunity joins with the stun land in Phase 3), then
 * each damage component resolves per impact through mir4ResolveDamage.
 */
export function castMir4Skill(
  ctx: SimContext,
  pid: number,
  skillId: number,
  targetId?: number,
): Mir4CastResult {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return { ok: false, reason: 'no-target' };
  const skill = mir4SkillById(skillId);
  if (!skill) return { ok: false, reason: 'unknown-skill' };
  const classId = p.mir4?.classId;
  if (classId !== skill.classId) return { ok: false, reason: 'wrong-class' };
  if (skill.unlock.kind === 'level' && p.level < skill.unlock.level) {
    return { ok: false, reason: 'not-unlocked' };
  }
  const target = resolveLivingMobTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  const rangeYards = classRangeYards(p);
  if (dist2d(p.pos, target.pos) > rangeYards) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (p.cooldowns.has(String(skillId))) return { ok: false, reason: 'on-cooldown' };
  if (p.gcdRemaining > 0) return { ok: false, reason: 'on-gcd' };

  const cost = mir4SkillManaCost(p.mir4?.manaCostStat ?? 0, skill.skillCost, skill.skillCostType);
  if (p.resource < cost) return { ok: false, reason: 'no-mp' };

  // Commit: spend, arm cooldown + the shared 1s GCD (seconds on Entity).
  p.resource -= cost;
  p.cooldowns.set(String(skillId), skill.cooldownMs / 1000);
  p.gcdRemaining = Math.max(p.gcdRemaining, MIR4_SKILL_GLOBAL_COOLDOWN_MS / 1000);

  const channel = 'physical';
  const skillLevel = 1; // source: level 2 sits behind Phase 3 evolution gates
  let anyImpactLanded = false;
  for (const component of skill.damage?.components ?? []) {
    const coefficient = component.coefficient + (skillLevel - 1) * component.levelUpCoefficient;
    const coefficientDamage = mir4CoefficientDamage(p.attackPower, coefficient);
    const impactCount = Math.max(1, component.impactCount);
    const perImpact =
      skill.damage?.allocationMode === 'row-total-impact-vector'
        ? Math.floor(coefficientDamage / impactCount)
        : coefficientDamage;
    for (let impact = 0; impact < impactCount; impact++) {
      const resolved = mir4ResolveDamage({
        rawDamage: perImpact,
        channel,
        attacker: mir4AttackerStats(p),
        defender: mir4DefenderStats(target),
        hitRoll: rollBps(ctx),
        criticalRoll: rollBps(ctx),
      });
      if (!resolved.hit) continue;
      anyImpactLanded = true;
      ctx.dealDamage(
        p,
        target,
        resolved.damage,
        resolved.critical,
        channel,
        skill.displayName,
        'hit',
        true, // no rage: mir4 has no rage economy
      );
      if (target.dead) break;
    }
    if (target.dead) break;
  }

  // Effect landings ride the shared aura machinery (stun via the classic kind).
  const effect = skill.effect;
  const stunSeconds = (effect?.durationMs ?? 0) / 1000;
  if (
    anyImpactLanded &&
    effect &&
    !target.dead &&
    stunSeconds > 0 &&
    effect.effect === 'stun' &&
    !target.ccImmune
  ) {
    ctx.applyAura(target, {
      id: `mir4_${skillId}_stun`,
      name: skill.displayName,
      kind: 'stun',
      remaining: stunSeconds,
      duration: stunSeconds,
      value: 0,
      sourceId: p.id,
      school: channel,
    });
  }
  return { ok: true };
}

/** The authorial basic attack: coefficient 6000, its own 650 ms cadence. */
export function mir4BasicAttack(ctx: SimContext, pid: number, targetId?: number): Mir4CastResult {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return { ok: false, reason: 'no-target' };
  const target = resolveLivingMobTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  if (dist2d(p.pos, target.pos) > classRangeYards(p)) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (p.cooldowns.has(BASIC_ATTACK_COOLDOWN_KEY)) return { ok: false, reason: 'on-cooldown' };

  p.cooldowns.set(BASIC_ATTACK_COOLDOWN_KEY, BASIC_ATTACK_COOLDOWN_SECONDS);
  const damage = mir4CoefficientDamage(p.attackPower, BASIC_ATTACK_COEFFICIENT);
  const resolved = mir4ResolveDamage({
    rawDamage: damage,
    channel: 'physical',
    attacker: mir4AttackerStats(p),
    defender: mir4DefenderStats(target),
    hitRoll: rollBps(ctx),
    criticalRoll: rollBps(ctx),
  });
  if (resolved.hit) {
    ctx.dealDamage(p, target, resolved.damage, resolved.critical, 'physical', null, 'hit', true);
  }
  return { ok: true };
}

/** The PlayerMeta fields the XP grant reads (structural, no sim.ts cycle). */
interface Mir4XpTarget {
  entityId: number;
  xp: number;
  counters: { xpGained: number };
}

/**
 * Kill/quest XP under the mir4 profile: flat mob rewards through the ported
 * level table (BigInt-safe reqExp), replacing the classic XP_TABLE loop.
 * Called from the shared grantXp funnel when the profile is mir4.
 */
export function grantMir4Xp(ctx: SimContext, amount: number, meta: Mir4XpTarget): void {
  const p = ctx.entities.get(meta.entityId);
  if (!p || amount <= 0) return;
  meta.counters.xpGained += amount;
  const result = advanceMir4Experience(p.level, meta.xp, amount);
  meta.xp = result.xp;
  if (result.levelUps > 0) {
    p.level = result.level;
    recalcMir4PlayerStats(p, p.templateId as PlayerClass, result.level);
    ctx.emit({ type: 'levelup', level: p.level, pid: p.id });
  }
  ctx.emit({ type: 'xp', amount, pid: p.id });
}
