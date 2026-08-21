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
// createP3bB3DurableCombatSpec invariants and the per-class P4 builders):
// coefficient, authored impact offset, cadence, gauge gain, and the ultimate
// all come from MIR4_CLASS_COMBAT_SPECS (src/sim/content/mir4/classes.ts).

import {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  MIR4_CLASS_COMBAT_SPECS,
  MIR4_SKILL_GLOBAL_COOLDOWN_MS,
  MIR4_SKILL_LEVEL_CAPS,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
} from '../content/mir4';
import { mir4ArcMobTemplate } from '../content/mir4/arc_mobs';
import { MIR4_MOBS } from '../content/mir4/mobs';
import type { SimContext } from '../sim_context';
import type { Entity, PlayerClass } from '../types';
import { dist2d } from '../types';
import { refreshMir4KnownAbilities } from './action_abilities';
import {
  applyMir4Effect,
  mir4AoESecondaryTargets,
  mir4AttackMultiplier,
  mir4DamageTakenAddend,
  mir4EffectKindOf,
  mir4SecondaryBps,
} from './effects';
import {
  type Mir4CombatStats,
  type Mir4TargetKind,
  mir4CoefficientDamage,
  mir4ResolveDamage,
  mir4SkillDamageAfterBoost,
  mir4SkillManaCost,
  mir4StunChanceBps,
} from './math';
import { mir4NativeVfxCue } from './native_vfx';
import { resolveMir4PlayerDamageWithSpirit } from './spirit_combat';
import {
  advanceMir4Experience,
  mir4ClassIdForPlayerClass,
  mir4RecalcClassOf,
  recalcMir4PlayerStats,
} from './stats';

const BASIC_ATTACK_COOLDOWN_KEY = 'mir4_basic';

function mir4AttackerStats(p: Entity): Partial<Mir4CombatStats> {
  const s = p.mir4;
  return {
    accuracy: s?.accuracy ?? 0,
    critical: s?.critical ?? 0,
    criticalOutcome: s?.criticalOutcome ?? 10,
    penetrationBps: s?.penetrationBps ?? 0,
    bossDamageBps: s?.bossDamageBps ?? 0,
  };
}

function mir4MobTemplateFor(ctx: SimContext, target: Entity) {
  return (
    MIR4_MOBS[target.templateId as string] ??
    ctx.mir4RuntimeMobTemplates.get(target.templateId) ??
    mir4ArcMobTemplate(target.templateId)
  );
}

function mir4TargetKind(target: Entity): Mir4TargetKind {
  if (target.kind === 'player') return 'player';
  return target.mobBoss ? 'boss' : 'monster';
}

function mir4DefenderStats(ctx: SimContext, target: Entity): Partial<Mir4CombatStats> {
  const s = target.mir4;
  const template = target.mobBoss ? mir4MobTemplateFor(ctx, target) : undefined;
  return {
    dodge: s?.dodge ?? 0,
    avoidCritical: s?.avoidCritical ?? 0,
    physicalDefense: s?.physicalDefense ?? 0,
    magicDefense: s?.magicDefense ?? 0,
    penetrationDefenseBps: 0,
    bossDamageReductionBps: template?.mir4BossDamageReductionBps ?? 0,
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
    | 'on-gcd'
    | 'utility-not-ready';
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
  // Self utilities (2503 shield, 3503 heal) need no target; everything else
  // does. The utility readiness rules mirror the source's applyActorUtility:
  // a shield refuses while one is up, a heal refuses at full health.
  const isSelfUtility =
    skill.effect?.effect === 'magic-shield' || skill.effect?.effect === 'heal-pulse';
  const target = isSelfUtility
    ? null
    : resolveLivingMobTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!isSelfUtility && !target) return { ok: false, reason: 'no-target' };
  if (isSelfUtility) {
    if (skill.effect?.effect === 'magic-shield' && (p.mir4Shield?.remaining ?? 0) > 0) {
      return { ok: false, reason: 'utility-not-ready' };
    }
    if (skill.effect?.effect === 'heal-pulse' && p.hp >= p.maxHp) {
      return { ok: false, reason: 'utility-not-ready' };
    }
  }
  const rangeYards = classRangeYards(p);
  if (target && dist2d(p.pos, target.pos) > rangeYards) {
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
  // Skill level from the persisted per-skill state, fail-closed against the
  // frozen caps: an id without a cap entry (or past it) always resolves to 1.
  const meta = ctx.players.get(pid);
  const rawLevel = meta?.mir4SkillLevels?.[skillId] ?? 1;
  const cap = MIR4_SKILL_LEVEL_CAPS[classId ?? 0]?.[skillId] ?? 1;
  const skillLevel = Math.min(Math.max(1, Math.floor(rawLevel)), cap);
  let anyImpactLanded = false;
  let totalRawDamage = 0;
  let spiritProcAttempted = false;

  // Authorial skills (the 7 source rebuilds) resolve through their policy:
  // hybrid sums the channels, impactCount is presentation-only cardinality.
  const policy = MIR4_AUTHORIAL_SKILL_POLICIES[skillId];
  if (policy) {
    const phys = Math.floor((p.attackPower * (policy.damage.physicalCoefficient ?? 0)) / 10_000);
    const magic = Math.floor((p.spellPower * (policy.damage.magicCoefficient ?? 0)) / 10_000);
    totalRawDamage = mir4SkillDamageAfterBoost(Math.max(1, phys + magic), p.mir4?.skillDamageBps);
    const hitRoll = rollBps(ctx);
    const criticalRoll = rollBps(ctx);
    const spiritDamage = resolveMir4PlayerDamageWithSpirit(ctx, p, target!, {
      rawDamage: Math.floor(totalRawDamage * (1 + mir4DamageTakenAddend(target!))),
      channel: 'physical',
      attacker: mir4AttackerStats(p),
      defender: mir4DefenderStats(ctx, target!),
      targetKind: mir4TargetKind(target!),
      hitRoll,
      criticalRoll,
      allowSpiritProc: !spiritProcAttempted,
    });
    const resolved = spiritDamage.resolved;
    spiritProcAttempted ||= spiritDamage.attempted;
    if (resolved.hit) {
      anyImpactLanded = true;
      ctx.dealDamage(
        p,
        target!,
        resolved.damage,
        resolved.critical,
        'physical',
        skill.displayName,
        'hit',
        true,
      );
    }
  }

  for (const component of skill.damage?.components ?? []) {
    const coefficient = component.coefficient + (skillLevel - 1) * component.levelUpCoefficient;
    // damageType 2 rides the magic channel (spellPower); 1 the physical one.
    const magic = component.damageType === 2;
    const attackPower = magic ? p.spellPower : p.attackPower;
    const componentChannel = magic ? 'magic' : 'physical';
    const coefficientDamage = mir4SkillDamageAfterBoost(
      mir4CoefficientDamage(attackPower, coefficient),
      p.mir4?.skillDamageBps,
    );
    const impactCount = Math.max(1, component.impactCount);
    const perImpact =
      skill.damage?.allocationMode === 'row-total-impact-vector'
        ? Math.floor(coefficientDamage / impactCount)
        : coefficientDamage;
    totalRawDamage += perImpact * impactCount;
    for (let impact = 0; impact < impactCount; impact++) {
      // The source applies the target's damage-taken addend (defense-break +
      // burn magnitudes) to the raw damage BEFORE the resolve pipeline.
      const rawWithTaken = Math.floor(perImpact * (1 + mir4DamageTakenAddend(target!)));
      const hitRoll = rollBps(ctx);
      const criticalRoll = rollBps(ctx);
      const spiritDamage = resolveMir4PlayerDamageWithSpirit(ctx, p, target!, {
        rawDamage: rawWithTaken,
        channel: componentChannel,
        attacker: mir4AttackerStats(p),
        defender: mir4DefenderStats(ctx, target!),
        targetKind: mir4TargetKind(target!),
        hitRoll,
        criticalRoll,
        allowSpiritProc: !spiritProcAttempted,
      });
      const resolved = spiritDamage.resolved;
      spiritProcAttempted ||= spiritDamage.attempted;
      if (!resolved.hit) continue;
      anyImpactLanded = true;
      ctx.dealDamage(
        p,
        target!,
        resolved.damage,
        resolved.critical,
        componentChannel,
        skill.displayName,
        'hit',
        true, // no rage: mir4 has no rage economy
      );
      if (target!.dead) break;
    }
    if (target!.dead) break;
  }

  // The AoE secondaries: up to maxSecondaryTargets other mobs inside the
  // effect radius each take the contract's secondary bps of the cast's total
  // raw damage (soft-capped by target selection, so the full base lands).
  const area = skill.effect?.areaRadiusPx;
  if (area !== undefined && totalRawDamage > 0 && target) {
    const maxTargets = skill.effect?.maxSecondaryTargets ?? 0;
    const bps = skill.effect?.secondaryDamageBasisPoints ?? 0;
    if (maxTargets > 0 && bps > 0) {
      const secondaries = mir4AoESecondaryTargets(ctx, target, area / 16, maxTargets);
      const perSecondary = Math.floor(
        (totalRawDamage * mir4SecondaryBps(bps, maxTargets, secondaries.length)) / 10_000,
      );
      for (const secondary of secondaries) {
        if (secondary.dead) continue;
        const resolved = mir4ResolveDamage({
          rawDamage: Math.floor(perSecondary * (1 + mir4DamageTakenAddend(secondary))),
          channel: 'physical',
          attacker: mir4AttackerStats(p),
          defender: mir4DefenderStats(ctx, secondary),
          targetKind: mir4TargetKind(secondary),
          hitRoll: rollBps(ctx),
          criticalRoll: rollBps(ctx),
        });
        if (resolved.hit) {
          ctx.dealDamage(
            p,
            secondary,
            resolved.damage,
            resolved.critical,
            'physical',
            skill.displayName,
            'hit',
            true,
          );
        }
      }
    }
  }

  // Self utilities land on the caster: the magic shield rides Entity.mir4Shield
  // (consumed by the mob->player pipeline in 3.7), the heal pays immediately.
  if (isSelfUtility && skill.effect) {
    if (skill.effect.effect === 'magic-shield') {
      p.mir4Shield = {
        remaining: (skill.effect.durationMs ?? 0) / 1000,
        magnitude: skill.effect.magnitude ?? 0,
      };
    } else if (skill.effect.effect === 'heal-pulse') {
      // The bps lives in the verbatim long tail (types-as-data), so the read
      // is asserted here, where the utility contract defines it.
      const bps = skill.effect.healMaxHpBasisPoints as number | undefined;
      const heal = Math.floor((p.maxHp * (bps ?? 0)) / 10_000);
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }
    const cue = mir4NativeVfxCue(skill);
    ctx.emit({
      type: 'spellfx',
      sourceId: p.id,
      targetId: p.id,
      school: cue.school,
      fx: cue.fx,
      ability: cue.ability,
    });
    return { ok: true };
  }

  // Effect landing through the mir4 engine (dedup + 750ms immunity tail + the
  // classic stun/slow aura mirror). 4106-style stuns roll their PvE chance
  // (base + stunSuccess - stunResistance; mob resistance is 0 until 3.7).
  const effect = skill.effect;
  const controlOnlySkill = skill.damage === null && policy === undefined;
  if ((anyImpactLanded || controlOnlySkill) && effect && target && !target.dead) {
    const kind = mir4EffectKindOf(effect.effect);
    if (kind) {
      let lands = true;
      if (kind === 'stun' && effect.pveChanceBasisPoints !== undefined) {
        const chance = mir4StunChanceBps(effect.pveChanceBasisPoints, 0, 0);
        lands = rollBps(ctx) < chance;
      }
      if (lands) {
        applyMir4Effect(ctx, target, {
          effectId: `mir4_${skillId}_${effect.effect}`,
          kind,
          durationSeconds: (effect.durationMs ?? 0) / 1000,
          magnitude: effect.magnitude ?? 0,
          name: skill.displayName,
          sourceId: p.id,
        });
      }
    }
  }
  // Presentation remains entirely target-native: alias the logical skill to an
  // existing WoC cue so the current particles, animation and spatial audio
  // pipeline can render it without importing a source-project asset.
  const cue = mir4NativeVfxCue(skill);
  ctx.emit({
    type: 'spellfx',
    sourceId: p.id,
    targetId: target?.id ?? p.id,
    school: cue.school,
    fx: cue.fx,
    ability: cue.ability,
  });
  return { ok: true };
}

/**
 * The per-class basic attack from the ported spec: coefficient, authored
 * impact offset, cadence. The damage resolves AT the offset (rolls then), and
 * each landed impact feeds the ultimate gauge.
 */
export function mir4BasicAttack(ctx: SimContext, pid: number, targetId?: number): Mir4CastResult {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return { ok: false, reason: 'no-target' };
  const target = resolveLivingMobTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  const spec = MIR4_CLASS_COMBAT_SPECS[p.mir4?.classId ?? 1] ?? MIR4_CLASS_COMBAT_SPECS[1]!;
  const rangeYards = Math.min(classRangeYards(p), spec.basic.rangePx / 16);
  if (dist2d(p.pos, target.pos) > rangeYards) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (p.cooldowns.has(BASIC_ATTACK_COOLDOWN_KEY)) return { ok: false, reason: 'on-cooldown' };

  p.cooldowns.set(BASIC_ATTACK_COOLDOWN_KEY, spec.basic.cadenceMs / 1000);
  const attackPower = spec.basic.channel === 'magic' ? p.spellPower : p.attackPower;
  const damage = mir4CoefficientDamage(attackPower, spec.basic.coefficient);
  for (const [index, offsetMs] of spec.basic.impactOffsetMs.entries()) {
    scheduleMir4Impact(ctx, p, target, {
      dueAt: ctx.time + offsetMs / 1000,
      rawDamage: damage,
      channel: spec.basic.channel,
      name: null,
      gaugeGain: spec.basic.gaugeGainPerImpact,
      spiritProcEligible: index === 0,
    });
  }
  return { ok: true };
}

// Potions (the source's mir4_hp_potion / mir4_mp_potion): HP restores 5% of
// max on a 1s group cooldown, MP restores a flat 120 on a 5s group cooldown.
// The slice has no consumable inventory yet, so counts are unlimited and only
// the cooldowns gate use; the Phase 4 inventory port carries the stacks.
export const MIR4_HP_POTION_HEAL_BPS = 500;
export const MIR4_MP_POTION_RESTORE = 120;
const HP_POTION_COOLDOWN_KEY = 'mir4_potion_hp';
const MP_POTION_COOLDOWN_KEY = 'mir4_potion_mp';

export function mir4UsePotion(
  ctx: { entities: Map<number, Entity> },
  pid: number,
  kind: 'hp' | 'mp',
): boolean {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return false;
  if (kind === 'hp') {
    if (p.hp >= p.maxHp) return false; // RESOURCE_FULL: nothing to restore
    if (p.cooldowns.has(HP_POTION_COOLDOWN_KEY)) return false;
    p.cooldowns.set(HP_POTION_COOLDOWN_KEY, 1);
    p.hp = Math.min(p.maxHp, p.hp + Math.floor((p.maxHp * MIR4_HP_POTION_HEAL_BPS) / 10_000));
    return true;
  }
  if (p.resource >= p.maxResource) return false;
  if (p.cooldowns.has(MP_POTION_COOLDOWN_KEY)) return false;
  p.cooldowns.set(MP_POTION_COOLDOWN_KEY, 5);
  p.resource = Math.min(p.maxResource, p.resource + MIR4_MP_POTION_RESTORE);
  return true;
}

const ULTIMATE_COOLDOWN_KEY = 'mir4_ult';

/**
 * The ultimate: requires a full gauge (atomically spent at admission), its
 * own cooldown, and per-impact damage at the authored offsets.
 */
export function mir4Ultimate(ctx: SimContext, pid: number, targetId?: number): Mir4CastResult {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return { ok: false, reason: 'no-target' };
  const target = resolveLivingMobTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  const spec = MIR4_CLASS_COMBAT_SPECS[p.mir4?.classId ?? 1] ?? MIR4_CLASS_COMBAT_SPECS[1]!;
  if ((p.mir4UltGauge ?? 0) < spec.ultimate.requiredGauge) {
    return { ok: false, reason: 'no-mp' };
  }
  const rangeYards = Math.min(classRangeYards(p) * 1.5, spec.ultimate.rangePx / 16);
  if (dist2d(p.pos, target.pos) > rangeYards) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (p.cooldowns.has(ULTIMATE_COOLDOWN_KEY)) return { ok: false, reason: 'on-cooldown' };

  p.mir4UltGauge = 0;
  p.cooldowns.set(ULTIMATE_COOLDOWN_KEY, spec.ultimate.cooldownMs / 1000);
  const attackPower = spec.ultimate.channel === 'magic' ? p.spellPower : p.attackPower;
  const damage = mir4SkillDamageAfterBoost(
    mir4CoefficientDamage(attackPower, spec.ultimate.perImpactCoefficient),
    p.mir4?.skillDamageBps,
  );
  for (const [index, offsetMs] of spec.ultimate.impactOffsetMs.entries()) {
    scheduleMir4Impact(ctx, p, target, {
      dueAt: ctx.time + offsetMs / 1000,
      rawDamage: damage,
      channel: spec.ultimate.channel,
      name: 'Ultimate',
      gaugeGain: 0,
      spiritProcEligible: index === 0,
    });
  }
  return { ok: true };
}

function scheduleMir4Impact(
  ctx: SimContext,
  p: Entity,
  target: Entity,
  impact: {
    dueAt: number;
    rawDamage: number;
    channel: 'physical' | 'magic';
    name: string | null;
    gaugeGain: number;
    spiritProcEligible: boolean;
  },
): void {
  if (!p.mir4PendingImpacts) p.mir4PendingImpacts = [];
  p.mir4PendingImpacts.push({
    dueAt: impact.dueAt,
    sourceId: p.id,
    targetId: target.id,
    rawDamage: impact.rawDamage,
    channel: impact.channel,
    name: impact.name,
    gaugeGain: impact.gaugeGain,
    spiritProcEligible: impact.spiritProcEligible,
  });
}

/** Drain the due authored-offset impacts; rolls are drawn HERE (source clock). */
export function updateMir4PendingImpacts(ctx: SimContext): void {
  for (const e of ctx.entities.values()) {
    const pending = e.mir4PendingImpacts;
    if (!pending || pending.length === 0) continue;
    const due = pending.filter((i) => i.dueAt <= ctx.time);
    if (due.length === 0) continue;
    e.mir4PendingImpacts = pending.filter((i) => i.dueAt > ctx.time);
    for (const impact of due) {
      const source = ctx.entities.get(impact.sourceId);
      const target = ctx.entities.get(impact.targetId);
      if (!source || !target || target.dead || source.dead) continue;
      const raw = Math.floor(impact.rawDamage * (1 + mir4DamageTakenAddend(target)));
      const hitRoll = rollBps(ctx);
      const criticalRoll = rollBps(ctx);
      const spiritDamage = resolveMir4PlayerDamageWithSpirit(ctx, source, target, {
        rawDamage: raw,
        channel: impact.channel,
        attacker: mir4AttackerStats(source),
        defender: mir4DefenderStats(ctx, target),
        targetKind: mir4TargetKind(target),
        hitRoll,
        criticalRoll,
        allowSpiritProc: impact.spiritProcEligible === true,
      });
      const resolved = spiritDamage.resolved;
      if (!resolved.hit) continue;
      ctx.dealDamage(
        source,
        target,
        resolved.damage,
        resolved.critical,
        impact.channel,
        impact.name,
        'hit',
        true,
      );
      if (impact.gaugeGain > 0) {
        source.mir4UltGauge = Math.min(100, (source.mir4UltGauge ?? 0) + impact.gaugeGain);
      }
    }
  }
}

/** The PlayerMeta fields the XP grant reads (structural, no sim.ts cycle). */
interface Mir4XpTarget {
  entityId: number;
  xp: number;
  counters: { xpGained: number; levelUps: number };
  known: import('../sim').ResolvedAbility[];
  mir4SkillLevels?: Record<number, number>;
  mir4Equipment?: { weapon?: number };
  mir4EquipmentInstances?: Record<number, unknown>;
  mir4Mounts?: import('./mounts').Mir4MountState;
  mir4Spirits?: import('./spirits').Mir4SpiritState;
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
    recalcMir4PlayerStats(
      p,
      mir4RecalcClassOf(p),
      result.level,
      meta.mir4Equipment,
      meta.mir4EquipmentInstances,
      meta.mir4Spirits,
      meta.mir4Mounts,
    );
    refreshMir4KnownAbilities(p, meta);
    meta.counters.levelUps += result.levelUps;
    ctx.emit({ type: 'levelup', level: p.level, pid: p.id });
  }
  ctx.emit({ type: 'xp', amount, pid: p.id });
}

/**
 * The mob->player attack under the mir4 profile (3.7): the mob's raw attack
 * cut by any blind it carries, then the full bps pipeline against the
 * PLAYER's own defenses — hit, crit, the player-target contextual lane, and
 * the 100/(100+def) mitigation — with the magic shield's magnitude shaving
 * what lands. Draw order: hit, then crit.
 */
export function mir4MobAttackPlayer(ctx: SimContext, mob: Entity, player: Entity): void {
  if (mob.dead || player.dead) return;
  // The classic shell materializes weapon.min = round(dmg*0.8), a variance the
  // source spawn formula does not have: read the mir4 template's own dmg
  // columns back, falling back to the weapon for unknown templates.
  const template = mir4MobTemplateFor(ctx, mob);
  const baseAttack = template
    ? template.dmgBase + template.dmgPerLevel * (mob.level - 1)
    : mob.weapon.min;
  const raw = Math.max(1, Math.floor(baseAttack * mir4AttackMultiplier(mob)));
  const resolved = mir4ResolveDamage({
    rawDamage: raw,
    channel: 'physical',
    attacker: { accuracy: 0, critical: 0, criticalOutcome: 10 },
    defender: {
      dodge: player.mir4?.dodge ?? 0,
      avoidCritical: player.mir4?.avoidCritical ?? 0,
      physicalDefense: player.mir4?.physicalDefense ?? 0,
    },
    targetKind: 'player',
    hitRoll: rollBps(ctx),
    criticalRoll: rollBps(ctx),
  });
  ctx.dealDamage(mob, player, resolved.damage, resolved.critical, 'physical', null, 'hit', false);
}
