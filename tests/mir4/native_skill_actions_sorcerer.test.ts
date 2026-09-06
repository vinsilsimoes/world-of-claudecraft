import { describe, expect, it } from 'vitest';
import { MIR4_NATIVE_SORCERER_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions_sorcerer';

const actionById = (skillId: number) => {
  const action = MIR4_NATIVE_SORCERER_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === skillId,
  );
  if (!action) throw new Error(`Missing Sorcerer native skill action ${skillId}`);
  return action;
};

describe('MIR4 native Sorcerer skill actions', () => {
  it('pins every requested skill id, native header, unlock and direct row count exactly once', () => {
    expect(
      MIR4_NATIVE_SORCERER_SKILL_ACTIONS.map((action) => [
        action.skillId,
        action.cooldownMs,
        action.skillCostType,
        action.skillCost,
        action.attackAnimationMs,
        action.endCutAnimationMs,
        action.hitCount,
        action.requiredClassLevel,
        action.targeting,
        action.blockingCheck,
        [
          action.indicator.type,
          action.indicator.index,
          action.indicator.angleDegrees,
          action.indicator.nativeMin,
          action.indicator.nativeMax,
          action.indicator.nativeWidth,
          action.indicator.nativeOffset,
          action.indicator.nativeHeight,
        ],
        action.rows.length,
      ]),
    ).toEqual([
      [2101, 12_000, 2, 1600, 1267, 1100, 1, 1, true, 1, [0, 0, 40, 0, 1450, 0, 0, 700], 2],
      [2111, 15_000, 2, 2200, 1330, 1100, 1, 1, true, 1, [0, 0, 0, 0, 0, 0, 0, 700], 2],
      [2501, 18_000, 2, 3600, 1267, 1010, 6, 1, true, 0, [0, 102, 360, 0, 500, 0, 500, 1000], 2],
      [2301, 27_000, 2, 4800, 1570, 1300, 5, 1, true, 0, [0, 102, 360, 0, 750, 0, 500, 1000], 1],
      [2503, 52_000, 2, 2500, 1267, 1010, 3, 5, false, 0, [0, 102, 360, 0, 650, 0, 0, 400], 3],
      [2203, 40_000, 2, 4800, 1633, 1600, 7, 8, true, 0, [0, 102, 360, 0, 700, 0, 500, 1000], 2],
      [2303, 18_000, 2, 2200, 2100, 1890, 6, 16, true, 1, [0, 0, 0, 0, 0, 0, 0, 700], 1],
      [2201, 20_000, 2, 1400, 1767, 1400, 3, 24, true, 1, [0, 102, 360, 0, 750, 0, 0, 400], 3],
      [2502, 30_000, 2, 2160, 1867, 1600, 5, 32, true, 0, [0, 102, 360, 0, 650, 0, 500, 1000], 2],
      [2103, 45_000, 2, 7000, 2800, 2500, 10, 40, true, 1, [0, 0, 0, 0, 0, 0, 0, 400], 5],
      [2204, 54_000, 2, 3000, 1600, 1300, 0, 48, false, 0, [0, 102, 360, 0, 500, 0, 0, 400], 2],
      [2202, 53_000, 2, 6300, 4000, 3600, 2, 56, true, 1, [0, 102, 360, 0, 700, 0, 0, 400], 3],
      [2403, 10_000, 2, 7000, 3330, 2760, 10, 1, true, 0, [0, 103, 0, 0, 1500, 500, 0, 1000], 1],
    ]);

    const ids = MIR4_NATIVE_SORCERER_SKILL_ACTIONS.map((action) => action.skillId);
    expect(new Set(ids).size).toBe(13);
  });

  it('preserves every direct AttackLink row, impact slot and per-row coefficient in order', () => {
    expect(
      Object.fromEntries(
        MIR4_NATIVE_SORCERER_SKILL_ACTIONS.map((action) => [
          action.skillId,
          action.rows.map((row) => [
            row.attackId,
            [...row.impactOffsetsMs],
            row.damage.coefficient,
          ]),
        ]),
      ),
    ).toEqual({
      2101: [
        [210101, [530], 0],
        [210102, [780], 18_700],
      ],
      2111: [
        [211101, [574], 0],
        [211102, [824], 17_800],
      ],
      2501: [
        [250101, [100], 0],
        [250102, [720], 4000],
      ],
      2301: [[230101, [100], 0]],
      2503: [
        [250301, [450], 3000],
        [250302, [850], 4000],
        [250303, [1050], 4000],
      ],
      2203: [
        [220301, [100], 0],
        [220302, [700], 3900],
      ],
      2303: [[230301, [979, 1110, 1250, 1390, 1530, 1670, 1800], 17_600]],
      2201: [
        [220101, [150], 0],
        [220102, [446], 8000],
        [220103, [746, 1076], 15_000],
      ],
      2502: [
        [250201, [800], 0],
        [250202, [1140], 4000],
      ],
      2103: [
        [210301, [665, 765], 7000],
        [210302, [965, 1065], 7000],
        [210303, [1315, 1415], 8000],
        [210304, [1665, 1765], 8000],
        [210305, [2015, 2115], 10_000],
      ],
      2204: [
        [220401, [550], 0],
        [220402, [850], 0],
      ],
      2202: [
        [220201, [20], 2200],
        [220202, [3000], 9900],
        [220203, [3400], 9900],
      ],
      2403: [[240302, [100], 0]],
    });
  });

  it('pins high-risk direct evidence without multiplying coefficients by impact counts', () => {
    const thunderstorm = actionById(2303);
    expect(thunderstorm.rows).toHaveLength(1);
    expect(thunderstorm.rows[0]?.impactOffsetsMs).toEqual([
      979, 1110, 1250, 1390, 1530, 1670, 1800,
    ]);
    expect(thunderstorm.rows[0]?.damage.coefficient).toBe(17_600);

    const dragonTornado = actionById(2103);
    expect(dragonTornado.rows).toHaveLength(5);
    expect(dragonTornado.rows.every((row) => row.impactOffsetsMs.length === 2)).toBe(true);
    expect(dragonTornado.rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(40_000);

    expect(actionById(2201).rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(
      23_000,
    );

    const blizzard = actionById(2202);
    expect(blizzard.targeting).toBe(true);
    expect(blizzard.rows.filter((row) => row.damage.coefficient > 0)).toHaveLength(3);
    expect(blizzard.rows.reduce((sum, row) => sum + row.damage.coefficient, 0)).toBe(22_000);
  });

  it('preserves raw targeting, zero movement and the direct ultimate totem setup row', () => {
    expect(
      [2201, 2202, 2503, 2204].map((skillId) => [skillId, actionById(skillId).targeting]),
    ).toEqual([
      [2201, true],
      [2202, true],
      [2503, false],
      [2204, false],
    ]);
    expect(
      MIR4_NATIVE_SORCERER_SKILL_ACTIONS.every((action) =>
        action.rows.every((row) => row.movement.kind === 'none'),
      ),
    ).toBe(true);

    expect(actionById(2403).rows).toEqual([
      {
        attackId: 240302,
        mainAttack: 1,
        nextAttackId: 0,
        impactStartMs: 0,
        movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
        viewTarget: 0,
        targetDistance: { nativeMin: 0, nativeMax: 1700 },
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
          nativeHeight: 700,
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

  it('deeply freezes the catalogue and all represented nested evidence', () => {
    expect(Object.isFrozen(MIR4_NATIVE_SORCERER_SKILL_ACTIONS)).toBe(true);
    for (const action of MIR4_NATIVE_SORCERER_SKILL_ACTIONS) {
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
