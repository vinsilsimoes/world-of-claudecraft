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
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
} from '../content/mir4';
import { mir4ArcMobTemplate } from '../content/mir4/arc_mobs';
import { MIR4_MOBS, mir4MobAccuracy } from '../content/mir4/mobs';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4PendingImpact, PlayerClass } from '../types';
import { dist2d } from '../types';
import { refreshMir4KnownAbilities } from './action_abilities';
import { mir4AnimationDurationForContactsMs } from './attack_timeline';
import {
  mir4ControlChanceFromStatuses,
  mir4ControlDurationMs,
  mir4ControlFamilyOf,
} from './control';
import {
  applyMir4Effect,
  mir4AoEHostileTargets,
  mir4AoESecondaryTargets,
  mir4AttackMultiplier,
  mir4DamageTakenAddend,
  mir4EffectKindOf,
  mir4SecondaryBps,
} from './effects';
import {
  type Mir4CombatStats,
  type Mir4TargetKind,
  mir4AuthorialSkillRankDamage,
  mir4CoefficientDamage,
  mir4ResolveDamage,
  mir4SkillDamageAfterBoost,
  mir4SkillManaCost,
  mir4SkillRankScaledInteger,
} from './math';
import { mir4NativeVfxCue } from './native_vfx';
import { cancelMir4QuestObjectiveCastForCombat } from './quest_objective_cast';
import {
  MIR4_SKILL_MAX_LEVEL,
  MIR4_ULTIMATE_UNLOCK_LEVEL,
  mir4SkillUnlockLevel,
} from './skill_progression';
import { resolveMir4PlayerDamageWithSpirit } from './spirit_combat';
import {
  advanceMir4Experience,
  mir4ClassIdForPlayerClass,
  mir4RecalcClassOf,
  recalcMir4PlayerStats,
} from './stats';
import {
  mir4DrainOnDamage,
  mir4ManaRecoveredFromHealing,
  mir4ModifiedManaCost,
  mir4ModifiedPotionAmount,
  mir4ModifiedProgressionReward,
  mir4ModifiedSkillCooldownSeconds,
  mir4ModifiedSkillHealing,
  mir4RecoveryPerTenSeconds,
} from './status_effects';
import { mir4StatusRecordValue } from './status_values';

const BASIC_ATTACK_COOLDOWN_KEY = 'mir4_basic';

export function mir4BasicAttackCadenceSeconds(
  authoredCadenceMs: number,
  attackSpeedBps: number,
): number {
  return authoredCadenceMs / 1000 / (1 + Math.max(0, attackSpeedBps) / 10_000);
}

function mir4AttackerStats(p: Entity): Partial<Mir4CombatStats> {
  const s = p.mir4;
  return {
    accuracy: s?.accuracy ?? 0,
    critical: s?.critical ?? 0,
    criticalOutcome: s?.criticalOutcome ?? 10,
    penetrationBps: s?.penetrationBps ?? 0,
    pvpDamageBps: s?.pvpDamageBps ?? 0,
    monsterDamageBps: s?.monsterDamageBps ?? 0,
    bossDamageBps: s?.bossDamageBps ?? 0,
    allDamageBps: s?.allDamageBps ?? 0,
    skillDamageBps: s?.skillDamageBps ?? 0,
    basicDamageBps:
      mir4StatusRecordValue(s?.statusValues, 143) + mir4StatusRecordValue(s?.statusValues, 159),
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
    criticalDamageReduction: mir4StatusRecordValue(s?.statusValues, 33),
    physicalDefense: s?.physicalDefense ?? 0,
    magicDefense: s?.magicDefense ?? 0,
    penetrationDefenseBps: 0,
    pvpDamageReductionBps: s?.pvpDamageReductionBps ?? 0,
    monsterDamageReductionBps: s?.monsterDamageReductionBps ?? 0,
    bossDamageReductionBps:
      (s?.bossDamageReductionBps ?? 0) + (template?.mir4BossDamageReductionBps ?? 0),
    allDamageReductionBps: s?.allDamageReductionBps ?? 0,
    skillDamageReductionBps: s?.skillDamageReductionBps ?? 0,
    basicDamageReductionBps: mir4StatusRecordValue(s?.statusValues, 160),
  };
}

function applyMir4Drain(player: Entity, landedDamage: number): void {
  if (landedDamage <= 0 || !player.mir4) return;
  const drain = mir4DrainOnDamage(landedDamage, player.mir4.statusValues);
  if (drain.hp > 0) player.hp = Math.min(player.maxHp, player.hp + drain.hp);
  if (drain.mp > 0) {
    player.resource = Math.min(player.maxResource, player.resource + drain.mp);
  }
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

/** Authoritative reach of this character's basic attack. Automation callers
 * share this helper so pursuit stops at the exact same range the cast admits. */
export function mir4BasicAttackRangeYards(p: Entity): number {
  const spec = MIR4_CLASS_COMBAT_SPECS[p.mir4?.classId ?? 1] ?? MIR4_CLASS_COMBAT_SPECS[1];
  if (!spec) return classRangeYards(p);
  return Math.min(classRangeYards(p), spec.basic.rangePx / 16);
}

function resolveLivingHostileTarget(
  ctx: SimContext,
  pid: number,
  targetId: number | undefined,
): Entity | null {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return null;
  const target = targetId !== undefined ? ctx.entities.get(targetId) : null;
  if (!target || target.dead || !ctx.isHostileTo(p, target)) return null;
  return target;
}

function mir4ActionInFlight(player: Entity): boolean {
  return (player.mir4PendingImpacts?.length ?? 0) > 0;
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
  if (p.level < mir4SkillUnlockLevel(skill.slot)) {
    return { ok: false, reason: 'not-unlocked' };
  }
  // Self utilities need no target. Catalog rows that explicitly carry a
  // targetless area resolve around the actor and choose visible enemies
  // deterministically; other offensive rows still require a live target.
  const isSelfUtility =
    skill.effect?.effect === 'magic-shield' || skill.effect?.effect === 'heal-pulse';
  const areaRadiusYards = (skill.effect?.areaRadiusPx ?? 0) / 16;
  const isActorCenteredAoE = !skill.requiresTarget && areaRadiusYards > 0 && !isSelfUtility;
  const maxSecondaryTargets = skill.effect?.maxSecondaryTargets ?? 0;
  const actorCenteredTargets = isActorCenteredAoE
    ? mir4AoEHostileTargets(ctx, p, p, areaRadiusYards, Math.max(1, maxSecondaryTargets + 1))
    : [];
  const target = isSelfUtility
    ? null
    : isActorCenteredAoE
      ? (actorCenteredTargets[0] ?? null)
      : resolveLivingHostileTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!isSelfUtility && !isActorCenteredAoE && !target) {
    return { ok: false, reason: 'no-target' };
  }
  if (isSelfUtility) {
    if (skill.effect?.effect === 'magic-shield' && (p.mir4Shield?.remaining ?? 0) > 0) {
      return { ok: false, reason: 'utility-not-ready' };
    }
    if (skill.effect?.effect === 'heal-pulse' && p.hp >= p.maxHp) {
      return { ok: false, reason: 'utility-not-ready' };
    }
  }
  const rangeYards = classRangeYards(p);
  if (!isActorCenteredAoE && target && dist2d(p.pos, target.pos) > rangeYards) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (!isActorCenteredAoE && target && !ctx.hasLineOfSight(p, target)) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (p.cooldowns.has(String(skillId))) return { ok: false, reason: 'on-cooldown' };
  if (p.gcdRemaining > 0 || mir4ActionInFlight(p)) return { ok: false, reason: 'on-gcd' };

  const cost = mir4ModifiedManaCost(
    mir4SkillManaCost(p.mir4?.manaCostStat ?? 0, skill.skillCost, skill.skillCostType),
    p.mir4?.statusValues,
  );
  if (p.resource < cost) return { ok: false, reason: 'no-mp' };

  // Commit: spend, arm cooldown + the shared 1s GCD (seconds on Entity).
  cancelMir4QuestObjectiveCastForCombat(ctx, p);
  p.resource -= cost;
  p.cooldowns.set(
    String(skillId),
    mir4ModifiedSkillCooldownSeconds(skill.cooldownMs / 1000, p.mir4?.statusValues),
  );
  p.gcdRemaining = Math.max(p.gcdRemaining, MIR4_SKILL_GLOBAL_COOLDOWN_MS / 1000);

  // Skill rank from the authoritative per-skill state. Persistence and the
  // upgrade verb both fail-close class ownership and the shared rank-15 cap.
  const meta = ctx.players.get(pid);
  const rawLevel = meta?.mir4SkillLevels?.[skillId] ?? 1;
  const skillLevel = Math.min(MIR4_SKILL_MAX_LEVEL, Math.max(1, Math.floor(rawLevel)));
  const primaryImpacts: Array<{
    target: Entity;
    rawDamage: number;
    channel: 'physical' | 'magic';
  }> = [];
  let totalRawDamage = 0;
  const areaSecondaries = target
    ? isActorCenteredAoE
      ? actorCenteredTargets.slice(1)
      : areaRadiusYards > 0 && maxSecondaryTargets > 0
        ? mir4AoESecondaryTargets(ctx, p, target, areaRadiusYards, maxSecondaryTargets)
        : []
    : [];

  // Authorial skills keep their aggregate mechanics inside the same immediate
  // action batch as catalog damage components.
  const policy = MIR4_AUTHORIAL_SKILL_POLICIES[skillId];
  if (policy && target) {
    const phys = Math.floor((p.attackPower * (policy.damage.physicalCoefficient ?? 0)) / 10_000);
    const magic = Math.floor((p.spellPower * (policy.damage.magicCoefficient ?? 0)) / 10_000);
    totalRawDamage = mir4SkillDamageAfterBoost(
      mir4AuthorialSkillRankDamage(Math.max(1, phys + magic), skillLevel),
      p.mir4?.skillDamageBps,
    );
    primaryImpacts.push({
      target,
      rawDamage: totalRawDamage,
      channel: policy.damage.damageType === 2 ? 'magic' : 'physical',
    });
  }

  for (const component of skill.damage?.components ?? []) {
    if (!target) break;
    const componentTarget = target;
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
      primaryImpacts.push({
        target: componentTarget,
        rawDamage: perImpact,
        channel: componentChannel,
      });
    }
  }

  const secondaryImpacts: Array<{
    target: Entity;
    rawDamage: number;
    channel: 'physical' | 'magic';
  }> = [];
  if (areaRadiusYards > 0 && totalRawDamage > 0 && target) {
    const bps = skill.effect?.secondaryDamageBasisPoints ?? 0;
    if (maxSecondaryTargets > 0 && bps > 0) {
      const perSecondary = Math.floor(
        (totalRawDamage * mir4SecondaryBps(bps, maxSecondaryTargets, areaSecondaries.length)) /
          10_000,
      );
      for (const secondary of areaSecondaries) {
        if (secondary.dead) continue;
        secondaryImpacts.push({ target: secondary, rawDamage: perSecondary, channel: 'physical' });
      }
    }
  }

  const cue = mir4NativeVfxCue(skill);
  const visualTarget = target?.id ?? p.id;
  const actionPrefix = `${p.id}:skill:${skillId}:${Math.round(ctx.time * 1_000)}`;
  const actionGroups = new Map<number, string>();
  const actionGroupFor = (impactTarget: Entity): string => {
    const existing = actionGroups.get(impactTarget.id);
    if (existing) return existing;
    const created = `${actionPrefix}:${impactTarget.id}`;
    actionGroups.set(impactTarget.id, created);
    return created;
  };
  for (const impact of primaryImpacts) {
    scheduleMir4Impact(ctx, p, impact.target, {
      dueAt: ctx.time,
      rawDamage: impact.rawDamage,
      channel: impact.channel,
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      // Every contact remains eligible until the first one actually lands;
      // the action-group state then closes the single spirit-proc attempt.
      spiritProcEligible: true,
      skillId,
      skillLevel,
      actionGroupId: actionGroupFor(impact.target),
    });
  }
  for (const impact of secondaryImpacts) {
    scheduleMir4Impact(ctx, p, impact.target, {
      dueAt: ctx.time,
      rawDamage: impact.rawDamage,
      channel: impact.channel,
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      skillLevel,
      actionGroupId: actionGroupFor(impact.target),
    });
  }

  if (skill.effect && primaryImpacts.length + secondaryImpacts.length > 0) {
    const damagedTargets = new Map<number, Entity>();
    for (const impact of [...primaryImpacts, ...secondaryImpacts]) {
      damagedTargets.set(impact.target.id, impact.target);
    }
    // The effect resolves after the action's damage contacts. It observes
    // whether ANY contact landed, so a miss on the last hit cannot
    // erase an effect earned by an earlier hit and the effect still cannot
    // amplify damage from the action that applied it.
    for (const effectTarget of damagedTargets.values()) {
      scheduleMir4Impact(ctx, p, effectTarget, {
        dueAt: ctx.time,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        skillLevel,
        applySkillEffect: true,
        effectOnly: true,
        requiresLandedImpact: true,
        actionGroupId: actionGroupFor(effectTarget),
      });
    }
  } else if (primaryImpacts.length === 0 && secondaryImpacts.length === 0 && skill.effect) {
    const effectTargets = isSelfUtility
      ? [p]
      : target
        ? areaRadiusYards > 0
          ? [target, ...areaSecondaries]
          : [target]
        : [];
    for (const effectTarget of effectTargets) {
      scheduleMir4Impact(ctx, p, effectTarget, {
        dueAt: ctx.time,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        skillLevel,
        applySkillEffect: true,
        effectOnly: true,
        actionGroupId: actionGroupFor(effectTarget),
      });
    }
  }
  // Skills keep the original MIR4-port feel: their authoritative result is
  // committed in the cast command, then the existing VFX cue owns the body
  // gesture. Basic attacks and ultimates retain their authored contact-time
  // scheduling below.
  resolveMir4SkillActionImmediately(ctx, p, actionPrefix);
  ctx.emit({
    type: 'spellfx',
    sourceId: p.id,
    targetId: visualTarget,
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
  const target = resolveLivingHostileTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  const spec = MIR4_CLASS_COMBAT_SPECS[p.mir4?.classId ?? 1] ?? MIR4_CLASS_COMBAT_SPECS[1];
  const rangeYards = mir4BasicAttackRangeYards(p);
  if (dist2d(p.pos, target.pos) > rangeYards) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (!ctx.hasLineOfSight(p, target)) return { ok: false, reason: 'out-of-range' };
  if (p.cooldowns.has(BASIC_ATTACK_COOLDOWN_KEY)) return { ok: false, reason: 'on-cooldown' };
  if (p.gcdRemaining > 0 || mir4ActionInFlight(p)) return { ok: false, reason: 'on-gcd' };

  cancelMir4QuestObjectiveCastForCombat(ctx, p);
  p.cooldowns.set(
    BASIC_ATTACK_COOLDOWN_KEY,
    mir4BasicAttackCadenceSeconds(spec.basic.cadenceMs, p.mir4?.mountBasicAttackSpeedBps ?? 0),
  );
  ctx.emit({
    type: 'mir4AttackStart',
    sourceId: p.id,
    targetId: target.id,
    action: 'basic',
    pose: spec.basic.channel === 'magic' ? 'cast' : 'weapon',
    durationMs: mir4AnimationDurationForContactsMs(spec.basic.impactOffsetMs),
  });
  const attackPower = spec.basic.channel === 'magic' ? p.spellPower : p.attackPower;
  const damage = mir4CoefficientDamage(attackPower, spec.basic.coefficient);
  const actionGroupId = `${p.id}:basic:${Math.round(ctx.time * 1_000)}:${target.id}`;
  for (const offsetMs of spec.basic.impactOffsetMs) {
    scheduleMir4Impact(ctx, p, target, {
      dueAt: ctx.time + offsetMs / 1000,
      rawDamage: damage,
      channel: spec.basic.channel,
      attackKind: 'basic',
      name: null,
      gaugeGain: spec.basic.gaugeGainPerImpact,
      spiritProcEligible: true,
      actionGroupId,
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
export const MIR4_HP_POTION_COOLDOWN_SECONDS = 1;
export const MIR4_MP_POTION_COOLDOWN_SECONDS = 5;
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
    p.cooldowns.set(HP_POTION_COOLDOWN_KEY, MIR4_HP_POTION_COOLDOWN_SECONDS);
    const baseHeal = Math.floor((p.maxHp * MIR4_HP_POTION_HEAL_BPS) / 10_000);
    p.hp = Math.min(p.maxHp, p.hp + mir4ModifiedPotionAmount(baseHeal, 'hp', p.mir4?.statusValues));
    return true;
  }
  if (p.resource >= p.maxResource) return false;
  if (p.cooldowns.has(MP_POTION_COOLDOWN_KEY)) return false;
  p.cooldowns.set(MP_POTION_COOLDOWN_KEY, MIR4_MP_POTION_COOLDOWN_SECONDS);
  p.resource = Math.min(
    p.maxResource,
    p.resource + mir4ModifiedPotionAmount(MIR4_MP_POTION_RESTORE, 'mp', p.mir4?.statusValues),
  );
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
  if (p.level < MIR4_ULTIMATE_UNLOCK_LEVEL) return { ok: false, reason: 'not-unlocked' };
  const target = resolveLivingHostileTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  const spec = MIR4_CLASS_COMBAT_SPECS[p.mir4?.classId ?? 1] ?? MIR4_CLASS_COMBAT_SPECS[1];
  if ((p.mir4UltGauge ?? 0) < spec.ultimate.requiredGauge) {
    return { ok: false, reason: 'no-mp' };
  }
  const rangeYards = Math.min(classRangeYards(p) * 1.5, spec.ultimate.rangePx / 16);
  if (dist2d(p.pos, target.pos) > rangeYards) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (!ctx.hasLineOfSight(p, target)) return { ok: false, reason: 'out-of-range' };
  if (p.cooldowns.has(ULTIMATE_COOLDOWN_KEY)) return { ok: false, reason: 'on-cooldown' };
  if (p.gcdRemaining > 0 || mir4ActionInFlight(p)) return { ok: false, reason: 'on-gcd' };

  p.mir4UltGauge = 0;
  p.cooldowns.set(
    ULTIMATE_COOLDOWN_KEY,
    mir4ModifiedSkillCooldownSeconds(spec.ultimate.cooldownMs / 1000, p.mir4?.statusValues),
  );
  const attackPower = spec.ultimate.channel === 'magic' ? p.spellPower : p.attackPower;
  const damage = mir4SkillDamageAfterBoost(
    mir4CoefficientDamage(attackPower, spec.ultimate.perImpactCoefficient),
    p.mir4?.skillDamageBps,
  );
  ctx.emit({
    type: 'mir4AttackStart',
    sourceId: p.id,
    targetId: target.id,
    action: 'ultimate',
    pose: spec.ultimate.channel === 'magic' ? 'cast' : 'weapon',
    durationMs: mir4AnimationDurationForContactsMs(spec.ultimate.impactOffsetMs),
  });
  const actionGroupId = `${p.id}:ultimate:${Math.round(ctx.time * 1_000)}:${target.id}`;
  for (const offsetMs of spec.ultimate.impactOffsetMs) {
    scheduleMir4Impact(ctx, p, target, {
      dueAt: ctx.time + offsetMs / 1000,
      rawDamage: damage,
      channel: spec.ultimate.channel,
      attackKind: 'skill',
      name: 'Ultimate',
      gaugeGain: 0,
      spiritProcEligible: true,
      actionGroupId,
    });
  }
  return { ok: true };
}

function scheduleMir4Impact(
  _ctx: SimContext,
  p: Entity,
  target: Entity,
  impact: {
    dueAt: number;
    rawDamage: number;
    channel: 'physical' | 'magic';
    attackKind: 'basic' | 'skill';
    name: string | null;
    gaugeGain: number;
    spiritProcEligible: boolean;
    skillId?: number;
    skillLevel?: number;
    applySkillEffect?: boolean;
    effectOnly?: boolean;
    actionGroupId?: string;
    requiresLandedImpact?: boolean;
  },
): void {
  if (!p.mir4PendingImpacts) p.mir4PendingImpacts = [];
  p.mir4PendingImpacts.push({
    dueAt: impact.dueAt,
    sourceId: p.id,
    targetId: target.id,
    rawDamage: impact.rawDamage,
    channel: impact.channel,
    attackKind: impact.attackKind,
    name: impact.name,
    gaugeGain: impact.gaugeGain,
    spiritProcEligible: impact.spiritProcEligible,
    skillId: impact.skillId,
    skillLevel: impact.skillLevel,
    applySkillEffect: impact.applySkillEffect,
    effectOnly: impact.effectOnly,
    actionGroupId: impact.actionGroupId,
    requiresLandedImpact: impact.requiresLandedImpact,
  });
}

function applyMir4PendingSkillEffect(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  skillLevel: number,
  effectOnly: boolean,
): void {
  const skill = mir4SkillById(skillId);
  const effect = skill?.effect;
  if (!skill || !effect || target.dead) return;

  if (effect.effect === 'magic-shield' && source.id === target.id) {
    const magnitudeBasisPoints = mir4SkillRankScaledInteger(
      Math.round((effect.magnitude ?? 0) * 10_000),
      skillLevel,
    );
    source.mir4Shield = {
      remaining: (effect.durationMs ?? 0) / 1000,
      magnitude: magnitudeBasisPoints / 10_000,
    };
    return;
  }
  if (effect.effect === 'heal-pulse' && source.id === target.id) {
    const bps = effect.healMaxHpBasisPoints as number | undefined;
    const scaledBps = mir4SkillRankScaledInteger(bps ?? 0, skillLevel);
    const heal = mir4ModifiedSkillHealing(
      Math.floor((source.maxHp * scaledBps) / 10_000),
      source.mir4?.statusValues,
    );
    const healthBefore = source.hp;
    source.hp = Math.min(source.maxHp, source.hp + heal);
    source.resource = Math.min(
      source.maxResource,
      source.resource +
        mir4ManaRecoveredFromHealing(source.hp - healthBefore, source.mir4?.statusValues),
    );
    return;
  }

  const kind = mir4EffectKindOf(effect.effect);
  if (!kind || !ctx.isHostileTo(source, target)) return;
  let lands = true;
  const controlFamily = mir4ControlFamilyOf(kind);
  if (controlFamily) {
    const baseChance =
      target.kind === 'player' ? effect.pvpChanceBasisPoints : effect.pveChanceBasisPoints;
    if (baseChance !== undefined) {
      const chance = mir4ControlChanceFromStatuses(
        baseChance,
        controlFamily,
        source.mir4?.statusValues,
        target.mir4?.statusValues,
        mir4TargetKind(target),
      );
      lands = rollBps(ctx) < chance;
    }
  }
  if (!lands) return;
  const rankedDurationMs = effectOnly
    ? mir4SkillRankScaledInteger(effect.durationMs ?? 0, skillLevel)
    : (effect.durationMs ?? 0);
  const durationMs = controlFamily
    ? mir4ControlDurationMs(rankedDurationMs, controlFamily, source.mir4?.statusValues)
    : rankedDurationMs;
  const magnitudeBasisPoints = effectOnly
    ? mir4SkillRankScaledInteger(Math.round((effect.magnitude ?? 0) * 10_000), skillLevel)
    : Math.round((effect.magnitude ?? 0) * 10_000);
  applyMir4Effect(ctx, target, {
    effectId: `mir4_${skillId}_${effect.effect}`,
    kind,
    durationSeconds: durationMs / 1000,
    magnitude: magnitudeBasisPoints / 10_000,
    name: skill.displayName,
    sourceId: source.id,
  });
}

function patchMir4ActionGroup(
  owner: Entity,
  due: Mir4PendingImpact[],
  actionGroupId: string | undefined,
  patch: Pick<Mir4PendingImpact, 'actionLanded' | 'spiritProcAttempted'>,
): void {
  if (!actionGroupId) return;
  for (const candidate of [...due, ...(owner.mir4PendingImpacts ?? [])]) {
    if (candidate.actionGroupId !== actionGroupId) continue;
    if (patch.actionLanded === true) candidate.actionLanded = true;
    if (patch.spiritProcAttempted === true) candidate.spiritProcAttempted = true;
  }
}

function resolveMir4PendingImpactBatch(
  ctx: SimContext,
  owner: Entity,
  due: Mir4PendingImpact[],
): void {
  for (const impact of due) {
    const source = ctx.entities.get(impact.sourceId);
    const target = ctx.entities.get(impact.targetId);
    if (!source || !target || target.dead || source.dead) continue;
    const selfUtility = impact.effectOnly === true && source.id === target.id;
    const pvpTarget = target.kind === 'player' || target.ownerId !== null;
    // Hostility is always revalidated because a duel can end during the
    // authored windup. PvP also keeps the impact-time sight check. A PvE
    // action, however, was already range/LOS-admitted at cast time: commit
    // it at the authored contact so a moving mob or a portal/building seam
    // cannot silently erase an otherwise valid action after its cooldown and
    // resource cost were spent.
    if (
      !selfUtility &&
      (!ctx.isHostileTo(source, target) || (pvpTarget && !ctx.hasLineOfSight(source, target)))
    ) {
      continue;
    }
    if (impact.effectOnly) {
      if (impact.requiresLandedImpact && impact.actionLanded !== true) continue;
      if (impact.applySkillEffect && impact.skillId !== undefined) {
        applyMir4PendingSkillEffect(
          ctx,
          source,
          target,
          impact.skillId,
          impact.skillLevel ?? 1,
          impact.requiresLandedImpact !== true,
        );
      }
      continue;
    }
    const raw = Math.floor(impact.rawDamage * (1 + mir4DamageTakenAddend(target)));
    const hitRoll = rollBps(ctx);
    const criticalRoll = rollBps(ctx);
    const spiritDamage = resolveMir4PlayerDamageWithSpirit(ctx, source, target, {
      rawDamage: raw,
      channel: impact.channel,
      attacker: mir4AttackerStats(source),
      defender: mir4DefenderStats(ctx, target),
      targetKind: mir4TargetKind(target),
      attackKind: impact.attackKind,
      hitRoll,
      criticalRoll,
      allowSpiritProc: impact.spiritProcEligible === true && impact.spiritProcAttempted !== true,
    });
    if (spiritDamage.attempted) {
      patchMir4ActionGroup(owner, due, impact.actionGroupId, { spiritProcAttempted: true });
    }
    const resolved = spiritDamage.resolved;
    if (!resolved.hit) continue;
    patchMir4ActionGroup(owner, due, impact.actionGroupId, { actionLanded: true });
    const landedDamage = ctx.dealDamage(
      source,
      target,
      resolved.damage,
      resolved.critical,
      impact.channel,
      impact.name,
      'hit',
      true,
      undefined,
      true,
      impact.attackKind !== 'skill',
    );
    applyMir4Drain(source, landedDamage);
    if (impact.gaugeGain > 0) {
      source.mir4UltGauge = Math.min(100, (source.mir4UltGauge ?? 0) + impact.gaugeGain);
    }
  }
}

function resolveMir4SkillActionImmediately(
  ctx: SimContext,
  source: Entity,
  actionPrefix: string,
): void {
  const pending = source.mir4PendingImpacts ?? [];
  const groupPrefix = `${actionPrefix}:`;
  const immediate = pending.filter(
    (impact) =>
      impact.attackKind === 'skill' && impact.actionGroupId?.startsWith(groupPrefix) === true,
  );
  if (immediate.length === 0) return;
  const immediateSet = new Set(immediate);
  source.mir4PendingImpacts = pending.filter((impact) => !immediateSet.has(impact));
  resolveMir4PendingImpactBatch(ctx, source, immediate);
}

/** Drain the due authored-offset impacts; rolls are drawn HERE (source clock). */
export function updateMir4PendingImpacts(ctx: SimContext): void {
  for (const owner of ctx.entities.values()) {
    const pending = owner.mir4PendingImpacts;
    if (!pending || pending.length === 0) continue;
    const due = pending.filter((impact) => impact.dueAt <= ctx.time);
    if (due.length === 0) continue;
    owner.mir4PendingImpacts = pending.filter((impact) => impact.dueAt > ctx.time);
    resolveMir4PendingImpactBatch(ctx, owner, due);
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
  mir4Codex?: import('./codex').Mir4CodexState;
  mir4ArcRewards?: { items?: Record<string, number> };
  mir4Training?: import('./training').Mir4TrainingState;
}

/**
 * Kill/quest XP under the mir4 profile: flat mob rewards through the ported
 * level table (BigInt-safe reqExp), replacing the classic XP_TABLE loop.
 * Called from the shared grantXp funnel when the profile is mir4.
 */
export function grantMir4Xp(
  ctx: SimContext,
  amount: number,
  meta: Mir4XpTarget,
  source: 'hunting' | 'reward' = 'reward',
): void {
  const p = ctx.entities.get(meta.entityId);
  if (!p || amount <= 0) return;
  amount = mir4ModifiedProgressionReward(
    amount,
    source === 'hunting' ? 'hunting-xp' : 'reward-xp',
    p.mir4?.statusValues,
  );
  meta.counters.xpGained += amount;
  const result = advanceMir4Experience(p.level, meta.xp, amount);
  meta.xp = result.xp;
  if (result.levelUps > 0) {
    const knownBeforeLevelUp = new Set(meta.known.map((ability) => ability.def.id));
    p.level = result.level;
    recalcMir4PlayerStats(
      p,
      mir4RecalcClassOf(p),
      result.level,
      meta.mir4Equipment,
      meta.mir4EquipmentInstances,
      meta.mir4Spirits,
      meta.mir4Mounts,
      meta.mir4Codex,
      meta.mir4ArcRewards?.items,
      meta.mir4Training,
    );
    refreshMir4KnownAbilities(p, meta);
    meta.counters.levelUps += result.levelUps;
    ctx.emit({ type: 'levelup', level: p.level, pid: p.id });
    for (const ability of meta.known) {
      if (knownBeforeLevelUp.has(ability.def.id)) continue;
      ctx.emit({
        type: 'learnAbility',
        abilityId: ability.def.id,
        rank: ability.rank,
        pid: p.id,
      });
    }
  }
  ctx.emit({ type: 'xp', amount, pid: p.id });
}

/** Apply the official per-ten-second HP and MP recovery statuses. */
export function updateMir4Regeneration(ctx: SimContext): void {
  if (ctx.tickCount <= 0 || ctx.tickCount % 200 !== 0) return;
  for (const player of ctx.entities.values()) {
    if (player.kind !== 'player' || player.dead || !player.mir4) continue;
    const recovery = mir4RecoveryPerTenSeconds(
      player.maxHp,
      player.maxResource,
      player.mir4.statusValues,
    );
    if (recovery.hp > 0) player.hp = Math.min(player.maxHp, player.hp + recovery.hp);
    if (recovery.mp > 0) {
      player.resource = Math.min(player.maxResource, player.resource + recovery.mp);
    }
  }
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
    ? template.dmgBase + template.dmgPerLevel * (mob.level - (template.statAnchorLevel ?? 1))
    : mob.weapon.min;
  const raw = Math.max(1, Math.floor(baseAttack * mir4AttackMultiplier(mob)));
  const resolved = mir4ResolveDamage({
    rawDamage: raw,
    channel: 'physical',
    attacker: { accuracy: mir4MobAccuracy(mob.level), critical: 0, criticalOutcome: 10 },
    defender: mir4DefenderStats(ctx, player),
    targetKind: mob.mobBoss ? 'boss' : 'monster',
    attackKind: 'basic',
    hitRoll: rollBps(ctx),
    criticalRoll: rollBps(ctx),
  });
  ctx.dealDamage(mob, player, resolved.damage, resolved.critical, 'physical', null, 'hit', false);
}
