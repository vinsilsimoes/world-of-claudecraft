import { mir4AutomationActionBlocked, mir4AutomationRunSpeed } from '../auto_battle/admission';
import {
  type Mir4AutoBattlePursuitMemory,
  observeMir4AutoBattlePursuit,
} from '../auto_battle/target_memory';
import { advanceMir4AutomationRoute, type Mir4AutomationRouteState } from '../auto_quest/route';
import { MIR4_GAME_PROFILE } from '../game_profile';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { dist2d } from '../types';
import {
  mir4ActionAbilityDef,
  mir4ClassIdFromUltimateAction,
  mir4SkillIdFromAction,
} from './action_abilities';
import { castMir4Skill, type Mir4CastResult, mir4Ultimate } from './combat';
import { mir4ManualMovementActive } from './manual_input';
import {
  mir4NativeSkillActivationRanges,
  mir4NativeTargetHeightAdmitted,
  mir4NativeTraceCommitWithinRange,
} from './native_skill_activation_range';
import { MIR4_NATIVE_ULTIMATE_SKILL_IDS } from './native_ultimate_runtime';
import { type Mir4SkillActionState, mir4SkillActionLocked } from './skill_action_scheduler';
import { mir4SkillActivationPolicy } from './skill_activation_policy';
import { markMir4WireDirty } from './wire_revision';

export interface Mir4SkillActivationState {
  readonly phase: 'approach';
  readonly abilityId: string;
  readonly targetId: number;
  /** True when changing the selected target must cancel this captured action. */
  readonly selectionBound: boolean;
  readonly armedTick: number;
  readonly instanceKey: string;
  route?: Mir4AutomationRouteState;
  pursuit?: Mir4AutoBattlePursuitMemory;
}

export interface Mir4SkillActivationResult extends Mir4CastResult {
  queued?: true;
}

type ActivationMeta = {
  moveInput: Parameters<typeof mir4ManualMovementActive>[0];
  mir4SkillActivation?: Mir4SkillActivationState;
  mir4SkillAction?: Mir4SkillActionState;
  /** Keeps this action as the sole movement owner through its commit tick. */
  mir4SkillActivationClaimedThroughTick?: number;
};

const ERROR_TEXT: Readonly<Record<NonNullable<Mir4CastResult['reason']>, string>> = {
  'unknown-skill': 'Unknown ability.',
  'wrong-class': 'That ability belongs to another class.',
  'not-unlocked': 'That ability is not unlocked yet.',
  'no-target': 'You have no target.',
  'out-of-range': 'Out of range.',
  'no-mp': 'Not enough mana!',
  'on-cooldown': 'That ability is not ready yet.',
  'on-gcd': 'That ability is not ready yet.',
  controlled: 'You are stunned!',
  silenced: 'You are silenced!',
  'utility-not-ready': 'That ability is not ready yet.',
};

export function mir4CastErrorText(reason: NonNullable<Mir4CastResult['reason']>): string {
  return ERROR_TEXT[reason];
}

export function mir4SkillActivationOwnsMotion(
  meta: ActivationMeta | undefined,
  tickCount?: number,
): boolean {
  if (!meta || mir4ManualMovementActive(meta.moveInput)) return false;
  if (
    meta.mir4SkillAction &&
    !meta.mir4SkillAction.motionInterrupted &&
    (tickCount === undefined || mir4SkillActionLocked(meta.mir4SkillAction, tickCount))
  ) {
    return true;
  }
  if (meta.mir4SkillActivation) return true;
  return (
    tickCount !== undefined &&
    (meta.mir4SkillActivationClaimedThroughTick ?? Number.NEGATIVE_INFINITY) >= tickCount
  );
}

function clearActivation(meta: ActivationMeta): void {
  if (!meta.mir4SkillActivation) return;
  meta.mir4SkillActivation = undefined;
  markMir4WireDirty(meta);
}

function claimActivationMotion(meta: ActivationMeta, throughTick: number): void {
  meta.mir4SkillActivationClaimedThroughTick = Math.max(
    meta.mir4SkillActivationClaimedThroughTick ?? Number.NEGATIVE_INFINITY,
    throughTick,
  );
}

/** Clear a one-shot manual skill contract without spending or firing it. */
export function cancelMir4SkillActivation(ctx: SimContext, pid: number): void {
  const meta = ctx.players.get(pid);
  if (!meta) return;
  clearActivation(meta);
  meta.mir4SkillActivationClaimedThroughTick = undefined;
}

function livingHostile(ctx: SimContext, player: Entity, targetId: number): Entity | null {
  const target = ctx.entities.get(targetId);
  return target && !target.dead && ctx.isHostileTo(player, target) ? target : null;
}

function atomicCast(
  ctx: SimContext,
  pid: number,
  abilityId: string,
  targetId: number | undefined,
): Mir4CastResult {
  const skillId = mir4SkillIdFromAction(abilityId);
  if (skillId !== null) return castMir4Skill(ctx, pid, skillId, targetId);
  const ultimateClassId = mir4ClassIdFromUltimateAction(abilityId);
  const player = ctx.entities.get(pid);
  if (ultimateClassId === null) return { ok: false, reason: 'unknown-skill' };
  if (player?.mir4?.classId !== ultimateClassId) return { ok: false, reason: 'wrong-class' };
  return mir4Ultimate(ctx, pid, targetId);
}

function targetInCommitRange(
  ctx: SimContext,
  player: Entity,
  abilityId: string,
  target: Entity,
): boolean {
  const action = mir4ActionAbilityDef(abilityId);
  const skillId = mir4SkillIdFromAction(abilityId);
  const ultimateClassId = mir4ClassIdFromUltimateAction(abilityId);
  const nativeSkillId =
    skillId ?? (ultimateClassId === null ? null : MIR4_NATIVE_ULTIMATE_SKILL_IDS[ultimateClassId]);
  const nativeActivation =
    nativeSkillId === null
      ? null
      : mir4NativeSkillActivationRanges(nativeSkillId, {
          targetBodyRadiusYards: PLAYER_BODY_RADIUS,
          skillDistanceBonusNative: 0,
        });
  if (nativeActivation) {
    return (
      mir4NativeTraceCommitWithinRange(dist2d(player.pos, target.pos), nativeActivation) &&
      mir4NativeTargetHeightAdmitted(target.pos.y - player.pos.y, nativeActivation) &&
      (!nativeActivation.blockingCheck || ctx.hasLineOfSight(player, target))
    );
  }
  return (
    !!action && dist2d(player.pos, target.pos) <= action.range && ctx.hasLineOfSight(player, target)
  );
}

function faceTarget(player: Entity, target: Entity): void {
  player.facing = Math.atan2(target.pos.x - player.pos.x, target.pos.z - player.pos.z);
}

/**
 * Player-facing activation. Atomic combat remains in combat.ts; this function
 * only captures one selected target and owns the no-cost approach leading to
 * that commit.
 */
export function requestMir4SkillActivation(
  ctx: SimContext,
  abilityId: string,
  pid: number,
  explicitTargetId?: number,
): Mir4SkillActivationResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'unknown-skill' };
  const policy = mir4SkillActivationPolicy(abilityId);
  const player = ctx.entities.get(pid);
  const meta = ctx.players.get(pid);
  if (!policy || !player || !meta) return { ok: false, reason: 'unknown-skill' };

  if (policy.targetMode === 'none') {
    clearActivation(meta);
    const result = atomicCast(ctx, pid, abilityId, undefined);
    if (result.ok) claimActivationMotion(meta, ctx.tickCount + 1);
    return result;
  }

  const selectedTargetId = player.targetId ?? undefined;
  const targetId = explicitTargetId ?? selectedTargetId;
  const selectionBound = explicitTargetId === undefined || explicitTargetId === selectedTargetId;
  const target = targetId === undefined ? null : livingHostile(ctx, player, targetId);
  const result = atomicCast(ctx, pid, abilityId, targetId);
  if (result.ok) {
    if (target && policy.faceOnCommit) faceTarget(player, target);
    claimActivationMotion(meta, ctx.tickCount + 1);
    clearActivation(meta);
    return result;
  }
  if (result.reason !== 'out-of-range' || targetId === undefined || !target) {
    clearActivation(meta);
    return result;
  }

  const current = meta.mir4SkillActivation;
  if (
    current?.abilityId === abilityId &&
    current.targetId === targetId &&
    current.selectionBound === selectionBound
  ) {
    return { ok: true, queued: true };
  }
  meta.mir4SkillActivation = {
    phase: 'approach',
    abilityId,
    targetId,
    selectionBound,
    armedTick: ctx.tickCount,
    instanceKey: ctx.instanceKeyFor(player.id),
  };
  markMir4WireDirty(meta);
  return { ok: true, queued: true };
}

/** One deterministic approach/commit decision for each captured manual action. */
export function updateMir4SkillActivations(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const state = meta.mir4SkillActivation;
    if (!state) {
      if (
        meta.mir4SkillActivationClaimedThroughTick !== undefined &&
        meta.mir4SkillActivationClaimedThroughTick < ctx.tickCount
      ) {
        meta.mir4SkillActivationClaimedThroughTick = undefined;
      }
      continue;
    }
    const player = ctx.entities.get(meta.entityId);
    if (
      !player ||
      player.dead ||
      (state.selectionBound && player.targetId !== state.targetId) ||
      ctx.instanceKeyFor(player.id) !== state.instanceKey ||
      mir4ManualMovementActive(meta.moveInput)
    ) {
      clearActivation(meta);
      continue;
    }
    const target = livingHostile(ctx, player, state.targetId);
    const policy = mir4SkillActivationPolicy(state.abilityId);
    if (!target || !policy || policy.targetMode !== 'selected-hostile') {
      clearActivation(meta);
      continue;
    }
    if (mir4AutomationActionBlocked(ctx, player)) continue;

    if (targetInCommitRange(ctx, player, state.abilityId, target)) {
      const result = atomicCast(ctx, player.id, state.abilityId, target.id);
      if (result.ok) {
        if (policy.faceOnCommit) faceTarget(player, target);
        claimActivationMotion(meta, ctx.tickCount);
        clearActivation(meta);
        continue;
      }
      if (result.reason !== 'out-of-range') {
        clearActivation(meta);
        ctx.error(player.id, mir4CastErrorText(result.reason ?? 'unknown-skill'));
      }
      continue;
    }

    const runSpeed = mir4AutomationRunSpeed(ctx, player);
    if (runSpeed <= 0) continue;
    // Progress follows actual locomotion, not direct distance to the target.
    // A valid route around a wall can temporarily move sideways or farther
    // away without being an unreachable pursuit.
    const observed = observeMir4AutoBattlePursuit(state.pursuit, target.id, player.pos);
    state.pursuit = observed.pursuit;
    if (observed.stalled) {
      clearActivation(meta);
      ctx.error(player.id, 'Out of range.');
      continue;
    }
    const next = advanceMir4AutomationRoute(
      ctx.cfg.seed,
      player.pos,
      target.pos,
      state.route,
      ctx.riftCollisionToken,
    );
    state.route = next.route;
    ctx.moveToward(player, { x: next.waypoint.x, y: player.pos.y, z: next.waypoint.z }, runSpeed);
  }
}
