import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillActionById } from '../content/mir4/native_skill_actions';
import type { Mir4NativeBuffRawRecord } from '../content/mir4/native_skill_buff_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { mir4NativeRuntimeTotemPlan } from './native_skill_totem_runtime';

const RAW_CHILL_BUFF = Object.freeze({
  BuffId: 20020,
  BuffName: 360030,
  BuffExplain: 370030,
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
  Icon: 341032,
  Icon_Big: 0,
  BuffTime: 5,
  LevelUpBuffTime: 1,
  BuffType: 1,
  BuffIndexType_1: 1,
  BuffIndex_1: 45,
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
  BuffOverlap: 3,
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

export const MIR4_NATIVE_CHILL_EVIDENCE = Object.freeze({
  provenance: Object.freeze({
    skill: 'b454991f1b2c5194944e9356b40a5228dcc81c5241fe02fb6e52aeafa149eb12',
    skillPassive: '8de37fc84924c9a70dcacfba079cb579188b935f5b6ffea2902bb32697852495',
    buff: 'd77fb42610eb6e1878bd66ac1a4306d08d6a87f6f3ba16b5c3ff760089ef6d19',
    stringTemplate: '7ff2203e504c40143492a31938bb60325b26e920bbd1e31f0dcce2949b0ebb4a',
  }),
  skill: Object.freeze({
    skillId: 2301,
    contactAttackIds: Object.freeze([230113, 230114, 230115, 230116] as const),
    smiteBuffIds: Object.freeze([20020]),
    autoLearnPassiveIds: Object.freeze([102001]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: Object.freeze({
    passiveId: 102001,
    learnType: 1,
    classId: 2,
    passiveType: 1,
    targetType: 1,
    castingCondition: 21,
    conditionValue01: 20020,
    conditionValue02: 0,
    conditionPercent: 100,
    buffTargetType: 2,
    buffLink: 0,
    buffLink1: 0,
    isSmite: true,
  }),
  strings: Object.freeze({
    nameId: 360030,
    englishName: 'Chill',
    explanationId: 370030,
    nativeStatusId: 45,
  }),
  buff: RAW_CHILL_BUFF,
});

export interface Mir4NativeSkillChillDebuffSpec {
  readonly skillId: 2301;
  readonly contactAttackIds: readonly [230113, 230114, 230115, 230116];
  readonly passiveId: 102001;
  readonly buffId: 20020;
  readonly effectId: 'mir4_native_buff_20020';
  readonly kind: 'native-status-boost';
  readonly nativeStatusId: 45;
  readonly durationMs: number;
  /** Native percentage points. The combat boundary converts these to basis points. */
  readonly nativeMagnitude: -25;
  readonly probabilityBasisPoints: 10_000;
  readonly overlap: {
    readonly authority: 'authorial-browser-reconstruction';
    readonly nativeClaim: false;
    readonly policyId: 'mir4-authorial.buff-overlap-3-refresh-by-id-v1';
    readonly resolution: 'refresh-by-buff-id';
  };
}

export type Mir4NativeSkillChillDebuffCompileResult =
  | { readonly ok: true; readonly debuff: Mir4NativeSkillChillDebuffSpec }
  | { readonly ok: false; readonly path: string };

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function failure(path: string): Mir4NativeSkillChillDebuffCompileResult {
  return Object.freeze({ ok: false as const, path });
}

/** Compile the reviewed Thunderstorm -> 102001 -> BUFF 20020 chain. */
export function compileMir4NativeSkillChillDebuff(
  action: Mir4NativeSkillAction,
  skillLevel: number,
): Mir4NativeSkillChillDebuffCompileResult {
  const evidence = MIR4_NATIVE_CHILL_EVIDENCE;
  if (action.skillId !== evidence.skill.skillId) return failure('action.skillId');
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
    return failure('action.nativeBehavior.passiveIds[102001]');
  }
  if (!Number.isSafeInteger(skillLevel) || skillLevel < 1 || skillLevel > 15) {
    return failure('skillLevel');
  }

  const totem = mir4NativeRuntimeTotemPlan(action.skillId);
  if (
    !totem ||
    totem.skillId !== 2301 ||
    !sameNumbers(
      totem.contacts.map((contact) => contact.attackId),
      evidence.skill.contactAttackIds,
    )
  ) {
    return failure('action.totem.contacts');
  }
  const buff = evidence.buff;
  if (
    buff.BuffId !== 20020 ||
    buff.BuffName !== evidence.strings.nameId ||
    buff.BuffExplain !== evidence.strings.explanationId ||
    buff.BuffTarget !== 0 ||
    buff.BuffProbability !== 1000 ||
    buff.BuffIndexType_1 !== 1 ||
    buff.BuffIndex_1 !== evidence.strings.nativeStatusId ||
    buff.BuffValue_1 !== -25 ||
    buff.LevelUpBuffValue_1 !== 0 ||
    buff.BuffTime !== 5 ||
    buff.LevelUpBuffTime !== 1 ||
    buff.BuffOverlap !== 3 ||
    buff.OverLapCallGroupID !== 0
  ) {
    return failure('evidence.buff');
  }

  return Object.freeze({
    ok: true as const,
    debuff: Object.freeze({
      skillId: 2301 as const,
      contactAttackIds: evidence.skill.contactAttackIds,
      passiveId: 102001 as const,
      buffId: 20020 as const,
      effectId: 'mir4_native_buff_20020' as const,
      kind: 'native-status-boost' as const,
      nativeStatusId: 45 as const,
      durationMs: (buff.BuffTime + (skillLevel - 1) * buff.LevelUpBuffTime) * 1_000,
      nativeMagnitude: -25 as const,
      probabilityBasisPoints: 10_000 as const,
      overlap: Object.freeze({
        authority: 'authorial-browser-reconstruction' as const,
        nativeClaim: false as const,
        policyId: 'mir4-authorial.buff-overlap-3-refresh-by-id-v1' as const,
        resolution: 'refresh-by-buff-id' as const,
      }),
    }),
  });
}

export function mir4NativeRuntimeChillDebuff(
  skillId: number,
  attackId: number,
  skillLevel: number,
): Mir4NativeSkillChillDebuffSpec | null {
  const action = mir4NativeSkillActionById(skillId);
  if (!action) return null;
  const compiled = compileMir4NativeSkillChillDebuff(action, skillLevel);
  if (
    !compiled.ok ||
    !compiled.debuff.contactAttackIds.some((contactAttackId) => contactAttackId === attackId)
  ) {
    return null;
  }
  return compiled.debuff;
}

/** Apply or refresh Chill by its exact BuffId-derived effect identity. */
export function applyMir4NativeSkillChillDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: Mir4NativeSkillChillDebuffSpec,
): boolean {
  const existing = target.mir4Effects?.active.find((effect) => effect.effectId === spec.effectId);
  if (existing) {
    existing.kind = spec.kind;
    existing.duration = spec.durationMs / 1_000;
    existing.remaining = existing.duration;
    existing.magnitude = spec.nativeMagnitude;
    existing.nativeStatusId = spec.nativeStatusId;
    existing.sourceId = source.id;
    return true;
  }
  return applyMir4Effect(ctx, target, {
    effectId: spec.effectId,
    kind: spec.kind,
    durationSeconds: spec.durationMs / 1_000,
    magnitude: spec.nativeMagnitude,
    nativeStatusId: spec.nativeStatusId,
    name: MIR4_NATIVE_CHILL_EVIDENCE.strings.englishName,
    sourceId: source.id,
  }).ok;
}
