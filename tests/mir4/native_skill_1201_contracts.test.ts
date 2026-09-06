import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import { mir4NativeRuntimeActivationRangePolicy } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeRuntimeAggroPolicy } from '../../src/sim/mir4/native_skill_aggro';
import { mir4NativeRuntimeDamageSummary } from '../../src/sim/mir4/native_skill_damage_summary';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeHitReaction } from '../../src/sim/mir4/native_skill_hit_reaction';
import { mir4NativeRuntimeIndicator } from '../../src/sim/mir4/native_skill_indicator';
import {
  mir4NativeIronShacklePersistentBonuses,
  mir4NativeRuntimeIronShacklePolicy,
} from '../../src/sim/mir4/native_skill_iron_shackle';
import {
  mir4NativeRuntimeAttackRagePolicy,
  mir4NativeRuntimeHitRagePolicy,
} from '../../src/sim/mir4/native_skill_rage';
import { mir4NativeRuntimeKnockbackReaction } from '../../src/sim/mir4/native_skill_knockback';
import { mir4NativeRuntimePushToPointReaction } from '../../src/sim/mir4/native_skill_push_to_point';
import { mir4NativeRuntimeSkillSourceFacets } from '../../src/sim/mir4/native_skill_source_facets';
import {
  mir4NativeExpectedSuperState,
  mir4NativeRuntimeSuperState,
} from '../../src/sim/mir4/native_skill_super_state';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Warrior 1201 native runtime contracts', () => {
  it('admits the exact approach, indicator, and preparation guide', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(1201)).toEqual({
      skillId: 1201,
      firstAttackId: 120101,
      targetDistanceMaxNative: 1600,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeIndicator(1201)).toEqual({
      skillId: 1201,
      shape: 'circle',
      index: 102,
      angleDegrees: 360,
      nativeMin: 0,
      nativeMax: 1100,
      nativeWidth: 0,
      nativeHeight: 400,
      nativeOffset: 500,
      presentation: 'targeting-metadata',
    });
    expect(mir4NativeRuntimeGuidePolicy(1201, 120101)).toMatchObject({
      attackId: 120101,
      guideShape: 'circle',
      aliveMs: 700,
      scalingMs: 500,
      indicatorNativeRadius: 1100,
    });
  });

  it('admits all three five-target circles and their exact reactions', () => {
    for (const attackId of [120101, 120102, 120103]) {
      expect(mir4NativeImpactType2RuntimeAttack(1201, attackId)).toBe(true);
    }
    expect(mir4NativeRuntimeKnockbackReaction(1201, 120101)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 250,
      moveDurationMs: 100,
      moveDistanceYards: 0.1,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimePushToPointReaction(1201, 120102)).toEqual({
      kind: 'push-to-point',
      stance: 'stun-01',
      durationMs: 600,
      moveDurationMs: 300,
      anchorOffsetYards: 2,
      heightYards: 0,
    });
    expect(mir4NativeRuntimeHitReaction(1201, 120103)).toEqual({
      durationMs: 200,
      stance: 'hit-01',
    });
  });

  it('admits damage, super state, rage, and threat without legacy approximations', () => {
    expect(mir4NativeRuntimeDamageSummary(1201)).toEqual({
      damageType: 1,
      coefficient: 220,
      levelUpCoefficient: 4,
      attackCoefficient: 22_000,
      attackLevelUpCoefficient: 400,
      attackIds: [120101, 120102, 120103],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
    for (const attackId of [120101, 120102]) {
      expect(mir4NativeExpectedSuperState(1201, attackId)).toMatchObject({
        superIgnore: 1000,
        superArmor: 0,
        ccUserCheck: 0,
        runtimeAdmission: true,
      });
      expect(mir4NativeRuntimeSuperState(1201, attackId)).toMatchObject({
        controlApplicationBasisPoints: 10_000,
      });
    }
    expect(mir4NativeExpectedSuperState(1201, 120103)).toBeNull();
    expect(
      [120101, 120102, 120103].map((attackId) =>
        mir4NativeRuntimeAttackRagePolicy(1201, attackId),
      ),
    ).toEqual([
      { nativePoints: 634, appliesOnLandedDamageContact: true },
      { nativePoints: 634, appliesOnLandedDamageContact: true },
      { nativePoints: 678, appliesOnLandedDamageContact: true },
    ]);
    for (const attackId of [120101, 120102, 120103]) {
      expect(mir4NativeRuntimeHitRagePolicy(1201, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit: true,
      });
      expect(mir4NativeRuntimeAggroPolicy(1201, attackId)).toEqual({
        nativeRateBasisPoints: 10_000,
        appliesOnLandedDamageContact: true,
      });
    }
  });

  it('compiles the exact rank 5, 8, and 10 milestones', () => {
    expect(mir4NativeIronShacklePersistentBonuses(4)).toEqual({
      monsterDamageBasisPoints: 0,
      allDamageReductionBasisPoints: 0,
    });
    expect(mir4NativeRuntimeIronShacklePolicy(5)).toMatchObject({
      skillLevel: 5,
      persistent: { monsterDamageBasisPoints: 400, allDamageReductionBasisPoints: 200 },
      damageAmplification: null,
      finalStun: null,
    });
    expect(mir4NativeRuntimeIronShacklePolicy(8)).toMatchObject({
      skillLevel: 8,
      persistent: { monsterDamageBasisPoints: 800, allDamageReductionBasisPoints: 400 },
      damageAmplification: {
        sourceAttackId: 120102,
        buffId: 10511,
        durationMs: 6000,
        magnitudeBasisPoints: 2500,
      },
      finalStun: null,
    });
    expect(mir4NativeRuntimeIronShacklePolicy(10)).toMatchObject({
      skillLevel: 10,
      persistent: { monsterDamageBasisPoints: 1200, allDamageReductionBasisPoints: 600 },
      damageAmplification: {
        sourceAttackId: 120102,
        buffId: 10511,
        durationMs: 8000,
        magnitudeBasisPoints: 3500,
      },
      finalStun: {
        sourceAttackId: 120103,
        buffId: 10521,
        durationMs: 1000,
        chanceBasisPoints: 10_000,
      },
    });
  });

  it('promotes the native action and removes the generic pull approximation', () => {
    expect(mir4SkillById(1201)).toMatchObject({
      hitCount: 3,
      impactOffsetsMs: [500, 850, 1500],
      roles: ['aoe', 'debuff'],
      minTargets: null,
      effect: null,
    });
    expect(mir4NativeRuntimeSkillSourceFacets(1201)).not.toBeNull();
    const authority = mir4RuntimeSkillExecutionAuthority(1201);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 1201,
      attackAnimationMs: 2833,
      endCutAnimationMs: 2300,
      sourceHitCount: 3,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([
      120101,
      120102,
      120103,
    ]);
  });
});
