import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillActionById } from '../content/mir4/native_skill_actions';
import type { Mir4NativeBuffRawRecord } from '../content/mir4/native_skill_buff_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { compileMir4NativeTimedBuff } from './native_timed_buffs';

const RAW_QUELL_BUFF = Object.freeze({
  BuffId: 30010,
  BuffName: 360050,
  BuffExplain: 370050,
  ShowDamageFont: 1,
  ShowDamageLog: 1,
  PetBuff_IconId: Object.freeze([0, 0] as const),
  PetId: 0,
  BuffUseType: 1,
  ApplyType: 1,
  BuffTarget: 0,
  ActEffect: 2050109,
  BuffEffect: 0,
  BuffEffectScale: 1,
  Icon: 341033,
  Icon_Big: 0,
  BuffTime: 5,
  LevelUpBuffTime: 1,
  BuffType: 1,
  BuffIndexType_1: 1,
  BuffIndex_1: 22,
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
  EffectSocket: 'Root',
  EffectSocket_Type: 'EBuffSocketType::Root',
  EffectHeight: 0,
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

export const MIR4_NATIVE_2101_QUELL_EVIDENCE = Object.freeze({
  provenance: Object.freeze({
    skill: 'b3cef975e878aeadfa14d467f730f47a3352be288a27b897640ad5cc07d73026',
    skillPassive: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
    skillCost: '35fbdfe4db6724801093dceb5e0f7032b378bbb00923730961614c8972aa07a',
    buff: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
  }),
  skill: Object.freeze({
    skillId: 2101,
    skillCostGroupId: 201,
    contactAttackId: 210102,
    contactDamageType: 2,
    contactDamageChannel: 'magicDamage' as const,
    contactCoefficient: 18_700,
    contactLevelUpCoefficient: 400,
    contactImpactOffsetsMs: Object.freeze([780]),
    smiteBuffIds: Object.freeze([30010]),
    autoLearnPassiveIds: Object.freeze([103001]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: Object.freeze({
    passiveId: 103001,
    learnType: 1,
    classId: 3,
    passiveType: 1,
    targetType: 1,
    castingCondition: 21,
    conditionValue01: 30010,
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
        skillCostId: 20101 + index,
        skillGroupId: 201,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([30010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_QUELL_BUFF,
});

/** Flame Strike references the same Sorcerer Quell passive and BUFF chain. */
export const MIR4_NATIVE_2201_QUELL_EVIDENCE = Object.freeze({
  provenance: MIR4_NATIVE_2101_QUELL_EVIDENCE.provenance,
  skill: Object.freeze({
    skillId: 2201,
    skillCostGroupId: 210,
    contactAttackId: 220102,
    contactDamageType: 2,
    contactDamageChannel: 'magicDamage' as const,
    contactCoefficient: 8_000,
    contactLevelUpCoefficient: 180,
    contactImpactOffsetsMs: Object.freeze([446]),
    smiteBuffIds: Object.freeze([30010]),
    autoLearnPassiveIds: Object.freeze([103001]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: MIR4_NATIVE_2101_QUELL_EVIDENCE.passive,
  skillCostRows: Object.freeze(
    Array.from({ length: 10 }, (_, index) =>
      Object.freeze({
        skillCostId: 21001 + index,
        skillGroupId: 210,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([30010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_QUELL_BUFF,
});

/** Immolate references the same Sorcerer Quell passive and BUFF chain. */
export const MIR4_NATIVE_2103_QUELL_EVIDENCE = Object.freeze({
  provenance: MIR4_NATIVE_2101_QUELL_EVIDENCE.provenance,
  skill: Object.freeze({
    skillId: 2103,
    skillCostGroupId: 208,
    contactAttackId: 210301,
    contactDamageType: 2,
    contactDamageChannel: 'magicDamage' as const,
    contactCoefficient: 7_000,
    contactLevelUpCoefficient: 140,
    contactImpactOffsetsMs: Object.freeze([665, 765]),
    smiteBuffIds: Object.freeze([30010]),
    autoLearnPassiveIds: Object.freeze([103001]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: MIR4_NATIVE_2101_QUELL_EVIDENCE.passive,
  skillCostRows: Object.freeze(
    Array.from({ length: 10 }, (_, index) =>
      Object.freeze({
        skillCostId: 20801 + index,
        skillGroupId: 208,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([30010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_QUELL_BUFF,
});

/** Sunbeam Sword learns the same Taoist Quell passive from cost group 302. */
export const MIR4_NATIVE_3101_QUELL_EVIDENCE = Object.freeze({
  provenance: MIR4_NATIVE_2101_QUELL_EVIDENCE.provenance,
  skill: Object.freeze({
    skillId: 3101,
    skillCostGroupId: 302,
    contactAttackId: 310101,
    contactDamageType: 1,
    contactDamageChannel: 'physicalDamage' as const,
    contactCoefficient: 5_000,
    contactLevelUpCoefficient: 100,
    contactImpactOffsetsMs: Object.freeze([380]),
    smiteBuffIds: Object.freeze([30010]),
    autoLearnPassiveIds: Object.freeze([103001]),
    skillModPassiveIds: Object.freeze([]) as readonly number[],
  }),
  passive: MIR4_NATIVE_2101_QUELL_EVIDENCE.passive,
  skillCostRows: Object.freeze(
    Array.from({ length: 10 }, (_, index) =>
      Object.freeze({
        skillCostId: 30201 + index,
        skillGroupId: 302,
        skillLevel: index + 1,
        smiteBuffIds: Object.freeze([30010]),
        silenceUse: 0,
        stateConditionUse: false,
      }),
    ),
  ),
  buff: RAW_QUELL_BUFF,
});

export interface Mir4NativeSkillQuellDebuffSpec {
  readonly skillId: 2101 | 2103 | 2201 | 3101;
  readonly contactAttackId: 210102 | 210301 | 220102 | 310101;
  readonly passiveId: 103001;
  readonly buffId: 30010;
  readonly effectId: 'mir4_native_buff_30010';
  readonly kind: 'spell-attack-reduction';
  readonly durationMs: number;
  readonly magnitude: number;
  readonly probabilityBasisPoints: 10_000;
}

export type Mir4NativeSkillQuellDebuffCompileResult =
  | { readonly ok: true; readonly debuff: Mir4NativeSkillQuellDebuffSpec }
  | { readonly ok: false; readonly path: string };

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function failure(path: string): Mir4NativeSkillQuellDebuffCompileResult {
  return Object.freeze({ ok: false as const, path });
}

/** Compile only reviewed skill -> 103001 -> BUFF 30010 chains. */
export function compileMir4NativeSkillQuellDebuff(
  action: Mir4NativeSkillAction,
  skillLevel: number,
): Mir4NativeSkillQuellDebuffCompileResult {
  const evidence =
    action.skillId === 2101
      ? MIR4_NATIVE_2101_QUELL_EVIDENCE
      : action.skillId === 2103
        ? MIR4_NATIVE_2103_QUELL_EVIDENCE
        : action.skillId === 2201
          ? MIR4_NATIVE_2201_QUELL_EVIDENCE
          : action.skillId === 3101
            ? MIR4_NATIVE_3101_QUELL_EVIDENCE
            : null;
  if (!evidence) return failure('action.skillId');
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
    return failure('action.nativeBehavior.passiveIds[103001]');
  }
  const contact = action.rows.find((row) => row.attackId === evidence.skill.contactAttackId);
  const damageChannel = contact?.nativeBehavior[evidence.skill.contactDamageChannel];
  if (
    !contact ||
    contact.nativeBehavior.damageType !== evidence.skill.contactDamageType ||
    damageChannel?.coefficient !== evidence.skill.contactCoefficient ||
    damageChannel.levelUpCoefficient !== evidence.skill.contactLevelUpCoefficient ||
    !sameNumbers(contact.impactOffsetsMs, evidence.skill.contactImpactOffsetsMs)
  ) {
    return failure(`action.rows[${evidence.skill.contactAttackId}].damageContact`);
  }
  if (!Number.isSafeInteger(skillLevel) || skillLevel < 1 || skillLevel > 10) {
    return failure('skillLevel');
  }

  const compiledBuff = compileMir4NativeTimedBuff(evidence.buff, skillLevel);
  if (!compiledBuff.ok) return failure('evidence.buff');
  const spellAttack = compiledBuff.buff.contributions.find(
    (contribution) => contribution.calculatedId === 113,
  );
  if (!spellAttack || spellAttack.value >= 0) {
    return failure('evidence.buff.spellAttack');
  }

  return Object.freeze({
    ok: true as const,
    debuff: Object.freeze({
      skillId: evidence.skill.skillId as 2101 | 2103 | 2201 | 3101,
      contactAttackId: evidence.skill.contactAttackId as 210102 | 210301 | 220102 | 310101,
      passiveId: 103001 as const,
      buffId: 30010 as const,
      effectId: 'mir4_native_buff_30010' as const,
      kind: 'spell-attack-reduction' as const,
      durationMs: compiledBuff.buff.durationMs,
      magnitude: Math.abs(spellAttack.value) / 100,
      probabilityBasisPoints: 10_000 as const,
    }),
  });
}

export function mir4NativeRuntimeQuellDebuff(
  skillId: number,
  attackId: number,
  skillLevel: number,
): Mir4NativeSkillQuellDebuffSpec | null {
  const action = mir4NativeSkillActionById(skillId);
  if (!action) return null;
  const compiled = compileMir4NativeSkillQuellDebuff(action, skillLevel);
  if (!compiled.ok || attackId !== compiled.debuff.contactAttackId) return null;
  return compiled.debuff;
}

/** Apply or refresh native Quell by BuffId after the successful damage contact. */
export function applyMir4NativeSkillQuellDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: Mir4NativeSkillQuellDebuffSpec,
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
    name: 'Quell',
    sourceId: source.id,
  }).ok;
}
