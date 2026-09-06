import type { Mir4NativeBuffRawRecord } from '../content/mir4/native_skill_buff_types';

const UINT16_MAX = 0xffff;
const UINT32_MAX = 0xffff_ffff;
const INT16_MAX = 0x7fff;
const INT32_MIN = -0x8000_0000;
const INT32_MAX = 0x7fff_ffff;
const CALCULATED_ID_OFFSET = 91;
const CALCULATED_HOLDER_SIZE = 182;

const SLOT_FIELDS = [
  {
    indexType: 'BuffIndexType_1',
    index: 'BuffIndex_1',
    value: 'BuffValue_1',
    levelUpValue: 'LevelUpBuffValue_1',
  },
  {
    indexType: 'BuffIndexType_2',
    index: 'BuffIndex_2',
    value: 'BuffValue_2',
    levelUpValue: 'LevelUpBuffValue_2',
  },
  {
    indexType: 'BuffIndexType_3',
    index: 'BuffIndex_3',
    value: 'BuffValue_3',
    levelUpValue: 'LevelUpBuffValue_3',
  },
] as const;

export type Mir4NativeTimedBuffIssueCode =
  | 'invalid-buff-id'
  | 'invalid-level'
  | 'invalid-duration-source'
  | 'invalid-duration'
  | 'unsupported-buff-overlap'
  | 'unsupported-overlap-call-group'
  | 'unsupported-detach-buff-id'
  | 'invalid-index-type'
  | 'unsupported-active-index-type'
  | 'invalid-buff-index'
  | 'invalid-calculated-id'
  | 'invalid-buff-value'
  | 'invalid-level-up-buff-value'
  | 'invalid-contribution-value'
  | 'no-calculated-contributions';

export interface Mir4NativeTimedBuffIssue {
  readonly code: Mir4NativeTimedBuffIssueCode;
  readonly path: string;
  readonly actual: number | string;
}

export interface Mir4NativeCalculatedContribution {
  /** Numeric calculated-holder ID only. No gameplay stat meaning is inferred. */
  readonly calculatedId: number;
  readonly value: number;
}

export interface Mir4NativeCompiledTimedBuff {
  readonly buffId: number;
  readonly level: number;
  readonly durationMs: number;
  readonly contributions: readonly Mir4NativeCalculatedContribution[];
}

export interface Mir4NativeTimedBuffCompileSuccess {
  readonly ok: true;
  readonly buff: Mir4NativeCompiledTimedBuff;
}

export interface Mir4NativeTimedBuffCompileFailure {
  readonly ok: false;
  readonly issues: readonly Mir4NativeTimedBuffIssue[];
}

export type Mir4NativeTimedBuffCompileResult =
  | Mir4NativeTimedBuffCompileSuccess
  | Mir4NativeTimedBuffCompileFailure;

export interface Mir4NativeTimedBuffInstance extends Mir4NativeCompiledTimedBuff {
  readonly remainingMs: number;
}

export interface Mir4NativeTimedBuffState {
  /** Native map identity is BuffId; this array retains first-application order. */
  readonly active: readonly Mir4NativeTimedBuffInstance[];
}

interface MutableIssue extends Mir4NativeTimedBuffIssue {}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}

function issueActual(value: number): number | string {
  return Number.isFinite(value) ? value : String(value);
}

function addIssue(
  issues: MutableIssue[],
  code: Mir4NativeTimedBuffIssueCode,
  path: string,
  actual: number,
): void {
  issues.push({ code, path, actual: issueActual(actual) });
}

function fail(issues: readonly MutableIssue[]): Mir4NativeTimedBuffCompileFailure {
  return deepFreeze({
    ok: false as const,
    issues: issues.map((issue) => ({ ...issue })),
  });
}

function isUint16(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= UINT16_MAX;
}

function isUint32(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= UINT32_MAX;
}

function isInt32(value: number): boolean {
  return Number.isSafeInteger(value) && value >= INT32_MIN && value <= INT32_MAX;
}

/** Mirror the native BUFF parser's int32(float(seconds) * 1000) storage. */
function nativeDurationTermMs(seconds: number): number | null {
  if (!Number.isFinite(seconds)) return null;
  const milliseconds = Math.trunc(Math.fround(Math.fround(seconds) * 1_000));
  return isInt32(milliseconds) ? milliseconds : null;
}

/**
 * Compile only the proved native IndexType=1 calculated-holder writer.
 * Unsupported or malformed active slots reject the complete row.
 */
export function compileMir4NativeTimedBuff(
  rawRecord: Mir4NativeBuffRawRecord,
  level: number,
): Mir4NativeTimedBuffCompileResult {
  const issues: MutableIssue[] = [];
  const validBuffId = isUint32(rawRecord.BuffId);
  const validLevel = isUint16(level);

  if (!validBuffId) addIssue(issues, 'invalid-buff-id', 'BuffId', rawRecord.BuffId);
  if (!validLevel) addIssue(issues, 'invalid-level', 'level', level);

  const baseDurationMs = nativeDurationTermMs(rawRecord.BuffTime);
  const levelUpDurationMs = nativeDurationTermMs(rawRecord.LevelUpBuffTime);
  if (baseDurationMs === null) {
    addIssue(issues, 'invalid-duration-source', 'BuffTime', rawRecord.BuffTime);
  }
  if (levelUpDurationMs === null) {
    addIssue(issues, 'invalid-duration-source', 'LevelUpBuffTime', rawRecord.LevelUpBuffTime);
  }

  let durationMs: number | null = null;
  if (baseDurationMs !== null && levelUpDurationMs !== null && validLevel) {
    const candidate = baseDurationMs + (level - 1) * levelUpDurationMs;
    if (!isInt32(candidate) || candidate <= 0) {
      addIssue(issues, 'invalid-duration', 'durationMs', candidate);
    } else {
      durationMs = candidate;
    }
  }

  if (rawRecord.BuffOverlap !== 0) {
    addIssue(issues, 'unsupported-buff-overlap', 'BuffOverlap', rawRecord.BuffOverlap);
  }
  if (rawRecord.OverLapCallGroupID !== 0) {
    addIssue(
      issues,
      'unsupported-overlap-call-group',
      'OverLapCallGroupID',
      rawRecord.OverLapCallGroupID,
    );
  }
  rawRecord.detachBuffID.forEach((buffId, index) => {
    if (buffId !== 0) {
      addIssue(issues, 'unsupported-detach-buff-id', `detachBuffID[${index}]`, buffId);
    }
  });

  const contributions: Mir4NativeCalculatedContribution[] = [];
  let type1SlotCount = 0;
  let type1SlotInvalid = false;
  let hasNonzeroContribution = false;

  for (const fields of SLOT_FIELDS) {
    const indexType = rawRecord[fields.indexType];
    if (indexType === 0) continue;
    if (!Number.isSafeInteger(indexType)) {
      addIssue(issues, 'invalid-index-type', fields.indexType, indexType);
      continue;
    }
    if (indexType !== 1) {
      addIssue(issues, 'unsupported-active-index-type', fields.indexType, indexType);
      continue;
    }

    type1SlotCount += 1;
    const rawIndex = rawRecord[fields.index];
    const rawValue = rawRecord[fields.value];
    const rawLevelUpValue = rawRecord[fields.levelUpValue];
    let slotValid = true;
    let calculatedId: number | null = null;

    if (!Number.isSafeInteger(rawIndex) || rawIndex <= 0 || rawIndex > INT16_MAX) {
      addIssue(issues, 'invalid-buff-index', fields.index, rawIndex);
      slotValid = false;
    } else {
      const candidate = CALCULATED_ID_OFFSET + rawIndex;
      if (candidate < 0 || candidate >= CALCULATED_HOLDER_SIZE) {
        addIssue(issues, 'invalid-calculated-id', fields.index, candidate);
        slotValid = false;
      } else {
        calculatedId = candidate;
      }
    }

    if (!isInt32(rawValue)) {
      addIssue(issues, 'invalid-buff-value', fields.value, rawValue);
      slotValid = false;
    }
    if (!isInt32(rawLevelUpValue)) {
      addIssue(issues, 'invalid-level-up-buff-value', fields.levelUpValue, rawLevelUpValue);
      slotValid = false;
    }

    if (!slotValid || !validLevel || calculatedId === null) {
      type1SlotInvalid = true;
      continue;
    }

    const contributionValue = rawValue + (level - 1) * rawLevelUpValue;
    if (!isInt32(contributionValue)) {
      addIssue(
        issues,
        'invalid-contribution-value',
        `${fields.value}+${fields.levelUpValue}`,
        contributionValue,
      );
      type1SlotInvalid = true;
      continue;
    }

    contributions.push({ calculatedId, value: contributionValue });
    if (contributionValue !== 0) hasNonzeroContribution = true;
  }

  if (type1SlotCount === 0 || (validLevel && !type1SlotInvalid && !hasNonzeroContribution)) {
    addIssue(issues, 'no-calculated-contributions', 'contributions', 0);
  }

  if (issues.length > 0 || !validBuffId || durationMs === null) return fail(issues);

  return deepFreeze({
    ok: true as const,
    buff: {
      buffId: rawRecord.BuffId,
      level,
      durationMs,
      contributions: contributions.map((contribution) => ({ ...contribution })),
    },
  });
}

const EMPTY_MIR4_NATIVE_TIMED_BUFF_STATE = deepFreeze({
  active: [] as Mir4NativeTimedBuffInstance[],
});

export function createMir4NativeTimedBuffState(): Mir4NativeTimedBuffState {
  return EMPTY_MIR4_NATIVE_TIMED_BUFF_STATE;
}

function validCompiledBuff(buff: Mir4NativeCompiledTimedBuff): boolean {
  return (
    isUint32(buff.buffId) &&
    isUint16(buff.level) &&
    isInt32(buff.durationMs) &&
    buff.durationMs > 0 &&
    buff.contributions.length > 0 &&
    buff.contributions.some((contribution) => contribution.value !== 0) &&
    buff.contributions.every(
      (contribution) =>
        Number.isSafeInteger(contribution.calculatedId) &&
        contribution.calculatedId > CALCULATED_ID_OFFSET &&
        contribution.calculatedId < CALCULATED_HOLDER_SIZE &&
        isInt32(contribution.value),
    )
  );
}

function freezeInstance(
  buff: Mir4NativeCompiledTimedBuff,
  remainingMs: number,
): Mir4NativeTimedBuffInstance {
  return deepFreeze({
    buffId: buff.buffId,
    level: buff.level,
    durationMs: buff.durationMs,
    remainingMs,
    contributions: buff.contributions.map((contribution) => ({ ...contribution })),
  });
}

function freezeState(active: readonly Mir4NativeTimedBuffInstance[]): Mir4NativeTimedBuffState {
  return deepFreeze({
    active: active.map((buff) => freezeInstance(buff, buff.remainingMs)),
  });
}

/** Refresh or replace by exact native BuffId while retaining its application position. */
export function applyMir4NativeTimedBuff(
  state: Mir4NativeTimedBuffState,
  buff: Mir4NativeCompiledTimedBuff,
): Mir4NativeTimedBuffState {
  if (!validCompiledBuff(buff)) {
    throw new RangeError('buff must be a valid compiled MIR4 native timed BUFF');
  }

  const instance = freezeInstance(buff, buff.durationMs);
  const existingIndex = state.active.findIndex((active) => active.buffId === buff.buffId);
  if (existingIndex < 0) return freezeState([...state.active, instance]);

  const active = [...state.active];
  active[existingIndex] = instance;
  return freezeState(active);
}

/** Advance caller-owned elapsed time. An instance expires when remainingMs reaches zero. */
export function advanceMir4NativeTimedBuffs(
  state: Mir4NativeTimedBuffState,
  elapsedMs: number,
): Mir4NativeTimedBuffState {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) {
    throw new RangeError('elapsedMs must be a nonnegative safe integer');
  }
  if (elapsedMs === 0 || state.active.length === 0) return state;

  const active: Mir4NativeTimedBuffInstance[] = [];
  for (const buff of state.active) {
    if (!Number.isSafeInteger(buff.remainingMs) || buff.remainingMs <= 0) {
      throw new RangeError('state contains an invalid remainingMs');
    }
    const remainingMs = buff.remainingMs - elapsedMs;
    if (remainingMs > 0) active.push(freezeInstance(buff, remainingMs));
  }
  return active.length === 0 ? EMPTY_MIR4_NATIVE_TIMED_BUFF_STATE : freezeState(active);
}

/** Remove one exact native BuffId and its whole contribution. */
export function detachMir4NativeTimedBuff(
  state: Mir4NativeTimedBuffState,
  buffId: number,
): Mir4NativeTimedBuffState {
  if (!isUint32(buffId)) throw new RangeError('buffId must be a positive uint32');
  const active = state.active.filter((buff) => buff.buffId !== buffId);
  if (active.length === state.active.length) return state;
  return active.length === 0 ? EMPTY_MIR4_NATIVE_TIMED_BUFF_STATE : freezeState(active);
}

/** Sum numeric calculated-holder contributions in first-encounter order. */
export function aggregateMir4NativeTimedBuffContributions(
  state: Mir4NativeTimedBuffState,
): readonly Mir4NativeCalculatedContribution[] {
  const aggregate: Array<{ calculatedId: number; value: number }> = [];
  const indexByCalculatedId = new Map<number, number>();

  for (const buff of state.active) {
    for (const contribution of buff.contributions) {
      const existingIndex = indexByCalculatedId.get(contribution.calculatedId);
      if (existingIndex === undefined) {
        indexByCalculatedId.set(contribution.calculatedId, aggregate.length);
        aggregate.push({ ...contribution });
        continue;
      }

      const existing = aggregate[existingIndex];
      if (!existing) throw new Error('calculated contribution index is inconsistent');
      const value = existing.value + contribution.value;
      if (!isInt32(value)) {
        throw new RangeError('calculated contribution aggregate exceeds int32');
      }
      existing.value = value;
    }
  }

  return deepFreeze(aggregate);
}
