import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_LANCER_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions_lancer';

const actionById = (skillId: number) => {
  const action = MIR4_NATIVE_LANCER_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === skillId,
  );
  if (!action) throw new Error(`Missing Lancer native skill action ${skillId}`);
  return action;
};

describe('MIR4 native Lancer skill actions', () => {
  it('pins all regular skills plus the ultimate with native headers and unlocks', () => {
    expect(
      MIR4_NATIVE_LANCER_SKILL_ACTIONS.map((action) => ({
        skillId: action.skillId,
        cooldownMs: action.cooldownMs,
        skillCostType: action.skillCostType,
        skillCost: action.skillCost,
        attackAnimationMs: action.attackAnimationMs,
        endCutAnimationMs: action.endCutAnimationMs,
        hitCount: action.hitCount,
        requiredClassLevel: action.requiredClassLevel,
        targeting: action.targeting,
        blockingCheck: action.blockingCheck,
        indicator: action.indicator,
      })),
    ).toEqual([
      {
        skillId: 5201,
        cooldownMs: 24000,
        skillCostType: 2,
        skillCost: 1500,
        attackAnimationMs: 1833,
        endCutAnimationMs: 1740,
        hitCount: 6,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 103,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 700,
          nativeWidth: 600,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5101,
        cooldownMs: 16000,
        skillCostType: 2,
        skillCost: 2000,
        attackAnimationMs: 1967,
        endCutAnimationMs: 1560,
        hitCount: 3,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 0,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 0,
          nativeWidth: 0,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5104,
        cooldownMs: 18000,
        skillCostType: 2,
        skillCost: 1800,
        attackAnimationMs: 1233,
        endCutAnimationMs: 1000,
        hitCount: 2,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 0,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 0,
          nativeWidth: 0,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5301,
        cooldownMs: 24000,
        skillCostType: 2,
        skillCost: 3300,
        attackAnimationMs: 1900,
        endCutAnimationMs: 1700,
        hitCount: 3,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 103,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 600,
          nativeWidth: 600,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5401,
        cooldownMs: 44000,
        skillCostType: 2,
        skillCost: 3400,
        attackAnimationMs: 1067,
        endCutAnimationMs: 980,
        hitCount: 6,
        requiredClassLevel: 5,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 0,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 0,
          nativeWidth: 0,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5102,
        cooldownMs: 29000,
        skillCostType: 2,
        skillCost: 4000,
        attackAnimationMs: 1667,
        endCutAnimationMs: 1600,
        hitCount: 3,
        requiredClassLevel: 8,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 0,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 0,
          nativeWidth: 0,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5103,
        cooldownMs: 25000,
        skillCostType: 2,
        skillCost: 2500,
        attackAnimationMs: 2000,
        endCutAnimationMs: 1800,
        hitCount: 6,
        requiredClassLevel: 16,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 102,
          angleDegrees: 360,
          nativeMin: 0,
          nativeMax: 600,
          nativeWidth: 0,
          nativeOffset: 400,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5303,
        cooldownMs: 38000,
        skillCostType: 2,
        skillCost: 4200,
        attackAnimationMs: 1760,
        endCutAnimationMs: 1600,
        hitCount: 4,
        requiredClassLevel: 24,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 102,
          angleDegrees: 360,
          nativeMin: 0,
          nativeMax: 500,
          nativeWidth: 0,
          nativeOffset: 450,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5403,
        cooldownMs: 45000,
        skillCostType: 2,
        skillCost: 3800,
        attackAnimationMs: 800,
        endCutAnimationMs: 720,
        hitCount: 5,
        requiredClassLevel: 32,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 103,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 500,
          nativeWidth: 600,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5205,
        cooldownMs: 37000,
        skillCostType: 2,
        skillCost: 4800,
        attackAnimationMs: 1440,
        endCutAnimationMs: 1400,
        hitCount: 1,
        requiredClassLevel: 40,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 103,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 850,
          nativeWidth: 400,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5304,
        cooldownMs: 63000,
        skillCostType: 2,
        skillCost: 2400,
        attackAnimationMs: 1260,
        endCutAnimationMs: 1100,
        hitCount: 0,
        requiredClassLevel: 48,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 0,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 0,
          nativeWidth: 0,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5202,
        cooldownMs: 25000,
        skillCostType: 2,
        skillCost: 4440,
        attackAnimationMs: 1200,
        endCutAnimationMs: 1080,
        hitCount: 2,
        requiredClassLevel: 56,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 0,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 0,
          nativeWidth: 0,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
      {
        skillId: 5203,
        cooldownMs: 10000,
        skillCostType: 2,
        skillCost: 7000,
        attackAnimationMs: 2405,
        endCutAnimationMs: 1910,
        hitCount: 1,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
        indicator: {
          type: 0,
          index: 3,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 1600,
          nativeWidth: 500,
          nativeOffset: 0,
          nativeHeight: 400,
        },
      },
    ]);
    expect(new Set(MIR4_NATIVE_LANCER_SKILL_ACTIONS.map((action) => action.skillId)).size).toBe(13);
  });

  it('pins every source AttackLink row, impact slot and per-row damage coefficient', () => {
    expect(
      Object.fromEntries(
        MIR4_NATIVE_LANCER_SKILL_ACTIONS.map((action) => [
          action.skillId,
          action.rows.map((row) => [
            row.attackId,
            [...row.impactOffsetsMs],
            row.damage.coefficient,
            row.damage.levelUpCoefficient,
          ]),
        ]),
      ),
    ).toEqual({
      5201: [
        [520101, [480, 690, 880], 4000, 60],
        [520102, [1000, 1150], 4000, 60],
        [520103, [1300], 4000, 80],
      ],
      5101: [
        [510101, [400], 13000, 260],
        [510102, [1120], 6000, 140],
      ],
      5104: [
        [510401, [400], 0, 0],
        [510402, [600], 16000, 300],
      ],
      5301: [
        [530101, [400], 9000, 180],
        [530102, [1040], 8000, 160],
        [530103, [1200], 8000, 160],
      ],
      5401: [
        [540101, [20], 1000, 20],
        [540102, [240], 1000, 30],
        [540103, [400], 1000, 30],
        [540104, [510], 2000, 40],
        [540105, [660], 2000, 40],
        [540106, [840], 2000, 40],
      ],
      5102: [
        [510201, [200], 0, 0],
        [510202, [400], 16000, 270],
        [510203, [790], 16000, 370],
        [510204, [890], 4000, 60],
      ],
      5103: [
        [510301, [300], 0, 0],
        [510302, [580], 4000, 60],
        [510303, [960], 4000, 60],
        [510304, [1240], 4000, 80],
      ],
      5303: [
        [530301, [20], 0, 0],
        [530302, [400, 550, 700], 18000, 350],
        [530303, [890], 6000, 150],
      ],
      5403: [
        [540301, [20], 3000, 70],
        [540302, [200], 0, 0],
        [540303, [300, 400], 3000, 70],
        [540304, [510], 4000, 80],
        [540305, [620], 4000, 80],
      ],
      5205: [
        [520501, [360], 0, 0],
        [520502, [380], 8000, 200],
        [520503, [400], 8000, 200],
      ],
      5304: [[530401, [950], 11000, 200]],
      5202: [
        [520201, [20], 0, 0],
        [520202, [600], 28000, 600],
      ],
      5203: [
        [520301, [20], 0, 0],
        [520302, [1320], 30000, 600],
      ],
    });
  });

  it('preserves the far 1500 to 2000 native row on skill 5205', () => {
    expect(actionById(5205).rows[2]).toMatchObject({
      attackId: 520503,
      targetDistance: { nativeMin: 0, nativeMax: 2000 },
      impactOffsetsMs: [400],
      geometry: {
        nativeDistanceMin: 1500,
        nativeDistanceMax: 2000,
        nativeWidth: 400,
        nativeHeight: 500,
        nativeOffset: { x: -50, y: 0, z: 0 },
      },
      damage: { type: 1, coefficient: 8000, levelUpCoefficient: 200, attribute: 0 },
    });
  });

  it('preserves the negative 5202 target displacement and raw crowd-control window', () => {
    expect(actionById(5202).rows[1]).toMatchObject({
      attackId: 520202,
      movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
      reaction: {
        kind: 'knock-down',
        stance: 'down-02',
        value: -1100,
        nativeHeight: 350,
        valueEx: 0.9,
        durationMs: 2100,
        probabilityPercent: 100,
        direction: 0,
      },
    });
  });

  it('pins the native 5203 ultimate core without claiming omitted runtime fields', () => {
    expect(actionById(5203)).toMatchObject({
      skillId: 5203,
      cooldownMs: 10_000,
      skillCostType: 2,
      skillCost: 7000,
      attackAnimationMs: 2405,
      endCutAnimationMs: 1910,
      hitCount: 1,
      requiredClassLevel: 1,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 3,
        angleDegrees: 0,
        nativeMin: 0,
        nativeMax: 1600,
        nativeWidth: 500,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      rows: [
        expect.objectContaining({
          attackId: 520301,
          impactOffsetsMs: [20],
          damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
          guideEffectId: 103,
        }),
        expect.objectContaining({
          attackId: 520302,
          impactStartMs: 1280,
          impactOffsetsMs: [1320],
          damage: { type: 3, coefficient: 30_000, levelUpCoefficient: 600, attribute: 0 },
          reaction: expect.objectContaining({
            kind: 'knock-down',
            stance: 'down-02',
            value: 400,
            nativeHeight: 100,
            valueEx: 0.9,
            durationMs: 2100,
          }),
        }),
      ],
    });
  });

  it('deeply freezes the catalogue and every represented nested row', () => {
    expect(Object.isFrozen(MIR4_NATIVE_LANCER_SKILL_ACTIONS)).toBe(true);
    for (const action of MIR4_NATIVE_LANCER_SKILL_ACTIONS) {
      expect(Object.isFrozen(action)).toBe(true);
      expect(Object.isFrozen(action.indicator)).toBe(true);
      expect(Object.isFrozen(action.presentation)).toBe(true);
      expect(Object.isFrozen(action.presentation.vfxAssetPaths)).toBe(true);
      expect(Object.isFrozen(action.presentation.guideAssetPaths)).toBe(true);
      expect(Object.isFrozen(action.presentation.soundAssetPaths)).toBe(true);
      expect(Object.isFrozen(action.presentation.cameraCurveAssetPaths)).toBe(true);
      expect(Object.isFrozen(action.presentation.cameraShakeAssetPaths)).toBe(true);
      expect(Object.isFrozen(action.rows)).toBe(true);
      for (const row of action.rows) {
        expect(Object.isFrozen(row)).toBe(true);
        expect(Object.isFrozen(row.movement)).toBe(true);
        expect(Object.isFrozen(row.targetDistance)).toBe(true);
        expect(Object.isFrozen(row.impactOffsetsMs)).toBe(true);
        expect(Object.isFrozen(row.geometry)).toBe(true);
        expect(Object.isFrozen(row.geometry.nativeOffset)).toBe(true);
        expect(Object.isFrozen(row.damage)).toBe(true);
        expect(Object.isFrozen(row.reaction)).toBe(true);
      }
    }
  });
});
