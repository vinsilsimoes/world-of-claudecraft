import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';

const SKILL_ID = 2503 as const;
const BUFF_ID = 24012 as const;
const MAX_AELDRUNE_SKILL_LEVEL = 15;

export interface Mir4NativeMagicShieldPolicy {
  readonly skillId: 2503;
  readonly skillLevel: number;
  readonly sourceAttackId: 250301;
  readonly applyAtMs: 450;
  readonly buffId: 24012;
  readonly durationMs: 25_000;
  readonly damageReductionBasisPoints: number;
  readonly absorptionLimit: number;
  readonly hitLimit: 20;
  readonly bashDamageReductionBasisPoints: number;
}

function exactBuff24012(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(BUFF_ID)?.rawRecord;
  return (
    raw?.BuffName === 361204 &&
    raw.BuffExplain === 371204 &&
    raw.BuffUseType === 1 &&
    raw.ApplyType === 2 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 25 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4011 &&
    raw.BuffValue_1 === 2_400 &&
    raw.LevelUpBuffValue_1 === 400 &&
    raw.BuffValueEx_1 === 20 &&
    raw.BuffIndexType_2 === 3 &&
    raw.BuffIndex_2 === 4023 &&
    raw.BuffValue_2 === 2_000 &&
    raw.LevelUpBuffValue_2 === 7_000 &&
    raw.BuffIndexType_3 === 1 &&
    raw.BuffIndex_3 === 35 &&
    raw.BuffValue_3 === 150 &&
    raw.LevelUpBuffValue_3 === 30
  );
}

export function mir4NativeMagicShieldBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    row.attackId === 250301 &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 450 &&
    exactBuff24012()
  );
}

/**
 * Compile the exact base Magic Shield contract carried by SKILL 2503 and BUFF
 * 24012. The extracted rank-5/8/10 passive additions remain outside this
 * policy until their native consumers are decoded.
 */
export function mir4NativeRuntimeMagicShieldPolicy(
  requestedSkillLevel: number,
): Mir4NativeMagicShieldPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const action = mir4NativeSkillActionById(SKILL_ID);
  const row = action?.rows.find((candidate) => candidate.attackId === 250301);
  if (!action || !row || !mir4NativeMagicShieldBuffMatchesRow(row)) return null;
  const ability = action.nativeBehavior.abilities;
  if (
    ability.length !== 4 ||
    ability[0]?.type !== 4011 ||
    ability[0].value !== 24 ||
    ability[0].levelUpValue !== 4 ||
    ability[0].time !== 20 ||
    ability[1]?.type !== 0 ||
    ability[1].value !== 2_000 ||
    ability[1].levelUpValue !== 7_000 ||
    ability[2]?.type !== 0 ||
    ability[2].value !== 15 ||
    ability[2].levelUpValue !== 3 ||
    ability[3]?.type !== 0 ||
    ability[3].value !== 0 ||
    ability[3].levelUpValue !== 0 ||
    ability[3].time !== 20
  ) {
    return null;
  }
  const skillLevel = Math.max(
    1,
    Math.min(MAX_AELDRUNE_SKILL_LEVEL, Math.trunc(requestedSkillLevel)),
  );
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    sourceAttackId: 250301 as const,
    applyAtMs: 450 as const,
    buffId: BUFF_ID,
    durationMs: 25_000 as const,
    damageReductionBasisPoints: 2_400 + (skillLevel - 1) * 400,
    absorptionLimit: 2_000 + (skillLevel - 1) * 7_000,
    hitLimit: 20 as const,
    // Native STATUS 35 uses tenths of one percent, matching the existing
    // status-record conversion in native_skill_bash.ts.
    bashDamageReductionBasisPoints: (150 + (skillLevel - 1) * 30) * 10,
  });
}
