import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillActionById } from '../content/mir4/native_skill_actions';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';

const IMMOLATE_SKILL_ID = 2_103;
const IMMOLATE_PRODUCT_TYPE = 4;
const IMMOLATE_PERIODIC_ATTACK_ID = 210_302;
const IMMOLATE_PERIODIC_BUFF_ID = 20_012;

export interface Mir4NativeImmolatePolicy {
  readonly skillId: 2_103;
  readonly productType: 4;
  readonly selectedTargetRequired: true;
  readonly periodicAttackId: 210_302;
  readonly periodicBuffId: 20_012;
}

const IMMOLATE_POLICY = Object.freeze({
  skillId: IMMOLATE_SKILL_ID,
  productType: IMMOLATE_PRODUCT_TYPE,
  selectedTargetRequired: true,
  periodicAttackId: IMMOLATE_PERIODIC_ATTACK_ID,
  periodicBuffId: IMMOLATE_PERIODIC_BUFF_ID,
}) satisfies Mir4NativeImmolatePolicy;

function exactNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Admit only the extracted five-row Pcm laser sequence. ProductType 4 is kept
 * skill-specific until the native product dispatcher is recovered for other
 * actions; it is not treated as a generic projectile or area rule.
 */
export function mir4NativeRuntimeImmolatePolicy(skillId: number): Mir4NativeImmolatePolicy | null {
  if (skillId !== IMMOLATE_SKILL_ID) return null;
  const action = mir4NativeSkillActionById(skillId);
  const periodicBuff = mir4NativeSkillBuffEvidenceById(IMMOLATE_PERIODIC_BUFF_ID)?.rawRecord;
  if (
    !action ||
    action.nativeBehavior.productType !== IMMOLATE_PRODUCT_TYPE ||
    action.targeting !== true ||
    action.hitCount !== 10 ||
    !exactNumbers(
      action.rows.map((row) => row.attackId),
      [210_301, 210_302, 210_303, 210_304, 210_305],
    ) ||
    !exactNumbers(
      action.rows.flatMap((row) => row.impactOffsetsMs),
      [665, 765, 965, 1_065, 1_315, 1_415, 1_665, 1_765, 2_015, 2_115],
    ) ||
    !mir4NativeImmolatePeriodicBuffMatchesRow(action.rows[1]) ||
    periodicBuff?.BuffTarget !== 0 ||
    periodicBuff.ApplyType !== 1 ||
    periodicBuff.BuffTime !== 5 ||
    periodicBuff.BuffProbability !== 1_000 ||
    periodicBuff.BuffIndexType_1 !== 2 ||
    periodicBuff.BuffIndex_1 !== 2_004 ||
    periodicBuff.BuffValue_1 !== 6_000 ||
    periodicBuff.LevelUpBuffValue_1 !== 1_200 ||
    periodicBuff.BuffIndexType_2 !== 3 ||
    periodicBuff.BuffIndex_2 !== 4_032 ||
    periodicBuff.BuffValue_2 !== 20_010
  ) {
    return null;
  }
  return IMMOLATE_POLICY;
}

/** The periodic Fire Flare writer is authored only on SKILL_ATTACK 210302. */
export function mir4NativeImmolatePeriodicBuffMatchesRow(
  row: Mir4NativeSkillAttackRow | undefined,
): boolean {
  return (
    row?.attackId === IMMOLATE_PERIODIC_ATTACK_ID &&
    exactNumbers(row.nativeBehavior.buffIds, [IMMOLATE_PERIODIC_BUFF_ID]) &&
    row.nativeBehavior.ccBuffIds.length === 0
  );
}
