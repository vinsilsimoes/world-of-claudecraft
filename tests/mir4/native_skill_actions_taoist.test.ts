import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions_taoist';

const actionById = (skillId: number) => {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === skillId,
  );
  if (!action) throw new Error(`Missing Taoist native skill action ${skillId}`);
  return action;
};

describe('MIR4 native Taoist skill actions', () => {
  it('pins all regular skills plus the ultimate with native headers', () => {
    expect(
      MIR4_NATIVE_TAOIST_SKILL_ACTIONS.map((action) => ({
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
      })),
    ).toEqual([
      {
        skillId: 3506,
        cooldownMs: 21000,
        skillCostType: 2,
        skillCost: 2600,
        attackAnimationMs: 2533,
        endCutAnimationMs: 2280,
        hitCount: 5,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
      },
      {
        skillId: 3101,
        cooldownMs: 16000,
        skillCostType: 2,
        skillCost: 1600,
        attackAnimationMs: 1833,
        endCutAnimationMs: 1600,
        hitCount: 7,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
      },
      {
        skillId: 3301,
        cooldownMs: 24000,
        skillCostType: 2,
        skillCost: 2400,
        attackAnimationMs: 1533,
        endCutAnimationMs: 1300,
        hitCount: 9,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
      },
      {
        skillId: 3104,
        cooldownMs: 20000,
        skillCostType: 2,
        skillCost: 3840,
        attackAnimationMs: 1267,
        endCutAnimationMs: 1150,
        hitCount: 4,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 0,
      },
      {
        skillId: 3503,
        cooldownMs: 20000,
        skillCostType: 2,
        skillCost: 5200,
        attackAnimationMs: 1400,
        endCutAnimationMs: 1350,
        hitCount: 0,
        requiredClassLevel: 5,
        targeting: false,
        blockingCheck: 0,
      },
      {
        skillId: 3103,
        cooldownMs: 20000,
        skillCostType: 2,
        skillCost: 1500,
        attackAnimationMs: 1767,
        endCutAnimationMs: 1650,
        hitCount: 6,
        requiredClassLevel: 8,
        targeting: true,
        blockingCheck: 1,
      },
      {
        skillId: 3501,
        cooldownMs: 46000,
        skillCostType: 2,
        skillCost: 2640,
        attackAnimationMs: 1000,
        endCutAnimationMs: 950,
        hitCount: 1,
        requiredClassLevel: 16,
        targeting: false,
        blockingCheck: 0,
      },
      {
        skillId: 3201,
        cooldownMs: 35000,
        skillCostType: 2,
        skillCost: 3000,
        attackAnimationMs: 2067,
        endCutAnimationMs: 1850,
        hitCount: 6,
        requiredClassLevel: 24,
        targeting: true,
        blockingCheck: 1,
      },
      {
        skillId: 3505,
        cooldownMs: 28000,
        skillCostType: 2,
        skillCost: 4000,
        attackAnimationMs: 1533,
        endCutAnimationMs: 1350,
        hitCount: 1,
        requiredClassLevel: 32,
        targeting: true,
        blockingCheck: 1,
      },
      {
        skillId: 3203,
        cooldownMs: 31000,
        skillCostType: 2,
        skillCost: 2800,
        attackAnimationMs: 1700,
        endCutAnimationMs: 1550,
        hitCount: 9,
        requiredClassLevel: 40,
        targeting: true,
        blockingCheck: 1,
      },
      {
        skillId: 3404,
        cooldownMs: 46000,
        skillCostType: 2,
        skillCost: 3000,
        attackAnimationMs: 1000,
        endCutAnimationMs: 950,
        hitCount: 0,
        requiredClassLevel: 48,
        targeting: false,
        blockingCheck: 0,
      },
      {
        skillId: 3504,
        cooldownMs: 46000,
        skillCostType: 2,
        skillCost: 5880,
        attackAnimationMs: 1640,
        endCutAnimationMs: 1500,
        hitCount: 0,
        requiredClassLevel: 56,
        targeting: false,
        blockingCheck: 0,
      },
      {
        skillId: 3303,
        cooldownMs: 10000,
        skillCostType: 2,
        skillCost: 7000,
        attackAnimationMs: 4000,
        endCutAnimationMs: 3100,
        hitCount: 9,
        requiredClassLevel: 1,
        targeting: true,
        blockingCheck: 1,
      },
    ]);
    expect(new Set(MIR4_NATIVE_TAOIST_SKILL_ACTIONS.map((action) => action.skillId)).size).toBe(13);
  });

  it('pins every direct AttackLink row, impact slot and represented primary coefficient', () => {
    expect(
      Object.fromEntries(
        MIR4_NATIVE_TAOIST_SKILL_ACTIONS.map((action) => [
          action.skillId,
          action.rows.map((row) => [
            row.attackId,
            [...row.impactOffsetsMs],
            row.damage.type,
            row.damage.coefficient,
            row.damage.levelUpCoefficient,
          ]),
        ]),
      ),
    ).toEqual({
      3506: [
        [350601, [200], 0, 0, 0],
        [350602, [732], 2, 6000, 100],
      ],
      3101: [
        [310101, [380], 1, 5000, 100],
        [310102, [550, 750], 1, 5000, 100],
        [310103, [950, 1150], 1, 5000, 100],
        [310104, [1350, 1550], 1, 5000, 100],
      ],
      3301: [
        [330101, [567], 0, 0, 0],
        [330102, [900], 2, 3500, 60],
      ],
      3104: [
        [310401, [100], 0, 0, 0],
        [310402, [1000], 1, 6000, 130],
      ],
      3503: [
        [350301, [20], 0, 0, 0],
        [350302, [590], 0, 0, 0],
        [350303, [840], 0, 0, 0],
      ],
      3103: [
        [310301, [500], 0, 0, 0],
        [310302, [720, 850, 980], 1, 10000, 200],
        [310303, [1120, 1250], 1, 10000, 200],
      ],
      3501: [
        [350101, [20], 0, 0, 0],
        [350102, [400], 2, 6000, 100],
        [350103, [550], 0, 0, 0],
      ],
      3201: [
        [320101, [20], 3, 4000, 80],
        [320102, [490], 3, 4000, 80],
        [320103, [690], 3, 4000, 80],
        [320104, [850], 3, 4000, 80],
        [320105, [1000], 3, 4000, 90],
        [320106, [1340], 3, 4000, 90],
        [320107, [1440], 0, 0, 0],
      ],
      3505: [
        [350501, [830], 0, 0, 0],
        [350502, [1080], 2, 24000, 500],
      ],
      3203: [
        [320301, [350, 500, 650], 3, 9000, 200],
        [320302, [800, 950, 1100], 3, 10000, 200],
        [320303, [1250, 1450, 1650], 3, 10000, 200],
      ],
      3404: [[340401, [564], 0, 0, 0]],
      3504: [
        [350401, [20], 0, 0, 0],
        [350402, [740], 0, 0, 0],
        [350403, [900], 0, 0, 0],
        [350404, [1050], 0, 0, 0],
      ],
      3303: [
        [330301, [20], 0, 0, 0],
        [330302, [400], 0, 0, 0],
        [330303, [1060, 1260], 2, 4000, 80],
        [330304, [1400], 0, 0, 0],
        [330305, [1660, 1860], 2, 4000, 80],
        [330306, [2200], 2, 4000, 80],
        [330307, [2400], 0, 0, 0],
        [330309, [2600], 2, 5000, 80],
        [330310, [2800], 2, 5000, 80],
      ],
    });
  });

  it('preserves 3101 as four primary rows, seven impacts and 20000 total coefficient', () => {
    const action = actionById(3101);
    expect(action.rows).toHaveLength(4);
    expect(action.rows.flatMap((row) => row.impactOffsetsMs)).toHaveLength(7);
    expect(action.rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(20_000);
  });

  it('keeps only the direct 3104 hybrid primary component while its Totem stays omitted', () => {
    const action = actionById(3104);
    expect(action.rows.map((row) => row.attackId)).toEqual([310401, 310402]);
    expect(action.rows.map((row) => row.damage)).toEqual([
      { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
      { type: 1, coefficient: 6000, levelUpCoefficient: 130, attribute: 0 },
    ]);
    expect(action.rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(6000);
  });

  it('preserves all friendly and self 3503 rows as zero primary damage', () => {
    const action = actionById(3503);
    expect(action.rows.map((row) => row.targetType)).toEqual([2, 4, 3]);
    expect(action.rows.every((row) => row.damage.coefficient === 0)).toBe(true);
    expect(action.rows.every((row) => row.movement.kind === 'none')).toBe(true);
  });

  it('preserves the seven 3201 primary rows while separate MagicDamage remains omitted', () => {
    const action = actionById(3201);
    expect(
      action.rows.map((row) => [row.attackId, row.damage.type, row.damage.coefficient]),
    ).toEqual([
      [320101, 3, 4000],
      [320102, 3, 4000],
      [320103, 3, 4000],
      [320104, 3, 4000],
      [320105, 3, 4000],
      [320106, 3, 4000],
      [320107, 0, 0],
    ]);
    expect(action.rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(24_000);
    expect(action.rows.every((row) => !Object.hasOwn(row.damage, 'magicDamage'))).toBe(true);
  });

  it('retains DeadOnly source rows without false alive-only normalization', () => {
    const deadOnlyRows = actionById(3504).rows.filter((row) =>
      [350403, 350404].includes(row.attackId),
    );
    expect(deadOnlyRows.map((row) => row.targetType)).toEqual([3, 3]);
    expect(deadOnlyRows.map((row) => row.targetSubtype)).toEqual(['dead-only', 'dead-only']);
    expect(
      actionById(3504)
        .rows.slice(0, 2)
        .map((row) => row.targetSubtype),
    ).toEqual(['alive-only', 'alive-only']);
  });

  it('pins the linked 3303 rows, skips orphan 330308 and retains represented geometry', () => {
    const action = actionById(3303);
    expect(action.rows.map((row) => row.attackId)).toEqual([
      330301, 330302, 330303, 330304, 330305, 330306, 330307, 330309, 330310,
    ]);
    expect(
      action.rows.map((row) => [
        row.targetType,
        row.geometry.nativeDistanceMax,
        row.geometry.nativeWidth,
        row.geometry.nativeOffset.x,
        row.geometry.nativeOffset.z,
      ]),
    ).toEqual([
      [1, 500, 350, 0, 300],
      [4, 1350, 450, -50, 0],
      [1, 1300, 350, 0, 0],
      [4, 1350, 450, -50, 0],
      [1, 1300, 350, 0, 0],
      [1, 1300, 350, 0, 0],
      [4, 1350, 450, -50, 0],
      [1, 1600, 400, 0, 0],
      [1, 1600, 400, 0, 0],
    ]);
    expect(action.rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(22_000);
    expect(action.rows.every((row) => !Object.hasOwn(row.damage, 'magicDamage'))).toBe(true);
  });

  it('deeply freezes the catalogue and every represented nested row', () => {
    expect(Object.isFrozen(MIR4_NATIVE_TAOIST_SKILL_ACTIONS)).toBe(true);
    for (const action of MIR4_NATIVE_TAOIST_SKILL_ACTIONS) {
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
