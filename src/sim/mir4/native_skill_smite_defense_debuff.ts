import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillActionById } from '../content/mir4/native_skill_actions';
import type { Mir4NativeBuffRawRecord } from '../content/mir4/native_skill_buff_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { compileMir4NativeTimedBuff } from './native_timed_buffs';

const GALE_SLASH_ATTACK_IDS = Object.freeze([150101, 150102, 150103, 150104, 150105] as const);
const CRESCENT_STRIKE_ATTACK_IDS = Object.freeze([160101, 160102, 160103] as const);
const CRESCENT_STRIKE_CONTACT_ATTACK_IDS = Object.freeze([160103] as const);

const RAW_CONFUSE_BUFF = Object.freeze({
  BuffId: 10020,
  BuffName: 360060,
  BuffExplain: 370060,
  ShowDamageFont: 1,
  ShowDamageLog: 1,
  PetBuff_IconId: Object.freeze([0, 0] as const),
  PetId: 0,
  BuffUseType: 1,
  ApplyType: 1,
  BuffTarget: 0,
  ActEffect: 0,
  BuffEffect: 2050125,
  BuffEffectScale: 1,
  Icon: 341043,
  Icon_Big: 0,
  BuffTime: 5,
  LevelUpBuffTime: 1,
  BuffType: 1,
  BuffIndexType_1: 1,
  BuffIndex_1: 24,
  BuffValue_1: -25,
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
  BuffOverlap: 0,
  EffectSocket: 'Buff_Top',
  EffectSocket_Type: 'EBuffSocketType::Buff_Top',
  EffectHeight: 60,
  BuffArmorType: 2,
  BuffProbability: 1000,
  UpdateRule: 0,
  Emissive_Dcolor: Object.freeze([0, 0, 0] as const),
  Fresnel_Exponenth: 0,
  Fresnel_BaseReflect: 0,
  BuffAttackID: 0,
  ExtinctionEffect: 0,
  ExtinctionEffectSocket: '0',
  OverLapCallGroupID: 0,
  KeepType_Die: 0,
  KeepType_StageOut: 1,
  KeepType_LogOut: 0,
  IsHideRemainTime: 0,
  detachBuffID: Object.freeze([0]),
}) satisfies Mir4NativeBuffRawRecord;

export const MIR4_NATIVE_1501_SMITE_EVIDENCE = Object.freeze({
  provenance: Object.freeze({
    skill: 'b3cef975e878aeadfa14d467f730f47a3352be288a27b897640ad5cc07d73026',
    skillPassive: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
    skillCost: '35fbdfe4db6724801093dceb5e0f7032b378bbb00923730961614c8972aa07a',
    buff: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
  }),
  skill: Object.freeze({
    skillId: 1501,
    skillCostGroupId: 105,
    actionAttackIds: GALE_SLASH_ATTACK_IDS,
    contactAttackIds: GALE_SLASH_ATTACK_IDS,
    smiteBuffIds: Object.freeze([10020]),
    autoLearnPassiveIds: Object.freeze([101002]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: Object.freeze({
    passiveId: 101002,
    learnType: 1,
    classId: 1,
    passiveType: 1,
    targetType: 1,
    castingCondition: 21,
    conditionValue01: 10020,
    conditionValue02: 0,
    conditionPercent: 100,
    buffTargetType: 2,
    buffLink: 0,
    buffLink1: 0,
    isSmite: true,
  }),
  skillCostRows: Object.freeze(
    Array.from({ length: 10 }, (_, index) =>
      Object.freeze({
        skillCostId: 10501 + index,
        skillGroupId: 105,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([10020, 30010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_CONFUSE_BUFF,
  externalEligibilityOnlyPassiveIds: Object.freeze([706005]),
});

export const MIR4_NATIVE_1601_SMITE_EVIDENCE = Object.freeze({
  provenance: MIR4_NATIVE_1501_SMITE_EVIDENCE.provenance,
  skill: Object.freeze({
    skillId: 1601,
    skillCostGroupId: 109,
    actionAttackIds: CRESCENT_STRIKE_ATTACK_IDS,
    contactAttackIds: CRESCENT_STRIKE_CONTACT_ATTACK_IDS,
    smiteBuffIds: Object.freeze([10020]),
    autoLearnPassiveIds: Object.freeze([101002]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: MIR4_NATIVE_1501_SMITE_EVIDENCE.passive,
  skillCostRows: Object.freeze(
    Array.from({ length: 10 }, (_, index) =>
      Object.freeze({
        skillCostId: 10901 + index,
        skillGroupId: 109,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([10020, 30010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_CONFUSE_BUFF,
  externalEligibilityOnlyPassiveIds:
    MIR4_NATIVE_1501_SMITE_EVIDENCE.externalEligibilityOnlyPassiveIds,
});

export interface Mir4NativeSkillSmiteDefenseDebuffSpec {
  readonly skillId: 1501 | 1601;
  readonly contactAttackIds: readonly number[];
  readonly passiveId: 101002;
  readonly buffId: 10020;
  readonly effectId: 'mir4_native_buff_10020';
  readonly kind: 'physical-defense-reduction';
  readonly durationMs: number;
  readonly magnitude: number;
  readonly probabilityBasisPoints: 10_000;
}

export type Mir4NativeSkillSmiteDefenseDebuffCompileResult =
  | { readonly ok: true; readonly debuff: Mir4NativeSkillSmiteDefenseDebuffSpec }
  | { readonly ok: false; readonly path: string };

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function failure(path: string): Mir4NativeSkillSmiteDefenseDebuffCompileResult {
  return Object.freeze({ ok: false as const, path });
}

/** Compile only the exact Warrior 1501/1601 -> 101002 -> 10020 source chains. */
export function compileMir4NativeSkillSmiteDefenseDebuff(
  action: Mir4NativeSkillAction,
  skillLevel: number,
): Mir4NativeSkillSmiteDefenseDebuffCompileResult {
  const evidence =
    action.skillId === 1501
      ? MIR4_NATIVE_1501_SMITE_EVIDENCE
      : action.skillId === 1601
        ? MIR4_NATIVE_1601_SMITE_EVIDENCE
        : null;
  if (!evidence) return failure('action.skillId');
  if (!sameNumbers(action.nativeBehavior.smiteBuffIds, evidence.skill.smiteBuffIds)) {
    return failure('action.nativeBehavior.smiteBuffIds');
  }
  if (!sameNumbers(action.nativeBehavior.autoLearnPassiveIds, evidence.skill.autoLearnPassiveIds)) {
    return failure('action.nativeBehavior.autoLearnPassiveIds');
  }
  if (!sameNumbers(action.nativeBehavior.skillModPassiveIds, evidence.skill.skillModPassiveIds)) {
    return failure('action.nativeBehavior.skillModPassiveIds');
  }
  if (!action.nativeBehavior.passiveIds.includes(evidence.passive.passiveId)) {
    return failure('action.nativeBehavior.passiveIds[101002]');
  }
  if (
    !evidence.externalEligibilityOnlyPassiveIds.every((passiveId) =>
      action.nativeBehavior.passiveIds.includes(passiveId),
    )
  ) {
    return failure('action.nativeBehavior.passiveIds[external]');
  }
  if (
    !sameNumbers(
      action.rows.map((row) => row.attackId),
      evidence.skill.actionAttackIds,
    )
  ) {
    return failure('action.rows');
  }
  if (!Number.isSafeInteger(skillLevel) || skillLevel < 1) return failure('skillLevel');

  const compiledBuff = compileMir4NativeTimedBuff(evidence.buff, skillLevel);
  if (!compiledBuff.ok) return failure('evidence.buff');
  const physicalDefense = compiledBuff.buff.contributions.find(
    (contribution) => contribution.calculatedId === 115,
  );
  if (!physicalDefense || physicalDefense.value >= 0)
    return failure('evidence.buff.physicalDefense');

  return Object.freeze({
    ok: true as const,
    debuff: Object.freeze({
      skillId: evidence.skill.skillId,
      contactAttackIds: evidence.skill.contactAttackIds,
      passiveId: 101002,
      buffId: 10020,
      effectId: 'mir4_native_buff_10020',
      kind: 'physical-defense-reduction',
      durationMs: compiledBuff.buff.durationMs,
      magnitude: Math.abs(physicalDefense.value) / 100,
      probabilityBasisPoints: 10_000,
    }),
  });
}

export function mir4NativeRuntimeSmiteDefenseDebuff(
  skillId: number,
  attackId: number,
  skillLevel: number,
): Mir4NativeSkillSmiteDefenseDebuffSpec | null {
  const action = mir4NativeSkillActionById(skillId);
  if (!action) return null;
  const compiled = compileMir4NativeSkillSmiteDefenseDebuff(action, skillLevel);
  if (
    !compiled.ok ||
    !compiled.debuff.contactAttackIds.some((candidate) => candidate === attackId)
  ) {
    return null;
  }
  return compiled.debuff;
}

/** Apply or refresh physical-defense-only Confuse by its native BuffId. */
export function applyMir4NativeSkillSmiteDefenseDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: Mir4NativeSkillSmiteDefenseDebuffSpec,
): boolean {
  const existing = target.mir4Effects?.active.find((effect) => effect.effectId === spec.effectId);
  if (existing) {
    existing.kind = spec.kind;
    existing.duration = spec.durationMs / 1_000;
    existing.remaining = existing.duration;
    existing.magnitude = spec.magnitude;
    existing.sourceId = source.id;
    return true;
  }
  return applyMir4Effect(ctx, target, {
    effectId: spec.effectId,
    kind: spec.kind,
    durationSeconds: spec.durationMs / 1_000,
    magnitude: spec.magnitude,
    name: 'Confuse',
    sourceId: source.id,
  }).ok;
}
