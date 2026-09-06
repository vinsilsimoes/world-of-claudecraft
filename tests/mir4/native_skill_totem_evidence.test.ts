import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE } from '../../src/sim/content/mir4/native_skill_action_evidence';
import type { Mir4NativeRawSkillAttackRecord } from '../../src/sim/content/mir4/native_skill_raw_records';
import {
  MIR4_NATIVE_TOTEM_ATTACK_ROWS,
  MIR4_NATIVE_TOTEM_EVIDENCE,
  MIR4_NATIVE_TOTEM_PROVENANCE,
  MIR4_NATIVE_TOTEM_RAW_ATTACK_RECORDS,
  mir4NativeTotemEvidenceById,
} from '../../src/sim/content/mir4/native_skill_totem_evidence';
import {
  compileMir4NativeTotemAttackChain,
  type Mir4NativeTotemBridgeEvidence,
} from '../../src/sim/content/mir4/native_skill_totem_types';

const TOTEM_IDS = [
  1001, 1004, 1008, 1009, 1010, 1011, 1012, 1013, 1401, 1402, 1403, 1404, 1405, 1406,
] as const;

const TOTEM_ATTACK_IDS = [
  230112, 230113, 230114, 230115, 230116, 330111, 330112, 330113, 330114, 220311, 220312, 220313,
  220314, 250111, 250112, 250113, 250114, 250115, 310411, 310412, 260211, 260212, 260213, 260214,
  350611, 350612, 240321, 240322, 240323, 240324, 240325, 410311, 410312, 410313, 411211, 410811,
  410812, 410813, 410814, 410511, 410512, 410513, 410514, 410411, 410412, 410413, 410414, 410711,
  410712, 410713, 410714, 410715, 410716,
] as const;

const TOTEM_RECORD_KEYS = [
  'TotemId',
  'ResourceID',
  'PhysicalAttack',
  'MagicAttack',
  'AccuracyPer',
  'CriticalPer',
  'CriticalOutcomePer',
  'AttackDelay',
  'SkillAttackID',
  'CombatPower',
  'Cleartime',
  'DetectRange',
  'AniSequence',
] as const;

const RAW_ATTACK_RECORD_KEYS = [
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

function mutableRawRecords(totemId: (typeof TOTEM_IDS)[number]): Mir4NativeRawSkillAttackRecord[] {
  const entry = mir4NativeTotemEvidenceById(totemId);
  if (entry === null) throw new Error(`Missing test Totem ${totemId}`);
  return structuredClone(entry.rawAttackRecords) as Mir4NativeRawSkillAttackRecord[];
}

describe('MIR4 native Totem evidence', () => {
  it('pins incorporated source and canonical projection hashes', () => {
    expect(MIR4_NATIVE_TOTEM_PROVENANCE).toEqual({
      sources: [
        {
          fileName: 'TOTEM.json',
          sha256: '082d57d209fd6eceb9f906af486775dc4b8b7d24f617b91e79631260aa3ad057',
        },
        {
          fileName: 'SKILL_ATTACK.json',
          sha256: 'a71fabdfff8883483566b622d2c909b946c015268b6da5a727459615106bba8c',
        },
      ],
      projections: {
        rawTotemRecordsSha256: '368ea1b97193528da8708e2e64aff7ab1a1a321b60dd9f42a978f1f1f5daec07',
        rawAttackRecordsSha256: '57b4f6cadbfc3df4e06e11518072ae241b87e8f4f7eeea48ec6f51f190242417',
        combinedEvidenceSha256: 'b01349166eea29c5f4132987382fca716b44753a8e2c8e52c84c40eae95bdfd9',
      },
      referencedSources: [{ fileName: 'BUFF.json', status: 'referenced-ids-only' }],
    });
    expect(canonicalHash(MIR4_NATIVE_TOTEM_EVIDENCE.map((entry) => entry.record))).toBe(
      MIR4_NATIVE_TOTEM_PROVENANCE.projections.rawTotemRecordsSha256,
    );
    expect(canonicalHash(MIR4_NATIVE_TOTEM_RAW_ATTACK_RECORDS)).toBe(
      MIR4_NATIVE_TOTEM_PROVENANCE.projections.rawAttackRecordsSha256,
    );
    expect(
      canonicalHash(
        MIR4_NATIVE_TOTEM_EVIDENCE.map(({ record, rawAttackRecords }) => ({
          record,
          rawAttackRecords,
        })),
      ),
    ).toBe(MIR4_NATIVE_TOTEM_PROVENANCE.projections.combinedEvidenceSha256);
  });

  it('pins the 14 source-order Totems, all 53 linked rows, and the 244-row union', () => {
    expect(MIR4_NATIVE_TOTEM_EVIDENCE.map((entry) => entry.record.TotemId)).toEqual(TOTEM_IDS);
    expect(MIR4_NATIVE_TOTEM_EVIDENCE.map((entry) => entry.rawAttackRecords.length)).toEqual([
      5, 4, 4, 5, 2, 4, 2, 5, 3, 1, 4, 4, 4, 6,
    ]);
    expect(MIR4_NATIVE_TOTEM_RAW_ATTACK_RECORDS.map((row) => row.AttackID)).toEqual(
      TOTEM_ATTACK_IDS,
    );
    expect(MIR4_NATIVE_TOTEM_ATTACK_ROWS).toHaveLength(53);

    const directIds = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.flatMap((action) =>
      action.rows.map((row) => row.attackId),
    );
    expect(directIds).toHaveLength(191);
    expect(new Set([...directIds, ...TOTEM_ATTACK_IDS]).size).toBe(244);
    expect(TOTEM_ATTACK_IDS.some((attackId) => directIds.includes(attackId))).toBe(false);
  });

  it('retains every raw TOTEM and SKILL_ATTACK key without extras', () => {
    for (const entry of MIR4_NATIVE_TOTEM_EVIDENCE) {
      expect(Object.keys(entry.record)).toEqual(TOTEM_RECORD_KEYS);
      expect(entry.rawAttackRecords.map((row) => row.AttackID)).toEqual(
        entry.attackRows.map((row) => row.attackId),
      );
      for (const raw of entry.rawAttackRecords) {
        expect(Object.keys(raw)).toEqual(RAW_ATTACK_RECORD_KEYS);
      }
    }
    expect(RAW_ATTACK_RECORD_KEYS).toHaveLength(98);
  });

  it('pins raw bridge identity and leaves unknown timing/range fields uninterpreted', () => {
    expect(
      MIR4_NATIVE_TOTEM_EVIDENCE.map(({ record, bridge }) => [
        record.TotemId,
        bridge.AttackID,
        bridge.SkillId,
        bridge.SkillTotemTarget,
        bridge.SkillTotemTime,
        bridge.SkillTotemCount,
      ]),
    ).toEqual([
      [1001, 230101, 2301, 0, 4, 1],
      [1004, 330101, 3301, 0, 6, 1],
      [1008, 220301, 2203, 0, 6, 1],
      [1009, 250101, 2501, 0, 6, 1],
      [1010, 310401, 3104, 0, 4, 1],
      [1011, 250201, 2502, 0, 6, 1],
      [1012, 350601, 3506, 0, 4, 1],
      [1013, 240302, 2403, 0, 6, 1],
      [1401, 410302, 4103, 0, 3, 1],
      [1402, 411201, 4112, 1, 1, 1],
      [1403, 410801, 4108, 0, 6, 1],
      [1404, 410501, 4105, 0, 3, 1],
      [1405, 410402, 4104, 0, 6, 1],
      [1406, 410701, 4107, 0, 6, 1],
    ]);

    const t1401 = mir4NativeTotemEvidenceById(1401);
    const t1402 = mir4NativeTotemEvidenceById(1402);
    expect(t1401?.bridge.SkillTotemTime).toBe(3);
    expect(t1401?.record.Cleartime).toBe(5);
    expect(t1402?.bridge.SkillTotemTime).toBe(1);
    expect(t1402?.record.Cleartime).toBe(5);
    expect(t1402?.record.DetectRange).toBe(3000);
    expect(t1402?.record.AttackDelay).toBe(6);
  });

  it('links every Totem bridge back to its separate direct player-action row', () => {
    const directRows = new Map(
      MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.flatMap((action) =>
        action.rows.map((row) => [row.attackId, { skillId: action.skillId, row }] as const),
      ),
    );

    for (const entry of MIR4_NATIVE_TOTEM_EVIDENCE) {
      const direct = directRows.get(entry.bridge.AttackID);
      expect(direct?.skillId).toBe(entry.bridge.SkillId);
      expect(direct?.row.nativeBehavior.totem).toEqual({
        id: entry.bridge.SkillTotem,
        target: entry.bridge.SkillTotemTarget,
        time: entry.bridge.SkillTotemTime,
        count: entry.bridge.SkillTotemCount,
      });
      expect(direct?.row.attackId).not.toBe(entry.record.SkillAttackID);
    }
  });

  it('pins representative multi-impact, single-row, and repeated-Buff graphs', () => {
    const t1008 = mir4NativeTotemEvidenceById(1008);
    expect(t1008?.rawAttackRecords.map((row) => row.ImpactTime)).toEqual([
      [0.455, 0.65],
      [1.05],
      [1.4, 1.8],
      [2.1],
    ]);
    expect(t1008?.attackRows.map((row) => row.impactOffsetsMs)).toEqual([
      [455, 650],
      [1050],
      [1400, 1800],
      [2100],
    ]);

    const t1402 = mir4NativeTotemEvidenceById(1402);
    expect(t1402?.record).toMatchObject({
      ResourceID: '50101',
      SkillAttackID: 411211,
      Cleartime: 5,
    });
    expect(t1402?.rawAttackRecords.map((row) => row.AttackID)).toEqual([411211]);

    const t1406 = mir4NativeTotemEvidenceById(1406);
    expect(t1406?.rawAttackRecords.map((row) => row.Buff)).toEqual([
      [41071],
      [41071],
      [41071],
      [41071],
      [41071],
      [41071],
    ]);
    expect(t1406?.attackRows.map((row) => row.nativeBehavior.buffIds)).toEqual([
      [41071],
      [41071],
      [41071],
      [41071],
      [41071],
      [41071],
    ]);
  });

  it('deep-freezes catalogs, raw arrays/vectors, projections, and provenance', () => {
    expect(Object.isFrozen(MIR4_NATIVE_TOTEM_PROVENANCE)).toBe(true);
    expect(Object.isFrozen(MIR4_NATIVE_TOTEM_PROVENANCE.sources)).toBe(true);
    expect(Object.isFrozen(MIR4_NATIVE_TOTEM_EVIDENCE)).toBe(true);
    expect(Object.isFrozen(MIR4_NATIVE_TOTEM_RAW_ATTACK_RECORDS)).toBe(true);
    expect(Object.isFrozen(MIR4_NATIVE_TOTEM_ATTACK_ROWS)).toBe(true);

    const entry = MIR4_NATIVE_TOTEM_EVIDENCE[0];
    const raw = entry.rawAttackRecords[0];
    const projected = entry.attackRows[0];
    for (const value of [
      entry,
      entry.record,
      entry.bridge,
      entry.rawAttackRecords,
      entry.attackRows,
      raw,
      raw.ImpactTime,
      raw.Buff,
      raw.CCBuff,
      raw.Emissive_Dcolor,
      raw.LocationOffset,
      raw.BulletRotationOffset,
      projected,
      projected.nativeBehavior,
      projected.nativeBehavior.buffIds,
      projected.nativeBehavior.physicalDamage,
      projected.nativeBehavior.magicDamage,
      projected.movement,
      projected.targetDistance,
      projected.impactOffsetsMs,
      projected.geometry,
      projected.geometry.nativeOffset,
      projected.damage,
      projected.reaction,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Reflect.set(raw, 'UnexpectedSourceKey', 1)).toBe(false);
    expect(() => (raw.Buff as number[]).push(999)).toThrow(TypeError);
  });
});

describe('compileMir4NativeTotemAttackChain', () => {
  const entry = MIR4_NATIVE_TOTEM_EVIDENCE[0];

  it('is pure and returns a cloned, deeply frozen linked order', () => {
    const input = mutableRawRecords(1001);
    const compiled = compileMir4NativeTotemAttackChain(entry.record, entry.bridge, input);
    expect(compiled.map((row) => row.AttackID)).toEqual([230112, 230113, 230114, 230115, 230116]);
    expect(compiled).not.toBe(input);
    expect(compiled[0]).not.toBe(input[0]);
    expect(Object.isFrozen(compiled)).toBe(true);
    expect(Object.isFrozen(compiled[0])).toBe(true);
    expect(Object.isFrozen(compiled[0].ImpactTime)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input[0])).toBe(false);
  });

  it('fails closed on a missing linked row', () => {
    const rows = mutableRawRecords(1001);
    rows.splice(1, 1);
    expect(() => compileMir4NativeTotemAttackChain(entry.record, entry.bridge, rows)).toThrow(
      'missing linked AttackID 230113',
    );
  });

  it('fails closed on a duplicate AttackID', () => {
    const rows = mutableRawRecords(1001);
    rows.push(structuredClone(rows[0]));
    expect(() => compileMir4NativeTotemAttackChain(entry.record, entry.bridge, rows)).toThrow(
      'duplicate AttackID 230112',
    );
  });

  it('fails closed on a cycle', () => {
    const rows = mutableRawRecords(1001);
    (rows.at(-1) as { NextAttackLink: number }).NextAttackLink = rows[0].AttackID;
    expect(() => compileMir4NativeTotemAttackChain(entry.record, entry.bridge, rows)).toThrow(
      'contains cycle at 230112',
    );
  });

  it('fails closed on a SkillId mismatch', () => {
    const rows = mutableRawRecords(1001);
    (rows[2] as { SkillId: number }).SkillId = 9999;
    expect(() => compileMir4NativeTotemAttackChain(entry.record, entry.bridge, rows)).toThrow(
      'SkillId mismatch: expected 2301, got 9999',
    );
  });

  it('fails closed on a bridge Totem mismatch', () => {
    const bridge = {
      ...structuredClone(entry.bridge),
      SkillTotem: 1004,
    } as Mir4NativeTotemBridgeEvidence;
    expect(() =>
      compileMir4NativeTotemAttackChain(entry.record, bridge, mutableRawRecords(1001)),
    ).toThrow('bridge mismatch');
  });
});
