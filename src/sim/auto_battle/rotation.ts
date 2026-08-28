// Read-only MIR4 Auto Battle rotation selection. This leaf owns role priority,
// readiness, per-skill area counting, and the range of the next admitted
// action; the coordinator only commits the chosen verb.

import {
  MIR4_CLASS_COMBAT_SPECS,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
  mir4SkillsForClass,
} from '../content/mir4';
import type { Mir4SkillDef } from '../content/mir4/skills';
import { mir4HardControlled, mir4Silenced } from '../mir4/effects';
import { mir4SkillManaCost } from '../mir4/math';
import { MIR4_ULTIMATE_UNLOCK_LEVEL, mir4SkillUnlockLevel } from '../mir4/skill_progression';
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

function isSelfUtility(skill: Mir4SkillDef): boolean {
  return skill.effect?.effect === 'magic-shield' || skill.effect?.effect === 'heal-pulse';
}

function isActorCenteredOffense(skill: Mir4SkillDef): boolean {
  return !skill.requiresTarget && (skill.effect?.areaRadiusPx ?? 0) > 0 && !isSelfUtility(skill);
}

function skillReady(p: Entity, skill: Mir4SkillDef): boolean {
  if (p.cooldowns.has(String(skill.skillId))) return false;
  const cost = mir4SkillManaCost(p.mir4?.manaCostStat ?? 0, skill.skillCost, skill.skillCostType);
  if (p.resource < cost) return false;
  if (skill.effect?.effect === 'magic-shield' && (p.mir4Shield?.remaining ?? 0) > 0) {
    return false;
  }
  if (skill.effect?.effect === 'heal-pulse' && p.hp >= p.maxHp) return false;
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
  const radius = (skill.effect?.areaRadiusPx ?? 0) / 16;
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
    (skill) =>
      p.level >= mir4SkillUnlockLevel(skill.slot) && !disabledSkillIds?.includes(skill.skillId),
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
      if (!skillReady(p, skill)) continue;
      const roles = skill.roles;
      if (phase === 'survival-utility' && !(wants(roles, phase) && hpPercent <= 45)) continue;
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
  // level-one Burst: it is tagged as AoE, but is the class's only unlocked
  // skill until level 10. Against a lone target, use any remaining ready
  // offensive skill before falling back to the basic attack.
  for (const skill of order) {
    if (!skillReady(p, skill) || isSelfUtility(skill) || repeatsActiveEffect(target, skill)) {
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
    const radius = (skill?.effect?.areaRadiusPx ?? 0) / 16;
    if (radius > 0) return radius;
  }
  if (pick && !pick.selfUtility && p.gcdRemaining <= 0) return classRange;
  return Math.min(classRange, spec.basic.rangePx / 16);
}

/** Warrior setup/payoff flip; every other class keeps catalog order. */
function orderKit<T extends { skillId: number }>(
  kit: readonly T[],
  classId: number,
  targetControlled: boolean,
): T[] {
  if (classId !== 1) return [...kit];
  const rank = targetControlled
    ? { 1104: 0, 1401: 1, 1102: 2, 1304: 3 }
    : { 1102: 0, 1304: 1, 1104: 2, 1401: 3 };
  return [...kit].sort(
    (a, b) =>
      (rank[a.skillId as 1102 | 1104 | 1304 | 1401] ?? 9) -
      (rank[b.skillId as 1102 | 1104 | 1304 | 1401] ?? 9),
  );
}
