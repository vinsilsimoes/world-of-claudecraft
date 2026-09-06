import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE } from '../../src/sim/content/mir4/native_skill_action_evidence';
import {
  MIR4_NATIVE_DIRECT_RAW_ATTACK_RECORDS,
  MIR4_NATIVE_DIRECT_RAW_EVIDENCE,
  MIR4_NATIVE_DIRECT_RAW_PROVENANCE,
  MIR4_NATIVE_DIRECT_RAW_SKILL_RECORDS,
  mir4NativeDirectRawEvidenceBySkillId,
} from '../../src/sim/content/mir4/native_skill_direct_raw_evidence';
import type {
  Mir4NativeRawSkillAttackRecord,
  Mir4NativeRawSkillRecord,
} from '../../src/sim/content/mir4/native_skill_raw_records';

const SKILL_IDS = [
  1101, 1102, 1103, 1104, 1201, 1301, 1302, 1304, 1401, 1403, 1501, 1502, 1601, 2101, 2111, 2501,
  2301, 2503, 2203, 2303, 2201, 2502, 2103, 2204, 2202, 2403, 3506, 3101, 3301, 3104, 3503, 3103,
  3501, 3201, 3505, 3203, 3404, 3504, 3303, 4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109,
  4110, 4111, 4112, 4113, 5201, 5101, 5104, 5301, 5401, 5102, 5103, 5303, 5403, 5205, 5304, 5202,
  5203,
] as const;

const RAW_SKILL_KEYS = [
  'SkillId',
  'NameSid',
  'GroupNoteSid',
  'NoteSid',
  'EffectSid',
  'Icon',
  'Icon_Gray',
  'NameImgId',
  'SkillType',
  'ClassId',
  'Group',
  'SkillProductType',
  'UseControlTime',
  'ConditionTarget',
  'ConditionType',
  'ConditionValue',
  'ConditionRange',
  'ConditionCheckTime',
  'ChainUseSkillLv',
  'ChainSkillID',
  'ChainSkillDelay',
  'ChainSkillCount',
  'Cooltime',
  'MaxCooltime',
  'LevelUpCooltime',
  'GlobalCooltime',
  'SkillCostType',
  'SkillCost',
  'SkillCostType_1',
  'SkillCost_1',
  'AttackLink',
  'AttackAniTime',
  'EndCutAniTime',
  'HitCount',
  'NextNormalSkilLink',
  'NextNormalSkilProb',
  'DarkChange',
  'DamageType',
  'MulDamage',
  'LevelUpMulDamage',
  'AddDamage',
  'LevelUpAddDamage',
  'MulDamage_1',
  'LevelUpMulDamage_1',
  'AddDamage_1',
  'LevelUpAddDamage_1',
  'AbilityType_1',
  'AbilityValue_1',
  'LevelUpValue_1',
  'AbilityTime_1',
  'AbilityType_2',
  'AbilityValue_2',
  'LevelUpValue_2',
  'AbilityTime_2',
  'AbilityType_3',
  'AbilityValue_3',
  'LevelUpValue_3',
  'AbilityTime_3',
  'AbilityType_4',
  'AbilityValue_4',
  'LevelUpValue_4',
  'AbilityTime_4',
  'ReqClassLevel',
  'MaxSkillLevel',
  'LevelUpCostType',
  'LevelUpDefaultCost',
  'LevelUpCost',
  'LevelUpCostType1',
  'LevelUpDefaultCost1',
  'LevelUpCost1',
  'ItemSmallIcon',
  'CombatPoint',
  'LevelUpCombatPoint',
  'IndicatorType',
  'IndicatorIndex',
  'IndicatorAngle',
  'IndicatorMin',
  'IndicatorMax',
  'IndicatorWidth',
  'IndicatorOffset',
  'MainSkillID',
  'Targeting',
  'TargetHeight',
  'BlockingCheck',
  'Passive',
  'StateConUse',
  'MoveConUse',
  'SmiteBuffID',
  'SkillCostGroupID',
  'ReqBloodLevel',
  'ReqForceLevel',
  'ReqCheckQuest',
  'UIViewOrder',
  'AutoLearnPassive',
  'Skill_MODPassive',
  'SpecialLevel',
  'SpecialNoteSid',
  'SpecialToolTipTitle',
  'SpecialToolTip',
  'SkillUseCount',
  'SkillUseTime',
  'AddCoolTime',
  'AddSkillCost',
] as const;

const RAW_ATTACK_KEYS = [
  'AttackID',
  'AniIndex',
  'SkillId',
  'AniType',
  'MainAttack',
  'NextAttackLink',
  'ImpactStartTime',
  'MoveType',
  'MoveAngleMin',
  'MoveAngleMax',
  'MoveRange',
  'DelayMove',
  'MoveTime',
  'ViewTarget',
  'AttackUseType',
  'TargetDistanceMin',
  'TargetDistanceMax',
  'TargetType',
  'TargetValue',
  'TargetSubType',
  'ImpactType',
  'ImpactSpawnType',
  'ImpactTime',
  'StrikeDelay',
  'AttackAngle',
  'AttackDistanceMin',
  'AttackDistanceMax',
  'AttackWidth',
  'AttackHeight',
  'LocationOffset',
  'RotationOffset',
  'BulletType',
  'BulletMoveType',
  'BulletCount',
  'BulletSpeed',
  'BulletTime',
  'BulletSocketName',
  'LaunchGapDelay',
  'BulletEffect',
  'BulletEffectScale',
  'CurveData',
  'SpeedData',
  'DamageType',
  'MulDamage',
  'LevelUpMulDamage',
  'AddDamage',
  'LevelUpAddDamage',
  'DamageAttribute',
  'MagicDamage',
  'LevelUpMagicDamage',
  'AddMagicDamage',
  'LevelUpAddMagicDamage',
  'ActType',
  'SuperIgnore',
  'SuperArmor',
  'CCStance',
  'CrowdControlType',
  'CrowdControlValue',
  'CrowdControlHeight',
  'CrowdControlValueEx',
  'CrowdControlTime',
  'CCEffect',
  'CCEffectSocket',
  'CCEffectHeight',
  'CCEffectScale',
  'CCMaterialPath',
  'HitReactionProb',
  'GuideEffectApplyType',
  'GuideEffect',
  'GuideEffectAliveTime',
  'GuideEffectScalingTime',
  'ActEffect',
  'HitEffect',
  'CriticalHitEffect',
  'HitEffectSound',
  'CameraShake',
  'DieReaction',
  'Buff',
  'BulletRotationOffset',
  'BulletAngleSpeed',
  'MonScaleApply',
  'AniTime',
  'AttackRagePoint',
  'HitRagePoint',
  'CCDirection',
  'SkillTotem',
  'SkillTotemTarget',
  'SkillTotemTime',
  'SkillTotemCount',
  'AggroRate',
  'Emissive_Dcolor',
  'Fresnel_Exponenth',
  'Fresnel_BaseReflect',
  'EmissiveTime',
  'CCBuff',
  'CCUserCheck',
  'BulletCurveTime',
  'BulletHeight',
] as const;

function canonicalHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function activeIds(values: readonly number[]): readonly number[] {
  return values.filter((value) => value !== 0);
}

function expectedSkillBehavior(raw: Mir4NativeRawSkillRecord): unknown {
  return {
    source: 'SKILL.json',
    skillType: raw.SkillType,
    productType: raw.SkillProductType,
    useControlTime: raw.UseControlTime,
    conditionTarget: raw.ConditionTarget,
    conditionType: raw.ConditionType,
    conditionValue: raw.ConditionValue,
    conditionRange: raw.ConditionRange,
    conditionCheckTime: raw.ConditionCheckTime,
    chainUseSkillLevel: raw.ChainUseSkillLv,
    chainSkillId: raw.ChainSkillID,
    chainSkillDelay: raw.ChainSkillDelay,
    chainSkillCount: raw.ChainSkillCount,
    secondaryCostType: raw.SkillCostType_1,
    secondaryCost: raw.SkillCost_1,
    darkChange: raw.DarkChange,
    damageType: raw.DamageType,
    primaryDamage: {
      coefficient: raw.MulDamage,
      levelUpCoefficient: raw.LevelUpMulDamage,
      additive: raw.AddDamage,
      levelUpAdditive: raw.LevelUpAddDamage,
    },
    secondaryDamage: {
      coefficient: raw.MulDamage_1,
      levelUpCoefficient: raw.LevelUpMulDamage_1,
      additive: raw.AddDamage_1,
      levelUpAdditive: raw.LevelUpAddDamage_1,
    },
    abilities: [1, 2, 3, 4].map((slot) => ({
      type: raw[`AbilityType_${slot}` as keyof Mir4NativeRawSkillRecord],
      value: raw[`AbilityValue_${slot}` as keyof Mir4NativeRawSkillRecord],
      levelUpValue: raw[`LevelUpValue_${slot}` as keyof Mir4NativeRawSkillRecord],
      time: raw[`AbilityTime_${slot}` as keyof Mir4NativeRawSkillRecord],
    })),
    stateConditionUse: raw.StateConUse,
    moveConditionUse: raw.MoveConUse,
    passiveIds: activeIds(raw.Passive),
    smiteBuffIds: activeIds(raw.SmiteBuffID),
    autoLearnPassiveIds: activeIds(raw.AutoLearnPassive),
    skillModPassiveIds: activeIds(raw.Skill_MODPassive),
  };
}

function expectedAttackBehavior(raw: Mir4NativeRawSkillAttackRecord): unknown {
  return {
    source: 'SKILL_ATTACK.json',
    attackUseType: raw.AttackUseType,
    rawTargetSubtype: raw.TargetSubType,
    impactSpawnType: raw.ImpactSpawnType,
    strikeDelay: raw.StrikeDelay,
    projectile:
      raw.BulletType === 0
        ? null
        : {
            bulletType: raw.BulletType,
            moveType: raw.BulletMoveType,
            count: raw.BulletCount,
            speed: raw.BulletSpeed,
            lifetime: raw.BulletTime,
            socketName: raw.BulletSocketName,
            launchGapDelay: raw.LaunchGapDelay,
            effectId: raw.BulletEffect,
            effectScale: raw.BulletEffectScale,
            curveData: raw.CurveData,
            speedData: raw.SpeedData,
            rotationOffset: {
              x: raw.BulletRotationOffset.X,
              y: raw.BulletRotationOffset.Y,
              z: raw.BulletRotationOffset.Z,
            },
            angleSpeed: raw.BulletAngleSpeed,
            curveTime: raw.BulletCurveTime,
            nativeHeight: raw.BulletHeight,
          },
    totem:
      raw.SkillTotem === 0
        ? null
        : {
            id: raw.SkillTotem,
            target: raw.SkillTotemTarget,
            time: raw.SkillTotemTime,
            count: raw.SkillTotemCount,
          },
    buffIds: activeIds(raw.Buff),
    ccBuffIds: activeIds(raw.CCBuff),
    superIgnore: raw.SuperIgnore,
    superArmor: raw.SuperArmor,
    actType: raw.ActType,
    ccUserCheck: raw.CCUserCheck,
    attackRagePoint: raw.AttackRagePoint,
    hitRagePoint: raw.HitRagePoint,
    aggroRate: raw.AggroRate,
    damageType: raw.DamageType,
    damageAttribute: raw.DamageAttribute,
    physicalDamage: {
      coefficient: raw.MulDamage,
      levelUpCoefficient: raw.LevelUpMulDamage,
      additive: raw.AddDamage,
      levelUpAdditive: raw.LevelUpAddDamage,
    },
    magicDamage: {
      coefficient: raw.MagicDamage,
      levelUpCoefficient: raw.LevelUpMagicDamage,
      additive: raw.AddMagicDamage,
      levelUpAdditive: raw.LevelUpAddMagicDamage,
    },
    monsterScaleApply: raw.MonScaleApply,
  };
}

describe('MIR4 direct raw source evidence', () => {
  it('pins incorporated source and canonical selection hashes', () => {
    expect(MIR4_NATIVE_DIRECT_RAW_PROVENANCE).toEqual({
      sources: [
        {
          fileName: 'SKILL.json',
          sha256: 'b3cef975e878aeadfa14d467f730f47a3352be288a27b897640ad5cc07d73026',
        },
        {
          fileName: 'SKILL_ATTACK.json',
          sha256: 'a71fabdfff8883483566b622d2c909b946c015268b6da5a727459615106bba8c',
        },
      ],
      projections: {
        rawSkillRecordsSha256: 'f08e02b2718aba00c6fcc7752c60d73bdaa64fca2164300c4d2d503da9707587',
        rawAttackRecordsSha256: '5ddd30c6f028ba65079fad377f23c0e4bf70e372cfb08becd93c137642c630be',
        combinedEvidenceSha256: 'c3338e6ad07d6f7d63ea9d533e52d3773263883e867d9cdfb39e3195a365ba2b',
      },
    });
    expect(canonicalHash(MIR4_NATIVE_DIRECT_RAW_SKILL_RECORDS)).toBe(
      MIR4_NATIVE_DIRECT_RAW_PROVENANCE.projections.rawSkillRecordsSha256,
    );
    expect(canonicalHash(MIR4_NATIVE_DIRECT_RAW_ATTACK_RECORDS)).toBe(
      MIR4_NATIVE_DIRECT_RAW_PROVENANCE.projections.rawAttackRecordsSha256,
    );
    expect(canonicalHash(MIR4_NATIVE_DIRECT_RAW_EVIDENCE)).toBe(
      MIR4_NATIVE_DIRECT_RAW_PROVENANCE.projections.combinedEvidenceSha256,
    );
  });

  it('pins 65 class/action ordered skills and 191 unique direct rows', () => {
    expect(MIR4_NATIVE_DIRECT_RAW_SKILL_RECORDS.map((raw) => raw.SkillId)).toEqual(SKILL_IDS);
    expect(MIR4_NATIVE_DIRECT_RAW_EVIDENCE).toHaveLength(65);
    expect(new Set(MIR4_NATIVE_DIRECT_RAW_SKILL_RECORDS.map((raw) => raw.SkillId)).size).toBe(65);
    expect(MIR4_NATIVE_DIRECT_RAW_ATTACK_RECORDS).toHaveLength(191);
    expect(new Set(MIR4_NATIVE_DIRECT_RAW_ATTACK_RECORDS.map((raw) => raw.AttackID)).size).toBe(
      191,
    );
    expect(MIR4_NATIVE_DIRECT_RAW_SKILL_RECORDS.map((raw) => raw.ClassId)).toEqual([
      ...Array(13).fill(1),
      ...Array(13).fill(2),
      ...Array(13).fill(3),
      ...Array(13).fill(4),
      ...Array(13).fill(5),
    ]);
  });

  it('retains all 103 SKILL keys and all 98 SKILL_ATTACK keys without extras', () => {
    expect(RAW_SKILL_KEYS).toHaveLength(103);
    expect(RAW_ATTACK_KEYS).toHaveLength(98);
    for (const entry of MIR4_NATIVE_DIRECT_RAW_EVIDENCE) {
      expect(Object.keys(entry.rawSkillRecord)).toEqual(RAW_SKILL_KEYS);
      for (const raw of entry.rawAttackRecords) {
        expect(Object.keys(raw)).toEqual(RAW_ATTACK_KEYS);
      }
    }
  });

  it('matches every raw AttackLink and NextAttackLink to the 65 typed action catalogs', () => {
    expect(MIR4_NATIVE_DIRECT_RAW_EVIDENCE).toHaveLength(
      MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.length,
    );

    for (const [index, rawEntry] of MIR4_NATIVE_DIRECT_RAW_EVIDENCE.entries()) {
      const action = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE[index];
      expect(rawEntry.rawSkillRecord.SkillId).toBe(action.skillId);
      expect(rawEntry.rawSkillRecord.AttackLink).toEqual(action.rows.map((row) => row.attackId));
      expect(rawEntry.rawAttackRecords.map((raw) => raw.AttackID)).toEqual(
        action.rows.map((row) => row.attackId),
      );
      expect(rawEntry.rawAttackRecords.map((raw) => raw.NextAttackLink)).toEqual(
        action.rows.map((row) => row.nextAttackId),
      );
      expect(rawEntry.rawAttackRecords.every((raw) => raw.SkillId === action.skillId)).toBe(true);
    }
  });

  it('projects every raw behavior-bearing field exactly into nativeBehavior', () => {
    for (const [index, rawEntry] of MIR4_NATIVE_DIRECT_RAW_EVIDENCE.entries()) {
      const action = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE[index];
      expect(action.nativeBehavior).toEqual(expectedSkillBehavior(rawEntry.rawSkillRecord));
      for (const [rowIndex, raw] of rawEntry.rawAttackRecords.entries()) {
        expect(action.rows[rowIndex].nativeBehavior).toEqual(expectedAttackBehavior(raw));
      }
    }
  });

  it('pins representative projectile, Totem, dead-only, and dual-channel raw rows', () => {
    const projectile = mir4NativeDirectRawEvidenceBySkillId(2101)?.rawAttackRecords[0];
    expect(projectile).toMatchObject({
      AttackID: 210101,
      BulletType: 1,
      BulletMoveType: 1,
      BulletSpeed: 4000,
      BulletSocketName: 'Hand_L',
    });

    const totem = mir4NativeDirectRawEvidenceBySkillId(4112)?.rawAttackRecords[0];
    expect(totem).toMatchObject({
      AttackID: 411201,
      SkillTotem: 1402,
      SkillTotemTarget: 1,
      SkillTotemTime: 1,
      SkillTotemCount: 1,
    });

    const deadOnly = mir4NativeDirectRawEvidenceBySkillId(3504)?.rawAttackRecords;
    expect(deadOnly?.filter((raw) => raw.TargetSubType === 'TARGET_SUBTYPE::DeadOnly')).toEqual([
      expect.objectContaining({ AttackID: 350403 }),
      expect.objectContaining({ AttackID: 350404 }),
    ]);

    const dual = mir4NativeDirectRawEvidenceBySkillId(5203)?.rawAttackRecords.find(
      (raw) => raw.AttackID === 520302,
    );
    expect(dual?.MulDamage).not.toBe(0);
    expect(dual?.MagicDamage).not.toBe(0);
  });

  it('deep-freezes records, arrays, vectors, projections, and provenance', () => {
    const entry = MIR4_NATIVE_DIRECT_RAW_EVIDENCE[0];
    const skill = entry.rawSkillRecord;
    const attack = entry.rawAttackRecords[0];
    for (const value of [
      MIR4_NATIVE_DIRECT_RAW_PROVENANCE,
      MIR4_NATIVE_DIRECT_RAW_PROVENANCE.sources,
      MIR4_NATIVE_DIRECT_RAW_PROVENANCE.projections,
      MIR4_NATIVE_DIRECT_RAW_EVIDENCE,
      MIR4_NATIVE_DIRECT_RAW_SKILL_RECORDS,
      MIR4_NATIVE_DIRECT_RAW_ATTACK_RECORDS,
      entry,
      skill,
      skill.NameImgId,
      skill.AttackLink,
      skill.Passive,
      skill.AutoLearnPassive,
      entry.rawAttackRecords,
      attack,
      attack.ImpactTime,
      attack.LocationOffset,
      attack.Buff,
      attack.BulletRotationOffset,
      attack.CCBuff,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Reflect.set(skill, 'UnexpectedSourceKey', 1)).toBe(false);
    expect(Reflect.set(attack, 'UnexpectedSourceKey', 1)).toBe(false);
    expect(() => (skill.AttackLink as number[]).push(999)).toThrow(TypeError);
    expect(() => (attack.Buff as number[]).push(999)).toThrow(TypeError);
  });
});
