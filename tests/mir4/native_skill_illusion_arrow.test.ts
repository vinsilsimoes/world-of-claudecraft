import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeActivationRangePolicy } from '../../src/sim/mir4/native_skill_activation_range';
import {
  mir4NativeIllusionArrowBuffsMatchRow,
  mir4NativeIllusionArrowCriticalDamageBasisPoints,
  mir4NativeIllusionArrowMonsterDamageBasisPoints,
  mir4NativeIllusionArrowPolicy,
} from '../../src/sim/mir4/native_skill_illusion_arrow';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import type { Entity } from '../../src/sim/types';

function target(kind: 'mob' | 'player', ownerId?: number): Entity {
  return { kind, ownerId } as Entity;
}

describe('MIR4 Illusion Arrow native contract', () => {
  it('closes the exact five-row action and compiles it as live authority', () => {
    const action = mir4NativeSkillActionById(4102);
    expect(action?.rows.map((row) => [row.attackId, row.nextAttackId])).toEqual([
      [410201, 410202],
      [410202, 410203],
      [410203, 410204],
      [410204, 410205],
      [410205, 0],
    ]);
    expect(action?.rows.map((row) => row.impactOffsetsMs)).toEqual([
      [20],
      [400],
      [600],
      [800],
      [1000],
    ]);
    expect(action?.rows.map((row) => row.damage.coefficient)).toEqual([
      4_000, 5_000, 5_000, 5_000, 5_000,
    ]);
    expect(action?.rows[0] && mir4NativeIllusionArrowBuffsMatchRow(action.rows[0])).toBe(true);

    const authority = mir4RuntimeSkillExecutionAuthority(4102);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([
      410201, 410202, 410203, 410204, 410205,
    ]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(5);
  });

  it('uses exact 7-yard activation and 10-yard circular contact geometry', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(4102)).toEqual({
      skillId: 4102,
      firstAttackId: 410201,
      targetDistanceMaxNative: 700,
      traceStopPaddingNative: 100,
      targetHeightNative: 500,
      blockingCheck: true,
    });
    for (const row of mir4NativeSkillActionById(4102)?.rows ?? []) {
      expect(row).toMatchObject({
        impactType: 2,
        authorialTargetValue: 8,
        geometry: {
          angleDegrees: 360,
          nativeDistanceMin: 0,
          nativeDistanceMax: 1000,
          nativeHeight: 400,
        },
      });
    }
  });

  it.each([
    [1, null, 0, 0],
    [5, 150, 1_000, 1_500],
    [8, 300, 2_000, 3_000],
    [10, 500, 5_000, 5_000],
    [15, 500, 5_000, 5_000],
  ] as const)(
    'projects rank %i EVA, critical-skill, and monster lanes',
    (rank, evasion, criticalBoost, monsterBoost) => {
      const policy = mir4NativeIllusionArrowPolicy(rank);
      expect(policy?.evasion?.magnitude ?? null).toBe(evasion);
      expect(policy?.criticalSkillDamageBoostBasisPoints).toBe(criticalBoost);
      expect(policy?.monsterDamageBoostBasisPoints).toBe(monsterBoost);
    },
  );

  it('applies monster and critical boosts only to their exact contextual lanes', () => {
    expect(mir4NativeIllusionArrowMonsterDamageBasisPoints(4102, target('mob'), 10)).toBe(15_000);
    expect(
      mir4NativeIllusionArrowMonsterDamageBasisPoints(4102, target('mob', 99), 10),
    ).toBe(10_000);
    expect(mir4NativeIllusionArrowMonsterDamageBasisPoints(4102, target('player'), 10)).toBe(
      10_000,
    );
    expect(mir4NativeIllusionArrowMonsterDamageBasisPoints(4101, target('mob'), 10)).toBe(10_000);
    expect(mir4NativeIllusionArrowCriticalDamageBasisPoints(4102, true, 10)).toBe(15_000);
    expect(mir4NativeIllusionArrowCriticalDamageBasisPoints(4102, false, 10)).toBe(10_000);
    expect(mir4NativeIllusionArrowCriticalDamageBasisPoints(4101, true, 10)).toBe(10_000);
  });

  it('recovers both authored radial knock-backs without inventing hard control', () => {
    expect(mir4NativeRuntimeKnockbackReaction(4102, 410202)).toMatchObject({
      durationMs: 200,
      moveDurationMs: 100,
      moveDistanceYards: 0.4,
      displacementDirection: 'radial',
    });
    expect(mir4NativeRuntimeKnockbackReaction(4102, 410204)).toMatchObject({
      durationMs: 200,
      moveDurationMs: 100,
      moveDistanceYards: 0.2,
      displacementDirection: 'radial',
    });
  });
});
