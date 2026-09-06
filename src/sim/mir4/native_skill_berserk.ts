import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { compileMir4NativeSourceBuffDispatch } from './native_source_buff_dispatch';

const SKILL_ID = 1101 as const;
const MAX_NATIVE_SKILL_LEVEL = 10;

export type Mir4NativeBerserkBuff =
  | {
      readonly buffId: 11011;
      readonly durationMs: 1_500;
      readonly kind: 'invincible';
    }
  | {
      readonly buffId: 11012;
      readonly durationMs: 15_000;
      readonly kind: 'native-status-boost';
      readonly statusId: 44;
      readonly magnitudeBasisPoints: number;
    };

export interface Mir4NativeBerserkPolicy {
  readonly skillId: 1101;
  readonly skillLevel: number;
  readonly rows: readonly {
    readonly attackId: 110100 | 110101;
    readonly applyAtMs: 20 | 650;
    readonly buff: Mir4NativeBerserkBuff;
  }[];
}

function exactBuff11011(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(11011)?.rawRecord;
  return (
    raw?.BuffName === 362108 &&
    raw.BuffExplain === 372108 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 1.5 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4003 &&
    raw.BuffValue_1 === 0 &&
    raw.LevelUpBuffValue_1 === 0 &&
    raw.BuffIndexType_2 === 0 &&
    raw.BuffIndexType_3 === 0
  );
}

function exactBuff11012(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(11012)?.rawRecord;
  return (
    raw?.BuffName === 363003 &&
    raw.BuffExplain === 376101 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 15 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 1 &&
    raw.BuffIndex_1 === 44 &&
    raw.BuffValue_1 === 120 &&
    raw.LevelUpBuffValue_1 === 20 &&
    raw.BuffIndexType_2 === 0 &&
    raw.BuffIndexType_3 === 0
  );
}

export function mir4NativeBerserkImpactBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  if (row.attackId === 110100) {
    return (
      row.nativeBehavior.buffIds.length === 1 &&
      row.nativeBehavior.buffIds[0] === 11011 &&
      row.impactOffsetsMs.length === 1 &&
      row.impactOffsetsMs[0] === 20 &&
      exactBuff11011()
    );
  }
  if (row.attackId === 110101) {
    return (
      row.nativeBehavior.buffIds.length === 1 &&
      row.nativeBehavior.buffIds[0] === 11012 &&
      row.impactOffsetsMs.length === 1 &&
      row.impactOffsetsMs[0] === 650 &&
      exactBuff11012()
    );
  }
  return false;
}

/** Compile the exact source-owned BUFF dispatch attached to skill 1101. */
export function mir4NativeRuntimeBerserkPolicy(
  requestedSkillLevel: number,
): Mir4NativeBerserkPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const action = mir4NativeSkillActionById(SKILL_ID);
  const dispatch = compileMir4NativeSourceBuffDispatch(action);
  if (
    !dispatch.ok ||
    action?.rows.length !== 2 ||
    !action.rows.every(mir4NativeBerserkImpactBuffsMatchRow)
  ) {
    return null;
  }
  const skillLevel = Math.max(1, Math.min(MAX_NATIVE_SKILL_LEVEL, Math.trunc(requestedSkillLevel)));
  const rawDamageBoost = mir4NativeSkillBuffEvidenceById(11012)?.rawRecord;
  if (!rawDamageBoost) return null;
  const magnitudeBasisPoints =
    (rawDamageBoost.BuffValue_1 + (skillLevel - 1) * rawDamageBoost.LevelUpBuffValue_1) * 10;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    rows: Object.freeze([
      Object.freeze({
        attackId: 110100 as const,
        applyAtMs: 20 as const,
        buff: Object.freeze({
          buffId: 11011 as const,
          durationMs: 1_500 as const,
          kind: 'invincible' as const,
        }),
      }),
      Object.freeze({
        attackId: 110101 as const,
        applyAtMs: 650 as const,
        buff: Object.freeze({
          buffId: 11012 as const,
          durationMs: 15_000 as const,
          kind: 'native-status-boost' as const,
          statusId: 44 as const,
          magnitudeBasisPoints,
        }),
      }),
    ]),
  });
}
