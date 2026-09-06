import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildMir4NativeSkillSpecialAbilityCatalog,
  type Mir4NativeRawSkillSpecialAbilityRecord,
} from '../../src/sim/content/mir4/native_skill_special_ability_types';
import {
  MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG,
  MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_PROVENANCE,
  MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_VALIDATION,
  mir4NativeWarrior1101PassiveRecordById,
  mir4NativeWarrior1101SpecialAbilityRecordById,
} from '../../src/sim/content/mir4/native_skill_special_ability_warrior_1101';

const EXPECTED_SPECIAL_ABILITY_RAW_KEYS = [
  'ID',
  'SkillId',
  'SkillMinLv',
  'SkillMaxLv',
  'TriggerSkillAttackId',
  'Passive',
  'PassivePartyBuffID',
  'PassivePartyBuffLv',
  'PartyPassive',
  'SkillOnlyPassive',
];

const EXPECTED_PASSIVE_RAW_KEYS = [
  'PassiveId',
  'PassiveMainType',
  'PassiveName',
  'PassiveExplain',
  'ItemOptionGrade',
  'PassiveIcon',
  'PassiveTranceExplain',
  'LearnType',
  'ShowUI',
  'Class',
  'PassiveGroupID',
  'PassiveMaxGrade',
  'PassiveMaxLv',
  'ReqClassLevel',
  'ReqPassivePoint',
  'ReqPassivePointLevelUp',
  'ReqPassiveGroupLevel',
  'ReqPassiveGroupLevelUp',
  'NeedItem01Id',
  'NeedItem01Count',
  'NeedCost01ID',
  'NeedCost01Count',
  'NeedLevelUpCost01',
  'PassiveType',
  'TargetType',
  'CastingCondition',
  'ConditionValue01',
  'ConditionValue02',
  'ConditionPer',
  'LVConditionPer',
  'CoolTime',
  'LVCoolTime',
  'BuffTargetType',
  'SkillPassiveLevel',
  'BuffLink',
  'BuffLink1',
  'SpecialAbilityType',
  'SpecialAbilityValue01',
  'SpecialAbilityValue02',
  'AbilityType_1',
  'AbilityValue_1',
  'LevelUpAbilityValue_1',
  'AbilityValueEx_1',
  'AbilityType_2',
  'AbilityValue_2',
  'LevelUpAbilityValue_2',
  'AbilityValueEx_2',
  'IsSmite',
  'UIDescValue',
  'UIDescLevelUpValue',
  'UIDescValueEx',
  'UIDescLevelUpValueEx',
  'UIDescAbilityTime',
  'UIDescLevelUpTime',
  'UIDescBuffValue',
  'UIDescLevelUpBuffValue',
  'UIDescConditonPer',
];

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nestedValue of Object.values(value)) expectDeepFrozen(nestedValue);
}

describe('MIR4 Warrior 1101 native special ability evidence', () => {
  it('pins materialized and referenced source files by exact SHA-256', () => {
    expect(MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_PROVENANCE).toEqual({
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
      ],
      selection: {
        skillId: 1101,
        specialAbilityRowCount: 4,
        passiveRowCount: 19,
        passiveReferenceCount: 20,
        referencedSkillAttackCount: 4,
        referencedBuffCount: 19,
      },
    });
    expectDeepFrozen(MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_PROVENANCE);
  });

  it('preserves all four source-ordered special ability rows and exact key order', () => {
    const records = MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.specialAbilityRecords;
    expect(records).toEqual([
      {
        ID: 37,
        SkillId: 1101,
        SkillMinLv: 1,
        SkillMaxLv: 4,
        TriggerSkillAttackId: 110101,
        Passive: [0],
        PassivePartyBuffID: [0],
        PassivePartyBuffLv: [0],
        PartyPassive: [0],
        SkillOnlyPassive: [600201],
      },
      {
        ID: 38,
        SkillId: 1101,
        SkillMinLv: 5,
        SkillMaxLv: 7,
        TriggerSkillAttackId: 110101,
        Passive: [0],
        PassivePartyBuffID: [0],
        PassivePartyBuffLv: [0],
        PartyPassive: [0],
        SkillOnlyPassive: [600202, 611011, 611013, 611019],
      },
      {
        ID: 39,
        SkillId: 1101,
        SkillMinLv: 8,
        SkillMaxLv: 9,
        TriggerSkillAttackId: 110101,
        Passive: [0],
        PassivePartyBuffID: [0],
        PassivePartyBuffLv: [0],
        PartyPassive: [0],
        SkillOnlyPassive: [600203, 611021, 611023, 611024, 611025, 611029],
      },
      {
        ID: 40,
        SkillId: 1101,
        SkillMinLv: 10,
        SkillMaxLv: 10,
        TriggerSkillAttackId: 110101,
        Passive: [0],
        PassivePartyBuffID: [0],
        PassivePartyBuffLv: [0],
        PartyPassive: [0],
        SkillOnlyPassive: [600203, 611031, 611033, 611034, 611035, 611036, 611037, 611038, 611039],
      },
    ]);
    expect(sha256(records)).toBe(
      '3e87001618cd9c080a986833ef16ee0d78c6b30edda8d3c427db62acf3249651',
    );
    for (const record of records) {
      expect(Object.keys(record)).toEqual(EXPECTED_SPECIAL_ABILITY_RAW_KEYS);
    }
  });

  it('preserves every complete selected passive row in source order', () => {
    const records = MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveRecords;
    expect(records.map((record) => record.PassiveId)).toEqual([
      600201, 600202, 600203, 611011, 611013, 611019, 611021, 611023, 611024, 611025, 611029,
      611031, 611033, 611034, 611035, 611036, 611037, 611038, 611039,
    ]);
    expect(sha256(records)).toBe(
      'e67f43376e8e05bf1cd94141764ce800d3387b2fb86a638d3955785bb55509bf',
    );
    for (const record of records) {
      expect(Object.keys(record)).toEqual(EXPECTED_PASSIVE_RAW_KEYS);
    }

    expect(mir4NativeWarrior1101PassiveRecordById(600201)).toMatchObject({
      PassiveMainType: 5,
      PassiveType: 1,
      TargetType: 1,
      CastingCondition: 11,
      SkillPassiveLevel: 1,
      BuffLink: 10020,
    });
    expect(mir4NativeWarrior1101PassiveRecordById(611036)).toMatchObject({
      PassiveMainType: 5,
      PassiveType: 1,
      TargetType: 2,
      CastingCondition: 37,
      ConditionValue01: 3,
      BuffLink: 10110,
    });
  });

  it('pins every source-indexed special ability to passive edge', () => {
    expect(
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveEdges.map((edge) => [
        edge.sourceRecordId,
        edge.sourceField,
        edge.sourceIndex,
        edge.targetRecordId,
      ]),
    ).toEqual([
      [37, 'SkillOnlyPassive', 0, 600201],
      [38, 'SkillOnlyPassive', 0, 600202],
      [38, 'SkillOnlyPassive', 1, 611011],
      [38, 'SkillOnlyPassive', 2, 611013],
      [38, 'SkillOnlyPassive', 3, 611019],
      [39, 'SkillOnlyPassive', 0, 600203],
      [39, 'SkillOnlyPassive', 1, 611021],
      [39, 'SkillOnlyPassive', 2, 611023],
      [39, 'SkillOnlyPassive', 3, 611024],
      [39, 'SkillOnlyPassive', 4, 611025],
      [39, 'SkillOnlyPassive', 5, 611029],
      [40, 'SkillOnlyPassive', 0, 600203],
      [40, 'SkillOnlyPassive', 1, 611031],
      [40, 'SkillOnlyPassive', 2, 611033],
      [40, 'SkillOnlyPassive', 3, 611034],
      [40, 'SkillOnlyPassive', 4, 611035],
      [40, 'SkillOnlyPassive', 5, 611036],
      [40, 'SkillOnlyPassive', 6, 611037],
      [40, 'SkillOnlyPassive', 7, 611038],
      [40, 'SkillOnlyPassive', 8, 611039],
    ]);
    for (const edge of MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveEdges) {
      expect(edge.sourceFile).toBe('SKILL_SPECIAL_ABILITY.json');
      expect(edge.targetFile).toBe('SKILL_PASSIVE.json');
      expect(mir4NativeWarrior1101PassiveRecordById(edge.targetRecordId)).not.toBeNull();
    }
  });

  it('retains attack and BuffLink IDs only as sealed external references', () => {
    const edges = MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.referencedIdEdges;
    expect(
      edges
        .filter((edge) => edge.targetFile === 'SKILL_ATTACK.json')
        .map((edge) => [edge.sourceRecordId, edge.sourceField, edge.targetRecordId]),
    ).toEqual([
      [37, 'TriggerSkillAttackId', 110101],
      [38, 'TriggerSkillAttackId', 110101],
      [39, 'TriggerSkillAttackId', 110101],
      [40, 'TriggerSkillAttackId', 110101],
    ]);
    expect(
      edges
        .filter((edge) => edge.targetFile === 'BUFF.json')
        .map((edge) => [edge.sourceRecordId, edge.sourceField, edge.targetRecordId]),
    ).toEqual([
      [600201, 'BuffLink', 10020],
      [600202, 'BuffLink', 10020],
      [600203, 'BuffLink', 10020],
      [611011, 'BuffLink', 10124],
      [611013, 'BuffLink', 10126],
      [611019, 'BuffLink', 10133],
      [611021, 'BuffLink', 10105],
      [611023, 'BuffLink', 10107],
      [611024, 'BuffLink', 10108],
      [611025, 'BuffLink', 10109],
      [611029, 'BuffLink', 10133],
      [611031, 'BuffLink', 10105],
      [611033, 'BuffLink', 10107],
      [611034, 'BuffLink', 10108],
      [611035, 'BuffLink', 10109],
      [611036, 'BuffLink', 10110],
      [611037, 'BuffLink', 10111],
      [611038, 'BuffLink', 10112],
      [611039, 'BuffLink', 10133],
    ]);
    expect(edges.every((edge) => edge.status === 'referenced-id-only')).toBe(true);
  });

  it('keeps all source evidence deeply frozen and lookup-bounded', () => {
    expectDeepFrozen(MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG);
    expectDeepFrozen(MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_VALIDATION);
    expect(mir4NativeWarrior1101SpecialAbilityRecordById(37)).toBe(
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.specialAbilityRecords[0],
    );
    expect(mir4NativeWarrior1101PassiveRecordById(611039)).toBe(
      MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.passiveRecords.at(-1),
    );
    expect(mir4NativeWarrior1101SpecialAbilityRecordById(36)).toBeNull();
    expect(mir4NativeWarrior1101SpecialAbilityRecordById(41)).toBeNull();
    expect(mir4NativeWarrior1101PassiveRecordById(999999)).toBeNull();
  });

  it('fails closed without assigning passive enum or effect semantics', () => {
    expect(MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG.execution).toEqual({
      status: 'blocked-unresolved',
      unresolved: [
        'special-ability-runtime-consumer-not-proved',
        'passive-runtime-consumer-not-proved',
        'passive-enum-semantics-unresolved',
        'referenced-skill-attack-records-not-materialized',
        'referenced-buff-records-not-materialized',
      ],
    });
    expect(Object.keys(MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG)).toEqual([
      'skillId',
      'specialAbilityRecords',
      'passiveRecords',
      'passiveEdges',
      'referencedIdEdges',
      'execution',
    ]);
    expect(MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_VALIDATION).toEqual({
      skillId: 1101,
      specialAbilityRowCount: 4,
      passiveRowCount: 19,
      passiveReferenceCount: 20,
      uniquePassiveReferenceCount: 19,
      referencedSkillAttackCount: 4,
      referencedBuffCount: 19,
      executionStatus: 'blocked-unresolved',
    });
  });

  it('rejects missing, extra, cross-skill, duplicate, and reordered source evidence', () => {
    const catalog = MIR4_NATIVE_SKILL_SPECIAL_ABILITY_WARRIOR_1101_CATALOG;

    expect(() =>
      buildMir4NativeSkillSpecialAbilityCatalog({
        skillId: 1101,
        specialAbilityRecords: catalog.specialAbilityRecords,
        passiveRecords: catalog.passiveRecords.slice(1),
      }),
    ).toThrow('passive reference 600201 has no selected source record');

    expect(() =>
      buildMir4NativeSkillSpecialAbilityCatalog({
        skillId: 1101,
        specialAbilityRecords: catalog.specialAbilityRecords,
        passiveRecords: [
          ...catalog.passiveRecords,
          { ...catalog.passiveRecords[0], PassiveId: 999999 },
        ],
      }),
    ).toThrow('selected passive 999999 is outside the bounded graph');

    expect(() =>
      buildMir4NativeSkillSpecialAbilityCatalog({
        skillId: 1101,
        specialAbilityRecords: [
          { ...catalog.specialAbilityRecords[0], SkillId: 1102 },
          ...catalog.specialAbilityRecords.slice(1),
        ],
        passiveRecords: catalog.passiveRecords,
      }),
    ).toThrow('special ability 37 belongs to skill 1102, not 1101');

    expect(() =>
      buildMir4NativeSkillSpecialAbilityCatalog({
        skillId: 1101,
        specialAbilityRecords: [...catalog.specialAbilityRecords, catalog.specialAbilityRecords[0]],
        passiveRecords: catalog.passiveRecords,
      }),
    ).toThrow('special ability rows contains duplicate IDs');

    const { ID, ...withoutId } = catalog.specialAbilityRecords[0];
    const reordered = { ...withoutId, ID } as Mir4NativeRawSkillSpecialAbilityRecord;
    expect(() =>
      buildMir4NativeSkillSpecialAbilityCatalog({
        skillId: 1101,
        specialAbilityRecords: [reordered, ...catalog.specialAbilityRecords.slice(1)],
        passiveRecords: catalog.passiveRecords,
      }),
    ).toThrow('special ability 37 does not preserve the exact source key order');
  });
});
