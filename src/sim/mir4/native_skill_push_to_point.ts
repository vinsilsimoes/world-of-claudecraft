import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { interruptMir4SkillMovementOnDisplacement } from './displacement';
import { mir4NativeControlImmune } from './native_control_immunity';
import { refreshMir4NativeHitReactionState } from './native_skill_hit_reaction';
import {
  mir4NativeServerCrowdControlMoveUnits,
  mir4NativeServerCrowdControlWindowMs,
} from './native_skill_reactions';
import { mir4NativeDistanceToYards } from './native_skill_units';

const NATIVE_PUSH_TO_POINT_ROWS = Object.freeze([
  Object.freeze({
    skillId: 1103,
    attackId: 110106,
    stance: 'hit-01' as const,
    value: 100,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0,
    impactCount: 1,
  }),
  Object.freeze({
    skillId: 1201,
    attackId: 120102,
    stance: 'stun-01' as const,
    value: 200,
    nativeHeight: 0,
    valueEx: 0.3,
    nativeDurationMs: 300,
    probabilityPercent: 100,
    nativeDirection: 0,
    impactCount: 1,
  }),
  Object.freeze({
    skillId: 1403,
    attackId: 140302,
    stance: 'hit-01' as const,
    value: 500,
    nativeHeight: 0,
    valueEx: 0.2,
    nativeDurationMs: 500,
    probabilityPercent: 100,
    nativeDirection: 0,
    impactCount: 1,
  }),
]);
const POSITION_EPSILON = 1e-9;

export interface Mir4NativeRuntimePushToPointReaction {
  readonly kind: 'push-to-point';
  readonly stance: 'hit-01' | 'stun-01';
  /** Complete native reaction state: CrowdControlTime + CrowdControlValueEx. */
  readonly durationMs: number;
  /** Client movement interpolation authored by CrowdControlValueEx. */
  readonly moveDurationMs: number;
  /** Destination radius from the source, not displacement from the target. */
  readonly anchorOffsetYards: number;
  readonly heightYards: number;
}

export interface Mir4PushToPointSourcePosition {
  readonly x: number;
  readonly z: number;
  readonly facing: number;
}

export interface Mir4PushToPointTargetPosition {
  readonly x: number;
  readonly z: number;
}

/** Exact raw-row guard recovered from the native server movement consumer. */
export function mir4NativePushToPointReactionMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  const evidence = NATIVE_PUSH_TO_POINT_ROWS.find(
    (candidate) => candidate.attackId === row.attackId,
  );
  if (!evidence) return false;
  return (
    row.reaction.kind === 'push-to-point' &&
    row.reaction.stance === evidence.stance &&
    row.reaction.value === evidence.value &&
    row.reaction.nativeHeight === evidence.nativeHeight &&
    row.reaction.valueEx === evidence.valueEx &&
    row.reaction.durationMs === evidence.nativeDurationMs &&
    row.reaction.probabilityPercent === evidence.probabilityPercent &&
    row.reaction.direction === evidence.nativeDirection &&
    row.impactOffsetsMs.length === evidence.impactCount
  );
}

/**
 * Runtime policy for admitted exact native PushToPoint rows.
 *
 * The native server starts at the source position and advances a fixed
 * CrowdControlValue distance along the source-to-target ray. It does not move
 * the target by that distance and it is not an outward knockback.
 */
export function mir4NativeRuntimePushToPointReaction(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimePushToPointReaction | null {
  const evidence = NATIVE_PUSH_TO_POINT_ROWS.find(
    (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
  );
  if (!evidence) return null;
  const row = mir4NativeSkillActionById(skillId)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row || !mir4NativePushToPointReactionMatchesRow(row)) return null;
  return Object.freeze({
    kind: 'push-to-point',
    stance: evidence.stance,
    durationMs: mir4NativeServerCrowdControlWindowMs(row),
    moveDurationMs: Math.trunc(row.reaction.valueEx * 1_000),
    anchorOffsetYards: mir4NativeDistanceToYards(mir4NativeServerCrowdControlMoveUnits(row)),
    heightYards: mir4NativeDistanceToYards(row.reaction.nativeHeight),
  });
}

export function mir4NativePushToPointDestination(
  source: Mir4PushToPointSourcePosition,
  target: Mir4PushToPointTargetPosition,
  anchorOffsetYards: number,
): { readonly x: number; readonly z: number } {
  const dx = target.x - source.x;
  const dz = target.z - source.z;
  const length = Math.hypot(dx, dz);
  const directionX = length > POSITION_EPSILON ? dx / length : Math.sin(source.facing);
  const directionZ = length > POSITION_EPSILON ? dz / length : Math.cos(source.facing);
  return Object.freeze({
    x: source.x + directionX * anchorOffsetYards,
    z: source.z + directionZ * anchorOffsetYards,
  });
}

/** Apply the spatial and presentation result after native control admission succeeds. */
export function applyMir4NativePushToPointReaction(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  attackId: number,
  spec: Mir4NativeRuntimePushToPointReaction,
): boolean {
  if (
    target.dead ||
    mir4NativeControlImmune(target) ||
    !refreshMir4NativeHitReactionState(target, spec.durationMs / 1_000, source.id)
  ) {
    return false;
  }
  const destination = mir4NativePushToPointDestination(
    { x: source.pos.x, z: source.pos.z, facing: source.facing },
    { x: target.pos.x, z: target.pos.z },
    spec.anchorOffsetYards,
  );
  const resolved = ctx.resolveMove(
    target.pos.x,
    target.pos.z,
    destination.x,
    destination.z,
    PLAYER_BODY_RADIUS,
    target,
  );
  if (resolved.x !== target.pos.x || resolved.z !== target.pos.z) {
    interruptMir4SkillMovementOnDisplacement(ctx, target);
    target.prevPos = { ...target.pos };
    target.pos = ctx.groundPos(resolved.x, resolved.z);
    target.vx = 0;
    target.vy = 0;
    target.vz = 0;
    ctx.rebucket(target);
  }
  ctx.emit({
    type: 'mir4HitReaction',
    sourceId: source.id,
    targetId: target.id,
    skillId,
    attackId,
    durationMs: spec.durationMs,
    stance: spec.stance,
    moveDurationMs: spec.moveDurationMs,
    heightYards: spec.heightYards,
  });
  return true;
}
