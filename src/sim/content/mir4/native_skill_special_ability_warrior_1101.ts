import {
  buildMir4NativeSkillSpecialAbilityCatalog,
  freezeMir4NativeSkillSpecialAbilityValue,
  type Mir4NativeRawSkillPassiveRecord,
  type Mir4NativeRawSkillSpecialAbilityRecord,
  type Mir4NativeSkillSpecialAbilitySourceSeal,
} from './native_skill_special_ability_types';

/**
 * Sealed files for the bounded Warrior 1101 graph. SKILL_ATTACK and BUFF are
 * fingerprinted only because raw fields point at their IDs; their rows are not
 * materialized here.
 */
export const MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_PROVENANCE =
  freezeMir4NativeSkillSpecialAbilityValue({
    sources: [
      {
        fileName: 'SKILL_SPECIAL_ABILITY.json',
        sha256: '9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db',
        scope: 'materialized-records',
      },
      {
        fileName: 'SKILL_PASSIVE.json',
        sha256: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
        scope: 'materialized-records',
      },
      {
        fileName: 'SKILL_ATTACK.json',
        sha256: 'a71fabdfff8883483566b622d2c909b946c015268b6da5a727459615106bba8c',
        scope: 'referenced-ids-only',
      },
      {
        fileName: 'BUFF.json',
        sha256: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
        scope: 'referenced-ids-only',
      },
    ] satisfies readonly Mir4NativeSkillSpecialAbilitySourceSeal[],
    selection: {
      skillId: 1101,
      specialAbilityRowCount: 4,
      passiveRowCount: 19,
      passiveReferenceCount: 20,
      referencedSkillAttackCount: 4,
      referencedBuffCount: 19,
    },
  });

type Warrior1101SpecialAbilityVariant = Pick<
  Mir4NativeRawSkillSpecialAbilityRecord,
  'ID' | 'SkillMinLv' | 'SkillMaxLv' | 'SkillOnlyPassive'
>;

const WARRIOR_1101_SPECIAL_ABILITY_BASE = freezeMir4NativeSkillSpecialAbilityValue({
  ID: 0,
  SkillId: 1101,
  SkillMinLv: 0,
  SkillMaxLv: 0,
  TriggerSkillAttackId: 110101,
  Passive: [0],
  PassivePartyBuffID: [0],
  PassivePartyBuffLv: [0],
  PartyPassive: [0],
  SkillOnlyPassive: [0],
} satisfies Mir4NativeRawSkillSpecialAbilityRecord);

function warrior1101SpecialAbilityRecord(
  variant: Warrior1101SpecialAbilityVariant,
): Mir4NativeRawSkillSpecialAbilityRecord {
  return { ...WARRIOR_1101_SPECIAL_ABILITY_BASE, ...variant };
}

const RAW_WARRIOR_1101_SPECIAL_ABILITY_RECORDS = [
  warrior1101SpecialAbilityRecord({
    ID: 37,
    SkillMinLv: 1,
    SkillMaxLv: 4,
    SkillOnlyPassive: [600201],
  }),
  warrior1101SpecialAbilityRecord({
    ID: 38,
    SkillMinLv: 5,
    SkillMaxLv: 7,
    SkillOnlyPassive: [600202, 611011, 611013, 611019],
  }),
  warrior1101SpecialAbilityRecord({
    ID: 39,
    SkillMinLv: 8,
    SkillMaxLv: 9,
    SkillOnlyPassive: [600203, 611021, 611023, 611024, 611025, 611029],
  }),
  warrior1101SpecialAbilityRecord({
    ID: 40,
    SkillMinLv: 10,
    SkillMaxLv: 10,
    SkillOnlyPassive: [600203, 611031, 611033, 611034, 611035, 611036, 611037, 611038, 611039],
  }),
] satisfies readonly Mir4NativeRawSkillSpecialAbilityRecord[];

type Warrior1101PassiveVariant = Pick<
  Mir4NativeRawSkillPassiveRecord,
  | 'PassiveId'
  | 'Class'
  | 'PassiveMaxGrade'
  | 'PassiveMaxLv'
  | 'PassiveType'
  | 'TargetType'
  | 'CastingCondition'
  | 'ConditionValue01'
  | 'BuffTargetType'
  | 'SkillPassiveLevel'
  | 'BuffLink'
>;

const WARRIOR_1101_PASSIVE_BASE = freezeMir4NativeSkillSpecialAbilityValue({
  PassiveId: 0,
  PassiveMainType: 5,
  PassiveName: 0,
  PassiveExplain: 0,
  ItemOptionGrade: 0,
  PassiveIcon: 0,
  PassiveTranceExplain: 0,
  LearnType: 1,
  ShowUI: 0,
  Class: 0,
  PassiveGroupID: 0,
  PassiveMaxGrade: 0,
  PassiveMaxLv: 0,
  ReqClassLevel: 0,
  ReqPassivePoint: 0,
  ReqPassivePointLevelUp: 0,
  ReqPassiveGroupLevel: 0,
  ReqPassiveGroupLevelUp: 0,
  NeedItem01Id: 0,
  NeedItem01Count: 0,
  NeedCost01ID: 0,
  NeedCost01Count: 0,
  NeedLevelUpCost01: 0,
  PassiveType: 0,
  TargetType: 0,
  CastingCondition: 0,
  ConditionValue01: 0,
  ConditionValue02: 0,
  ConditionPer: 100,
  LVConditionPer: 0,
  CoolTime: 0,
  LVCoolTime: 0,
  BuffTargetType: 0,
  SkillPassiveLevel: 0,
  BuffLink: 0,
  BuffLink1: 0,
  SpecialAbilityType: 0,
  SpecialAbilityValue01: 0,
  SpecialAbilityValue02: 0,
  AbilityType_1: 0,
  AbilityValue_1: 0,
  LevelUpAbilityValue_1: 0,
  AbilityValueEx_1: 0,
  AbilityType_2: 0,
  AbilityValue_2: 0,
  LevelUpAbilityValue_2: 0,
  AbilityValueEx_2: 0,
  IsSmite: false,
  UIDescValue: 100,
  UIDescLevelUpValue: 0,
  UIDescValueEx: 0,
  UIDescLevelUpValueEx: 0,
  UIDescAbilityTime: 0,
  UIDescLevelUpTime: 0,
  UIDescBuffValue: 0,
  UIDescLevelUpBuffValue: 0,
  UIDescConditonPer: 0,
} satisfies Mir4NativeRawSkillPassiveRecord);

function warrior1101PassiveRecord(
  variant: Warrior1101PassiveVariant,
): Mir4NativeRawSkillPassiveRecord {
  return { ...WARRIOR_1101_PASSIVE_BASE, ...variant };
}

const RAW_WARRIOR_1101_PASSIVE_RECORDS = [
  warrior1101PassiveRecord({
    PassiveId: 600201,
    Class: 0,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 1,
    TargetType: 1,
    CastingCondition: 11,
    ConditionValue01: 0,
    BuffTargetType: 1,
    SkillPassiveLevel: 1,
    BuffLink: 10020,
  }),
  warrior1101PassiveRecord({
    PassiveId: 600202,
    Class: 0,
    PassiveMaxGrade: 4,
    PassiveMaxLv: 4,
    PassiveType: 1,
    TargetType: 1,
    CastingCondition: 11,
    ConditionValue01: 0,
    BuffTargetType: 1,
    SkillPassiveLevel: 4,
    BuffLink: 10020,
  }),
  warrior1101PassiveRecord({
    PassiveId: 600203,
    Class: 0,
    PassiveMaxGrade: 6,
    PassiveMaxLv: 6,
    PassiveType: 1,
    TargetType: 1,
    CastingCondition: 11,
    ConditionValue01: 0,
    BuffTargetType: 1,
    SkillPassiveLevel: 6,
    BuffLink: 10020,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611011,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10124,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611013,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10126,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611019,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10133,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611021,
    Class: 1,
    PassiveMaxGrade: 2,
    PassiveMaxLv: 2,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10105,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611023,
    Class: 1,
    PassiveMaxGrade: 2,
    PassiveMaxLv: 2,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10107,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611024,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10108,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611025,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10109,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611029,
    Class: 1,
    PassiveMaxGrade: 2,
    PassiveMaxLv: 2,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 2,
    BuffLink: 10133,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611031,
    Class: 1,
    PassiveMaxGrade: 2,
    PassiveMaxLv: 2,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 2,
    BuffLink: 10105,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611033,
    Class: 1,
    PassiveMaxGrade: 2,
    PassiveMaxLv: 2,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 2,
    BuffLink: 10107,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611034,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 2,
    BuffLink: 10108,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611035,
    Class: 1,
    PassiveMaxGrade: 2,
    PassiveMaxLv: 2,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 2,
    BuffLink: 10109,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611036,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 1,
    TargetType: 2,
    CastingCondition: 37,
    ConditionValue01: 3,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10110,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611037,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 1,
    TargetType: 2,
    CastingCondition: 37,
    ConditionValue01: 3,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10111,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611038,
    Class: 1,
    PassiveMaxGrade: 1,
    PassiveMaxLv: 1,
    PassiveType: 1,
    TargetType: 2,
    CastingCondition: 37,
    ConditionValue01: 3,
    BuffTargetType: 2,
    SkillPassiveLevel: 1,
    BuffLink: 10112,
  }),
  warrior1101PassiveRecord({
    PassiveId: 611039,
    Class: 1,
    PassiveMaxGrade: 3,
    PassiveMaxLv: 3,
    PassiveType: 4,
    TargetType: 2,
    CastingCondition: 131,
    ConditionValue01: 0,
    BuffTargetType: 2,
    SkillPassiveLevel: 3,
    BuffLink: 10133,
  }),
] satisfies readonly Mir4NativeRawSkillPassiveRecord[];

export const MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG =
  buildMir4NativeSkillSpecialAbilityCatalog({
    skillId: 1101,
    specialAbilityRecords: RAW_WARRIOR_1101_SPECIAL_ABILITY_RECORDS,
    passiveRecords: RAW_WARRIOR_1101_PASSIVE_RECORDS,
  });

const SPECIAL_ABILITY_RECORD_BY_ID = new Map(
  MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.specialAbilityRecords.map(
    (record) => [record.ID, record] as const,
  ),
);
const PASSIVE_RECORD_BY_ID = new Map(
  MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveRecords.map(
    (record) => [record.PassiveId, record] as const,
  ),
);

export const MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_VALIDATION =
  freezeMir4NativeSkillSpecialAbilityValue({
    skillId: MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.skillId,
    specialAbilityRowCount:
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.specialAbilityRecords.length,
    passiveRowCount: MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveRecords.length,
    passiveReferenceCount:
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveEdges.length,
    uniquePassiveReferenceCount: new Set(
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveEdges.map(
        (edge) => edge.targetRecordId,
      ),
    ).size,
    referencedSkillAttackCount:
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.referencedIdEdges.filter(
        (edge) => edge.targetFile === 'SKILL_ATTACK.json',
      ).length,
    referencedBuffCount:
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.referencedIdEdges.filter(
        (edge) => edge.targetFile === 'BUFF.json',
      ).length,
    executionStatus: MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.execution.status,
  });

export function mir4NativeWarrior1101SpecialAbilityRecordById(
  specialAbilityId: number,
): Mir4NativeRawSkillSpecialAbilityRecord | null {
  return SPECIAL_ABILITY_RECORD_BY_ID.get(specialAbilityId) ?? null;
}

export function mir4NativeWarrior1101PassiveRecordById(
  passiveId: number,
): Mir4NativeRawSkillPassiveRecord | null {
  return PASSIVE_RECORD_BY_ID.get(passiveId) ?? null;
}
