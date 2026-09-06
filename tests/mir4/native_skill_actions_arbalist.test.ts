import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_ARBALIST_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions_arbalist';

const actionById = (skillId: number) => {
  const action = MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === skillId,
  );
  if (!action) throw new Error(`Missing Arbalist native skill action ${skillId}`);
  return action;
};

describe('MIR4 native Arbalist skill actions', () => {
  it('pins every Arbalist skill id, native header and unlock exactly once', () => {
    expect(
      MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.map((action) => ({
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
        skillId: 4101,
        cooldownMs: 12_000,
        skillCostType: 2,
        skillCost: 1600,
        attackAnimationMs: 1500,
        endCutAnimationMs: 1350,
        hitCount: 5,
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
          nativeHeight: 500,
        },
      },
      {
        skillId: 4102,
        cooldownMs: 22_000,
        skillCostType: 2,
        skillCost: 2500,
        attackAnimationMs: 1467,
        endCutAnimationMs: 1320,
        hitCount: 5,
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
          nativeHeight: 500,
        },
      },
      {
        skillId: 4103,
        cooldownMs: 26_000,
        skillCostType: 2,
        skillCost: 2100,
        attackAnimationMs: 1100,
        endCutAnimationMs: 880,
        hitCount: 5,
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
          nativeHeight: 800,
        },
      },
      {
        skillId: 4104,
        cooldownMs: 40_000,
        skillCostType: 2,
        skillCost: 4800,
        attackAnimationMs: 1267,
        endCutAnimationMs: 1140,
        hitCount: 5,
        requiredClassLevel: 40,
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
          nativeHeight: 800,
        },
      },
      {
        skillId: 4105,
        cooldownMs: 33_000,
        skillCostType: 2,
        skillCost: 2500,
        attackAnimationMs: 1000,
        endCutAnimationMs: 900,
        hitCount: 5,
        requiredClassLevel: 24,
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
          nativeHeight: 800,
        },
      },
      {
        skillId: 4106,
        cooldownMs: 20_000,
        skillCostType: 2,
        skillCost: 2600,
        attackAnimationMs: 1000,
        endCutAnimationMs: 900,
        hitCount: 5,
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
        skillId: 4107,
        cooldownMs: 35_000,
        skillCostType: 2,
        skillCost: 4000,
        attackAnimationMs: 1000,
        endCutAnimationMs: 900,
        hitCount: 5,
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
          nativeHeight: 800,
        },
      },
      {
        skillId: 4108,
        cooldownMs: 20_000,
        skillCostType: 2,
        skillCost: 2800,
        attackAnimationMs: 1133,
        endCutAnimationMs: 1020,
        hitCount: 5,
        requiredClassLevel: 8,
        targeting: true,
        blockingCheck: 0,
        indicator: {
          type: 0,
          index: 0,
          angleDegrees: 0,
          nativeMin: 0,
          nativeMax: 0,
          nativeWidth: 0,
          nativeOffset: 0,
          nativeHeight: 800,
        },
      },
      {
        skillId: 4109,
        cooldownMs: 28_000,
        skillCostType: 2,
        skillCost: 2160,
        attackAnimationMs: 1000,
        endCutAnimationMs: 900,
        hitCount: 5,
        requiredClassLevel: 32,
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
        skillId: 4110,
        cooldownMs: 38_000,
        skillCostType: 2,
        skillCost: 4000,
        attackAnimationMs: 1900,
        endCutAnimationMs: 1710,
        hitCount: 5,
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
        skillId: 4111,
        cooldownMs: 30_000,
        skillCostType: 2,
        skillCost: 2000,
        attackAnimationMs: 1000,
        endCutAnimationMs: 850,
        hitCount: 5,
        requiredClassLevel: 16,
        targeting: false,
        blockingCheck: 0,
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
        skillId: 4112,
        cooldownMs: 60_000,
        skillCostType: 2,
        skillCost: 5500,
        attackAnimationMs: 600,
        endCutAnimationMs: 560,
        hitCount: 5,
        requiredClassLevel: 56,
        targeting: false,
        blockingCheck: 0,
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
        skillId: 4113,
        cooldownMs: 10_000,
        skillCostType: 2,
        skillCost: 7000,
        attackAnimationMs: 2933,
        endCutAnimationMs: 2560,
        hitCount: 5,
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
    ]);

    const ids = MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.map((action) => action.skillId);
    expect(new Set(ids).size).toBe(13);
  });

  it('preserves every AttackLink row, impact slot and per-row coefficient in source order', () => {
    expect(
      Object.fromEntries(
        MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.map((action) => [
          action.skillId,
          action.rows.map((row) => [
            row.attackId,
            [...row.impactOffsetsMs],
            row.damage.coefficient,
          ]),
        ]),
      ),
    ).toEqual({
      4101: [
        [410101, [113, 213], 3300],
        [410102, [313, 413], 3300],
        [410103, [519, 619], 3300],
        [410104, [719, 819], 3300],
        [410105, [913, 1013], 4400],
        [410106, [1116, 1216], 4400],
      ],
      4102: [
        [410201, [20], 4000],
        [410202, [400], 5000],
        [410203, [600], 5000],
        [410204, [800], 5000],
        [410205, [1000], 5000],
      ],
      4103: [
        [410301, [400], 0],
        [410302, [600], 0],
        [410303, [670], 0],
      ],
      4104: [
        [410401, [220], 0],
        [410402, [390], 0],
        [410403, [750], 5500],
      ],
      4105: [
        [410501, [560], 0],
        [410502, [900], 4000],
      ],
      4106: [
        [410601, [20], 0],
        [410602, [450], 17_000],
      ],
      4107: [
        [410701, [450], 0],
        [410702, [790], 19_000],
      ],
      4108: [
        [410801, [100], 0],
        [410802, [900], 6600],
      ],
      4109: [
        [410901, [380], 0],
        [410902, [480], 11_000],
        [410903, [520], 11_000],
      ],
      4110: [
        [411000, [20], 0],
        [411001, [1000], 0],
        [411002, [1250], 42_000],
      ],
      4111: [[411101, [564], 0]],
      4112: [
        [411201, [20], 0],
        [411202, [80], 0],
      ],
      4113: [
        [411301, [300], 0],
        [411302, [539], 13_000],
        [411303, [913], 13_000],
        [411304, [1283], 13_000],
        [411305, [1644], 13_000],
        [411306, [2010], 13_000],
      ],
    });
  });

  it('pins player rows whose native source also links a separately omitted SkillTotem', () => {
    expect(
      [410302, 410402, 410501, 410701, 410801, 411201].map((attackId) =>
        MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.flatMap((action) => action.rows).find(
          (row) => row.attackId === attackId,
        ),
      ),
    ).toEqual([
      {
        attackId: 410302,
        mainAttack: 2,
        nextAttackId: 410303,
        impactStartMs: 400,
        movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
        viewTarget: 2,
        targetDistance: { nativeMin: 0, nativeMax: 1200 },
        targetType: 2,
        authorialTargetValue: 1,
        targetSubtype: 'alive-only',
        impactType: 2,
        impactOffsetsMs: [600],
        geometry: {
          angleDegrees: 360,
          nativeDistanceMin: 0,
          nativeDistanceMax: 400,
          nativeWidth: 0,
          nativeHeight: 400,
          nativeOffset: { x: 700, y: 0, z: 0 },
          rotationDegrees: 0,
        },
        damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
        reaction: {
          kind: 'none',
          stance: 'none',
          value: 0,
          nativeHeight: 0,
          valueEx: 0,
          durationMs: 0,
          probabilityPercent: 0,
          direction: 0,
        },
        guideEffectId: 0,
      },
      {
        attackId: 410402,
        mainAttack: 2,
        nextAttackId: 410403,
        impactStartMs: 220,
        movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
        viewTarget: 0,
        targetDistance: { nativeMin: 0, nativeMax: 1200 },
        targetType: 1,
        authorialTargetValue: 1,
        targetSubtype: 'alive-only',
        impactType: 0,
        impactOffsetsMs: [390],
        geometry: {
          angleDegrees: 0,
          nativeDistanceMin: 0,
          nativeDistanceMax: 0,
          nativeWidth: 0,
          nativeHeight: 400,
          nativeOffset: { x: 0, y: 0, z: 0 },
          rotationDegrees: 0,
        },
        damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
        reaction: {
          kind: 'none',
          stance: 'none',
          value: 0,
          nativeHeight: 0,
          valueEx: 0,
          durationMs: 0,
          probabilityPercent: 0,
          direction: 0,
        },
        guideEffectId: 0,
      },
      {
        attackId: 410501,
        mainAttack: 1,
        nextAttackId: 410502,
        impactStartMs: 0,
        movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
        viewTarget: 0,
        targetDistance: { nativeMin: 0, nativeMax: 1200 },
        targetType: 1,
        authorialTargetValue: 1,
        targetSubtype: 'alive-only',
        impactType: 1,
        impactOffsetsMs: [560],
        geometry: {
          angleDegrees: 360,
          nativeDistanceMin: 0,
          nativeDistanceMax: 500,
          nativeWidth: 0,
          nativeHeight: 800,
          nativeOffset: { x: -300, y: 0, z: 0 },
          rotationDegrees: 0,
        },
        damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
        reaction: {
          kind: 'hit',
          stance: 'hit-01',
          value: 0,
          nativeHeight: 0,
          valueEx: 0,
          durationMs: 300,
          probabilityPercent: 0,
          direction: 0,
        },
        guideEffectId: 0,
      },
      {
        attackId: 410701,
        mainAttack: 1,
        nextAttackId: 410702,
        impactStartMs: 0,
        movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
        viewTarget: 0,
        targetDistance: { nativeMin: 0, nativeMax: 1200 },
        targetType: 1,
        authorialTargetValue: 1,
        targetSubtype: 'alive-only',
        impactType: 0,
        impactOffsetsMs: [450],
        geometry: {
          angleDegrees: 0,
          nativeDistanceMin: 0,
          nativeDistanceMax: 0,
          nativeWidth: 0,
          nativeHeight: 800,
          nativeOffset: { x: 0, y: 0, z: 0 },
          rotationDegrees: 0,
        },
        damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
        reaction: {
          kind: 'none',
          stance: 'none',
          value: 0,
          nativeHeight: 0,
          valueEx: 0,
          durationMs: 0,
          probabilityPercent: 0,
          direction: 0,
        },
        guideEffectId: 0,
      },
      {
        attackId: 410801,
        mainAttack: 1,
        nextAttackId: 410802,
        impactStartMs: 0,
        movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
        viewTarget: 0,
        targetDistance: { nativeMin: 0, nativeMax: 1200 },
        targetType: 1,
        authorialTargetValue: 1,
        targetSubtype: 'alive-only',
        impactType: 1,
        impactOffsetsMs: [100],
        geometry: {
          angleDegrees: 360,
          nativeDistanceMin: 0,
          nativeDistanceMax: 700,
          nativeWidth: 0,
          nativeHeight: 300,
          nativeOffset: { x: 0, y: 0, z: 0 },
          rotationDegrees: 0,
        },
        damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
        reaction: {
          kind: 'hit',
          stance: 'hit-01',
          value: 0,
          nativeHeight: 0,
          valueEx: 0,
          durationMs: 200,
          probabilityPercent: 10,
          direction: 0,
        },
        guideEffectId: 0,
      },
      {
        attackId: 411201,
        mainAttack: 1,
        nextAttackId: 411202,
        impactStartMs: 0,
        movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
        viewTarget: 2,
        targetDistance: { nativeMin: 0, nativeMax: 1200 },
        targetType: 2,
        authorialTargetValue: 1,
        targetSubtype: 'alive-only',
        impactType: 2,
        impactOffsetsMs: [20],
        geometry: {
          angleDegrees: 360,
          nativeDistanceMin: 0,
          nativeDistanceMax: 500,
          nativeWidth: 0,
          nativeHeight: 500,
          nativeOffset: { x: 0, y: 0, z: 0 },
          rotationDegrees: 0,
        },
        damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
        reaction: {
          kind: 'none',
          stance: 'none',
          value: 0,
          nativeHeight: 0,
          valueEx: 0,
          durationMs: 0,
          probabilityPercent: 0,
          direction: 0,
        },
        guideEffectId: 0,
      },
    ]);
  });

  it('pins high-risk contact totals, movement signs and source targeting', () => {
    const rapidFire = actionById(4101);
    expect(rapidFire.rows).toHaveLength(6);
    expect(rapidFire.rows.flatMap((row) => row.impactOffsetsMs)).toHaveLength(12);
    expect(rapidFire.rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(22_000);

    expect(actionById(4106).rows.map((row) => row.movement)).toEqual([
      { kind: 'target', nativeRange: 30, delayMs: 0, durationMs: 250 },
      { kind: 'direct', nativeRange: -800, delayMs: 100, durationMs: 500 },
    ]);
    expect(actionById(4112).rows[1]?.movement).toEqual({
      kind: 'direct',
      nativeRange: 1000,
      delayMs: 60,
      durationMs: 500,
    });

    expect(actionById(4111).rows.every((row) => row.damage.coefficient === 0)).toBe(true);

    const ultimate = actionById(4113);
    const damageRows = ultimate.rows.filter((row) => row.damage.coefficient > 0);
    expect(ultimate.targeting).toBe(true);
    expect(damageRows).toHaveLength(5);
    expect(damageRows.every((row) => row.movement.kind === 'direct')).toBe(true);
    expect(damageRows.every((row) => row.movement.nativeRange === -100)).toBe(true);
    expect(damageRows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(65_000);
  });

  it('deeply freezes the catalogue and all represented nested evidence', () => {
    expect(Object.isFrozen(MIR4_NATIVE_ARBALIST_SKILL_ACTIONS)).toBe(true);
    for (const action of MIR4_NATIVE_ARBALIST_SKILL_ACTIONS) {
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
