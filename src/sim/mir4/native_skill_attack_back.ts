import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { refreshMir4NativeHitReactionState } from './native_skill_hit_reaction';
import { mir4NativeServerCrowdControlWindowMs } from './native_skill_reactions';

const NATIVE_ATTACK_BACK_ROWS = Object.freeze([
  Object.freeze({
    skillId: 3103,
    attackId: 310303,
    stance: 'hit-01' as const,
    value: 10,
    nativeHeight: 0,
    valueEx: 0.1,
    nativeDurationMs: 100,
    probabilityPercent: 100,
    nativeDirection: 1 as const,
    impactCount: 2,
  }),
  ...[320102, 320104].map((attackId) =>
    Object.freeze({
      skillId: 3201,
      attackId,
      stance: 'hit-01' as const,
      value: -10,
      nativeHeight: 0,
      valueEx: 0.1,
      nativeDurationMs: 100,
      probabilityPercent: 100,
      nativeDirection: 0 as const,
      impactCount: 1,
    }),
  ),
  ...[330305, 330306].map((attackId) =>
    Object.freeze({
      skillId: 3303,
      attackId,
      stance: 'hit-01' as const,
      value: 60,
      nativeHeight: 0,
      valueEx: 0.1,
      nativeDurationMs: 200,
      probabilityPercent: 100,
      nativeDirection: 1 as const,
      impactCount: attackId === 330305 ? 2 : 1,
    }),
  ),
  ...[540101, 540103, 540105].map((attackId) =>
    Object.freeze({
      skillId: 5401,
      attackId,
      stance: 'hit-01' as const,
      value: 40,
      nativeHeight: 0,
      valueEx: 0.2,
      nativeDurationMs: 200,
      probabilityPercent: 100,
      nativeDirection: 0 as const,
      impactCount: 1,
    }),
  ),
  ...[
    [540301, 40],
    [540304, 80],
  ].map(([attackId, value]) =>
    Object.freeze({
      skillId: 5403,
      attackId,
      stance: 'hit-01' as const,
      value,
      nativeHeight: 0,
      valueEx: 0.2,
      nativeDurationMs: 200,
      probabilityPercent: 100,
      nativeDirection: 0 as const,
      impactCount: 1,
    }),
  ),
]);

export interface Mir4NativeRuntimeAttackBackReaction {
  readonly kind: 'attack-back';
  readonly stance: 'hit-01';
  readonly durationMs: number;
  readonly triggerSourceImpactIndex: 0;
}

/** Exact raw-row guard for native CrowdControlType 99 attack-back presentation. */
export function mir4NativeAttackBackReactionMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  const evidence = NATIVE_ATTACK_BACK_ROWS.find((candidate) => candidate.attackId === row.attackId);
  if (!evidence) return false;
  return (
    row.attackId === evidence.attackId &&
    row.reaction.kind === 'attack-back' &&
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

/** CrowdControlType 99 plays a reaction only. It does not move or disable the target. */
export function mir4NativeRuntimeAttackBackReaction(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeAttackBackReaction | null {
  if (
    !NATIVE_ATTACK_BACK_ROWS.some(
      (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
    )
  )
    return null;
  const evidence = NATIVE_ATTACK_BACK_ROWS.find(
    (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
  );
  if (!evidence) return null;
  const row = mir4NativeSkillActionById(skillId)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row || !mir4NativeAttackBackReactionMatchesRow(row)) return null;
  return Object.freeze({
    kind: 'attack-back' as const,
    stance: evidence.stance,
    durationMs: mir4NativeServerCrowdControlWindowMs(row),
    triggerSourceImpactIndex: 0 as const,
  });
}

export function applyMir4NativeAttackBackReaction(
  ctx: Pick<SimContext, 'emit'>,
  source: Entity,
  target: Entity,
  skillId: number,
  attackId: number,
  sourceImpactIndex: number,
  spec: Mir4NativeRuntimeAttackBackReaction,
): boolean {
  if (
    sourceImpactIndex !== spec.triggerSourceImpactIndex ||
    !refreshMir4NativeHitReactionState(target, spec.durationMs / 1_000, source.id)
  ) {
    return false;
  }
  ctx.emit({
    type: 'mir4HitReaction',
    sourceId: source.id,
    targetId: target.id,
    skillId,
    attackId,
    durationMs: spec.durationMs,
    stance: spec.stance,
  });
  return true;
}
