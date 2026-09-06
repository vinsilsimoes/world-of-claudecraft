import { isInstancedRegion, slopeGlueHeight } from '../colliders';
import { PLAYER_BODY_RADIUS, PLAYER_MAX_CLIMB_SLOPE, PLAYER_SWIM_DEPTH } from '../pathfind';
import { floorHeightAt, MAX_STEP_HEIGHT, moveCharacter } from '../physics/character';
import { isSwimming, SWIM_FLOOR_CLEARANCE, swimSurfaceY } from '../player_motion';
import { constrainRiftPlayerPosition, riftPlayerLiftAt } from '../rift/player_lift';
import type { SimContext } from '../sim_context';
import { type Entity, TICK_RATE } from '../types';
import { waterLevelAt } from '../world';
import { mir4HardControlled, mir4Rooted } from './effects';
import { mir4ManualMovementActive } from './manual_input';
import { mir4HitReacting } from './native_skill_hit_reaction';
import {
  applyMir4NativeUninterruptibleBuff,
  mir4NativeRuntimeUninterruptibleBuff,
} from './native_skill_uninterruptible';
import { mir4NativeDistanceToYards } from './native_skill_units';
import { mir4RuntimeSkillExecutionAuthority } from './runtime_skill_execution';
import { markMir4WireDirty } from './wire_revision';

const TICK_MS = 1_000 / TICK_RATE;
const POSITION_EPSILON = 1e-6;
const COLLISION_CLAMP_STEPS = 12;

export interface Mir4SkillActionMotionState {
  readonly requiresTarget: boolean;
  readonly startMs: number;
  readonly durationMs: number;
  readonly startX: number;
  readonly startZ: number;
  readonly endX: number;
  readonly endZ: number;
}

/** Session-only committed action state. Damage contacts remain independently
 * owned by Entity.mir4PendingImpacts. */
export interface Mir4SkillActionState {
  readonly skillId: number;
  readonly targetId: number | null;
  readonly startedTick: number;
  readonly endCutMs: number;
  readonly capturedFacing: number;
  readonly motions: readonly Mir4SkillActionMotionState[];
  motionInterrupted: boolean;
}

/** Admission can run before the MIR4 tail clears an exactly-finished state. */
export function mir4SkillActionLocked(
  action: Mir4SkillActionState | undefined,
  tickCount: number,
): boolean {
  return !!action && (tickCount - action.startedTick) * TICK_MS < action.endCutMs;
}

/**
 * Resolve the native SuperArmor authored on the target's currently active
 * attack row. Rows own the interval from their ImpactStart until the next
 * row begins; this keeps the runtime tied to the extracted action timeline
 * instead of inventing a separate protection duration.
 */
export function mir4ActiveSkillSuperArmorNative(ctx: SimContext, target: Entity): number {
  const action = ctx.players.get(target.id)?.mir4SkillAction;
  if (!action) return 0;
  const elapsedMs = Math.max(0, (ctx.tickCount - action.startedTick) * TICK_MS);
  if (elapsedMs >= action.endCutMs) return 0;
  const rows = mir4RuntimeSkillExecutionAuthority(action.skillId)?.action.rows;
  if (!rows?.length) return 0;
  let active = rows[0];
  for (const row of rows) {
    if (row.impactStartMs > elapsedMs) break;
    active = row;
  }
  return Math.max(0, Math.trunc(active.nativeBehavior.superArmor));
}

type SkillActionMeta = {
  readonly entityId: number;
  readonly moveInput: Parameters<typeof mir4ManualMovementActive>[0];
  mir4SkillAction?: Mir4SkillActionState;
  mir4SkillActivationClaimedThroughTick?: number;
};

interface Point2d {
  x: number;
  z: number;
}

function pointAlongFacing(origin: Point2d, facing: number, distance: number): Point2d {
  return {
    x: origin.x + Math.sin(facing) * distance,
    z: origin.z + Math.cos(facing) * distance,
  };
}

/**
 * The native target-movement consumer is not recoverable from the extracted
 * tables. This explicit homologation policy preserves the authored sign:
 * target + normalize(target - actor) * range. A negative range therefore
 * stops on the near side, while a positive range crosses beyond the target.
 */
function targetMovementEndpoint(
  actor: Point2d,
  target: Point2d,
  capturedFacing: number,
  signedDistance: number,
): Point2d {
  const dx = target.x - actor.x;
  const dz = target.z - actor.z;
  const length = Math.hypot(dx, dz);
  const directionX = length > POSITION_EPSILON ? dx / length : Math.sin(capturedFacing);
  const directionZ = length > POSITION_EPSILON ? dz / length : Math.cos(capturedFacing);
  return {
    x: target.x + directionX * signedDistance,
    z: target.z + directionZ * signedDistance,
  };
}

function authoredMotions(
  actor: Entity,
  target: Entity | null,
  skillId: number,
  capturedFacing: number,
): readonly Mir4SkillActionMotionState[] {
  const authority = mir4RuntimeSkillExecutionAuthority(skillId);
  if (!authority) return [];
  const rows = authority.plan?.rows ?? authority.action.rows;
  const motions: Mir4SkillActionMotionState[] = [];
  let cursor = { x: actor.pos.x, z: actor.pos.z };
  for (const row of rows) {
    const movement = 'motion' in row ? row.motion : row.movement;
    if (!movement) continue;
    if (movement.kind === 'none' || movement.durationMs <= 0) continue;
    const distance = mir4NativeDistanceToYards(movement.nativeRange);
    let endpoint: Point2d | null = null;
    if (movement.kind === 'forward') {
      endpoint = pointAlongFacing(cursor, capturedFacing, distance);
    } else if (movement.kind === 'direct') {
      endpoint = pointAlongFacing(cursor, capturedFacing, distance);
    } else if (movement.kind === 'target' && target) {
      endpoint = targetMovementEndpoint(cursor, target.pos, capturedFacing, distance);
    }
    if (!endpoint) continue;
    motions.push({
      requiresTarget: movement.kind === 'target',
      startMs: skillId === 4112 ? movement.delayMs : row.impactStartMs + movement.delayMs,
      durationMs: movement.durationMs,
      startX: cursor.x,
      startZ: cursor.z,
      endX: endpoint.x,
      endZ: endpoint.z,
    });
    cursor = endpoint;
  }
  return motions;
}

/** Arm recovery and any authored actor motion inside a successful combat commit. */
export function startMir4SkillAction(
  ctx: SimContext,
  actor: Entity,
  skillId: number,
  target: Entity | null,
): boolean {
  const authority = mir4RuntimeSkillExecutionAuthority(skillId);
  const meta = ctx.players.get(actor.id);
  if (!authority || !meta) return false;
  const action = authority.plan ?? authority.action;
  const capturedFacing = actor.facing;
  meta.mir4SkillAction = {
    skillId,
    targetId: target?.id ?? null,
    startedTick: ctx.tickCount,
    endCutMs: action.endCutAnimationMs,
    capturedFacing,
    motions: authoredMotions(actor, target, skillId, capturedFacing),
    motionInterrupted: false,
  };
  const uninterruptibleBuff = mir4NativeRuntimeUninterruptibleBuff(skillId);
  if (uninterruptibleBuff) {
    applyMir4NativeUninterruptibleBuff(ctx, actor, uninterruptibleBuff);
  }
  markMir4WireDirty(meta);
  return true;
}

/** Link loss and other host lifecycle events stop only the remaining movement. */
export function interruptMir4SkillActionMotion(ctx: SimContext, pid: number): void {
  const meta = ctx.players.get(pid);
  const action = meta?.mir4SkillAction;
  if (!meta || !action) return;
  // The short commit claim and the authored action describe the same movement
  // ownership. Once that action is interrupted, retaining the claim would let
  // the server silently own facing for one extra tick while the wire correctly
  // reports no action marker.
  meta.mir4SkillActivationClaimedThroughTick = undefined;
  if (action.motionInterrupted) return;
  action.motionInterrupted = true;
  markMir4WireDirty(meta);
}

function clearSkillAction(meta: SkillActionMeta): void {
  if (!meta.mir4SkillAction) return;
  meta.mir4SkillAction = undefined;
  markMir4WireDirty(meta);
}

/** Death/full teardown ends recovery ownership without refunding the cast. */
export function clearMir4SkillAction(ctx: SimContext, pid: number): void {
  const meta = ctx.players.get(pid);
  if (meta) clearSkillAction(meta);
}

function actionLostMotionAuthority(
  ctx: SimContext,
  meta: SkillActionMeta,
  actor: Entity,
  action: Mir4SkillActionState,
  elapsedMs: number,
): boolean {
  if (
    mir4ManualMovementActive(meta.moveInput) ||
    ctx.isRooted(actor) ||
    mir4Rooted(actor) ||
    ctx.isStunned(actor) ||
    mir4HardControlled(actor) ||
    mir4HitReacting(actor)
  ) {
    return true;
  }
  const pendingTargetMotion = action.motions.some(
    (motion) => motion.requiresTarget && elapsedMs < motion.startMs + motion.durationMs,
  );
  if (action.skillId === 4106 && !pendingTargetMotion) return false;
  if (action.targetId === null) return false;
  const target = ctx.entities.get(action.targetId);
  return !target || target.dead || !ctx.isHostileTo(actor, target);
}

function intendedPosition(action: Mir4SkillActionState, elapsedMs: number): Point2d | null {
  let intended: Point2d | null = null;
  for (const motion of action.motions) {
    if (elapsedMs < motion.startMs) break;
    const progress = Math.min(1, Math.max(0, (elapsedMs - motion.startMs) / motion.durationMs));
    intended = {
      x: motion.startX + (motion.endX - motion.startX) * progress,
      z: motion.startZ + (motion.endZ - motion.startZ) * progress,
    };
    if (progress < 1) break;
  }
  return intended;
}

function samePoint(a: Point2d, b: Point2d): boolean {
  return Math.abs(a.x - b.x) <= POSITION_EPSILON && Math.abs(a.z - b.z) <= POSITION_EPSILON;
}

function resolveAuthoredHorizontal(ctx: SimContext, actor: Entity, desired: Point2d): Point2d {
  if (isInstancedRegion(actor.pos.x)) {
    const resolved = ctx.resolveMove(
      actor.pos.x,
      actor.pos.z,
      desired.x,
      desired.z,
      PLAYER_BODY_RADIUS,
      actor,
    );
    return constrainRiftPlayerPosition(ctx, resolved.x, resolved.z);
  }
  const out = {
    x: actor.pos.x,
    y: actor.pos.y,
    z: actor.pos.z,
    blocked: false,
    stepped: 0,
  };
  const swimming = isSwimming(actor, ctx.cfg.seed);
  moveCharacter(
    {
      seed: ctx.cfg.seed,
      radius: PLAYER_BODY_RADIUS,
      stepHeight: MAX_STEP_HEIGHT,
      maxSlope: PLAYER_MAX_CLIMB_SLOPE,
      grounded: actor.onGround && !swimming,
      swimming,
      ignoreFences: false,
    },
    actor.pos.x,
    actor.pos.y,
    actor.pos.z,
    desired.x - actor.pos.x,
    desired.z - actor.pos.z,
    out,
  );
  return constrainRiftPlayerPosition(ctx, out.x, out.z);
}

function collisionFreeEndpoint(
  ctx: SimContext,
  actor: Entity,
  desired: Point2d,
): { point: Point2d; blocked: boolean } {
  const from = { x: actor.pos.x, z: actor.pos.z };
  const resolved = resolveAuthoredHorizontal(ctx, actor, desired);
  if (samePoint(resolved, desired)) return { point: desired, blocked: false };

  // resolveMove intentionally slides normal locomotion around obstacles. Skill
  // actions do not: search only the authored segment and stop at its last
  // collision-free point, then abandon all remaining authored motion.
  let low = 0;
  let high = 1;
  for (let pass = 0; pass < COLLISION_CLAMP_STEPS; pass += 1) {
    const mid = (low + high) / 2;
    const candidate = {
      x: from.x + (desired.x - from.x) * mid,
      z: from.z + (desired.z - from.z) * mid,
    };
    const probe = resolveAuthoredHorizontal(ctx, actor, candidate);
    if (samePoint(probe, candidate)) low = mid;
    else high = mid;
  }
  return {
    point: {
      x: from.x + (desired.x - from.x) * low,
      z: from.z + (desired.z - from.z) * low,
    },
    blocked: true,
  };
}

function applyAuthoredPosition(ctx: SimContext, actor: Entity, desired: Point2d): boolean {
  if (samePoint(actor.pos, desired)) return false;
  const resolved = collisionFreeEndpoint(ctx, actor, desired);
  if (!samePoint(actor.pos, resolved.point)) {
    // Authored skill motion uses the same floor contract as ordinary player
    // locomotion. `groundPos` only sees placement terrain in most of the open
    // world, so using it here would drop a caster through a bridge, canopy, or
    // rampart deck that already supports their feet.
    const strictFloor = floorHeightAt(
      ctx.cfg.seed,
      resolved.point.x,
      resolved.point.z,
      PLAYER_BODY_RADIUS,
      actor.pos.y + POSITION_EPSILON,
    );
    const slopeGlue = slopeGlueHeight(
      ctx.cfg.seed,
      actor.pos.x,
      actor.pos.z,
      resolved.point.x,
      resolved.point.z,
      PLAYER_BODY_RADIUS,
      actor.pos.y,
    );
    const floor =
      Number.isFinite(slopeGlue) && Math.abs(slopeGlue - actor.pos.y) <= MAX_STEP_HEIGHT
        ? slopeGlue
        : strictFloor;
    const water = waterLevelAt(resolved.point.x, resolved.point.z, ctx.cfg.seed);
    const deepWater = Number.isFinite(water) && floor < water - PLAYER_SWIM_DEPTH;
    let y = floor + riftPlayerLiftAt(ctx, resolved.point.x, resolved.point.z);
    if (deepWater) {
      const surface = swimSurfaceY(resolved.point.x, resolved.point.z, ctx.cfg.seed);
      if (actor.swimDiving) {
        const previousWater = waterLevelAt(actor.pos.x, actor.pos.z, ctx.cfg.seed);
        const depthBelowWater = Number.isFinite(previousWater)
          ? Math.max(0.75, previousWater - actor.pos.y)
          : 0.75;
        const swimFloor = Math.min(surface, floor + SWIM_FLOOR_CLEARANCE);
        y = Math.min(surface, Math.max(swimFloor, water - depthBelowWater));
        if (y >= surface - POSITION_EPSILON) actor.swimDiving = false;
      } else {
        // A surface swimmer rides the destination waterline. Authored
        // horizontal motion must never turn the submerged terrain bed into a
        // standable floor and park the caster underneath the lake.
        y = surface;
      }
    } else {
      // Reaching a shore or standable deck releases the water-depth latch.
      actor.swimDiving = false;
    }
    actor.pos = { x: resolved.point.x, y, z: resolved.point.z };
    actor.vx = 0;
    actor.vy = 0;
    actor.vz = 0;
    actor.onGround = true;
    actor.jumping = false;
    actor.fallStartY = actor.pos.y;
    ctx.rebucket(actor);
  }
  return resolved.blocked;
}

/** Advance committed actions before this tick admits any new MIR4 skill. */
export function updateMir4SkillActions(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const action = meta.mir4SkillAction;
    if (!action) continue;
    const actor = ctx.entities.get(meta.entityId);
    if (!actor || actor.dead) {
      clearSkillAction(meta);
      continue;
    }
    const elapsedMs = Math.max(0, (ctx.tickCount - action.startedTick) * TICK_MS);
    if (elapsedMs >= action.endCutMs) {
      if (!action.motionInterrupted) {
        const finalPosition = intendedPosition(action, action.endCutMs);
        if (finalPosition) applyAuthoredPosition(ctx, actor, finalPosition);
      }
      clearSkillAction(meta);
      continue;
    }
    if (
      !action.motionInterrupted &&
      actionLostMotionAuthority(ctx, meta, actor, action, elapsedMs)
    ) {
      interruptMir4SkillActionMotion(ctx, actor.id);
    }
    if (action.motionInterrupted) continue;
    const desired = intendedPosition(action, elapsedMs);
    if (desired && applyAuthoredPosition(ctx, actor, desired)) {
      interruptMir4SkillActionMotion(ctx, actor.id);
    }
  }
}
