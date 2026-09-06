import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeGeneratedMechanicalRow } from './native_skill_generated_contract';

export interface Mir4NativeAttackUseTypePolicy {
  readonly skillId: number;
  readonly attackId: number;
  readonly attackUseType: 1;
  readonly dispatchOwner: 'source-owner';
}

const POLICIES = new Map<number, ReadonlyMap<number, Mir4NativeAttackUseTypePolicy>>([
  [
    1502,
    new Map(
      [150201, 150202].map((attackId) => [
        attackId,
        Object.freeze({
          skillId: 1502,
          attackId,
          attackUseType: 1 as const,
          dispatchOwner: 'source-owner' as const,
        }),
      ]),
    ),
  ],
]);

export function mir4NativeRuntimeAttackUseTypePolicy(
  skillId: number,
  attackId: number,
): Mir4NativeAttackUseTypePolicy | null {
  const generatedRow = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  const expected =
    POLICIES.get(skillId)?.get(attackId) ??
    (generatedRow?.nativeBehavior.attackUseType === 1
      ? Object.freeze({
          skillId,
          attackId,
          attackUseType: 1 as const,
          dispatchOwner: 'source-owner' as const,
        })
      : undefined);
  const row =
    generatedRow ??
    mir4NativeSkillActionById(skillId)?.rows.find((candidate) => candidate.attackId === attackId);
  return expected && row && mir4NativeAttackUseTypeMatchesRow(row, expected) ? expected : null;
}

export function mir4NativeAttackUseTypeMatchesRow(
  row: Mir4NativeSkillAttackRow,
  expected: Mir4NativeAttackUseTypePolicy,
): boolean {
  return row.attackId === expected.attackId && row.nativeBehavior.attackUseType === 1;
}
