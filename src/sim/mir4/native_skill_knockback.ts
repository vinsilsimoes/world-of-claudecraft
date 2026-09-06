import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import {
  interruptMir4SkillMovementOnDisplacement,
  type Mir4DisplacementDirection,
  mir4DisplacementUnitVector,
} from './displacement';
import { mir4NativeControlImmune } from './native_control_immunity';
import { refreshMir4NativeHitReactionState } from './native_skill_hit_reaction';
import {
  mir4NativeServerCrowdControlMoveUnits,
  mir4NativeServerCrowdControlWindowMs,
} from './native_skill_reactions';
import { mir4NativeDistanceToYards } from './native_skill_units';

const NATIVE_KNOCKBACK_ROWS = Object.freeze([
  Object.freeze({
    skillId: 1201,
    attackId: 120101,
    stance: 'hit-01' as const,
    value: 10,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 150,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 1403,
    attackId: 140303,
    stance: 'hit-01' as const,
    value: 60,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 400,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 2,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 1501,
    attackId: 150102,
    stance: 'hit-01' as const,
    value: 40,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 2,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 1501,
    attackId: 150104,
    stance: 'hit-01' as const,
    value: 20,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 4102,
    attackId: 410202,
    stance: 'hit-01' as const,
    value: 40,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 4102,
    attackId: 410204,
    stance: 'hit-01' as const,
    value: 20,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 4113,
    attackId: 411302,
    stance: 'hit-01' as const,
    value: 40,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5201,
    attackId: 520102,
    stance: 'hit-02' as const,
    value: 50,
    nativeHeight: 0,
    valueEx: 0.3,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 2,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5301,
    attackId: 530101,
    stance: 'hit-02' as const,
    value: 250,
    nativeHeight: 0,
    valueEx: 0.3,
    nativeDurationMs: 700,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5102,
    attackId: 510202,
    stance: 'hit-01' as const,
    value: 50,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 300,
    probabilityPercent: 10,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 5102,
    attackId: 510203,
    stance: 'hit-01' as const,
    value: 150,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 300,
    probabilityPercent: 10,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  ...[510302, 510304].map((attackId) =>
    Object.freeze({
      skillId: 5103,
      attackId,
      stance: 'hit-01' as const,
      value: 10,
      nativeHeight: 0,
      valueEx: 0.1,
      nativeDurationMs: 200,
      probabilityPercent: 100,
      nativeDirection: 0 as const,
      impactCount: 1,
      displacementDirection: 'radial' as const,
    }),
  ),
  Object.freeze({
    skillId: 5303,
    attackId: 530302,
    stance: 'hit-01' as const,
    value: 30,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 3,
    displacementDirection: 'radial' as const,
  }),
  ...[540102, 540104, 540106].map((attackId) =>
    Object.freeze({
      skillId: 5401,
      attackId,
      stance: 'hit-01' as const,
      value: 80,
      nativeHeight: 0,
      valueEx: 0.2,
      nativeDurationMs: 200,
      probabilityPercent: 100,
      nativeDirection: 0 as const,
      impactCount: 1,
      displacementDirection: 'radial' as const,
    }),
  ),
  ...[
    [540303, 2],
    [540305, 1],
  ].map(([attackId, impactCount]) =>
    Object.freeze({
      skillId: 5403,
      attackId,
      stance: 'hit-01' as const,
      value: 80,
      nativeHeight: 0,
      valueEx: 0.2,
      nativeDurationMs: 200,
      probabilityPercent: 100,
      nativeDirection: 0 as const,
      impactCount,
      displacementDirection: 'radial' as const,
    }),
  ),
  Object.freeze({
    skillId: 5301,
    attackId: 530103,
    stance: 'hit-02' as const,
    value: 200,
    nativeHeight: 50,
    valueEx: 0.3,
    nativeDurationMs: 500,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 4113,
    attackId: 411304,
    stance: 'hit-01' as const,
    value: 20,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 2101,
    attackId: 210102,
    stance: 'hit-01' as const,
    value: 10,
    nativeHeight: 0,
    valueEx: 0,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 2503,
    attackId: 250301,
    stance: 'hit-01' as const,
    value: 200,
    nativeHeight: 0,
    valueEx: 0.2,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 2503,
    attackId: 250302,
    stance: 'hit-01' as const,
    value: 150,
    nativeHeight: 0,
    valueEx: 0.2,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 2503,
    attackId: 250303,
    stance: 'hit-01' as const,
    value: 150,
    nativeHeight: 0,
    valueEx: 0.2,
    nativeDurationMs: 200,
    probabilityPercent: 100,
    nativeDirection: 0 as const,
    impactCount: 1,
    displacementDirection: 'radial' as const,
  }),
  Object.freeze({
    skillId: 3101,
    attackId: 310101,
    stance: 'hit-01' as const,
    value: 100,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    impactCount: 1,
    displacementDirection: 'source-facing' as const,
  }),
  Object.freeze({
    skillId: 3101,
    attackId: 310103,
    stance: 'hit-01' as const,
    value: 20,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    impactCount: 2,
    displacementDirection: 'source-facing' as const,
  }),
  Object.freeze({
    skillId: 3103,
    attackId: 310302,
    stance: 'hit-01' as const,
    value: 30,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    impactCount: 3,
    displacementDirection: 'source-facing' as const,
  }),
  ...[
    [320101, -60],
    [320103, -30],
    [320105, -50],
  ].map(([attackId, value]) =>
    Object.freeze({
      skillId: 3201,
      attackId,
      stance: 'hit-01' as const,
      value,
      nativeHeight: 0,
      valueEx: 0.1,
      nativeDurationMs: 100,
      probabilityPercent: 100,
      nativeDirection: 0 as const,
      impactCount: 1,
      displacementDirection: 'radial' as const,
    }),
  ),
  ...[
    [320301, 40, 100],
    [320302, 100, 100],
    [320303, 80, 300],
  ].map(([attackId, value, nativeDurationMs]) =>
    Object.freeze({
      skillId: 3203,
      attackId,
      stance: 'hit-01' as const,
      value,
      nativeHeight: 0,
      valueEx: 0.1,
      nativeDurationMs,
      probabilityPercent: 100,
      nativeDirection: 1 as const,
      impactCount: 3,
      displacementDirection: 'source-facing' as const,
    }),
  ),
  Object.freeze({
    skillId: 3303,
    attackId: 330303,
    stance: 'hit-01' as const,
    value: 60,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 200,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    impactCount: 2,
    displacementDirection: 'source-facing' as const,
  }),
]);

export interface Mir4NativeRuntimeKnockbackReaction {
  readonly kind: 'knock-back';
  readonly stance: 'hit-01' | 'hit-02';
  /** Complete native server window after row-impact cardinality is applied. */
  readonly durationMs: number;
  /** Client interpolation budget across the complete native row. */
  readonly moveDurationMs: number;
  readonly moveDistanceYards: number;
  readonly heightYards: number;
  readonly displacementDirection: Mir4DisplacementDirection;
  /** The row-level reaction begins with its first landed authored contact. */
  readonly triggerSourceImpactIndex: 0;
}

/** Exact raw-row guard shared by the compiler and live runtime allowlist. */
export function mir4NativeKnockbackReactionMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  const evidence = NATIVE_KNOCKBACK_ROWS.find((candidate) => candidate.attackId === row.attackId);
  if (!evidence) return false;
  return (
    row.reaction.kind === 'knock-back' &&
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

/** Runtime policy for admitted exact native knock-back rows. */
export function mir4NativeRuntimeKnockbackReaction(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeKnockbackReaction | null {
  const evidence = NATIVE_KNOCKBACK_ROWS.find(
    (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
  );
  if (!evidence) return null;
  const row = mir4NativeSkillActionById(skillId)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row || !mir4NativeKnockbackReactionMatchesRow(row)) return null;
  return Object.freeze({
    kind: 'knock-back',
    stance: evidence.stance,
    durationMs: mir4NativeServerCrowdControlWindowMs(row),
    moveDurationMs: Math.trunc(row.reaction.valueEx * 1_000) * row.impactOffsetsMs.length,
    moveDistanceYards: mir4NativeDistanceToYards(mir4NativeServerCrowdControlMoveUnits(row)),
    heightYards: mir4NativeDistanceToYards(row.reaction.nativeHeight),
    displacementDirection: evidence.displacementDirection,
    triggerSourceImpactIndex: 0,
  });
}

/** Apply the row-level displacement and its short Hit01 presentation state. */
export function applyMir4NativeKnockbackReaction(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  attackId: number,
  sourceImpactIndex: number,
  spec: Mir4NativeRuntimeKnockbackReaction,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): boolean {
  const evidence = NATIVE_KNOCKBACK_ROWS.find(
    (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
  );
  if (
    !evidence ||
    target.dead ||
    mir4NativeControlImmune(target) ||
    sourceImpactIndex !== spec.triggerSourceImpactIndex ||
    (evidence.probabilityPercent < 100 && rollBasisPoints() >= evidence.probabilityPercent * 100) ||
    !refreshMir4NativeHitReactionState(target, spec.durationMs / 1_000, source.id)
  ) {
    return false;
  }

  if (spec.moveDistanceYards !== 0) {
    const direction = mir4DisplacementUnitVector(source, target, spec.displacementDirection);
    const radialDistance = Math.hypot(target.pos.x - source.pos.x, target.pos.z - source.pos.z);
    // Native negative rows pull toward the actor. Clamp at body contact so a
    // sequence of pulls cannot cross the caster and turn the next radial
    // sample into an accidental launch to the opposite side.
    const signedDistance =
      spec.moveDistanceYards < 0 && spec.displacementDirection === 'radial'
        ? -Math.min(
            Math.abs(spec.moveDistanceYards),
            Math.max(0, radialDistance - PLAYER_BODY_RADIUS * 2),
          )
        : spec.moveDistanceYards;
    const resolved = ctx.resolveMove(
      target.pos.x,
      target.pos.z,
      target.pos.x + direction.x * signedDistance,
      target.pos.z + direction.z * signedDistance,
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

  ctx.emit({
    type: 'mir4HitReaction',
    sourceId: source.id,
    targetId: target.id,
    skillId,
    attackId,
    durationMs: spec.durationMs,
    stance: spec.stance,
    moveDurationMs: Math.min(spec.moveDurationMs, spec.durationMs),
    heightYards: spec.heightYards,
  });
  return true;
}
