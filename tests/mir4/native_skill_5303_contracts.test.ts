import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import {
  mir4NativeCrushingBlowPolicy,
  mir4NativeCrushingBlowSourceMatches,
} from '../../src/sim/mir4/native_skill_crushing_blow';
import { mir4NativeRuntimeCrowdControlReaction } from '../../src/sim/mir4/native_skill_crowd_control';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import { mir4NativeRuntimeMultiImpactPolicy } from '../../src/sim/mir4/native_skill_multi_impact';
import { mir4NativeRuntimeSkillSourceFacets } from '../../src/sim/mir4/native_skill_source_facets';
import { mir4NativeRuntimeSuperState } from '../../src/sim/mir4/native_skill_super_state';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5303 Crushing Blow compiled contracts', () => {
  it('promotes the exact four-contact action and removes the generic area effect', () => {
    const action = mir4NativeSkillActionById(5303);
    const skill = mir4SkillById(5303);
    const authority = mir4RuntimeSkillExecutionAuthority(5303);

    expect(mir4NativeCrushingBlowSourceMatches()).toBe(true);
    expect(action?.rows.map((row) => row.attackId)).toEqual([530301, 530302, 530303]);
    expect(skill).toMatchObject({
      browserRangePx: 144,
      requiresTarget: true,
      impactOffsetsMs: [400, 550, 700, 890],
      minTargets: null,
      effect: null,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5303));
    expect(authority?.plan).toMatchObject({
      skillId: 5303,
      cooldownMs: 38_000,
      skillCostType: 2,
      skillCost: 4_200,
      attackAnimationMs: 1_760,
      endCutAnimationMs: 1_600,
      sourceHitCount: 4,
      requiredClassLevel: 24,
      requiresTarget: true,
      damageAllocation: 'row-total-impact-vector',
    });
    expect(
      authority?.plan?.rows.map((row) => ({
        attackId: row.attackId,
        motion: row.motion,
        contacts: row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
          contact.damage.componentImpactCount,
        ]),
      })),
    ).toEqual([
      {
        attackId: 530301,
        motion: { kind: 'target', nativeRange: 300, delayMs: 0, durationMs: 300 },
        contacts: [],
      },
      {
        attackId: 530302,
        motion: { kind: 'target', nativeRange: 100, delayMs: 0, durationMs: 400 },
        contacts: [
          [400, 18_000, 350, 3],
          [550, 18_000, 350, 3],
          [700, 18_000, 350, 3],
        ],
      },
      {
        attackId: 530303,
        motion: null,
        contacts: [[890, 6_000, 150, 1]],
      },
    ]);
  });

  it('pins the native volumes, guide, knock-back, knockdown and control admission', () => {
    expect(
      [530302, 530303].every((attackId) =>
        mir4NativeImpactType2RuntimeAttack(5303, attackId),
      ),
    ).toBe(true);
    expect(mir4NativeRuntimeGuidePolicy(5303, 530302)).toMatchObject({
      guideShape: 'circle',
      aliveMs: 700,
      scalingMs: 500,
      indicatorIndex: 102,
      indicatorNativeRadius: 500,
    });
    expect(mir4NativeRuntimeKnockbackReaction(5303, 530302)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 600,
      moveDurationMs: 300,
      moveDistanceYards: 0.9,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeCrowdControlReaction(5303, 530303)).toEqual({
      effectId: 'mir4_5303_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: 3,
      heightYards: 1.5,
      displacementDirection: 'radial',
    });
    expect(mir4NativeRuntimeSuperState(5303, 530303)).toEqual({
      skillId: 5303,
      attackId: 530303,
      superIgnore: 100,
      superArmor: 9_000,
      actType: 0,
      ccUserCheck: 1_000,
      controlApplicationBasisPoints: 1_000,
      ccUserCheckRuntime: 'client-passed-unused',
    });
  });

  it('allocates each row total across its native impact vector', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(5303)).toEqual({
      skillId: 5303,
      allocationMode: 'row-total-impact-vector',
      summaryCoefficient: 240,
      summaryLevelUpCoefficient: 5,
      rowCoefficientScale: 100,
      rows: [
        { attackId: 530302, coefficient: 18_000, levelUpCoefficient: 350, impactCount: 3 },
        { attackId: 530303, coefficient: 6_000, levelUpCoefficient: 150, impactCount: 1 },
      ],
      totalImpactCount: 4,
    });
  });

  it('compiles every rank milestone without interpolating between them', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeCrushingBlowPolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        invincibility: { buffId: 53011, applyAtMs: 20, durationMs: 1_000 },
        playerKnockdownChanceBasisPoints: 1_000,
        bossSkillDamageBasisPoints: 0,
        sourceSkillDamageBoost: null,
        sourceCooldownReduction: null,
        failureResistanceDebuff: null,
      }),
      expect.objectContaining({
        skillLevel: 5,
        playerKnockdownChanceBasisPoints: 3_000,
        bossSkillDamageBasisPoints: 2_500,
        sourceSkillDamageBoost: { buffId: 50101, magnitudeBasisPoints: 1_000, durationMs: 15_000 },
        sourceCooldownReduction: { buffId: 50102, magnitudeBasisPoints: 2_000, durationMs: 15_000 },
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_000,
          durationMs: 10_000,
        }),
      }),
      expect.objectContaining({
        skillLevel: 8,
        playerKnockdownChanceBasisPoints: 6_000,
        bossSkillDamageBasisPoints: 5_000,
        sourceSkillDamageBoost: { buffId: 50101, magnitudeBasisPoints: 2_000, durationMs: 15_000 },
        sourceCooldownReduction: { buffId: 50107, magnitudeBasisPoints: 3_000, durationMs: 20_000 },
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_500,
          durationMs: 15_000,
        }),
      }),
      expect.objectContaining({
        skillLevel: 10,
        playerKnockdownChanceBasisPoints: 10_000,
        bossSkillDamageBasisPoints: 10_000,
        sourceSkillDamageBoost: { buffId: 50101, magnitudeBasisPoints: 3_000, durationMs: 15_000 },
        sourceCooldownReduction: { buffId: 50107, magnitudeBasisPoints: 5_000, durationMs: 20_000 },
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -2_000,
          durationMs: 20_000,
        }),
      }),
    ]);
  });

  it('admits only the extracted non-mechanical source facets', () => {
    expect(mir4NativeRuntimeSkillSourceFacets(5303)).toMatchObject({
      skillId: 5303,
      darkChange: { nativeMode: 1, presentationOnly: true },
      abilities: Array.from({ length: 4 }, (_, slotIndex) => ({
        slotIndex,
        type: 0,
        value: 0,
        levelUpValue: 0,
        time: 0,
        active: false,
        inactiveReason: 'zero-type',
      })),
      smiteBuffIds: [],
      autoLearnPassiveIds: [],
      skillModPassiveIds: [],
    });
  });
});
