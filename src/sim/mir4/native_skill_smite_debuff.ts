import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillActionById } from '../content/mir4/native_skill_actions';
import type { Mir4NativeBuffRawRecord } from '../content/mir4/native_skill_buff_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { compileMir4NativeTimedBuff } from './native_timed_buffs';

export type Mir4NativeSkillSmiteDebuffIssueCode =
  | 'source-mismatch'
  | 'invalid-skill-level'
  | 'buff-compile-failed';

export interface Mir4NativeSkillSmiteDebuffIssue {
  readonly code: Mir4NativeSkillSmiteDebuffIssueCode;
  readonly path: string;
}

export interface Mir4NativeSkillSmiteDebuffSpec {
  readonly skillId: 1104 | 1401;
  readonly contactAttackId: 110402 | 140102;
  readonly passiveId: 101001;
  readonly buffId: 10010;
  readonly effectId: 'mir4_native_buff_10010';
  readonly kind: 'physical-attack-reduction';
  readonly durationMs: number;
  readonly magnitude: number;
  readonly probabilityBasisPoints: 10_000;
}

export type Mir4NativeSkillSmiteDebuffCompileResult =
  | { readonly ok: true; readonly debuff: Mir4NativeSkillSmiteDebuffSpec }
  | { readonly ok: false; readonly issues: readonly Mir4NativeSkillSmiteDebuffIssue[] };

const RAW_DAZE_BUFF = Object.freeze({
  BuffId: 10010,
  BuffName: 360010,
  BuffExplain: 370010,
  ShowDamageFont: 1,
  ShowDamageLog: 1,
  PetBuff_IconId: Object.freeze([0, 0] as const),
  PetId: 0,
  BuffUseType: 1,
  ApplyType: 1,
  BuffTarget: 0,
  ActEffect: 0,
  BuffEffect: 2050124,
  BuffEffectScale: 1,
  Icon: 341042,
  Icon_Big: 0,
  BuffTime: 5,
  LevelUpBuffTime: 1,
  BuffType: 1,
  BuffIndexType_1: 1,
  BuffIndex_1: 20,
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

/**
 * Bounded source contract for Warrior 1104 only. SKILL.Passive eligibility is
 * deliberately separate from AutoLearnPassive: 101001 is the hidden Smite
 * dispatcher, while 706005 remains an optional external progression hook.
 */
export const MIR4_NATIVE_1104_SMITE_EVIDENCE = Object.freeze({
  provenance: Object.freeze({
    skill: 'b3cef975e878aeadfa14d467f730f47a3352be288a27b897640ad5cc07d73026',
    skillPassive: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
    skillCost: '35fbdfe4db6724801093d3ceb5e0f7032b378bbb00923730961614c8972aa07a',
    buff: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
  }),
  skill: Object.freeze({
    skillId: 1104,
    skillCostGroupId: 102,
    contactAttackId: 110402,
    contactCoefficient: 21_000,
    contactLevelUpCoefficient: 400,
    contactImpactOffsetsMs: Object.freeze([490]),
    smiteBuffIds: Object.freeze([10010]),
    autoLearnPassiveIds: Object.freeze([101001]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: Object.freeze({
    passiveId: 101001,
    learnType: 1,
    classId: 1,
    passiveType: 1,
    targetType: 1,
    castingCondition: 21,
    conditionValue01: 10010,
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
        skillCostId: 10201 + index,
        skillGroupId: 102,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([10010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_DAZE_BUFF,
  externalEligibilityOnlyPassiveIds: Object.freeze([706005]),
});

/** Ground Smash uses the same proved Smite dispatcher and Daze buff through group 104. */
export const MIR4_NATIVE_1401_SMITE_EVIDENCE = Object.freeze({
  provenance: MIR4_NATIVE_1104_SMITE_EVIDENCE.provenance,
  skill: Object.freeze({
    skillId: 1401,
    skillCostGroupId: 104,
    contactAttackId: 140102,
    contactCoefficient: 25_000,
    contactLevelUpCoefficient: 500,
    contactImpactOffsetsMs: Object.freeze([610]),
    smiteBuffIds: Object.freeze([10010]),
    autoLearnPassiveIds: Object.freeze([101001]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: MIR4_NATIVE_1104_SMITE_EVIDENCE.passive,
  skillCostRows: Object.freeze(
    Array.from({ length: 10 }, (_, index) =>
      Object.freeze({
        skillCostId: 10401 + index,
        skillGroupId: 104,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([10010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_DAZE_BUFF,
  externalEligibilityOnlyPassiveIds: Object.freeze([706005]),
});

type Mir4NativeSmiteEvidence =
  | typeof MIR4_NATIVE_1104_SMITE_EVIDENCE
  | typeof MIR4_NATIVE_1401_SMITE_EVIDENCE;

const SMITE_EVIDENCE_BY_SKILL = new Map<number, Mir4NativeSmiteEvidence>([
  [1104, MIR4_NATIVE_1104_SMITE_EVIDENCE],
  [1401, MIR4_NATIVE_1401_SMITE_EVIDENCE],
]);

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function failure(path: string): Mir4NativeSkillSmiteDebuffCompileResult {
  return Object.freeze({
    ok: false as const,
    issues: Object.freeze([{ code: 'source-mismatch' as const, path }]),
  });
}

/** Compile only the exact admitted Warrior skill -> 101001 -> 10010 source chains. */
export function compileMir4NativeSkillSmiteDebuff(
  action: Mir4NativeSkillAction,
  skillLevel: number,
): Mir4NativeSkillSmiteDebuffCompileResult {
  const expected = SMITE_EVIDENCE_BY_SKILL.get(action.skillId as 1104 | 1401);
  if (!expected || action.skillId !== expected.skill.skillId) return failure('action.skillId');
  if (!sameNumbers(action.nativeBehavior.smiteBuffIds, expected.skill.smiteBuffIds)) {
    return failure('action.nativeBehavior.smiteBuffIds');
  }
  if (!sameNumbers(action.nativeBehavior.autoLearnPassiveIds, expected.skill.autoLearnPassiveIds)) {
    return failure('action.nativeBehavior.autoLearnPassiveIds');
  }
  if (!sameNumbers(action.nativeBehavior.skillModPassiveIds, expected.skill.skillModPassiveIds)) {
    return failure('action.nativeBehavior.skillModPassiveIds');
  }
  if (!action.nativeBehavior.passiveIds.includes(expected.passive.passiveId)) {
    return failure('action.nativeBehavior.passiveIds[101001]');
  }
  if (
    !expected.externalEligibilityOnlyPassiveIds.every((passiveId) =>
      action.nativeBehavior.passiveIds.includes(passiveId),
    )
  ) {
    return failure('action.nativeBehavior.passiveIds[external]');
  }
  const contact = action.rows.find((row) => row.attackId === expected.skill.contactAttackId);
  if (!contact) return failure(`action.rows[${expected.skill.contactAttackId}]`);
  if (
    contact.nativeBehavior.damageType !== 1 ||
    contact.nativeBehavior.physicalDamage.coefficient !== expected.skill.contactCoefficient ||
    contact.nativeBehavior.physicalDamage.levelUpCoefficient !==
      expected.skill.contactLevelUpCoefficient ||
    contact.nativeBehavior.magicDamage.coefficient !== 0 ||
    !sameNumbers(contact.impactOffsetsMs, expected.skill.contactImpactOffsetsMs)
  ) {
    return failure(`action.rows[${expected.skill.contactAttackId}].damageContact`);
  }
  if (!Number.isSafeInteger(skillLevel) || skillLevel < 1) {
    return Object.freeze({
      ok: false as const,
      issues: Object.freeze([{ code: 'invalid-skill-level' as const, path: 'skillLevel' }]),
    });
  }

  const compiledBuff = compileMir4NativeTimedBuff(expected.buff, skillLevel);
  if (!compiledBuff.ok) {
    return Object.freeze({
      ok: false as const,
      issues: Object.freeze([{ code: 'buff-compile-failed' as const, path: 'evidence.buff' }]),
    });
  }
  const physicalAttack = compiledBuff.buff.contributions.find(
    (contribution) => contribution.calculatedId === 111,
  );
  if (!physicalAttack || physicalAttack.value >= 0) return failure('evidence.buff.physicalAttack');

  return Object.freeze({
    ok: true as const,
    debuff: Object.freeze({
      skillId: expected.skill.skillId,
      contactAttackId: expected.skill.contactAttackId,
      passiveId: 101001 as const,
      buffId: 10010 as const,
      effectId: 'mir4_native_buff_10010' as const,
      kind: 'physical-attack-reduction' as const,
      durationMs: compiledBuff.buff.durationMs,
      magnitude: Math.abs(physicalAttack.value) / 100,
      probabilityBasisPoints: 10_000 as const,
    }),
  });
}

/** Runtime lookup stays closed to the one proved damaging SKILL_ATTACK contact. */
export function mir4NativeRuntimeSmiteDebuff(
  skillId: number,
  attackId: number,
  skillLevel: number,
): Mir4NativeSkillSmiteDebuffSpec | null {
  const action = mir4NativeSkillActionById(skillId);
  if (!action) return null;
  const compiled = compileMir4NativeSkillSmiteDebuff(action, skillLevel);
  if (!compiled.ok || attackId !== compiled.debuff.contactAttackId) return null;
  return compiled.debuff;
}

/** Apply or refresh by native BuffId. This stat debuff is not hard control. */
export function applyMir4NativeSkillSmiteDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: Mir4NativeSkillSmiteDebuffSpec,
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
    name: 'Daze',
    sourceId: source.id,
  }).ok;
}
