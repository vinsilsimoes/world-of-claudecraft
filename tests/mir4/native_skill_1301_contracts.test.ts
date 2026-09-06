import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType2RuntimeAttack } from '../../src/sim/mir4/native_impact_type2_targets';
import { mir4NativeRuntimeActivationRangePolicy } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeRuntimeAggroPolicy } from '../../src/sim/mir4/native_skill_aggro';
import { mir4NativeRuntimeCrowdControlReaction } from '../../src/sim/mir4/native_skill_crowd_control';
import { mir4NativeRuntimeDamageSummary } from '../../src/sim/mir4/native_skill_damage_summary';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeIndicator } from '../../src/sim/mir4/native_skill_indicator';
import {
  mir4NativeRuntimeAttackRagePolicy,
  mir4NativeRuntimeHitRagePolicy,
} from '../../src/sim/mir4/native_skill_rage';
import {
  mir4NativeRipostePlayerKnockdownChanceBasisPoints,
  mir4NativeRiposteSetupBuffsMatchRow,
  mir4NativeRuntimeRipostePolicy,
} from '../../src/sim/mir4/native_skill_riposte';
import { mir4NativeRuntimeSkillSourceFacets } from '../../src/sim/mir4/native_skill_source_facets';
import {
  mir4NativeExpectedSuperState,
  mir4NativeRuntimeSuperState,
} from '../../src/sim/mir4/native_skill_super_state';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Warrior 1301 native runtime contracts', () => {
  it('admits the native approach, indicator, and both circle guides', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(1301)).toEqual({
      skillId: 1301,
      firstAttackId: 130101,
      targetDistanceMaxNative: 1100,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeIndicator(1301)).toEqual({
      skillId: 1301,
      shape: 'circle',
      index: 102,
      angleDegrees: 360,
      nativeMin: 0,
      nativeMax: 450,
      nativeWidth: 0,
      nativeHeight: 400,
      nativeOffset: 250,
      presentation: 'targeting-metadata',
    });
    expect(mir4NativeRuntimeGuidePolicy(1301, 130101)).toMatchObject({
      attackId: 130101,
      guideShape: 'circle',
      aliveMs: 350,
      scalingMs: 150,
      indicatorNativeRadius: 1200,
    });
    expect(mir4NativeRuntimeGuidePolicy(1301, 130102)).toMatchObject({
      attackId: 130102,
      guideShape: 'circle',
      aliveMs: 400,
      scalingMs: 200,
      indicatorNativeRadius: 450,
    });
  });

  it('admits the exact damage, footprint, knockdown, rage, and threat rows', () => {
    expect(mir4NativeRuntimeDamageSummary(1301)).toEqual({
      damageType: 1,
      coefficient: 252,
      levelUpCoefficient: 5,
      attackCoefficient: 25_200,
      attackLevelUpCoefficient: 500,
      attackIds: [130102],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
    expect(mir4NativeImpactType2RuntimeAttack(1301, 130101)).toBe(true);
    expect(mir4NativeImpactType2RuntimeAttack(1301, 130102)).toBe(true);
    expect(mir4NativeRuntimeCrowdControlReaction(1301, 130102)).toEqual({
      effectId: 'mir4_1301_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3000,
      moveDurationMs: 900,
      moveDistanceYards: 2.5,
      heightYards: 3,
      displacementDirection: 'radial',
    });
    expect(mir4NativeExpectedSuperState(1301, 130101)).toMatchObject({
      superIgnore: 0,
      superArmor: 9000,
      ccUserCheck: 0,
      runtimeAdmission: false,
    });
    expect(mir4NativeRuntimeSuperState(1301, 130101)).toBeNull();
    expect(mir4NativeRuntimeSuperState(1301, 130102)).toMatchObject({
      superIgnore: 100,
      superArmor: 9000,
      ccUserCheck: 1000,
      controlApplicationBasisPoints: 1000,
    });
    expect(mir4NativeRuntimeAttackRagePolicy(1301, 130102)).toEqual({
      nativePoints: 1552,
      appliesOnLandedDamageContact: true,
    });
    expect(mir4NativeRuntimeHitRagePolicy(1301, 130101)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: false,
    });
    expect(mir4NativeRuntimeHitRagePolicy(1301, 130102)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: true,
    });
    expect(mir4NativeRuntimeAggroPolicy(1301, 130102)).toEqual({
      nativeRateBasisPoints: 20_000,
      appliesOnLandedDamageContact: true,
    });
  });

  it('compiles exact base and rank milestone effects from the sealed source graph', () => {
    expect(mir4NativeRiposteSetupBuffsMatchRow()).toBe(true);
    expect(mir4NativeRuntimeRipostePolicy(1)).toMatchObject({
      skillId: 1301,
      setupAttackId: 130101,
      damageAttackId: 130102,
      controlImmunity: { buffId: 11032, durationMs: 3000 },
      baseAllDamageReduction: { buffId: 13011, durationMs: 3000, magnitudeBasisPoints: 2400 },
      taunt: { buffId: 13012, durationMs: 5000 },
      specialAllDamageReduction: null,
      bossDamageReduction: null,
      immediateHealMaxHpBasisPoints: 0,
      playerKnockdownChanceBasisPoints: 1000,
      playerKnockdownHealBasisPointsPerTarget: 0,
      playerKnockdownHealMaxBasisPoints: 0,
      playerMultiTargetChanceRule: 'client-passed-unused',
    });
    expect(mir4NativeRuntimeRipostePolicy(5)).toMatchObject({
      baseAllDamageReduction: { magnitudeBasisPoints: 4000 },
      specialAllDamageReduction: { buffId: 10104, durationMs: 10_000, magnitudeBasisPoints: 1500 },
      bossDamageReduction: { buffId: 10128, durationMs: 10_000, magnitudeBasisPoints: 1500 },
      playerKnockdownChanceBasisPoints: 3000,
    });
    expect(mir4NativeRuntimeRipostePolicy(8)).toMatchObject({
      baseAllDamageReduction: { magnitudeBasisPoints: 5200 },
      specialAllDamageReduction: { buffId: 10130, durationMs: 10_000, magnitudeBasisPoints: 2000 },
      bossDamageReduction: { buffId: 10131, durationMs: 10_000, magnitudeBasisPoints: 3000 },
      immediateHealMaxHpBasisPoints: 1000,
      playerKnockdownChanceBasisPoints: 6000,
      playerKnockdownHealBasisPointsPerTarget: 700,
      playerKnockdownHealMaxBasisPoints: 3500,
    });
    expect(mir4NativeRuntimeRipostePolicy(10)).toMatchObject({
      baseAllDamageReduction: { magnitudeBasisPoints: 6000 },
      specialAllDamageReduction: { buffId: 10130, durationMs: 10_000, magnitudeBasisPoints: 2500 },
      bossDamageReduction: { buffId: 10131, durationMs: 10_000, magnitudeBasisPoints: 5000 },
      immediateHealMaxHpBasisPoints: 2000,
      playerKnockdownChanceBasisPoints: 10_000,
      playerKnockdownHealBasisPointsPerTarget: 1000,
      playerKnockdownHealMaxBasisPoints: 5000,
    });
    expect(
      mir4NativeRipostePlayerKnockdownChanceBasisPoints(
        8,
        { 119: 125, 127: 250 },
        { 120: 75, 128: 100 },
      ),
    ).toBe(6200);
    expect(
      mir4NativeRipostePlayerKnockdownChanceBasisPoints(10, undefined, {
        120: 750,
        128: 1250,
      }),
    ).toBe(8000);
  });

  it('promotes the native action without the legacy single-target defense approximation', () => {
    expect(mir4SkillById(1301)).toMatchObject({
      hitCount: 1,
      impactOffsetsMs: [1240],
      roles: ['aoe', 'survival-utility'],
      minTargets: null,
      effect: null,
    });
    expect(mir4SkillById(1301)?.additionalEffects).toBeUndefined();
    expect(mir4NativeRuntimeSkillSourceFacets(1301)).not.toBeNull();
    const authority = mir4RuntimeSkillExecutionAuthority(1301);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 1301,
      attackAnimationMs: 2150,
      endCutAnimationMs: 1900,
      sourceHitCount: 1,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([130101, 130102]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(1);
  });
});
