import { describe, expect, it } from 'vitest';
import { mir4NativeSkillBuffEvidenceById } from '../../src/sim/content/mir4/native_skill_buff_evidence';
import type { Mir4NativeBuffRawRecord } from '../../src/sim/content/mir4/native_skill_buff_types';
import {
  advanceMir4NativeTimedBuffs,
  aggregateMir4NativeTimedBuffContributions,
  applyMir4NativeTimedBuff,
  compileMir4NativeTimedBuff,
  createMir4NativeTimedBuffState,
  detachMir4NativeTimedBuff,
  type Mir4NativeCompiledTimedBuff,
} from '../../src/sim/mir4/native_timed_buffs';

function nativeBuffRecord(buffId: number): Mir4NativeBuffRawRecord {
  const rawRecord = mir4NativeSkillBuffEvidenceById(buffId)?.rawRecord;
  if (!rawRecord) throw new Error(`sealed BUFF ${buffId} evidence is missing`);
  return rawRecord;
}

const NATIVE_11012 = nativeBuffRecord(11012);

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nestedValue of Object.values(value)) expectDeepFrozen(nestedValue);
}

function rawBuff(overrides: Partial<Mir4NativeBuffRawRecord> = {}): Mir4NativeBuffRawRecord {
  return {
    ...NATIVE_11012,
    BuffId: 900_001,
    BuffTime: 1,
    LevelUpBuffTime: 0,
    BuffIndexType_1: 1,
    BuffIndex_1: 1,
    BuffValue_1: 10,
    LevelUpBuffValue_1: 0,
    BuffValueEx_1: 0,
    BuffIndexType_2: 0,
    BuffIndex_2: 0,
    BuffValue_2: 0,
    LevelUpBuffValue_2: 0,
    BuffValueEx_2: 0,
    BuffIndexType_3: 0,
    BuffIndex_3: 0,
    BuffValue_3: 0,
    LevelUpBuffValue_3: 0,
    BuffValueEx_3: 0,
    ...overrides,
  };
}

function compiled(
  overrides: Partial<Mir4NativeBuffRawRecord> = {},
  level = 1,
): Mir4NativeCompiledTimedBuff {
  const result = compileMir4NativeTimedBuff(rawBuff(overrides), level);
  if (!result.ok) throw new Error(`fixture failed: ${JSON.stringify(result.issues)}`);
  return result.buff;
}

describe('MIR4 native timed type-1 BUFF core', () => {
  it('compiles sealed BUFF 11012 at levels 1, 5, and 10 without naming calculated ID 135', () => {
    const results = [1, 5, 10].map((level) => compileMir4NativeTimedBuff(NATIVE_11012, level));

    expect(results).toEqual([
      {
        ok: true,
        buff: {
          buffId: 11012,
          level: 1,
          durationMs: 15_000,
          contributions: [{ calculatedId: 135, value: 120 }],
        },
      },
      {
        ok: true,
        buff: {
          buffId: 11012,
          level: 5,
          durationMs: 15_000,
          contributions: [{ calculatedId: 135, value: 200 }],
        },
      },
      {
        ok: true,
        buff: {
          buffId: 11012,
          level: 10,
          durationMs: 15_000,
          contributions: [{ calculatedId: 135, value: 300 }],
        },
      },
    ]);
    for (const result of results) {
      expectDeepFrozen(result);
      if (!result.ok) continue;
      expect(Object.keys(result.buff.contributions[0] ?? {})).toEqual(['calculatedId', 'value']);
    }
  });

  it('scales duration and every type-1 slot from the incoming level', () => {
    const result = compileMir4NativeTimedBuff(
      rawBuff({
        BuffTime: 1.5,
        LevelUpBuffTime: 0.25,
        BuffIndex_1: 3,
        BuffValue_1: -20,
        LevelUpBuffValue_1: -5,
        BuffIndexType_2: 1,
        BuffIndex_2: 4,
        BuffValue_2: 100,
        LevelUpBuffValue_2: 25,
      }),
      3,
    );

    expect(result).toEqual({
      ok: true,
      buff: {
        buffId: 900_001,
        level: 3,
        durationMs: 2_000,
        contributions: [
          { calculatedId: 94, value: -30 },
          { calculatedId: 95, value: 150 },
        ],
      },
    });
    expectDeepFrozen(result);
  });

  it('keeps the real 10020 numeric slice negative without assigning status or CC names', () => {
    const result = compileMir4NativeTimedBuff(
      rawBuff({
        BuffId: 10020,
        BuffTime: 5,
        LevelUpBuffTime: 1,
        BuffIndex_1: 24,
        BuffValue_1: -25,
      }),
      1,
    );

    expect(result).toEqual({
      ok: true,
      buff: {
        buffId: 10020,
        level: 1,
        durationMs: 5_000,
        contributions: [{ calculatedId: 115, value: -25 }],
      },
    });
    if (result.ok) {
      expect(Object.keys(result.buff.contributions[0] ?? {})).toEqual(['calculatedId', 'value']);
    }
    expectDeepFrozen(result);
  });

  it('refreshes the same BuffId and level without duplicating or reordering it', () => {
    const first = compiled({ BuffId: 900_101, BuffTime: 1, BuffValue_1: 10 });
    const second = compiled({ BuffId: 900_102, BuffTime: 2, BuffValue_1: 20 });
    const initial = applyMir4NativeTimedBuff(
      applyMir4NativeTimedBuff(createMir4NativeTimedBuffState(), first),
      second,
    );
    const elapsed = advanceMir4NativeTimedBuffs(initial, 400);
    const refreshed = applyMir4NativeTimedBuff(elapsed, first);

    expect(elapsed.active.map((buff) => [buff.buffId, buff.remainingMs])).toEqual([
      [900_101, 600],
      [900_102, 1_600],
    ]);
    expect(refreshed.active.map((buff) => [buff.buffId, buff.remainingMs])).toEqual([
      [900_101, 1_000],
      [900_102, 1_600],
    ]);
    expect(refreshed.active).toHaveLength(2);
    expectDeepFrozen(refreshed);
  });

  it('replaces the exact old contribution when the same BuffId changes level', () => {
    const row = { BuffId: 900_201, BuffValue_1: 10, LevelUpBuffValue_1: 5 } as const;
    const levelOne = compiled(row, 1);
    const levelThree = compiled(row, 3);
    const neighbor = compiled({ BuffId: 900_202, BuffIndex_1: 2, BuffValue_1: 7 });
    const before = applyMir4NativeTimedBuff(
      applyMir4NativeTimedBuff(createMir4NativeTimedBuffState(), levelOne),
      neighbor,
    );
    const after = applyMir4NativeTimedBuff(before, levelThree);

    expect(before.active[0]?.contributions).toEqual([{ calculatedId: 92, value: 10 }]);
    expect(after.active.map((buff) => buff.buffId)).toEqual([900_201, 900_202]);
    expect(after.active[0]?.contributions).toEqual([{ calculatedId: 92, value: 20 }]);
    expect(aggregateMir4NativeTimedBuffContributions(after)).toEqual([
      { calculatedId: 92, value: 20 },
      { calculatedId: 93, value: 7 },
    ]);
    expectDeepFrozen(after);
  });

  it('keeps distinct BuffIds additive and aggregates in first-application order', () => {
    const buffs = [
      compiled({ BuffId: 900_301, BuffIndex_1: 2, BuffValue_1: 10 }),
      compiled({ BuffId: 900_302, BuffIndex_1: 1, BuffValue_1: 4 }),
      compiled({ BuffId: 900_303, BuffIndex_1: 2, BuffValue_1: -3 }),
    ];
    const state = buffs.reduce(applyMir4NativeTimedBuff, createMir4NativeTimedBuffState());
    const aggregate = aggregateMir4NativeTimedBuffContributions(state);

    expect(state.active.map((buff) => buff.buffId)).toEqual([900_301, 900_302, 900_303]);
    expect(aggregate).toEqual([
      { calculatedId: 93, value: 7 },
      { calculatedId: 92, value: 4 },
    ]);
    expectDeepFrozen(state);
    expectDeepFrozen(aggregate);
  });

  it('expires only at the deterministic remaining-time boundary', () => {
    const short = compiled({ BuffId: 900_401, BuffTime: 0.1, BuffValue_1: 10 });
    const long = compiled({ BuffId: 900_402, BuffTime: 0.2, BuffValue_1: 20 });
    const initial = applyMir4NativeTimedBuff(
      applyMir4NativeTimedBuff(createMir4NativeTimedBuffState(), short),
      long,
    );
    const beforeBoundary = advanceMir4NativeTimedBuffs(initial, 99);
    const atBoundary = advanceMir4NativeTimedBuffs(beforeBoundary, 1);
    const final = advanceMir4NativeTimedBuffs(atBoundary, 100);

    expect(beforeBoundary.active.map((buff) => [buff.buffId, buff.remainingMs])).toEqual([
      [900_401, 1],
      [900_402, 101],
    ]);
    expect(atBoundary.active.map((buff) => [buff.buffId, buff.remainingMs])).toEqual([
      [900_402, 100],
    ]);
    expect(final).toEqual({ active: [] });
    expect(initial.active.map((buff) => buff.remainingMs)).toEqual([100, 200]);
    expectDeepFrozen(final);
  });

  it('detaches only the exact BuffId and preserves the remaining order', () => {
    const state = [900_501, 900_502, 900_503]
      .map((BuffId, index) => compiled({ BuffId, BuffValue_1: index + 1 }))
      .reduce(applyMir4NativeTimedBuff, createMir4NativeTimedBuffState());
    const detached = detachMir4NativeTimedBuff(state, 900_502);

    expect(detached.active.map((buff) => buff.buffId)).toEqual([900_501, 900_503]);
    expect(detachMir4NativeTimedBuff(detached, 999_999)).toBe(detached);
    expect(state.active.map((buff) => buff.buffId)).toEqual([900_501, 900_502, 900_503]);
    expectDeepFrozen(detached);
  });

  it('fails closed on a mixed active index-type row without returning a partial buff', () => {
    const result = compileMir4NativeTimedBuff(
      rawBuff({
        BuffIndexType_2: 2,
        BuffIndex_2: 2,
        BuffValue_2: 50,
      }),
      1,
    );

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'unsupported-active-index-type',
          path: 'BuffIndexType_2',
          actual: 2,
        },
      ],
    });
    expect('buff' in result).toBe(false);
    expectDeepFrozen(result);
  });

  it('rejects sealed non-type-1 BUFF 11011 without inferring invulnerability semantics', () => {
    const result = compileMir4NativeTimedBuff(nativeBuffRecord(11011), 1);

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'unsupported-active-index-type',
          path: 'BuffIndexType_1',
          actual: 3,
        },
        {
          code: 'no-calculated-contributions',
          path: 'contributions',
          actual: 0,
        },
      ],
    });
    expect('buff' in result).toBe(false);
    expectDeepFrozen(result);
  });

  it('rejects overlap and raw detach semantics outside the proved zero-overlap lifecycle', () => {
    const result = compileMir4NativeTimedBuff(
      rawBuff({
        BuffOverlap: 2,
        OverLapCallGroupID: 7,
        detachBuffID: [0, 900_001, 0],
      }),
      1,
    );

    expect(result).toEqual({
      ok: false,
      issues: [
        { code: 'unsupported-buff-overlap', path: 'BuffOverlap', actual: 2 },
        {
          code: 'unsupported-overlap-call-group',
          path: 'OverLapCallGroupID',
          actual: 7,
        },
        {
          code: 'unsupported-detach-buff-id',
          path: 'detachBuffID[1]',
          actual: 900_001,
        },
      ],
    });
    expect('buff' in result).toBe(false);
    expectDeepFrozen(result);
  });

  it('reports invalid IDs, level, duration, and values in a stable field order', () => {
    const result = compileMir4NativeTimedBuff(
      rawBuff({
        BuffId: 0,
        BuffTime: Number.NaN,
        LevelUpBuffTime: Number.POSITIVE_INFINITY,
        BuffIndex_1: 0,
        BuffValue_1: Number.NEGATIVE_INFINITY,
        LevelUpBuffValue_1: 2_147_483_648,
      }),
      0,
    );

    expect(result).toEqual({
      ok: false,
      issues: [
        { code: 'invalid-buff-id', path: 'BuffId', actual: 0 },
        { code: 'invalid-level', path: 'level', actual: 0 },
        { code: 'invalid-duration-source', path: 'BuffTime', actual: 'NaN' },
        {
          code: 'invalid-duration-source',
          path: 'LevelUpBuffTime',
          actual: 'Infinity',
        },
        { code: 'invalid-buff-index', path: 'BuffIndex_1', actual: 0 },
        { code: 'invalid-buff-value', path: 'BuffValue_1', actual: '-Infinity' },
        {
          code: 'invalid-level-up-buff-value',
          path: 'LevelUpBuffValue_1',
          actual: 2_147_483_648,
        },
      ],
    });
    expectDeepFrozen(result);
  });

  it('rejects out-of-holder IDs, overflowing scaled values, and nonpositive durations', () => {
    const badIndex = compileMir4NativeTimedBuff(rawBuff({ BuffIndex_1: 91 }), 1);
    const badValue = compileMir4NativeTimedBuff(
      rawBuff({ BuffValue_1: 2_147_483_647, LevelUpBuffValue_1: 1 }),
      2,
    );
    const badDuration = compileMir4NativeTimedBuff(
      rawBuff({ BuffTime: 0.5, LevelUpBuffTime: -0.5 }),
      2,
    );

    expect(badIndex).toEqual({
      ok: false,
      issues: [{ code: 'invalid-calculated-id', path: 'BuffIndex_1', actual: 182 }],
    });
    expect(badValue).toEqual({
      ok: false,
      issues: [
        {
          code: 'invalid-contribution-value',
          path: 'BuffValue_1+LevelUpBuffValue_1',
          actual: 2_147_483_648,
        },
      ],
    });
    expect(badDuration).toEqual({
      ok: false,
      issues: [{ code: 'invalid-duration', path: 'durationMs', actual: 0 }],
    });
  });

  it('rejects rows with no effective calculated contribution', () => {
    const inactive = compileMir4NativeTimedBuff(
      rawBuff({ BuffIndexType_1: 0, BuffIndex_1: 0, BuffValue_1: 0 }),
      1,
    );
    const zeroOnly = compileMir4NativeTimedBuff(rawBuff({ BuffValue_1: 0 }), 1);

    expect(inactive).toEqual({
      ok: false,
      issues: [
        {
          code: 'no-calculated-contributions',
          path: 'contributions',
          actual: 0,
        },
      ],
    });
    expect(zeroOnly).toEqual(inactive);
  });

  it('rejects invalid deterministic advance deltas before mutating state', () => {
    const state = applyMir4NativeTimedBuff(createMir4NativeTimedBuffState(), compiled());

    expect(() => advanceMir4NativeTimedBuffs(state, -1)).toThrow(RangeError);
    expect(() => advanceMir4NativeTimedBuffs(state, 0.5)).toThrow(RangeError);
    expect(state.active[0]?.remainingMs).toBe(1_000);
  });
});
