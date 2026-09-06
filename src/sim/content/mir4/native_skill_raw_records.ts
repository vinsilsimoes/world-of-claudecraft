/**
 * Lossless source-record shapes shared by direct skill and Totem evidence.
 *
 * Field names intentionally match SKILL.json and SKILL_ATTACK.json exactly.
 * These types preserve source data only and assign no runtime meaning.
 */

export interface Mir4NativeRawVector {
  readonly X: number;
  readonly Y: number;
  readonly Z: number;
}

/** Exact 103-key shape of the selected SKILL.json records. */
export interface Mir4NativeRawSkillRecord {
  readonly SkillId: number;
  readonly NameSid: number;
  readonly GroupNoteSid: number;
  readonly NoteSid: number;
  readonly EffectSid: number;
  readonly Icon: number;
  readonly Icon_Gray: number;
  readonly NameImgId: readonly number[];
  readonly SkillType: number;
  readonly ClassId: number;
  readonly Group: number;
  readonly SkillProductType: number;
  readonly UseControlTime: number;
  readonly ConditionTarget: number;
  readonly ConditionType: number;
  readonly ConditionValue: number;
  readonly ConditionRange: number;
  readonly ConditionCheckTime: number;
  readonly ChainUseSkillLv: number;
  readonly ChainSkillID: number;
  readonly ChainSkillDelay: number;
  readonly ChainSkillCount: number;
  readonly Cooltime: number;
  readonly MaxCooltime: number;
  readonly LevelUpCooltime: number;
  readonly GlobalCooltime: number;
  readonly SkillCostType: number;
  readonly SkillCost: number;
  readonly SkillCostType_1: number;
  readonly SkillCost_1: number;
  readonly AttackLink: readonly number[];
  readonly AttackAniTime: number;
  readonly EndCutAniTime: number;
  readonly HitCount: number;
  readonly NextNormalSkilLink: readonly number[];
  readonly NextNormalSkilProb: number;
  readonly DarkChange: number;
  readonly DamageType: number;
  readonly MulDamage: number;
  readonly LevelUpMulDamage: number;
  readonly AddDamage: number;
  readonly LevelUpAddDamage: number;
  readonly MulDamage_1: number;
  readonly LevelUpMulDamage_1: number;
  readonly AddDamage_1: number;
  readonly LevelUpAddDamage_1: number;
  readonly AbilityType_1: number;
  readonly AbilityValue_1: number;
  readonly LevelUpValue_1: number;
  readonly AbilityTime_1: number;
  readonly AbilityType_2: number;
  readonly AbilityValue_2: number;
  readonly LevelUpValue_2: number;
  readonly AbilityTime_2: number;
  readonly AbilityType_3: number;
  readonly AbilityValue_3: number;
  readonly LevelUpValue_3: number;
  readonly AbilityTime_3: number;
  readonly AbilityType_4: number;
  readonly AbilityValue_4: number;
  readonly LevelUpValue_4: number;
  readonly AbilityTime_4: number;
  readonly ReqClassLevel: number;
  readonly MaxSkillLevel: number;
  readonly LevelUpCostType: number;
  readonly LevelUpDefaultCost: number;
  readonly LevelUpCost: number;
  readonly LevelUpCostType1: number;
  readonly LevelUpDefaultCost1: number;
  readonly LevelUpCost1: number;
  readonly ItemSmallIcon: number;
  readonly CombatPoint: number;
  readonly LevelUpCombatPoint: number;
  readonly IndicatorType: number;
  readonly IndicatorIndex: number;
  readonly IndicatorAngle: number;
  readonly IndicatorMin: number;
  readonly IndicatorMax: number;
  readonly IndicatorWidth: number;
  readonly IndicatorOffset: number;
  readonly MainSkillID: number;
  readonly Targeting: boolean;
  readonly TargetHeight: number;
  readonly BlockingCheck: number;
  readonly Passive: readonly number[];
  readonly StateConUse: boolean;
  readonly MoveConUse: boolean;
  readonly SmiteBuffID: readonly number[];
  readonly SkillCostGroupID: number;
  readonly ReqBloodLevel: number;
  readonly ReqForceLevel: number;
  readonly ReqCheckQuest: number;
  readonly UIViewOrder: number;
  readonly AutoLearnPassive: readonly number[];
  readonly Skill_MODPassive: readonly number[];
  readonly SpecialLevel: readonly number[];
  readonly SpecialNoteSid: readonly number[];
  readonly SpecialToolTipTitle: readonly number[];
  readonly SpecialToolTip: readonly number[];
  readonly SkillUseCount: number;
  readonly SkillUseTime: number;
  readonly AddCoolTime: readonly number[];
  readonly AddSkillCost: readonly number[];
}

/** Exact 98-key shape shared by direct and Totem SKILL_ATTACK.json records. */
export interface Mir4NativeRawSkillAttackRecord {
  readonly AttackID: number;
  readonly AniIndex: number;
  readonly SkillId: number;
  readonly AniType: number;
  readonly MainAttack: number;
  readonly NextAttackLink: number;
  readonly ImpactStartTime: number;
  readonly MoveType: number;
  readonly MoveAngleMin: number;
  readonly MoveAngleMax: number;
  readonly MoveRange: number;
  readonly DelayMove: number;
  readonly MoveTime: number;
  readonly ViewTarget: number;
  readonly AttackUseType: number;
  readonly TargetDistanceMin: number;
  readonly TargetDistanceMax: number;
  readonly TargetType: number;
  readonly TargetValue: number;
  readonly TargetSubType: string;
  readonly ImpactType: number;
  readonly ImpactSpawnType: number;
  readonly ImpactTime: readonly number[];
  readonly StrikeDelay: number;
  readonly AttackAngle: number;
  readonly AttackDistanceMin: number;
  readonly AttackDistanceMax: number;
  readonly AttackWidth: number;
  readonly AttackHeight: number;
  readonly LocationOffset: Mir4NativeRawVector;
  readonly RotationOffset: number;
  readonly BulletType: number;
  readonly BulletMoveType: number;
  readonly BulletCount: number;
  readonly BulletSpeed: number;
  readonly BulletTime: number;
  readonly BulletSocketName: string;
  readonly LaunchGapDelay: number;
  readonly BulletEffect: number;
  readonly BulletEffectScale: number;
  readonly CurveData: string;
  readonly SpeedData: string;
  readonly DamageType: number;
  readonly MulDamage: number;
  readonly LevelUpMulDamage: number;
  readonly AddDamage: number;
  readonly LevelUpAddDamage: number;
  readonly DamageAttribute: number;
  readonly MagicDamage: number;
  readonly LevelUpMagicDamage: number;
  readonly AddMagicDamage: number;
  readonly LevelUpAddMagicDamage: number;
  readonly ActType: number;
  readonly SuperIgnore: number;
  readonly SuperArmor: number;
  readonly CCStance: number;
  readonly CrowdControlType: number;
  readonly CrowdControlValue: number;
  readonly CrowdControlHeight: number;
  readonly CrowdControlValueEx: number;
  readonly CrowdControlTime: number;
  readonly CCEffect: number;
  readonly CCEffectSocket: string;
  readonly CCEffectHeight: number;
  readonly CCEffectScale: number;
  readonly CCMaterialPath: string;
  readonly HitReactionProb: number;
  readonly GuideEffectApplyType: number;
  readonly GuideEffect: number;
  readonly GuideEffectAliveTime: number;
  readonly GuideEffectScalingTime: number;
  readonly ActEffect: number;
  readonly HitEffect: number;
  readonly CriticalHitEffect: number;
  readonly HitEffectSound: number;
  readonly CameraShake: number;
  readonly DieReaction: number;
  readonly Buff: readonly number[];
  readonly BulletRotationOffset: Mir4NativeRawVector;
  readonly BulletAngleSpeed: number;
  readonly MonScaleApply: boolean;
  readonly AniTime: number;
  readonly AttackRagePoint: number;
  readonly HitRagePoint: number;
  readonly CCDirection: number;
  readonly SkillTotem: number;
  readonly SkillTotemTarget: number;
  readonly SkillTotemTime: number;
  readonly SkillTotemCount: number;
  readonly AggroRate: number;
  readonly Emissive_Dcolor: readonly number[];
  readonly Fresnel_Exponenth: number;
  readonly Fresnel_BaseReflect: number;
  readonly EmissiveTime: number;
  readonly CCBuff: readonly number[];
  readonly CCUserCheck: number;
  readonly BulletCurveTime: number;
  readonly BulletHeight: number;
}

export function cloneMir4NativeEvidence<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneMir4NativeEvidence(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneMir4NativeEvidence(item)]),
    ) as T;
  }
  return value;
}

export function deepFreezeMir4NativeEvidence<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) {
      deepFreezeMir4NativeEvidence(item);
    }
    Object.freeze(value);
  }
  return value;
}
