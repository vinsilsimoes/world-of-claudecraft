import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import type {
  Mir4NativeAttackBehaviorEvidence,
  Mir4NativeSkillAction,
  Mir4NativeSkillAttackRow,
} from '../../src/sim/content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../../src/sim/content/mir4/native_skill_buff_evidence';
import type { Mir4NativeSkillBuffEvidence } from '../../src/sim/content/mir4/native_skill_buff_types';
import { compileMir4NativeSourceBuffDispatch } from '../../src/sim/mir4/native_source_buff_dispatch';

function action1101(): Mir4NativeSkillAction {
  const action = mir4NativeDirectSkillActionEvidenceById(1101);
  if (!action) throw new Error('sealed native action 1101 is missing');
  return action;
}

function buffEvidence(buffId: number): Mir4NativeSkillBuffEvidence {
  const evidence = mir4NativeSkillBuffEvidenceById(buffId);
  if (!evidence) throw new Error(`sealed native BUFF ${buffId} is missing`);
  return evidence;
}

function cloneBehavior(
  behavior: Mir4NativeAttackBehaviorEvidence,
  buffIds: readonly number[] = behavior.buffIds,
): Mir4NativeAttackBehaviorEvidence {
  return { ...behavior, buffIds: [...buffIds] };
}

function cloneRow(
  row: Mir4NativeSkillAttackRow,
  overrides: Partial<Mir4NativeSkillAttackRow> = {},
): Mir4NativeSkillAttackRow {
  return {
    ...row,
    nativeBehavior: cloneBehavior(row.nativeBehavior),
    impactOffsetsMs: [...row.impactOffsetsMs],
    ...overrides,
  };
}

function cloneAction(
  rows: readonly Mir4NativeSkillAttackRow[] = action1101().rows.map((row) => cloneRow(row)),
  overrides: Partial<Mir4NativeSkillAction> = {},
): Mir4NativeSkillAction {
  const source = action1101();
  return {
    ...source,
    nativeBehavior: source.nativeBehavior,
    rows,
    ...overrides,
  };
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nestedValue of Object.values(value)) expectDeepFrozen(nestedValue);
}

function enumerableKeys(value: unknown, result: string[] = []): readonly string[] {
  if (value === null || typeof value !== 'object') return result;
  for (const [key, nestedValue] of Object.entries(value)) {
    result.push(key);
    enumerableKeys(nestedValue, result);
  }
  return result;
}

describe('MIR4 native source BUFF dispatch evidence', () => {
  it('compiles the sealed Warrior 1101 rows in source order with relative router delays', () => {
    const result = compileMir4NativeSourceBuffDispatch();

    expect(result).toEqual({
      ok: true,
      dispatch: {
        skillId: 1101,
        rows: [
          {
            attackId: 110100,
            buffIds: [11011],
            routerDelayMs: 20,
            recipientSide: 'source-owner',
            dispatchPhase: 'queued-before-target-loop',
            deliveryStatus: 'routed-dispatch-unresolved',
          },
          {
            attackId: 110101,
            buffIds: [11012],
            routerDelayMs: 100,
            recipientSide: 'source-owner',
            dispatchPhase: 'queued-before-target-loop',
            deliveryStatus: 'routed-dispatch-unresolved',
          },
        ],
      },
    });
    expectDeepFrozen(result);
  });

  it('does not expose downstream mutation, effect, stat, or crowd-control claims', () => {
    const result = compileMir4NativeSourceBuffDispatch();
    const keys = enumerableKeys(result).map((key) => key.toLowerCase());

    expect(keys).not.toContain('application');
    expect(keys).not.toContain('effect');
    expect(keys).not.toContain('stat');
    expect(keys).not.toContain('cc');
    expect(keys).not.toContain('target');
    expect(keys).toContain('deliverystatus');
  });

  it('does not freeze caller-owned mutable evidence clones', () => {
    const input = cloneAction();
    const rows = input.rows;

    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(rows)).toBe(false);
    expect(compileMir4NativeSourceBuffDispatch(input).ok).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(rows)).toBe(false);
  });

  it('rejects absent or non-1101 action evidence before reading row details', () => {
    const absent = compileMir4NativeSourceBuffDispatch(null);
    const wrongSkill = compileMir4NativeSourceBuffDispatch(
      cloneAction(undefined, { skillId: 1102 }),
    );

    expect(absent).toEqual({
      ok: false,
      issues: [{ code: 'missing-action-evidence', path: 'action' }],
    });
    expect(wrongSkill).toEqual({
      ok: false,
      issues: [
        {
          code: 'unsupported-skill-id',
          path: 'action.skillId',
          expected: 1101,
          actual: 1102,
        },
      ],
    });
    expectDeepFrozen(absent);
    expectDeepFrozen(wrongSkill);
  });

  it('rejects a different direct attack list instead of re-sorting it', () => {
    const input = cloneAction([...action1101().rows].reverse().map((row) => cloneRow(row)));
    const result = compileMir4NativeSourceBuffDispatch(input);

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'attack-list-mismatch',
          path: 'action.rows',
          expected: [110100, 110101],
          actual: [110101, 110100],
        },
      ],
    });
    expectDeepFrozen(result);
  });

  it('rejects changed Buff IDs or order without compiling a partial dispatch', () => {
    const rows = action1101().rows.map((row, index) =>
      index === 0
        ? cloneRow(row, {
            nativeBehavior: cloneBehavior(row.nativeBehavior, [11012, 11011]),
          })
        : cloneRow(row),
    );
    const result = compileMir4NativeSourceBuffDispatch(cloneAction(rows));

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'buff-list-mismatch',
          path: 'action.rows[0].nativeBehavior.buffIds',
          expected: [11011],
          actual: [11012, 11011],
        },
      ],
    });
    expect('dispatch' in result).toBe(false);
    expectDeepFrozen(result);
  });

  it('reports missing BUFF evidence and non-source BuffTarget in source-row order', () => {
    const wrongTarget = {
      ...buffEvidence(11012),
      rawRecord: { ...buffEvidence(11012).rawRecord, BuffTarget: 0 },
    } satisfies Mir4NativeSkillBuffEvidence;
    const result = compileMir4NativeSourceBuffDispatch(action1101(), (buffId) => {
      if (buffId === 11011) return null;
      if (buffId === 11012) return wrongTarget;
      return mir4NativeSkillBuffEvidenceById(buffId);
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'missing-buff-evidence',
          path: 'action.rows[0].nativeBehavior.buffIds[0]',
          actual: 11011,
        },
        {
          code: 'unsupported-buff-target',
          path: 'buffEvidence[11012].rawRecord.BuffTarget',
          expected: 1,
          actual: 0,
        },
      ],
    });
    expectDeepFrozen(result);
  });

  it('rejects missing, negative, and nonfinite relative router delays', () => {
    const sourceRows = action1101().rows;
    const missingFirstImpact = cloneAction([
      cloneRow(sourceRows[0] as Mir4NativeSkillAttackRow, { impactOffsetsMs: [] }),
      cloneRow(sourceRows[1] as Mir4NativeSkillAttackRow),
    ]);
    const negativeDelta = cloneAction([
      cloneRow(sourceRows[0] as Mir4NativeSkillAttackRow),
      cloneRow(sourceRows[1] as Mir4NativeSkillAttackRow, { impactOffsetsMs: [500] }),
    ]);
    const nonfiniteDelta = cloneAction([
      cloneRow(sourceRows[0] as Mir4NativeSkillAttackRow, { impactStartMs: Number.NaN }),
      cloneRow(sourceRows[1] as Mir4NativeSkillAttackRow),
    ]);

    expect(compileMir4NativeSourceBuffDispatch(missingFirstImpact)).toEqual({
      ok: false,
      issues: [
        {
          code: 'missing-first-impact',
          path: 'action.rows[0].impactOffsetsMs',
        },
      ],
    });
    expect(compileMir4NativeSourceBuffDispatch(negativeDelta)).toEqual({
      ok: false,
      issues: [
        {
          code: 'invalid-router-delay',
          path: 'action.rows[1].impactOffsetsMs[0]',
          actual: -50,
        },
      ],
    });
    expect(compileMir4NativeSourceBuffDispatch(nonfiniteDelta)).toEqual({
      ok: false,
      issues: [
        {
          code: 'invalid-router-delay',
          path: 'action.rows[0].impactOffsetsMs[0]',
          actual: 'NaN',
        },
      ],
    });
  });

  it('rejects positive timing drift instead of treating 650ms as a relative delay', () => {
    const rows = action1101().rows.map((row, index) =>
      index === 1 ? cloneRow(row, { impactOffsetsMs: [660] }) : cloneRow(row),
    );
    const result = compileMir4NativeSourceBuffDispatch(cloneAction(rows));

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'router-delay-mismatch',
          path: 'action.rows[1].impactOffsetsMs[0]',
          expected: 100,
          actual: 110,
        },
      ],
    });
  });
});
