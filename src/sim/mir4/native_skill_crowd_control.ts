import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import {
  interruptMir4SkillMovementOnDisplacement,
  type Mir4DisplacementDirection,
  mir4DisplacementUnitVector,
} from './displacement';
import {
  mir4NativeServerCrowdControlMoveUnits,
  mir4NativeServerCrowdControlWindowMs,
} from './native_skill_reactions';
import { mir4NativeDistanceToYards } from './native_skill_units';

const NATIVE_KNOCKDOWN_ROWS = Object.freeze([
  Object.freeze({
    skillId: 1301,
    attackId: 130102,
    effectId: 'mir4_1301_knockdown' as const,
    stance: 'down-02' as const,
    value: 250,
    nativeHeight: 300,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 1103,
    attackId: 110107,
    effectId: 'mir4_1103_knockdown' as const,
    stance: 'down-02' as const,
    value: 300,
    nativeHeight: 100,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 0,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 1104,
    attackId: 110402,
    effectId: 'mir4_1104_knockdown' as const,
    stance: 'down-02' as const,
    value: 150,
    nativeHeight: 200,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    displacementDirection: 'source-facing' as const,
  }),
  Object.freeze({
    skillId: 1304,
    attackId: 130402,
    effectId: 'mir4_1304_knockdown' as const,
    stance: 'down-02' as const,
    value: 400,
    nativeHeight: 100,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    displacementDirection: 'source-facing' as const,
  }),
  Object.freeze({
    skillId: 1401,
    attackId: 140102,
    effectId: 'mir4_1401_knockdown' as const,
    stance: 'down-03' as const,
    value: 150,
    nativeHeight: 0,
    valueEx: 0.49,
    nativeDurationMs: 2_000,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    displacementDirection: 'source-facing' as const,
  }),
  Object.freeze({
    skillId: 1403,
    attackId: 140304,
    effectId: 'mir4_1403_knockdown' as const,
    stance: 'down-02' as const,
    value: 500,
    nativeHeight: 300,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 3201,
    attackId: 320106,
    effectId: 'mir4_3201_knockdown' as const,
    stance: 'down-02' as const,
    value: 400,
    nativeHeight: 100,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 3303,
    attackId: 330309,
    effectId: 'mir4_3303_knockdown' as const,
    stance: 'down-02' as const,
    value: 100,
    nativeHeight: 100,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 4109,
    attackId: 410902,
    effectId: 'mir4_4109_knockdown' as const,
    stance: 'down-02' as const,
    value: 250,
    nativeHeight: 0,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5101,
    attackId: 510102,
    effectId: 'mir4_5101_knockdown' as const,
    stance: 'down-02' as const,
    value: 200,
    nativeHeight: 150,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 10,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5104,
    attackId: 510402,
    effectId: 'mir4_5104_knockdown' as const,
    stance: 'down-02' as const,
    value: 300,
    nativeHeight: 400,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5303,
    attackId: 530303,
    effectId: 'mir4_5303_knockdown' as const,
    stance: 'down-02' as const,
    value: 300,
    nativeHeight: 150,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5202,
    attackId: 520202,
    effectId: 'mir4_5202_knockdown' as const,
    stance: 'down-02' as const,
    value: -1100,
    nativeHeight: 350,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5203,
    attackId: 520302,
    effectId: 'mir4_5203_knockdown' as const,
    stance: 'down-02' as const,
    value: 400,
    nativeHeight: 100,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5205,
    attackId: 520502,
    effectId: 'mir4_5205_520502_knockdown' as const,
    stance: 'down-02' as const,
    value: 250,
    nativeHeight: 0,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5205,
    attackId: 520503,
    effectId: 'mir4_5205_520503_knockdown' as const,
    stance: 'down-02' as const,
    value: 250,
    nativeHeight: 0,
    valueEx: 0.9,
    nativeDurationMs: 2_100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    displacementDirection: 'radial' as const,
  }),
]);

type Mir4NativeKnockdownEffectId = (typeof NATIVE_KNOCKDOWN_ROWS)[number]['effectId'];

export interface Mir4NativeRuntimeCrowdControlReaction {
  readonly effectId: Mir4NativeKnockdownEffectId;
  readonly kind: 'knockdown';
  readonly stance: 'down-02' | 'down-03';
  readonly durationMs: number;
  readonly moveDurationMs: number;
  readonly moveDistanceYards: number;
  readonly heightYards: number;
  readonly displacementDirection: Mir4DisplacementDirection;
}

/** Exact raw-row guard shared by the compiler and the live runtime allowlist. */
export function mir4NativeCrowdControlReactionMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  const evidence = NATIVE_KNOCKDOWN_ROWS.find((candidate) => candidate.attackId === row.attackId);
  if (!evidence) return false;
  return (
    row.reaction.kind === 'knock-down' &&
    row.reaction.stance === evidence.stance &&
    row.reaction.value === evidence.value &&
    row.reaction.nativeHeight === evidence.nativeHeight &&
    row.reaction.valueEx === evidence.valueEx &&
    row.reaction.durationMs === evidence.nativeDurationMs &&
    row.reaction.probabilityPercent === evidence.probabilityPercent &&
    row.reaction.direction === evidence.nativeDirection &&
    row.impactOffsetsMs.length === 1
  );
}

/**
 * Runtime allowlist for native hard-control rows whose server motion consumer
 * and client stance tuple have both been recovered. Other catalog rows remain
 * evidence-only until their own skill reaches this homologation gate.
 */
export function mir4NativeRuntimeCrowdControlReaction(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeCrowdControlReaction | null {
  const evidence = NATIVE_KNOCKDOWN_ROWS.find(
    (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
  );
  if (!evidence) return null;
  const row = mir4NativeSkillActionById(skillId)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row || !mir4NativeCrowdControlReactionMatchesRow(row)) return null;
  return Object.freeze({
    effectId: evidence.effectId,
    kind: 'knockdown',
    stance: evidence.stance,
    durationMs: mir4NativeServerCrowdControlWindowMs(row),
    moveDurationMs: Math.trunc(row.reaction.valueEx * 1_000),
    moveDistanceYards: mir4NativeDistanceToYards(mir4NativeServerCrowdControlMoveUnits(row)),
    heightYards: mir4NativeDistanceToYards(row.reaction.nativeHeight),
    displacementDirection: evidence.displacementDirection,
  });
}

/** True only for the exact authoritative effect entry this reaction consumes. */
export function mir4NativeCrowdControlEffectActive(
  target: Entity,
  spec: Mir4NativeRuntimeCrowdControlReaction,
): boolean {
  return (
    target.mir4Effects?.active.some(
      (effect) =>
        effect.effectId === spec.effectId &&
        effect.kind === spec.kind &&
        effect.remaining > CAST_COMPLETE_EPS,
    ) === true
  );
}

/**
 * Apply only the spatial and presentation half of an already-admitted native
 * control. Damage, chance, anti-control, DR and immunity remain owned by the
 * shared MIR4 effect pipeline.
 */
export function applyMir4NativeAdmittedCrowdControlReaction(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  attackId: number,
  spec: Mir4NativeRuntimeCrowdControlReaction,
): boolean {
  const active = target.mir4Effects?.active.find(
    (effect) =>
      effect.effectId === spec.effectId &&
      effect.kind === spec.kind &&
      effect.sourceId === source.id &&
      effect.remaining > CAST_COMPLETE_EPS,
  );
  if (!active || target.dead) return false;

  if (spec.moveDistanceYards !== 0) {
    const direction = mir4DisplacementUnitVector(source, target, spec.displacementDirection);
    const desiredX = target.pos.x + direction.x * spec.moveDistanceYards;
    const desiredZ = target.pos.z + direction.z * spec.moveDistanceYards;
    const resolved = ctx.resolveMove(
      target.pos.x,
      target.pos.z,
      desiredX,
      desiredZ,
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
  }

  const durationMs = Math.min(spec.durationMs, Math.max(0, Math.round(active.duration * 1_000)));
  ctx.emit({
    type: 'mir4HitReaction',
    sourceId: source.id,
    targetId: target.id,
    skillId,
    attackId,
    durationMs,
    stance: spec.stance,
    moveDurationMs: Math.min(spec.moveDurationMs, durationMs),
    heightYards: spec.heightYards,
  });
  return true;
}
