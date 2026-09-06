import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE } from '../../src/sim/content/mir4/native_skill_action_evidence';
import {
  MIR4_NATIVE_DIRECT_SKILL_BUFF_IDS,
  MIR4_NATIVE_PASSIVE_SKILL_BUFF_IDS,
  MIR4_NATIVE_SKILL_BUFF_CONSUMER_EVIDENCE,
  MIR4_NATIVE_SKILL_BUFF_EVIDENCE,
  MIR4_NATIVE_SKILL_BUFF_GRAPH_TARGET_IDS,
  MIR4_NATIVE_SKILL_BUFF_OVERLAP_CALL_EVIDENCE,
  MIR4_NATIVE_SKILL_BUFF_PROVENANCE,
  MIR4_NATIVE_SKILL_BUFF_VALIDATION,
  mir4NativeSkillBuffEvidenceById,
  mir4NativeSkillBuffOverlapCallEvidenceById,
} from '../../src/sim/content/mir4/native_skill_buff_evidence';

const EXPECTED_DIRECT_IDS = [
  11011, 11012, 11031, 11032, 13011, 13012, 13021, 14011, 14040, 15011, 15012, 20012, 22021, 22042,
  24012, 24031, 31051, 33011, 35010, 35011, 35012, 35014, 35015, 35019, 36010, 40114, 40115, 41001,
  41010, 41071, 43041, 50109, 51011, 53011, 53012, 54011,
];
const EXPECTED_GRAPH_TARGET_IDS = [
  50010, 50103, 50105, 50106, 50108, 50402, 30205, 30208, 20010, 704001, 705001, 41011, 41012,
  41013, 50101, 50102, 50107, 50505, 50519, 10101, 50514,
];
const EXPECTED_PASSIVE_IDS = [40102];
const EXPECTED_RAW_KEYS = [
  'BuffId',
  'BuffName',
  'BuffExplain',
  'ShowDamageFont',
  'ShowDamageLog',
  'PetBuff_IconId',
  'PetId',
  'BuffUseType',
  'ApplyType',
  'BuffTarget',
  'ActEffect',
  'BuffEffect',
  'BuffEffectScale',
  'Icon',
  'Icon_Big',
  'BuffTime',
  'LevelUpBuffTime',
  'BuffType',
  'BuffIndexType_1',
  'BuffIndex_1',
  'BuffValue_1',
  'LevelUpBuffValue_1',
  'BuffValueEx_1',
  'BuffIndexType_2',
  'BuffIndex_2',
  'BuffValue_2',
  'LevelUpBuffValue_2',
  'BuffValueEx_2',
  'BuffIndexType_3',
  'BuffIndex_3',
  'BuffValue_3',
  'LevelUpBuffValue_3',
  'BuffValueEx_3',
  'BuffOverlap',
  'EffectSocket',
  'EffectSocket_Type',
  'EffectHeight',
  'BuffArmorType',
  'BuffProbability',
  'UpdateRule',
  'Emissive_Dcolor',
  'Fresnel_Exponenth',
  'Fresnel_BaseReflect',
  'BuffAttackID',
  'ExtinctionEffect',
  'ExtinctionEffectSocket',
  'OverLapCallGroupID',
  'KeepType_Die',
  'KeepType_StageOut',
  'KeepType_LogOut',
  'IsHideRemainTime',
  'detachBuffID',
];

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nestedValue of Object.values(value)) expectDeepFrozen(nestedValue);
}

describe('MIR4 native skill BUFF evidence', () => {
  it('pins the three sealed source hashes', () => {
    expect(MIR4_NATIVE_SKILL_BUFF_PROVENANCE).toEqual({
      sources: [
        {
          fileName: 'BUFF.json',
          sha256: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
        },
        {
          fileName: 'BUFF_OVERLAPCALL.json',
          sha256: 'a6d04273c9aadfe8cb0a9b8f6ccdef20e42aaabcaca1a4cde708b11a522cd624',
        },
        {
          fileName: 'BUFF_ATTACK.json',
          sha256: '1be86bf8af4ec777e1543aac1e4091602a8499a9f4cd121acbfe78e8633ab94e',
        },
      ],
      selection: {
        directActionReferenceCount: 36,
        passiveSkillReferenceCount: 1,
        graphTargetCount: 21,
        overlapCallRowCount: 3,
      },
    });
    expectDeepFrozen(MIR4_NATIVE_SKILL_BUFF_PROVENANCE);
  });

  it('resolves every nonzero direct action Buff reference exactly once', () => {
    const actionRows = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.flatMap((action) => action.rows);
    const actionReferences = actionRows.flatMap((row) =>
      row.nativeBehavior.buffIds.filter((buffId) => buffId !== 0),
    );
    const uniqueActionReferences = [...new Set(actionReferences)].sort(
      (left, right) => left - right,
    );

    expect(MIR4_NATIVE_DIRECT_SKILL_BUFF_IDS).toEqual(EXPECTED_DIRECT_IDS);
    expect(uniqueActionReferences).toEqual(
      [...EXPECTED_DIRECT_IDS].sort((left, right) => left - right),
    );
    expect(new Set(MIR4_NATIVE_DIRECT_SKILL_BUFF_IDS).size).toBe(36);
    expect(actionRows.filter((row) => row.nativeBehavior.buffIds.length > 0)).toHaveLength(43);
    expect(actionReferences).toHaveLength(56);
    for (const buffId of actionReferences) {
      expect(mir4NativeSkillBuffEvidenceById(buffId)?.role).toBe('direct-action-reference');
    }
  });

  it('materializes the passive reference and twenty-one disjoint graph targets without duplicates', () => {
    expect(MIR4_NATIVE_PASSIVE_SKILL_BUFF_IDS).toEqual(EXPECTED_PASSIVE_IDS);
    expect(MIR4_NATIVE_SKILL_BUFF_GRAPH_TARGET_IDS).toEqual(EXPECTED_GRAPH_TARGET_IDS);
    expect(MIR4_NATIVE_SKILL_BUFF_EVIDENCE).toHaveLength(58);
    expect(new Set(MIR4_NATIVE_SKILL_BUFF_EVIDENCE.map((entry) => entry.id)).size).toBe(58);
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) => entry.role === 'direct-action-reference'),
    ).toHaveLength(36);
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) => entry.role === 'passive-skill-reference'),
    ).toHaveLength(1);
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) => entry.role === 'graph-target'),
    ).toHaveLength(21);
    expect(mir4NativeSkillBuffEvidenceById(40102)?.role).toBe('passive-skill-reference');
    for (const buffId of EXPECTED_GRAPH_TARGET_IDS) {
      expect(MIR4_NATIVE_DIRECT_SKILL_BUFF_IDS).not.toContain(buffId);
      expect(mir4NativeSkillBuffEvidenceById(buffId)?.role).toBe('graph-target');
    }
    expect(mir4NativeSkillBuffEvidenceById(1810)).toBeNull();
    expect(mir4NativeSkillBuffEvidenceById(999999)).toBeNull();
  });

  it('pins every full selected BUFF row and its exact 52-field shape', () => {
    const rawRecords = MIR4_NATIVE_SKILL_BUFF_EVIDENCE.map((entry) => entry.rawRecord);
    expect(sha256(rawRecords)).toBe(
      '8bbf49001a0826037f4cfb704f371eb6548dfaa0215137d6ad42e97bf21d838e',
    );
    for (const entry of MIR4_NATIVE_SKILL_BUFF_EVIDENCE) {
      expect(entry.source).toBe('BUFF.json');
      expect(entry.id).toBe(entry.rawRecord.BuffId);
      expect(Object.keys(entry.rawRecord)).toEqual(EXPECTED_RAW_KEYS);
      expectDeepFrozen(entry);
    }
  });

  it('projects only the raw target, duration, update, overlap, and three value slots', () => {
    for (const entry of MIR4_NATIVE_SKILL_BUFF_EVIDENCE) {
      const raw = entry.rawRecord;
      expect(entry.projection).toEqual({
        application: {
          rawBuffUseType: raw.BuffUseType,
          rawApplyType: raw.ApplyType,
          rawBuffTarget: raw.BuffTarget,
          rawBuffType: raw.BuffType,
          rawProbability: raw.BuffProbability,
        },
        duration: {
          rawBaseSeconds: raw.BuffTime,
          rawLevelUpSeconds: raw.LevelUpBuffTime,
        },
        update: {
          rawUpdateRule: raw.UpdateRule,
          rawBuffAttackId: raw.BuffAttackID,
        },
        overlap: {
          rawBuffOverlap: raw.BuffOverlap,
          rawOverlapCallGroupId: raw.OverLapCallGroupID,
          rawDetachBuffIds: raw.detachBuffID,
        },
        valueSlots: [1, 2, 3].map((slot) => ({
          slot,
          rawIndexType: raw[`BuffIndexType_${slot}` as keyof typeof raw],
          rawIndex: raw[`BuffIndex_${slot}` as keyof typeof raw],
          rawValue: raw[`BuffValue_${slot}` as keyof typeof raw],
          rawLevelUpValue: raw[`LevelUpBuffValue_${slot}` as keyof typeof raw],
          rawValueEx: raw[`BuffValueEx_${slot}` as keyof typeof raw],
        })),
      });
    }
  });

  it('pins all raw detach references and the complete overlap-call subgraph without semantics', () => {
    const rawDetachReferences = MIR4_NATIVE_SKILL_BUFF_EVIDENCE.flatMap((entry) =>
      entry.rawRecord.detachBuffID
        .filter((buffId) => buffId !== 0)
        .map((buffId) => [entry.id, buffId]),
    );
    expect(rawDetachReferences).toEqual([
      [20012, 20010],
      [24012, 704001],
      [24012, 705001],
      [50108, 30205],
      [30205, 30208],
      [30208, 30205],
      [704001, 24012],
      [705001, 24012],
      [41012, 41011],
      [41013, 41011],
      [41013, 41012],
    ]);
    for (const [, referencedId] of rawDetachReferences) {
      expect(mir4NativeSkillBuffEvidenceById(referencedId)).not.toBeNull();
    }

    expect(
      sha256(MIR4_NATIVE_SKILL_BUFF_OVERLAP_CALL_EVIDENCE.map((entry) => entry.rawRecord)),
    ).toBe('02e269be98ca1407e923993eb44736702645d48bab64492fe4f48024020f0b5b');
    expect(MIR4_NATIVE_SKILL_BUFF_OVERLAP_CALL_EVIDENCE.map((entry) => entry.rawRecord)).toEqual([
      {
        OverLapCallID: 201,
        OverLapCallGroupID: 2,
        BuffOverlapCntMin: 3,
        BuffOverlapCntMax: 5,
        AttachBuffID: [41011],
        BuffOverlapLevel: 1,
      },
      {
        OverLapCallID: 202,
        OverLapCallGroupID: 2,
        BuffOverlapCntMin: 6,
        BuffOverlapCntMax: 8,
        AttachBuffID: [41012],
        BuffOverlapLevel: 2,
      },
      {
        OverLapCallID: 203,
        OverLapCallGroupID: 2,
        BuffOverlapCntMin: 9,
        BuffOverlapCntMax: 10,
        AttachBuffID: [41013],
        BuffOverlapLevel: 3,
      },
    ]);
    for (const entry of MIR4_NATIVE_SKILL_BUFF_OVERLAP_CALL_EVIDENCE) {
      expect(entry.execution).toEqual({
        status: 'blocked-unresolved',
        reason: 'overlap-call-consumer-not-located',
      });
      expect(mir4NativeSkillBuffOverlapCallEvidenceById(entry.id)).toBe(entry);
      for (const referencedId of entry.rawRecord.AttachBuffID) {
        expect(mir4NativeSkillBuffEvidenceById(referencedId)?.role).toBe('graph-target');
      }
      expectDeepFrozen(entry);
    }
    expect(mir4NativeSkillBuffOverlapCallEvidenceById(999999)).toBeNull();
  });

  it('pins the located consumer symbols while leaving every absent consumer unresolved', () => {
    expect(MIR4_NATIVE_SKILL_BUFF_CONSUMER_EVIDENCE.nativeIndexType1Writer).toMatchObject({
      status: 'proved',
      sourcePath:
        'F:/Dev/Mir4-Like/docs/topaz-parity/evidence/GameServer.calculated-high-slot-buff-writer-audit.md',
      symbols: [
        'FUN_14006F0D0',
        'FUN_14006F9D0',
        'FUN_14006FE60',
        'FUN_14006D740',
        'FUN_14006CFB0',
        'FUN_140073550',
      ],
    });
    expect(MIR4_NATIVE_SKILL_BUFF_CONSUMER_EVIDENCE.shippingIndexType3WireProjection).toEqual({
      status: 'proved',
      ruling: 'wire special-effect projection only; gameplay meaning unresolved',
      sourcePath: 'F:/Dev/Mir4-Like/src/Services/Mir4ServerHost/ShippingWorldSessionAdapter.cs',
      symbols: ['ShippingWorldSessionAdapter.AppendPlayerBuffPublications'],
    });
    expect(MIR4_NATIVE_SKILL_BUFF_CONSUMER_EVIDENCE.boundedShippingApplicationGate).toMatchObject({
      status: 'proved',
      sourcePath: 'F:/Dev/Mir4-Like/src/Services/Mir4ServerHost/ShippingTopazDamageCalculator.cs',
      symbols: [
        'ShippingTopazDamageCalculator.TryBuildBuffApplications',
        'ShippingTopazDamageCalculator.HasOnlyPlayerVectorIndependentEffects',
      ],
    });
    for (const key of [
      'nativeIndexType2',
      'nativeIndexType3Gameplay',
      'targetRuntime',
      'periodicity',
      'detach',
      'overlapCall',
    ] as const) {
      expect(MIR4_NATIVE_SKILL_BUFF_CONSUMER_EVIDENCE[key].status).toBe('consumer-not-located');
    }
    expectDeepFrozen(MIR4_NATIVE_SKILL_BUFF_CONSUMER_EVIDENCE);
  });

  it('keeps execution fail-closed even for rows admitted by the proved bounded gate', () => {
    const admittedByBoundedGate = MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter(
      (entry) => entry.execution.boundedShippingGate === 'passes-proved-bounded-shipping-gate',
    ).map((entry) => entry.id);
    expect(admittedByBoundedGate).toEqual([
      11011, 11031, 11032, 14040, 22021, 24031, 31051, 33011, 36010, 40114, 40115, 41010, 51011,
      53011, 53012,
    ]);

    for (const entry of MIR4_NATIVE_SKILL_BUFF_EVIDENCE) {
      expect(entry.execution.status).toBe('blocked-unresolved');
      expect(entry.execution.unresolved).toContain('target-runtime-consumer-not-located');
      expect(entry.execution.unresolved).toContain('target-apply-enum-semantics-unresolved');
      expect(entry.execution.unresolved).toContain('periodicity-consumer-not-proved');
    }
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) =>
        entry.execution.unresolved.includes('index-type-2-consumer-not-located'),
      ).map((entry) => entry.id),
    ).toEqual([14011, 20012, 35014, 35015, 35019, 20010, 50519]);
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) =>
        entry.execution.unresolved.includes('mixed-index-types'),
      ).map((entry) => entry.id),
    ).toEqual([20012, 24012, 40102, 50514]);
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) =>
        entry.execution.unresolved.includes('empty-effect-list'),
      ).map((entry) => entry.id),
    ).toEqual([41001]);
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) =>
        entry.execution.unresolved.includes('nonpositive-duration'),
      ).map((entry) => entry.id),
    ).toEqual([50402, 41011, 41012, 41013]);
  });

  it('pins validation counts and proves there are no selected BUFF_ATTACK links', () => {
    expect(MIR4_NATIVE_SKILL_BUFF_VALIDATION).toEqual({
      directReferenceCount: 36,
      passiveReferenceCount: 1,
      graphTargetCount: 21,
      selectedBuffCount: 58,
      rawDetachReferenceCount: 11,
      rawOverlapAttachReferenceCount: 3,
      selectedBuffAttackReferenceCount: 0,
      executionStatus: 'blocked-unresolved',
    });
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.filter((entry) => entry.rawRecord.UpdateRule !== 0).map(
        (entry) => [entry.id, entry.rawRecord.UpdateRule],
      ),
    ).toEqual([[50402, 1]]);
    expect(
      MIR4_NATIVE_SKILL_BUFF_EVIDENCE.every((entry) => entry.rawRecord.BuffAttackID === 0),
    ).toBe(true);
    expectDeepFrozen(MIR4_NATIVE_SKILL_BUFF_VALIDATION);
  });
});
