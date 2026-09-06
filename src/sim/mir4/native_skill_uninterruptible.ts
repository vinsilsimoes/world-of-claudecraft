import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';

export interface Mir4NativeUninterruptibleBuffSpec {
  readonly skillId: 1501 | 5401 | 5403;
  readonly attackId: 150101 | 540101 | 540301;
  readonly buffId: 11031 | 51011;
  readonly effectId: 'mir4_native_buff_11031' | 'mir4_native_buff_51011';
  readonly kind: 'control-immunity';
  readonly durationMs: 2_000 | 1_500;
  readonly applyTo: 'source';
  readonly applyPhase: 'action-start';
}

const UNINTERRUPTIBLE_SPECS: readonly Mir4NativeUninterruptibleBuffSpec[] = Object.freeze([
  Object.freeze({
    skillId: 1501,
    attackId: 150101,
    buffId: 11031,
    effectId: 'mir4_native_buff_11031',
    kind: 'control-immunity',
    durationMs: 2_000,
    applyTo: 'source',
    applyPhase: 'action-start',
  }),
  Object.freeze({
    skillId: 5401,
    attackId: 540101,
    buffId: 51011,
    effectId: 'mir4_native_buff_51011',
    kind: 'control-immunity',
    durationMs: 1_500,
    applyTo: 'source',
    applyPhase: 'action-start',
  }),
  Object.freeze({
    skillId: 5403,
    attackId: 540301,
    buffId: 51011,
    effectId: 'mir4_native_buff_51011',
    kind: 'control-immunity',
    durationMs: 1_500,
    applyTo: 'source',
    applyPhase: 'action-start',
  }),
]);

const EXPECTED_ROW_BUFF_IDS: Readonly<Record<number, readonly number[]>> = Object.freeze({
  150101: Object.freeze([11031]),
  540101: Object.freeze([51011]),
  540301: Object.freeze([51011, 54011, 50109]),
});

function exactUninterruptibleBuff(spec: Mir4NativeUninterruptibleBuffSpec): boolean {
  const evidence = mir4NativeSkillBuffEvidenceById(spec.buffId)?.rawRecord;
  return (
    evidence?.BuffId === spec.buffId &&
    evidence.BuffUseType === 1 &&
    evidence.ApplyType === 0 &&
    evidence.BuffTarget === 1 &&
    evidence.BuffTime * 1_000 === spec.durationMs &&
    evidence.LevelUpBuffTime === 0 &&
    evidence.BuffType === 1 &&
    evidence.BuffIndexType_1 === 3 &&
    evidence.BuffIndex_1 === 4004 &&
    evidence.BuffValue_1 === 0 &&
    evidence.LevelUpBuffValue_1 === 0 &&
    evidence.BuffProbability === 1_000 &&
    evidence.BuffOverlap === 0
  );
}

/** Exact SKILL_ATTACK row guard for the self BUFF carried by the first 1501 row. */
export function mir4NativeSourceUninterruptibleBuffMatchesRow(
  row: Mir4NativeSkillAttackRow,
): boolean {
  const spec = UNINTERRUPTIBLE_SPECS.find((candidate) => candidate.attackId === row.attackId);
  const expectedBuffIds = EXPECTED_ROW_BUFF_IDS[row.attackId];
  return (
    spec !== undefined &&
    expectedBuffIds !== undefined &&
    row.nativeBehavior.buffIds.length === expectedBuffIds.length &&
    row.nativeBehavior.buffIds.every((buffId, index) => buffId === expectedBuffIds[index]) &&
    row.nativeBehavior.ccBuffIds.length === 0 &&
    exactUninterruptibleBuff(spec)
  );
}

/** Runtime lookup remains closed to the exact reviewed skill, attack and BUFF chains. */
export function mir4NativeRuntimeUninterruptibleBuff(
  skillId: number,
): Mir4NativeUninterruptibleBuffSpec | null {
  const spec = UNINTERRUPTIBLE_SPECS.find((candidate) => candidate.skillId === skillId);
  if (!spec) return null;
  const row = mir4NativeSkillActionById(skillId)?.rows.find(
    (candidate) => candidate.attackId === spec.attackId,
  );
  if (!row || !mir4NativeSourceUninterruptibleBuffMatchesRow(row)) return null;
  return spec;
}

/** Apply/refresh the exact source buff when the native action commits. */
export function applyMir4NativeUninterruptibleBuff(
  ctx: SimContext,
  source: Entity,
  spec: Mir4NativeUninterruptibleBuffSpec,
): boolean {
  const existing = source.mir4Effects?.active.find((effect) => effect.effectId === spec.effectId);
  if (existing) {
    existing.kind = spec.kind;
    existing.duration = spec.durationMs / 1_000;
    existing.remaining = existing.duration;
    existing.magnitude = 0;
    existing.sourceId = source.id;
    return true;
  }
  return applyMir4Effect(ctx, source, {
    effectId: spec.effectId,
    kind: spec.kind,
    durationSeconds: spec.durationMs / 1_000,
    magnitude: 0,
    name: 'Uninterruptible',
    sourceId: source.id,
  }).ok;
}
