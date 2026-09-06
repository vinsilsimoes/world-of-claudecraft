import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeActivationRangePolicy } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeRuntimeAggroPolicy } from '../../src/sim/mir4/native_skill_aggro';
import { mir4NativeRuntimeDamageSummary } from '../../src/sim/mir4/native_skill_damage_summary';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeHitReaction } from '../../src/sim/mir4/native_skill_hit_reaction';
import { mir4NativeRuntimeIndicator } from '../../src/sim/mir4/native_skill_indicator';
import { mir4NativeRuntimeLionRoarDebuff } from '../../src/sim/mir4/native_skill_lion_roar_debuff';
import {
  mir4NativeRuntimeAttackRagePolicy,
  mir4NativeRuntimeHitRagePolicy,
} from '../../src/sim/mir4/native_skill_rage';
import { mir4NativeRuntimeSkillSourceFacets } from '../../src/sim/mir4/native_skill_source_facets';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Warrior 1302 native runtime contracts', () => {
  it('admits the native target approach, circle indicator, and preparation guide', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(1302)).toEqual({
      skillId: 1302,
      firstAttackId: 130201,
      targetDistanceMaxNative: 450,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeIndicator(1302)).toEqual({
      skillId: 1302,
      shape: 'circle',
      index: 102,
      angleDegrees: 360,
      nativeMin: 0,
      nativeMax: 400,
      nativeWidth: 0,
      nativeHeight: 400,
      nativeOffset: 0,
      presentation: 'targeting-metadata',
    });
    expect(mir4NativeRuntimeGuidePolicy(1302, 130201)).toMatchObject({
      skillId: 1302,
      attackId: 130201,
      guideEffectId: 102,
      guideShape: 'circle',
      aliveMs: 700,
      scalingMs: 500,
      indicatorNativeRadius: 600,
    });
  });

  it('admits the exact two native physical damage contacts and their reactions', () => {
    expect(mir4NativeRuntimeDamageSummary(1302)).toEqual({
      damageType: 1,
      coefficient: 130,
      levelUpCoefficient: 3,
      attackCoefficient: 13_000,
      attackLevelUpCoefficient: 300,
      attackIds: [130202, 130203],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
    for (const attackId of [130202, 130203]) {
      expect(mir4NativeRuntimeHitReaction(1302, attackId)).toEqual({
        durationMs: 100,
        stance: 'hit-01',
      });
    }
  });

  it('admits exact rage, threat, and the direct 130202 -> 13021 ATK Drop row', () => {
    expect(mir4NativeRuntimeAttackRagePolicy(1302, 130202)).toEqual({
      nativePoints: 1037,
      appliesOnLandedDamageContact: true,
    });
    expect(mir4NativeRuntimeAttackRagePolicy(1302, 130203)).toEqual({
      nativePoints: 100,
      appliesOnLandedDamageContact: true,
    });
    for (const [attackId, appliesOnLandedPlayerHit] of [
      [130201, false],
      [130202, true],
      [130203, true],
    ] as const) {
      expect(mir4NativeRuntimeHitRagePolicy(1302, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit,
      });
    }
    for (const attackId of [130202, 130203]) {
      expect(mir4NativeRuntimeAggroPolicy(1302, attackId)).toEqual({
        nativeRateBasisPoints: 10_000,
        appliesOnLandedDamageContact: true,
      });
    }
    expect(mir4NativeRuntimeLionRoarDebuff(1302, 130202, 1)).toEqual({
      skillId: 1302,
      attackId: 130202,
      buffId: 13021,
      effectId: 'mir4_native_buff_13021',
      kind: 'physical-attack-flat-reduction',
      durationMs: 10_000,
      magnitude: 80,
      probabilityBasisPoints: 10_000,
    });
    expect(mir4NativeRuntimeLionRoarDebuff(1302, 130203, 1)).toBeNull();
    expect(mir4NativeRuntimeSkillSourceFacets(1302)).not.toBeNull();
  });

  it('promotes the native action without the legacy area approximation', () => {
    expect(mir4SkillById(1302)).toMatchObject({
      hitCount: 1,
      impactOffsetsMs: [500, 600],
      minTargets: null,
      effect: null,
    });
    const authority = mir4RuntimeSkillExecutionAuthority(1302);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 1302,
      attackAnimationMs: 1300,
      endCutAnimationMs: 970,
      sourceHitCount: 1,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([130201, 130202, 130203]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(2);
  });
});
