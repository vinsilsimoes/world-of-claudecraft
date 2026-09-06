import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeGeneratedMechanicalRow } from './native_skill_generated_contract';

export interface Mir4NativeRuntimeInertReaction {
  readonly skillId: number;
  readonly attackId: number;
  readonly probabilityPercent: number;
  readonly active: false;
  readonly inactiveReason: 'zero-kind';
  readonly value?: number;
  readonly nativeHeight?: number;
  readonly valueEx?: number;
  readonly durationMs?: number;
  readonly direction?: number;
}

const INERT_REACTIONS = Object.freeze([
  Object.freeze({
    skillId: 1103,
    attackId: 110105,
    probabilityPercent: 100,
    active: false as const,
    inactiveReason: 'zero-kind' as const,
  }),
  Object.freeze({
    skillId: 1601,
    attackId: 160101,
    probabilityPercent: 100,
    active: false as const,
    inactiveReason: 'zero-kind' as const,
  }),
  Object.freeze({
    skillId: 1601,
    attackId: 160102,
    probabilityPercent: 100,
    active: false as const,
    inactiveReason: 'zero-kind' as const,
  }),
  ...[410601, 410603].map((attackId) =>
    Object.freeze({
      skillId: 4106,
      attackId,
      probabilityPercent: 100,
      active: false as const,
      inactiveReason: 'zero-kind' as const,
    }),
  ),
  Object.freeze({
    skillId: 5103,
    attackId: 510303,
    probabilityPercent: 100,
    active: false as const,
    inactiveReason: 'zero-kind' as const,
    value: 50,
    nativeHeight: 0,
    valueEx: 0.3,
    durationMs: 100,
    direction: 0,
  }),
]);

/** A zero reaction kind carries no runtime dispatcher despite its probability field. */
export function mir4NativeInertReactionMatchesRow(
  row: Mir4NativeSkillAttackRow,
  policy: Mir4NativeRuntimeInertReaction,
): boolean {
  return (
    row.attackId === policy.attackId &&
    row.reaction.kind === 'none' &&
    row.reaction.stance === 'none' &&
    row.reaction.value === (policy.value ?? 0) &&
    row.reaction.nativeHeight === (policy.nativeHeight ?? 0) &&
    row.reaction.valueEx === (policy.valueEx ?? 0) &&
    row.reaction.durationMs === (policy.durationMs ?? 0) &&
    row.reaction.probabilityPercent === policy.probabilityPercent &&
    row.reaction.direction === (policy.direction ?? 0)
  );
}

export function mir4NativeRuntimeInertReaction(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeInertReaction | null {
  const generatedRow = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  const explicitPolicy = INERT_REACTIONS.find(
    (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
  );
  const policy =
    explicitPolicy ??
    (generatedRow?.reaction.kind === 'none'
      ? Object.freeze({
          skillId,
          attackId,
          probabilityPercent: generatedRow.reaction.probabilityPercent,
          active: false as const,
          inactiveReason: 'zero-kind' as const,
        })
      : undefined);
  if (!policy) return null;
  const row =
    generatedRow ??
    mir4NativeSkillActionById(skillId)?.rows.find((candidate) => candidate.attackId === attackId);
  return row && mir4NativeInertReactionMatchesRow(row, policy) ? policy : null;
}
