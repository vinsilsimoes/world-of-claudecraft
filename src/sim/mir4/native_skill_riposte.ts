import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { type Mir4StatusRecord, mir4StatusRecordValue } from './status_values';

export interface Mir4NativeRiposteTimedReduction {
  readonly buffId: 13011 | 10104 | 10128 | 10130 | 10131;
  readonly effectId: string;
  readonly durationMs: number;
  readonly magnitudeBasisPoints: number;
}

export interface Mir4NativeRuntimeRipostePolicy {
  readonly skillId: 1301;
  readonly skillLevel: number;
  readonly setupAttackId: 130101;
  readonly damageAttackId: 130102;
  readonly controlImmunity: {
    readonly buffId: 11032;
    readonly effectId: 'mir4_native_buff_11032';
    readonly durationMs: 3000;
  };
  readonly baseAllDamageReduction: Mir4NativeRiposteTimedReduction & { readonly buffId: 13011 };
  readonly taunt: {
    readonly buffId: 13012;
    readonly durationMs: 5000;
  };
  readonly specialAllDamageReduction: Mir4NativeRiposteTimedReduction | null;
  readonly bossDamageReduction: Mir4NativeRiposteTimedReduction | null;
  readonly immediateHealMaxHpBasisPoints: number;
  /** Single-player-target value before the unresolved multi-target consumer. */
  readonly playerKnockdownChanceBasisPoints: number;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownHealBasisPointsPerTarget: number;
  readonly playerKnockdownHealMaxBasisPoints: number;
  readonly playerMultiTargetChanceRule: 'client-passed-unused';
}

const CONTROL_IMMUNITY = Object.freeze({
  buffId: 11032 as const,
  effectId: 'mir4_native_buff_11032' as const,
  durationMs: 3000 as const,
});

function reduction(
  buffId: Mir4NativeRiposteTimedReduction['buffId'],
  durationMs: number,
  magnitudeBasisPoints: number,
): Mir4NativeRiposteTimedReduction {
  return Object.freeze({
    buffId,
    effectId: `mir4_native_buff_${buffId}`,
    durationMs,
    magnitudeBasisPoints,
  });
}

function exactBuffRecord(
  buffId: 11032 | 13011 | 13012,
): ReturnType<typeof mir4NativeSkillBuffEvidenceById> {
  return mir4NativeSkillBuffEvidenceById(buffId);
}

/**
 * Exact row and direct BUFF guard for Riposte's setup contact.
 *
 * The rank milestone graph is sourced from SKILL_SPECIAL_ABILITY.json
 * (sha256 9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db)
 * and SKILL_PASSIVE.json
 * (sha256 533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e).
 * The direct buffs are additionally guarded against the materialized BUFF
 * evidence so source drift fails closed.
 */
export function mir4NativeRiposteSetupBuffsMatchRow(
  rowOverride?: Mir4NativeSkillAttackRow,
): boolean {
  const row =
    rowOverride ??
    mir4NativeSkillActionById(1301)?.rows.find((candidate) => candidate.attackId === 130101);
  const immune = exactBuffRecord(11032)?.rawRecord;
  const reductionBuff = exactBuffRecord(13011)?.rawRecord;
  const taunt = exactBuffRecord(13012)?.rawRecord;
  return (
    row?.attackId === 130101 &&
    row.nativeBehavior.buffIds.length === 3 &&
    row.nativeBehavior.buffIds[0] === 11032 &&
    row.nativeBehavior.buffIds[1] === 13011 &&
    row.nativeBehavior.buffIds[2] === 13012 &&
    row.nativeBehavior.damageType === 0 &&
    row.nativeBehavior.physicalDamage.coefficient === 0 &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 20 &&
    immune?.BuffTarget === 1 &&
    immune.BuffTime === 3 &&
    immune.BuffIndexType_1 === 3 &&
    immune.BuffIndex_1 === 4004 &&
    reductionBuff?.BuffTarget === 1 &&
    reductionBuff.BuffTime === 3 &&
    reductionBuff.BuffIndexType_1 === 1 &&
    reductionBuff.BuffIndex_1 === 47 &&
    reductionBuff.BuffValue_1 === 240 &&
    reductionBuff.LevelUpBuffValue_1 === 40 &&
    taunt?.BuffTarget === 0 &&
    taunt.BuffTime === 5 &&
    taunt.BuffIndexType_1 === 3 &&
    taunt.BuffIndex_1 === 4021
  );
}

/** Compile Riposte's exact direct buffs and rank 5, 8, and 10 milestones. */
export function mir4NativeRuntimeRipostePolicy(
  requestedSkillLevel: number,
): Mir4NativeRuntimeRipostePolicy | null {
  if (!mir4NativeRiposteSetupBuffsMatchRow()) return null;
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const baseAllDamageReduction = reduction(
    13011,
    3000,
    2400 + (skillLevel - 1) * 400,
  ) as Mir4NativeRiposteTimedReduction & { readonly buffId: 13011 };

  let specialAllDamageReduction: Mir4NativeRiposteTimedReduction | null = null;
  let bossDamageReduction: Mir4NativeRiposteTimedReduction | null = null;
  let immediateHealMaxHpBasisPoints = 0;
  let playerKnockdownChanceBasisPoints = 1000;
  let playerKnockdownHealBasisPointsPerTarget = 0;
  let playerKnockdownHealMaxBasisPoints = 0;

  if (skillLevel >= 10) {
    specialAllDamageReduction = reduction(10130, 10_000, 2500);
    bossDamageReduction = reduction(10131, 10_000, 5000);
    immediateHealMaxHpBasisPoints = 2000;
    playerKnockdownChanceBasisPoints = 10_000;
    playerKnockdownHealBasisPointsPerTarget = 1000;
    playerKnockdownHealMaxBasisPoints = 5000;
  } else if (skillLevel >= 8) {
    specialAllDamageReduction = reduction(10130, 10_000, 2000);
    bossDamageReduction = reduction(10131, 10_000, 3000);
    immediateHealMaxHpBasisPoints = 1000;
    playerKnockdownChanceBasisPoints = 6000;
    playerKnockdownHealBasisPointsPerTarget = 700;
    playerKnockdownHealMaxBasisPoints = 3500;
  } else if (skillLevel >= 5) {
    specialAllDamageReduction = reduction(10104, 10_000, 1500);
    bossDamageReduction = reduction(10128, 10_000, 1500);
    playerKnockdownChanceBasisPoints = 3000;
  }

  return Object.freeze({
    skillId: 1301,
    skillLevel,
    setupAttackId: 130101,
    damageAttackId: 130102,
    controlImmunity: CONTROL_IMMUNITY,
    baseAllDamageReduction,
    taunt: Object.freeze({ buffId: 13012 as const, durationMs: 5000 as const }),
    specialAllDamageReduction,
    bossDamageReduction,
    immediateHealMaxHpBasisPoints,
    playerKnockdownChanceBasisPoints,
    monsterKnockdownChanceBasisPoints: 10_000,
    playerKnockdownHealBasisPointsPerTarget,
    playerKnockdownHealMaxBasisPoints,
    playerMultiTargetChanceRule: 'client-passed-unused',
  });
}

/**
 * Riposte's exact player knockdown chance after its temporary native success
 * buff and the source/target knockdown status lanes are resolved.
 *
 * MirMobile passes CCUserCheck to the admission function, but the extracted
 * function never reads that argument. Target count therefore does not alter
 * the result in this client build.
 */
export function mir4NativeRipostePlayerKnockdownChanceBasisPoints(
  requestedSkillLevel: number,
  attackerStatuses?: Mir4StatusRecord,
  defenderStatuses?: Mir4StatusRecord,
): number | null {
  const policy = mir4NativeRuntimeRipostePolicy(requestedSkillLevel);
  if (!policy) return null;
  const success =
    mir4StatusRecordValue(attackerStatuses, 119) + mir4StatusRecordValue(attackerStatuses, 127);
  const resistance =
    mir4StatusRecordValue(defenderStatuses, 120) + mir4StatusRecordValue(defenderStatuses, 128);
  return Math.max(
    0,
    Math.min(10_000, Math.trunc(policy.playerKnockdownChanceBasisPoints + success - resistance)),
  );
}
