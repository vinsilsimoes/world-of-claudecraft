import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import { mir4NativeSkillActivationRanges } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeDragonTailHitReaction } from '../../src/sim/mir4/native_skill_dragon_tail';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5102 Dragon Tail native contracts', () => {
  it('compiles the exact four-row movement and three-contact damage chain', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5102);
    expect(mir4RuntimeSkillExecutionAuthority(5102)?.issues).toEqual([]);
    expect(
      plan?.rows.map((row) => [
        row.attackId,
        row.contacts.map((contact) => contact.offsetMs),
        row.motion?.kind ?? 'none',
        row.motion?.nativeRange ?? 0,
      ]),
    ).toEqual([
      [510201, [], 'forward', 300],
      [510202, [400], 'forward', 300],
      [510203, [790], 'none', 0],
      [510204, [890], 'none', 0],
    ]);
    expect(mir4SkillById(5102)?.damage).toMatchObject({
      aggregateCoefficient: 36_000,
      aggregateLevelUpCoefficient: 700,
      allocationMode: 'per-impact',
      components: [
        { attackId: 510202, damageType: 1, coefficient: 16_000, levelUpCoefficient: 270 },
        { attackId: 510203, damageType: 1, coefficient: 16_000, levelUpCoefficient: 370 },
        { attackId: 510204, damageType: 1, coefficient: 4_000, levelUpCoefficient: 60 },
      ],
    });
  });

  it('uses the native 5.5-yard target reach and 160-degree preparation guide', () => {
    expect(
      mir4NativeSkillActivationRanges(5102, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toMatchObject({
      firstAttackId: 510201,
      directContactRangeYards: 6,
      traceStopRangeYards: 5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeGuidePolicy(5102, 510202)).toMatchObject({
      guideShape: 'sector',
      indicatorNativeAngle: 160,
      indicatorNativeRadius: 700,
      indicatorNativeOffset: -100,
      aliveMs: 0,
      scalingMs: 200,
    });
    expect(
      [510201, 510202, 510203, 510204].every((attackId) =>
        mir4NativeImpactType2RuntimeAttack(5102, attackId),
      ),
    ).toBe(false);
    expect(
      [510202, 510203, 510204].every((attackId) =>
        mir4NativeImpactType2RuntimeAttack(5102, attackId),
      ),
    ).toBe(true);
    expect(mir4NativeRuntimeKnockbackReaction(5102, 510202)).toMatchObject({
      durationMs: 400,
      moveDurationMs: 100,
      moveDistanceYards: 0.5,
    });
    expect(mir4NativeRuntimeKnockbackReaction(5102, 510203)).toMatchObject({
      durationMs: 400,
      moveDurationMs: 100,
      moveDistanceYards: 1.5,
    });
    expect(mir4NativeDragonTailHitReaction(510204)).toEqual({
      durationMs: 300,
      stance: 'hit-01',
    });
  });
});
