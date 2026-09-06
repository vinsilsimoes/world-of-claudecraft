import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { mir4NativeDirectRawEvidenceBySkillId } from '../content/mir4/native_skill_direct_raw_evidence';

const SKILL_ID = 2204 as const;
const BUFF_ID = 22042 as const;
const MAX_AELDRUNE_SKILL_LEVEL = 15;

export interface Mir4NativePhoenixEmbracePolicy {
  readonly skillId: 2204;
  readonly skillLevel: number;
  readonly sourceAttackId: 220402;
  readonly applyAtMs: 850;
  readonly buffId: 22042;
  readonly durationMs: 60_000;
  readonly radiusYards: 7;
  readonly heightYards: 4;
  readonly targetCap: 5;
  readonly spellAttackFlat: number;
  readonly cooldownReductionBasisPoints: number;
  readonly mpPotionEfficiencyBasisPoints: number;
  readonly persistentSkillDamageBasisPoints: number;
  readonly globalCooldownMs: 0;
}

function exactBuff22042(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(BUFF_ID)?.rawRecord;
  return (
    raw?.BuffName === 362514 &&
    raw.BuffExplain === 372510 &&
    raw.BuffUseType === 1 &&
    raw.ApplyType === 0 &&
    raw.BuffTarget === 0 &&
    raw.BuffTime === 60 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 1 &&
    raw.BuffIndex_1 === 22 &&
    raw.BuffValue_1 === 25 &&
    raw.LevelUpBuffValue_1 === 5 &&
    raw.BuffIndexType_2 === 0 &&
    raw.BuffIndex_2 === 0 &&
    raw.BuffIndexType_3 === 0 &&
    raw.BuffIndex_3 === 0
  );
}

export function mir4NativePhoenixEmbraceBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    row.attackId === 220402 &&
    row.mainAttack === 2 &&
    row.targetType === 4 &&
    row.authorialTargetValue === 5 &&
    row.impactType === 2 &&
    row.geometry.angleDegrees === 360 &&
    row.geometry.nativeDistanceMin === 0 &&
    row.geometry.nativeDistanceMax === 700 &&
    row.geometry.nativeHeight === 400 &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 850 &&
    exactBuff22042()
  );
}

/**
 * Exact Phoenix Embrace base contract from SKILL 2204, SKILL_ATTACK 220401/
 * 220402 and BUFF 22042. Rank milestones come from SPECIAL_ABILITY 97..99,
 * PASSIVE 621113/621121/621123/621131/621133/121122/121132 and BUFF
 * 20108/20107/20101. Source SHA-256: SKILL B3CEF975..., SKILL_ATTACK
 * A71FABDF..., BUFF 797B3841..., SPECIAL_ABILITY 9F9C1C72..., PASSIVE
 * 533909CF.... The recovered localized notes corroborate 25/40/60% cooldown,
 * 20/30% MP-potion efficiency and 4/8% persistent Skill DMG.
 */
export function mir4NativeRuntimePhoenixEmbracePolicy(
  requestedSkillLevel: number,
): Mir4NativePhoenixEmbracePolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const action = mir4NativeSkillActionById(SKILL_ID);
  const rawSkill = mir4NativeDirectRawEvidenceBySkillId(SKILL_ID)?.rawSkillRecord;
  const guideRow = action?.rows.find((row) => row.attackId === 220401);
  const buffRow = action?.rows.find((row) => row.attackId === 220402);
  const ability = action?.nativeBehavior.abilities[0];
  if (
    !action ||
    !rawSkill ||
    !guideRow ||
    !buffRow ||
    action.targeting !== false ||
    action.blockingCheck !== 0 ||
    action.cooldownMs !== 54_000 ||
    action.attackAnimationMs !== 1_600 ||
    action.endCutAnimationMs !== 1_300 ||
    rawSkill.GlobalCooltime !== 0 ||
    rawSkill.MaxSkillLevel !== 10 ||
    rawSkill.SpecialLevel.join(',') !== '1,5,8,10' ||
    rawSkill.SpecialNoteSid.join(',') !== '342214,342224,342234,342244' ||
    action.indicator?.index !== 102 ||
    action.indicator.nativeMax !== 500 ||
    action.indicator.nativeHeight !== 400 ||
    ability?.type !== 22 ||
    ability.value !== 25 ||
    ability.levelUpValue !== 5 ||
    ability.time !== 60 ||
    guideRow.guideEffectId !== 102 ||
    guideRow.impactOffsetsMs[0] !== 550 ||
    !mir4NativePhoenixEmbraceBuffMatchesRow(buffRow)
  ) {
    return null;
  }
  const skillLevel = Math.max(
    1,
    Math.min(MAX_AELDRUNE_SKILL_LEVEL, Math.trunc(requestedSkillLevel)),
  );
  const cooldownReductionBasisPoints =
    skillLevel >= 10 ? 6_000 : skillLevel >= 8 ? 4_000 : skillLevel >= 5 ? 2_500 : 0;
  const mpPotionEfficiencyBasisPoints = skillLevel >= 10 ? 3_000 : skillLevel >= 8 ? 2_000 : 0;
  const persistentSkillDamageBasisPoints = skillLevel >= 10 ? 800 : skillLevel >= 8 ? 400 : 0;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    sourceAttackId: 220402 as const,
    applyAtMs: 850 as const,
    buffId: BUFF_ID,
    durationMs: 60_000 as const,
    radiusYards: 7 as const,
    heightYards: 4 as const,
    targetCap: 5 as const,
    spellAttackFlat: 25 + (skillLevel - 1) * 5,
    cooldownReductionBasisPoints,
    mpPotionEfficiencyBasisPoints,
    persistentSkillDamageBasisPoints,
    globalCooldownMs: 0 as const,
  });
}
