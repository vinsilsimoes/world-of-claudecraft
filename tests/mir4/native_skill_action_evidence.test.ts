import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE,
  mir4NativeDirectSkillActionEvidenceById,
} from '../../src/sim/content/mir4/native_skill_action_evidence';
import { MIR4_NATIVE_BEHAVIOR_PROVENANCE } from '../../src/sim/content/mir4/native_skill_action_types';
import { MIR4_NATIVE_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions';

const EXPECTED_SKILL_IDS = [
  1101, 1102, 1103, 1104, 1201, 1301, 1302, 1304, 1401, 1403, 1501, 1502, 1601, 2101, 2111, 2501,
  2301, 2503, 2203, 2303, 2201, 2502, 2103, 2204, 2202, 2403, 3506, 3101, 3301, 3104, 3503, 3103,
  3501, 3201, 3505, 3203, 3404, 3504, 3303, 4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109,
  4110, 4111, 4112, 4113, 5201, 5101, 5104, 5301, 5401, 5102, 5103, 5303, 5403, 5205, 5304, 5202,
  5203,
];

const EXPECTED_RUNTIME_SKILL_IDS = [
  1101, 1102, 1103, 1104, 1201, 1301, 1302, 1304, 1401, 1403, 1501, 1502, 1601, 2101, 2111, 2501,
  2301, 2503, 2203, 2303, 2201, 2502, 2103, 2204, 2202, 2403, 3506, 3101, 3301, 3104, 3503, 3103,
  3501, 3201, 3505, 3203, 3404, 3504, 3303, 4101, 4102, 4103, 4104, 4105, 4107, 4108, 4109, 4110,
  4111, 4113, 4106, 4112, 5201, 5101, 5104, 5301, 5401, 5102, 5103, 5303, 5403, 5205, 5304, 5202,
  5203,
];

function actionById(skillId: number) {
  const action = mir4NativeDirectSkillActionEvidenceById(skillId);
  if (!action) throw new Error(`Missing native action evidence ${skillId}`);
  return action;
}

function rowById(attackId: number) {
  const row = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.flatMap((action) => action.rows).find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row) throw new Error(`Missing native attack evidence ${attackId}`);
  return row;
}

describe('MIR4 direct skill action evidence', () => {
  it('covers all sixty skills and five ultimates exactly once', () => {
    expect(MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.map((action) => action.skillId)).toEqual(
      EXPECTED_SKILL_IDS,
    );
    expect(new Set(EXPECTED_SKILL_IDS).size).toBe(65);
    expect(
      new Set(MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.map((action) => action.skillId)).size,
    ).toBe(65);
    for (const skillId of EXPECTED_SKILL_IDS) {
      expect(mir4NativeDirectSkillActionEvidenceById(skillId)?.skillId).toBe(skillId);
    }
  });

  it('pins all 191 direct SKILL.AttackLink rows without duplicate attack ids', () => {
    const rows = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.flatMap((action) => action.rows);
    expect(rows).toHaveLength(191);
    expect(new Set(rows.map((row) => row.attackId)).size).toBe(191);
  });

  it('pins the two incorporated source hashes and keeps referenced graphs fail-closed', () => {
    expect(MIR4_NATIVE_BEHAVIOR_PROVENANCE).toEqual({
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
      referencedSources: [
        { fileName: 'TOTEM.json', status: 'referenced-ids-only' },
        { fileName: 'BUFF.json', status: 'referenced-ids-only' },
      ],
    });
    expect(Object.isFrozen(MIR4_NATIVE_BEHAVIOR_PROVENANCE)).toBe(true);
    expect(Object.isFrozen(MIR4_NATIVE_BEHAVIOR_PROVENANCE.sources)).toBe(true);
    expect(Object.isFrozen(MIR4_NATIVE_BEHAVIOR_PROVENANCE.referencedSources)).toBe(true);
  });

  it('requires immutable evidence on every action and direct row without changing enumeration', () => {
    for (const action of MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE) {
      expect(action.nativeBehavior.source).toBe('SKILL.json');
      expect(Object.isFrozen(action.nativeBehavior)).toBe(true);
      expect(Object.isFrozen(action.nativeBehavior.primaryDamage)).toBe(true);
      expect(Object.isFrozen(action.nativeBehavior.secondaryDamage)).toBe(true);
      expect(Object.isFrozen(action.nativeBehavior.abilities)).toBe(true);
      expect(action.nativeBehavior.abilities).toHaveLength(4);
      expect(Object.isFrozen(action.nativeBehavior.passiveIds)).toBe(true);
      expect(Object.isFrozen(action.nativeBehavior.smiteBuffIds)).toBe(true);
      expect(Object.isFrozen(action.nativeBehavior.autoLearnPassiveIds)).toBe(true);
      expect(Object.getOwnPropertyDescriptor(action, 'nativeBehavior')?.enumerable).toBe(false);

      for (const row of action.rows) {
        expect(row.nativeBehavior.source).toBe('SKILL_ATTACK.json');
        expect(Object.isFrozen(row.nativeBehavior)).toBe(true);
        expect(Object.isFrozen(row.nativeBehavior.buffIds)).toBe(true);
        expect(Object.isFrozen(row.nativeBehavior.ccBuffIds)).toBe(true);
        expect(Object.isFrozen(row.nativeBehavior.physicalDamage)).toBe(true);
        expect(Object.isFrozen(row.nativeBehavior.magicDamage)).toBe(true);
        expect(Object.getOwnPropertyDescriptor(row, 'nativeBehavior')?.enumerable).toBe(false);
        if (row.nativeBehavior.projectile) {
          expect(Object.isFrozen(row.nativeBehavior.projectile)).toBe(true);
          expect(Object.isFrozen(row.nativeBehavior.projectile.rotationOffset)).toBe(true);
        }
        if (row.nativeBehavior.totem) expect(Object.isFrozen(row.nativeBehavior.totem)).toBe(true);
      }
    }
  });

  it('pins the complete behavior projection hash', () => {
    const projection = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE.map((action) => ({
      skillId: action.skillId,
      nativeBehavior: action.nativeBehavior,
      rows: action.rows.map((row) => ({
        attackId: row.attackId,
        nativeBehavior: row.nativeBehavior,
      })),
    }));
    expect(createHash('sha256').update(JSON.stringify(projection)).digest('hex')).toBe(
      'abe837031fca887253cbf61be36bb7aa6d261353c38f581ee5a8132c4bebda9a',
    );
  });

  it('pins native behavior edge counts without interpreting numeric enums', () => {
    const actions = MIR4_NATIVE_DIRECT_SKILL_ACTION_EVIDENCE;
    const rows = actions.flatMap((action) => action.rows);
    expect(rows.filter((row) => row.nativeBehavior.attackUseType === 1)).toHaveLength(45);
    expect(rows.filter((row) => row.nativeBehavior.projectile !== null)).toHaveLength(9);
    expect(rows.filter((row) => row.nativeBehavior.totem !== null)).toHaveLength(14);
    expect(rows.filter((row) => row.nativeBehavior.buffIds.length > 0)).toHaveLength(43);
    expect(rows.filter((row) => row.nativeBehavior.superArmor !== 0)).toHaveLength(68);
    expect(rows.filter((row) => row.nativeBehavior.superIgnore !== 0)).toHaveLength(16);
    expect(rows.filter((row) => row.nativeBehavior.actType !== 0)).toHaveLength(10);
    expect(rows.filter((row) => row.nativeBehavior.ccUserCheck !== 0)).toHaveLength(11);
    expect(
      rows.filter(
        (row) =>
          row.nativeBehavior.physicalDamage.coefficient !== 0 &&
          row.nativeBehavior.magicDamage.coefficient !== 0,
      ),
    ).toHaveLength(34);
    expect(actions.filter((action) => action.nativeBehavior.secondaryCostType !== 0)).toHaveLength(
      5,
    );
    expect(actions.filter((action) => action.nativeBehavior.useControlTime !== 0)).toHaveLength(11);
    expect(actions.filter((action) => action.nativeBehavior.stateConditionUse)).toHaveLength(3);
  });

  it('preserves representative projectile, Totem, Buff, passive and dual-channel rows', () => {
    expect(rowById(410401).nativeBehavior.projectile).toEqual({
      bulletType: 1,
      moveType: 3,
      count: 1,
      speed: 1200,
      lifetime: 0.7,
      socketName: 'Hand_L',
      launchGapDelay: 0,
      effectId: 2040069,
      effectScale: 1,
      curveData:
        "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve02.MissileCurve02",
      speedData: '0',
      rotationOffset: { x: 0, y: 0, z: 0 },
      angleSpeed: 0,
      curveTime: 0.85,
      nativeHeight: 250,
    });
    expect(rowById(411201).nativeBehavior.totem).toEqual({
      id: 1402,
      target: 1,
      time: 1,
      count: 1,
    });
    expect(rowById(130101).nativeBehavior.buffIds).toEqual([11032, 13011, 13012]);
    expect(actionById(2101).nativeBehavior).toMatchObject({
      smiteBuffIds: [30010],
      autoLearnPassiveIds: [103001],
    });
    expect(actionById(2101).nativeBehavior.passiveIds).toContain(103001);
    expect(rowById(520302).nativeBehavior).toMatchObject({
      damageType: 3,
      physicalDamage: { coefficient: 30000, levelUpCoefficient: 600 },
      magicDamage: { coefficient: 40000, levelUpCoefficient: 800 },
    });
  });

  it('preserves the two dead-only Greater Heal rows', () => {
    const greaterHeal = mir4NativeDirectSkillActionEvidenceById(3504);
    expect(
      greaterHeal?.rows
        .filter((row) => row.targetSubtype === 'dead-only')
        .map((row) => [row.attackId, row.targetType]),
    ).toEqual([
      [350403, 3],
      [350404, 3],
    ]);
    expect(greaterHeal?.rows.slice(2).map((row) => row.nativeBehavior.rawTargetSubtype)).toEqual([
      'TARGET_SUBTYPE::DeadOnly',
      'TARGET_SUBTYPE::DeadOnly',
    ]);
  });

  it('does not silently expose the incomplete five-class evidence to the live scheduler', () => {
    expect(MIR4_NATIVE_SKILL_ACTIONS.map((action) => action.skillId)).toEqual(
      EXPECTED_RUNTIME_SKILL_IDS,
    );
  });
});
