import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import { mir4NativeSkillActivationRanges } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeInertReaction } from '../../src/sim/mir4/native_skill_inert_reaction';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5103 Ascending Dragon native contracts', () => {
  it('compiles the exact setup plus three hybrid damage contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5103);
    expect(mir4RuntimeSkillExecutionAuthority(5103)?.issues).toEqual([]);
    expect(
      plan?.rows.map((row) => [
        row.attackId,
        row.contacts.map((contact) => [contact.offsetMs, contact.damage?.damageType]),
      ]),
    ).toEqual([
      [510301, []],
      [
        510302,
        [
          [580, 1],
          [580, 2],
        ],
      ],
      [
        510303,
        [
          [960, 1],
          [960, 2],
        ],
      ],
      [
        510304,
        [
          [1240, 1],
          [1240, 2],
        ],
      ],
    ]);
    expect(mir4SkillById(5103)?.damage).toMatchObject({
      aggregateCoefficient: 28_000,
      aggregateLevelUpCoefficient: 500,
      allocationMode: 'per-impact',
      components: [
        { attackId: 510302, damageType: 1, coefficient: 4_000, levelUpCoefficient: 60 },
        { attackId: 510302, damageType: 2, coefficient: 5_000, levelUpCoefficient: 100 },
        { attackId: 510303, damageType: 1, coefficient: 4_000, levelUpCoefficient: 60 },
        { attackId: 510303, damageType: 2, coefficient: 5_000, levelUpCoefficient: 100 },
        { attackId: 510304, damageType: 1, coefficient: 4_000, levelUpCoefficient: 80 },
        { attackId: 510304, damageType: 2, coefficient: 6_000, levelUpCoefficient: 100 },
      ],
    });
  });

  it('uses the native target reach, forward circles, guides and reactions', () => {
    expect(
      mir4NativeSkillActivationRanges(5103, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toMatchObject({
      firstAttackId: 510301,
      directContactRangeYards: 7,
      traceStopRangeYards: 6,
      targetHeightYards: 4,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeGuidePolicy(5103, 510301)).toMatchObject({
      guideShape: 'circle',
      indicatorNativeRadius: 600,
      aliveMs: 700,
      scalingMs: 500,
    });
    expect(mir4NativeRuntimeGuidePolicy(5103, 510302)).toMatchObject({
      guideShape: 'circle',
      indicatorNativeRadius: 600,
      aliveMs: 500,
      scalingMs: 100,
    });
    expect(mir4NativeRuntimeGuidePolicy(5103, 510303)).toMatchObject({
      guideShape: 'circle',
      indicatorNativeRadius: 600,
      aliveMs: 500,
      scalingMs: 100,
    });
    expect(mir4NativeRuntimeGuidePolicy(5103, 510304)).toBeNull();
    expect(mir4NativeImpactType2RuntimeAttack(5103, 510301)).toBe(false);
    expect(
      [510302, 510303, 510304].every((attackId) =>
        mir4NativeImpactType2RuntimeAttack(5103, attackId),
      ),
    ).toBe(true);
    for (const attackId of [510302, 510304]) {
      expect(mir4NativeRuntimeKnockbackReaction(5103, attackId)).toMatchObject({
        durationMs: 300,
        moveDurationMs: 100,
        moveDistanceYards: 0.1,
        triggerSourceImpactIndex: 0,
      });
    }
    expect(mir4NativeRuntimeInertReaction(5103, 510303)).toMatchObject({
      active: false,
      inactiveReason: 'zero-kind',
      probabilityPercent: 100,
    });
  });
});
