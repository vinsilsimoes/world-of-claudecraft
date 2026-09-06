import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';

const SKILL_ID = 2202 as const;
const BUFF_ID = 22021 as const;

export interface Mir4NativeFrozenBlockPolicy {
  readonly skillId: 2202;
  readonly sourceAttackId: 220201;
  readonly applyAtMs: 20;
  readonly buffId: 22021;
  readonly durationMs: 3_000;
  readonly radiusYards: 7;
  readonly heightYards: 4;
  readonly targetCap: 5;
}

function exactBuff22021(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(BUFF_ID)?.rawRecord;
  return (
    raw?.BuffName === 363112 &&
    raw.BuffExplain === 370090 &&
    raw.BuffUseType === 1 &&
    raw.ApplyType === 2 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 3 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4005 &&
    raw.BuffValue_1 === 0 &&
    raw.BuffIndexType_2 === 3 &&
    raw.BuffIndex_2 === 4004 &&
    raw.BuffValue_2 === 0 &&
    raw.BuffIndexType_3 === 3 &&
    raw.BuffIndex_3 === 4002 &&
    raw.BuffValue_3 === 0
  );
}

export function mir4NativeFrozenBlockBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    row.attackId === 220201 &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 20 &&
    exactBuff22021()
  );
}

/**
 * Exact base Frozen Block contract recovered from SKILL 2202, SKILL_ATTACK
 * 220201..220203, and BUFF 22021. Rank-specific passive consumers remain
 * separate: this policy does not infer them from localized prose.
 */
export function mir4NativeRuntimeFrozenBlockPolicy(): Mir4NativeFrozenBlockPolicy | null {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const row = action?.rows.find((candidate) => candidate.attackId === 220201);
  if (
    !action ||
    !row ||
    action.attackAnimationMs !== 4_000 ||
    action.endCutAnimationMs !== 3_600 ||
    action.cooldownMs !== 53_000 ||
    action.blockingCheck !== 1 ||
    action.indicator?.index !== 102 ||
    action.indicator.nativeMax !== 700 ||
    action.indicator.nativeHeight !== 400 ||
    row.impactType !== 2 ||
    row.geometry.angleDegrees !== 360 ||
    row.geometry.nativeDistanceMin !== 0 ||
    row.geometry.nativeDistanceMax !== 700 ||
    row.geometry.nativeHeight !== 400 ||
    row.authorialTargetValue !== 5 ||
    !mir4NativeFrozenBlockBuffMatchesRow(row)
  ) {
    return null;
  }
  return Object.freeze({
    skillId: SKILL_ID,
    sourceAttackId: 220201 as const,
    applyAtMs: 20 as const,
    buffId: BUFF_ID,
    durationMs: 3_000 as const,
    radiusYards: 7 as const,
    heightYards: 4 as const,
    targetCap: 5 as const,
  });
}
