import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { Mir4NativeSkillBuffEvidence } from '../content/mir4/native_skill_buff_types';

const WARRIOR_1101_SKILL_ID = 1101;

const EXPECTED_ROWS = [
  {
    attackId: 110100,
    buffIds: [11011],
    routerDelayMs: 20,
  },
  {
    attackId: 110101,
    buffIds: [11012],
    routerDelayMs: 100,
  },
] as const;

export type Mir4NativeSourceBuffDispatchIssueCode =
  | 'missing-action-evidence'
  | 'unsupported-skill-id'
  | 'attack-list-mismatch'
  | 'buff-list-mismatch'
  | 'missing-first-impact'
  | 'invalid-router-delay'
  | 'router-delay-mismatch'
  | 'missing-buff-evidence'
  | 'buff-evidence-id-mismatch'
  | 'unsupported-buff-target';

export type Mir4NativeSourceBuffDispatchIssueValue = number | string | readonly number[];

export interface Mir4NativeSourceBuffDispatchIssue {
  readonly code: Mir4NativeSourceBuffDispatchIssueCode;
  readonly path: string;
  readonly expected?: Mir4NativeSourceBuffDispatchIssueValue;
  readonly actual?: Mir4NativeSourceBuffDispatchIssueValue;
}

export interface Mir4NativeSourceBuffDispatchRow {
  readonly attackId: number;
  readonly buffIds: readonly number[];
  readonly routerDelayMs: number;
  readonly recipientSide: 'source-owner';
  readonly dispatchPhase: 'queued-before-target-loop';
  readonly deliveryStatus: 'routed-dispatch-unresolved';
}

export interface Mir4NativeSourceBuffDispatch {
  readonly skillId: 1101;
  readonly rows: readonly Mir4NativeSourceBuffDispatchRow[];
}

export type Mir4NativeSourceBuffDispatchResult =
  | {
      readonly ok: true;
      readonly dispatch: Mir4NativeSourceBuffDispatch;
    }
  | {
      readonly ok: false;
      readonly issues: readonly Mir4NativeSourceBuffDispatchIssue[];
    };

export type Mir4NativeSourceBuffEvidenceLookup = (
  buffId: number,
) => Mir4NativeSkillBuffEvidence | null;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}

function issueNumber(value: number): number | string {
  return Number.isFinite(value) ? value : String(value);
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function fail(
  issues: readonly Mir4NativeSourceBuffDispatchIssue[],
): Mir4NativeSourceBuffDispatchResult {
  return deepFreeze({
    ok: false as const,
    issues: issues.map((issue) => ({ ...issue })),
  });
}

/**
 * Compile the proved numeric source-side routing slice for native handler 60189.
 * The downstream transport and mutation behind FUN_14022B4A0 remain unresolved.
 */
export function compileMir4NativeSourceBuffDispatch(
  action: Mir4NativeSkillAction | null = mir4NativeDirectSkillActionEvidenceById(
    WARRIOR_1101_SKILL_ID,
  ),
  buffEvidenceById: Mir4NativeSourceBuffEvidenceLookup = mir4NativeSkillBuffEvidenceById,
): Mir4NativeSourceBuffDispatchResult {
  if (action === null) {
    return fail([{ code: 'missing-action-evidence', path: 'action' }]);
  }
  if (action.skillId !== WARRIOR_1101_SKILL_ID) {
    return fail([
      {
        code: 'unsupported-skill-id',
        path: 'action.skillId',
        expected: WARRIOR_1101_SKILL_ID,
        actual: action.skillId,
      },
    ]);
  }

  const attackIds = action.rows.map((row) => row.attackId);
  const expectedAttackIds = EXPECTED_ROWS.map((row) => row.attackId);
  if (!sameNumbers(attackIds, expectedAttackIds)) {
    return fail([
      {
        code: 'attack-list-mismatch',
        path: 'action.rows',
        expected: expectedAttackIds,
        actual: attackIds,
      },
    ]);
  }

  const issues: Mir4NativeSourceBuffDispatchIssue[] = [];
  const rows: Mir4NativeSourceBuffDispatchRow[] = [];

  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const expected = EXPECTED_ROWS[index];
    const row = action.rows[index];
    if (!expected || !row) throw new Error('validated Warrior 1101 row index is missing');

    const buffIds = [...row.nativeBehavior.buffIds];
    const buffListMatches = sameNumbers(buffIds, expected.buffIds);
    if (!buffListMatches) {
      issues.push({
        code: 'buff-list-mismatch',
        path: `action.rows[${index}].nativeBehavior.buffIds`,
        expected: [...expected.buffIds],
        actual: buffIds,
      });
    }

    let routerDelayMs: number | null = null;
    const firstImpactMs = row.impactOffsetsMs[0];
    if (firstImpactMs === undefined) {
      issues.push({
        code: 'missing-first-impact',
        path: `action.rows[${index}].impactOffsetsMs`,
      });
    } else {
      const candidate = firstImpactMs - row.impactStartMs;
      if (!Number.isFinite(candidate) || candidate < 0) {
        issues.push({
          code: 'invalid-router-delay',
          path: `action.rows[${index}].impactOffsetsMs[0]`,
          actual: issueNumber(candidate),
        });
      } else if (candidate !== expected.routerDelayMs) {
        issues.push({
          code: 'router-delay-mismatch',
          path: `action.rows[${index}].impactOffsetsMs[0]`,
          expected: expected.routerDelayMs,
          actual: candidate,
        });
      } else {
        routerDelayMs = candidate;
      }
    }

    if (buffListMatches) {
      for (let buffIndex = 0; buffIndex < buffIds.length; buffIndex += 1) {
        const buffId = buffIds[buffIndex];
        if (buffId === undefined) continue;
        const evidence = buffEvidenceById(buffId);
        if (evidence === null) {
          issues.push({
            code: 'missing-buff-evidence',
            path: `action.rows[${index}].nativeBehavior.buffIds[${buffIndex}]`,
            actual: buffId,
          });
          continue;
        }
        if (evidence.id !== buffId || evidence.rawRecord.BuffId !== buffId) {
          issues.push({
            code: 'buff-evidence-id-mismatch',
            path: `buffEvidence[${buffId}].id`,
            expected: buffId,
            actual: `${evidence.id}/${evidence.rawRecord.BuffId}`,
          });
          continue;
        }
        if (evidence.rawRecord.BuffTarget !== 1) {
          issues.push({
            code: 'unsupported-buff-target',
            path: `buffEvidence[${buffId}].rawRecord.BuffTarget`,
            expected: 1,
            actual: evidence.rawRecord.BuffTarget,
          });
        }
      }
    }

    if (buffListMatches && routerDelayMs !== null) {
      rows.push({
        attackId: row.attackId,
        buffIds,
        routerDelayMs,
        recipientSide: 'source-owner',
        dispatchPhase: 'queued-before-target-loop',
        deliveryStatus: 'routed-dispatch-unresolved',
      });
    }
  }

  if (issues.length > 0) return fail(issues);

  return deepFreeze({
    ok: true as const,
    dispatch: {
      skillId: WARRIOR_1101_SKILL_ID,
      rows: rows.map((row) => ({ ...row, buffIds: [...row.buffIds] })),
    },
  });
}
