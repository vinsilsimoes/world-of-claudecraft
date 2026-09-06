// Read-only MIR4 Auto Battle rotation selection. This leaf owns role priority,
// readiness, per-skill area counting, and the range of the next admitted
// action; the coordinator only commits the chosen verb.

import type { Mir4SkillDef } from '../content/mir4';
import {
  MIR4_CLASS_COMBAT_SPECS,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
  mir4SkillsForClass,
} from '../content/mir4';
import { mir4HardControlled, mir4Silenced } from '../mir4/effects';
import { mir4SkillManaCost } from '../mir4/math';
import {
  type Mir4NativeSkillActivationRanges,
  mir4NativeDirectAdmissionWithinRange,
  mir4NativeSkillActivationRanges,
} from '../mir4/native_skill_activation_range';
import { mir4NativeNirvanaKickAutoConditionMet } from '../mir4/native_skill_nirvana_kick';
import { mir4NativeDistanceToYards } from '../mir4/native_skill_units';
import { mir4LowestPartyHealthPercent, mir4PartyNeedsHealing } from '../mir4/party_support';
import { mir4RuntimeSkillExecutionPlan } from '../mir4/runtime_skill_execution';
import { MIR4_ULTIMATE_UNLOCK_LEVEL, mir4SkillUnlockLevel } from '../mir4/skill_progression';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';

export interface Mir4AutoBattleArea {
  anchorX: number;
  anchorZ: number;
  acquireRadiusYards: number;
}

export interface Mir4AutoBattleSkillPick {
  skillId: number;
  selfUtility: boolean;
  actorCentered: boolean;
}

/** Native activation geometry for the currently selected targeted skill. */
export function mir4AutoBattleNativeSkillActivationRanges(
  pick: Mir4AutoBattleSkillPick | null,
): Mir4NativeSkillActivationRanges | null {
  if (!pick || pick.selfUtility || pick.actorCentered) return null;
  return mir4NativeSkillActivationRanges(pick.skillId, {
    targetBodyRadiusYards: PLAYER_BODY_RADIUS,
    skillDistanceBonusNative: 0,
  });
}

function isSelfUtility(skill: Mir4SkillDef): boolean {
  const effects = [skill.effect, ...(skill.additionalEffects ?? [])].filter(
    (effect): effect is NonNullable<Mir4SkillDef['effect']> => effect !== null,
  );
  return (
    skill.damage === null &&
    effects.length > 0 &&
    effects.every((effect) => effect.subject === 'actor' || effect.subject === 'party')
  );
}

function actorCenteredOffenseRadiusYards(skill: Mir4SkillDef): number {
  if (skill.requiresTarget || isSelfUtility(skill)) return 0;
  const configuredRadius = (skill.effect?.areaRadiusPx ?? 0) / 16;
  if (configuredRadius > 0) return configuredRadius;
  const plan = mir4RuntimeSkillExecutionPlan(skill.skillId);
  return Math.max(
    0,
    ...(plan?.rows.flatMap((row) =>
      row.contacts.length > 0 && row.target.impactType === 2
        ? [mir4NativeDistanceToYards(row.geometry.nativeDistanceMax)]
        : [],
    ) ?? []),
  );
}

function isActorCenteredOffense(skill: Mir4SkillDef): boolean {
  return actorCenteredOffenseRadiusYards(skill) > 0;
}

function partyPulseSpec(skill: Mir4SkillDef): {
  radiusYards: number;
  maxTargets: number;
} {
  return {
    radiusYards: (skill.effect?.partyRadiusPx ?? 0) / 16,
    maxTargets: skill.effect?.maxPartyTargets ?? 1,
  };
}

function skillReady(ctx: SimContext, p: Entity, target: Entity, skill: Mir4SkillDef): boolean {
  if (p.cooldowns.has(String(skill.skillId))) return false;
  const cost = mir4SkillManaCost(p.mir4?.manaCostStat ?? 0, skill.skillCost, skill.skillCostType);
  if (!(ctx.devCommands && p.devInfiniteResource) && p.resource < cost) return false;
  if (skill.skillId === 5104 && !mir4NativeNirvanaKickAutoConditionMet(target)) return false;
  if (skill.effect?.effect === 'magic-shield' && (p.mir4Shield?.remaining ?? 0) > 0) {
    return false;
  }
  if (
    skill.effect?.effect === 'heal-pulse' &&
    !mir4PartyNeedsHealing(ctx, p, partyPulseSpec(skill))
  ) {
    return false;
  }
  return true;
}

function repeatsActiveEffect(target: Entity, skill: Mir4SkillDef): boolean {
  const effectName = skill.effect?.effect;
  return Boolean(
    effectName &&
      !isSelfUtility(skill) &&
      target.mir4Effects?.active.some(
        (effect) => effect.effectId === `mir4_${skill.skillId}_${effectName}`,
      ),
  );
}

function hostileCountInSkillArea(
  ctx: SimContext,
  p: Entity,
  target: Entity,
  skill: Mir4SkillDef,
  area: Mir4AutoBattleArea,
): number {
  const radius = skill.requiresTarget
    ? (skill.effect?.areaRadiusPx ?? 0) / 16
    : actorCenteredOffenseRadiusYards(skill);
  if (radius <= 0) return 0;
  const center = skill.requiresTarget ? target.pos : p.pos;
  const radiusSq = radius * radius;
  const acquireRadiusSq = area.acquireRadiusYards * area.acquireRadiusYards;
  let count = 0;
  for (const e of ctx.entities.values()) {
    if ((e.kind !== 'mob' && e.kind !== 'player') || e.dead) continue;
    const anchorDx = e.pos.x - area.anchorX;
    const anchorDz = e.pos.z - area.anchorZ;
    if (anchorDx * anchorDx + anchorDz * anchorDz > acquireRadiusSq) continue;
    const centerDx = e.pos.x - center.x;
    const centerDz = e.pos.z - center.z;
    if (centerDx * centerDx + centerDz * centerDz > radiusSq) continue;
    if (!ctx.isHostileTo(p, e) || !ctx.hasLineOfSight(p, e)) continue;
    count++;
  }
  return count;
}

/**
 * Source rotation priority: survival utility, AoE, debuff, execution, then
 * single target. Targetless self utilities and actor-centered AoEs remain in
 * the deck; only their live readiness decides whether they can win a phase.
 */
export function pickMir4AutoBattleSkill(
  ctx: SimContext,
  p: Entity,
  target: Entity,
  area: Mir4AutoBattleArea,
  disabledSkillIds?: readonly number[],
): Mir4AutoBattleSkillPick | null {
  // Every skill shares the global cooldown. Avoid building and scanning the
  // deck while none can pass castMir4Skill's admission gate; Auto Battle may
  // still fall through to its independent basic attack for this tick.
  if (p.gcdRemaining > 0 || mir4Silenced(p)) return null;
  const kit = mir4SkillsForClass((p.mir4?.classId ?? 1) as 1 | 2 | 3 | 4 | 5).filter(
    (skill) => p.level >= mir4SkillUnlockLevel(skill) && !disabledSkillIds?.includes(skill.skillId),
  );
  const hpPercent = (p.hp / p.maxHp) * 100;
  const targetHpPercent = (target.hp / target.maxHp) * 100;
  const controlled = mir4HardControlled(target);
  const order = orderKit(kit, p.mir4?.classId ?? 1, controlled);

  const wants = (roles: readonly string[], role: string) => roles.includes(role);
  for (const phase of [
    'survival-utility',
    'aoe',
    'debuff',
    'execution',
    'single-target',
  ] as const) {
    for (const skill of order) {
      if (!skillReady(ctx, p, target, skill)) continue;
      const roles = skill.roles;
      const supportHpPercent =
        skill.effect?.effect === 'heal-pulse'
          ? mir4LowestPartyHealthPercent(ctx, p, partyPulseSpec(skill))
          : hpPercent;
      if (phase === 'survival-utility' && !(wants(roles, phase) && supportHpPercent <= 45)) {
        continue;
      }
      if (
        phase === 'aoe' &&
        !(
          wants(roles, phase) &&
          hostileCountInSkillArea(ctx, p, target, skill, area) >= Math.max(3, skill.minTargets ?? 3)
        )
      ) {
        continue;
      }
      if (phase === 'debuff' && !(wants(roles, phase) && (skill.effect?.effect ?? '') !== '')) {
        continue;
      }
      if (phase === 'execution' && !(wants(roles, phase) && targetHpPercent <= 30)) continue;
      if (phase === 'single-target' && !wants(roles, phase)) continue;
      if (repeatsActiveEffect(target, skill)) continue;
      return {
        skillId: skill.skillId,
        selfUtility: isSelfUtility(skill),
        actorCentered: isActorCenteredOffense(skill),
      };
    }
  }

  // Role thresholds optimize the rotation; they must not silently disable a
  // skill the player explicitly left on. This matters most for the Arbalist's
  // level-one Burst: it is tagged as AoE, but a lone target must not make the
  // enabled action unusable. Against one target, use any remaining ready
  // offensive skill before falling back to the basic attack.
  for (const skill of order) {
    if (
      !skillReady(ctx, p, target, skill) ||
      isSelfUtility(skill) ||
      repeatsActiveEffect(target, skill)
    ) {
      continue;
    }
    if (isActorCenteredOffense(skill) && hostileCountInSkillArea(ctx, p, target, skill, area) < 1) {
      continue;
    }
    return {
      skillId: skill.skillId,
      selfUtility: false,
      actorCentered: isActorCenteredOffense(skill),
    };
  }
  return null;
}

/** The exact admission range of the action Auto Battle will try next. */
export function mir4AutoBattleActionRange(
  p: Entity,
  pick: Mir4AutoBattleSkillPick | null,
  ultimateReadyOverride?: boolean,
): number {
  const classId = p.mir4?.classId ?? 1;
  const def = mir4ClassById(classId);
  const classRange = def ? mir4ClassRangeYards(def) : 4;
  const spec = MIR4_CLASS_COMBAT_SPECS[classId] ?? MIR4_CLASS_COMBAT_SPECS[1];
  if (!spec) return classRange;
  const ultimateReady =
    !mir4Silenced(p) &&
    (ultimateReadyOverride ??
      (p.level >= MIR4_ULTIMATE_UNLOCK_LEVEL &&
        (p.mir4UltGauge ?? 0) >= 100 &&
        !p.cooldowns.has('mir4_ult')));
  if (ultimateReady) {
    return Math.min(classRange * 1.5, spec.ultimate.rangePx / 16);
  }
  if (pick?.actorCentered) {
    const skill = mir4SkillById(pick.skillId);
    const radius = skill ? actorCenteredOffenseRadiusYards(skill) : 0;
    if (radius > 0) return radius;
  }
  if (pick && !pick.selfUtility && p.gcdRemaining <= 0) {
    const nativeActivation = mir4AutoBattleNativeSkillActivationRanges(pick);
    if (nativeActivation) return nativeActivation.directContactRangeYards;
    const skill = mir4SkillById(pick.skillId);
    return (skill?.castRangePx ?? classRange * 16) / 16;
  }
  return Math.min(classRange, spec.basic.rangePx / 16);
}

/** Direct-from-idle range predicate; native targeted skills use a strict edge. */
export function mir4AutoBattleActionInDirectRange(
  p: Entity,
  pick: Mir4AutoBattleSkillPick | null,
  horizontalDistanceYards: number,
  ultimateReadyOverride?: boolean,
): boolean {
  const nativeActivation = mir4AutoBattleNativeSkillActivationRanges(pick);
  const ultimateReady =
    !mir4Silenced(p) &&
    (ultimateReadyOverride ??
      (p.level >= MIR4_ULTIMATE_UNLOCK_LEVEL &&
        (p.mir4UltGauge ?? 0) >= 100 &&
        !p.cooldowns.has('mir4_ult')));
  if (!ultimateReady && nativeActivation) {
    return mir4NativeDirectAdmissionWithinRange(horizontalDistanceYards, nativeActivation);
  }
  return horizontalDistanceYards <= mir4AutoBattleActionRange(p, pick, ultimateReadyOverride);
}

/** Warrior setup/payoff flip; every other class keeps catalog order. */
function orderKit<T extends { skillId: number }>(
  kit: readonly T[],
  classId: number,
  targetControlled: boolean,
): T[] {
  if (classId !== 1) return [...kit];
  const rank = targetControlled
    ? { 1104: 0, 1401: 1, 1102: 2, 1301: 3, 1304: 4 }
    : {
        1102: 0,
        1301: 1,
        1302: 2,
        1101: 3,
        1103: 4,
        1304: 5,
        1104: 6,
        1401: 7,
      };
  return [...kit].sort(
    (a, b) =>
      (rank[a.skillId as keyof typeof rank] ?? 99) - (rank[b.skillId as keyof typeof rank] ?? 99),
  );
}
