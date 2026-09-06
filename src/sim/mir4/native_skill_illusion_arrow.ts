import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import {
  applyMir4NativeArbalistFocus,
  mir4NativeArbalistFocusBuffEvidenceExact,
} from './native_skill_quick_shot';

const SKILL_ID = 4102;
const SOURCE_ATTACK_ID = 410201;
const EVASION_TRIGGER_ATTACK_ID = 410202;
const FOCUS_BUFF_ID = 41010;
const UNINTERRUPTIBLE_BUFF_ID = 40114;
const EVASION_BUFF_ID = 40102;

export interface Mir4NativeIllusionArrowPolicy {
  readonly skillLevel: number;
  readonly source: Readonly<{
    attackId: 410201;
    applyAtMs: 20;
    focusBuffId: 41010;
    uninterruptibleBuffId: 40114;
    controlImmunityDurationMs: 1_500;
  }>;
  readonly evasion: Readonly<{
    triggerAttackId: 410202;
    buffId: 40102;
    magnitude: 150 | 300 | 500;
    durationMs: 5_000;
  }> | null;
  readonly criticalSkillDamageBoostBasisPoints: 0 | 1_000 | 2_000 | 5_000;
  readonly monsterDamageBoostBasisPoints: 0 | 1_500 | 3_000 | 5_000;
}

/** Exact rank 1/5/8/10 milestones from MIR4 special rows 187..192. */
export function mir4NativeIllusionArrowPolicy(
  requestedSkillLevel: number,
): Mir4NativeIllusionArrowPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillLevel,
    source: Object.freeze({
      attackId: SOURCE_ATTACK_ID,
      applyAtMs: 20,
      focusBuffId: FOCUS_BUFF_ID,
      uninterruptibleBuffId: UNINTERRUPTIBLE_BUFF_ID,
      controlImmunityDurationMs: 1_500,
    }),
    evasion: rank5
      ? Object.freeze({
          triggerAttackId: EVASION_TRIGGER_ATTACK_ID,
          buffId: EVASION_BUFF_ID,
          magnitude: rank10 ? 500 : rank8 ? 300 : 150,
          durationMs: 5_000,
        })
      : null,
    criticalSkillDamageBoostBasisPoints: rank10 ? 5_000 : rank8 ? 2_000 : rank5 ? 1_000 : 0,
    monsterDamageBoostBasisPoints: rank10 ? 5_000 : rank8 ? 3_000 : rank5 ? 1_500 : 0,
  });
}

function exactUninterruptibleEvidence(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(UNINTERRUPTIBLE_BUFF_ID)?.rawRecord;
  return (
    raw?.BuffId === UNINTERRUPTIBLE_BUFF_ID &&
    raw.BuffUseType === 3 &&
    raw.ApplyType === 0 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 1.5 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4004
  );
}

function exactEvasionEvidence(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(EVASION_BUFF_ID)?.rawRecord;
  return (
    raw?.BuffId === EVASION_BUFF_ID &&
    raw.BuffUseType === 3 &&
    raw.ApplyType === 0 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 5 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 1 &&
    raw.BuffIndex_1 === 29 &&
    raw.BuffValue_1 === 50 &&
    raw.LevelUpBuffValue_1 === 50 &&
    raw.BuffIndexType_2 === 3 &&
    raw.BuffIndex_2 === 4037 &&
    raw.BuffValue_2 === 1
  );
}

/** Exact first row carrying Focus and the 1.5-second anti-interruption state. */
export function mir4NativeIllusionArrowBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    exactUninterruptibleEvidence() &&
    row.attackId === SOURCE_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 2 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
    row.nativeBehavior.buffIds[1] === UNINTERRUPTIBLE_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 20
  );
}

/** Resolve both source-owned first-row buffs at the native 20ms contact. */
export function applyMir4NativeIllusionArrowSourceBuffs(ctx: SimContext, source: Entity): boolean {
  if (source.dead || !exactUninterruptibleEvidence()) return false;
  const focus = applyMir4NativeArbalistFocus(ctx, source);
  const uninterruptible = applyMir4Effect(ctx, source, {
    effectId: `mir4_native_buff_${UNINTERRUPTIBLE_BUFF_ID}`,
    kind: 'control-immunity',
    durationSeconds: 1.5,
    magnitude: 0,
    name: 'Illusion Arrow: Uninterruptible',
    sourceId: source.id,
  }).ok;
  return focus && uninterruptible;
}

/**
 * Apply the native 40102 EVA holder after the second authored arrow lands.
 * Passive levels 3/6/10 evaluate 50 + (level - 1) * 50 => 150/300/500.
 */
export function applyMir4NativeIllusionArrowEvasion(
  ctx: SimContext,
  source: Entity,
  attackId: number,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeIllusionArrowPolicy(requestedSkillLevel);
  if (
    source.dead ||
    !policy?.evasion ||
    attackId !== policy.evasion.triggerAttackId ||
    !exactEvasionEvidence()
  ) {
    return false;
  }
  const effectId = `mir4_native_buff_${policy.evasion.buffId}`;
  if (source.mir4Effects) {
    source.mir4Effects.active = source.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, source, {
    effectId,
    kind: 'dodge-boost',
    durationSeconds: policy.evasion.durationMs / 1_000,
    magnitude: policy.evasion.magnitude,
    name: 'Illusion Arrow: EVA Boost',
    sourceId: source.id,
  }).ok;
}

/** Direct monster-only AbilityType 21 lane, applied before hit/critical resolution. */
export function mir4NativeIllusionArrowMonsterDamageBasisPoints(
  skillId: number | undefined,
  target: Entity,
  requestedSkillLevel: number | undefined,
): number {
  if (skillId !== SKILL_ID || target.kind !== 'mob' || target.ownerId != null) return 10_000;
  const policy = mir4NativeIllusionArrowPolicy(requestedSkillLevel ?? 1);
  return 10_000 + (policy?.monsterDamageBoostBasisPoints ?? 0);
}

/** Critical-only AbilityType 38 lane, applied to the resolved critical contact. */
export function mir4NativeIllusionArrowCriticalDamageBasisPoints(
  skillId: number | undefined,
  critical: boolean,
  requestedSkillLevel: number | undefined,
): number {
  if (skillId !== SKILL_ID || !critical) return 10_000;
  const policy = mir4NativeIllusionArrowPolicy(requestedSkillLevel ?? 1);
  return 10_000 + (policy?.criticalSkillDamageBoostBasisPoints ?? 0);
}
