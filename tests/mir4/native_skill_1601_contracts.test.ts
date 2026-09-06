import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeActivationRangePolicy } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeRuntimeAggroPolicy } from '../../src/sim/mir4/native_skill_aggro';
import { mir4NativeRuntimeDamageSummary } from '../../src/sim/mir4/native_skill_damage_summary';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import { mir4NativeRuntimeHitReaction } from '../../src/sim/mir4/native_skill_hit_reaction';
import { mir4NativeRuntimeIndicator } from '../../src/sim/mir4/native_skill_indicator';
import { mir4NativeRuntimeInertReaction } from '../../src/sim/mir4/native_skill_inert_reaction';
import {
  mir4NativeRuntimeAttackRagePolicy,
  mir4NativeRuntimeHitRagePolicy,
} from '../../src/sim/mir4/native_skill_rage';
import { mir4NativeRuntimeSmiteDefenseDebuff } from '../../src/sim/mir4/native_skill_smite_defense_debuff';
import { mir4NativeRuntimeSkillSourceFacets } from '../../src/sim/mir4/native_skill_source_facets';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Warrior 1601 native runtime contracts', () => {
  it('admits its native activation footprint, targeting indicator, and preparation guide', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(1601)).toEqual({
      skillId: 1601,
      firstAttackId: 160101,
      targetDistanceMaxNative: 850,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeIndicator(1601)).toEqual({
      skillId: 1601,
      shape: 'direct',
      index: 103,
      angleDegrees: 0,
      nativeMin: 0,
      nativeMax: 900,
      nativeWidth: 500,
      nativeHeight: 400,
      nativeOffset: 0,
      presentation: 'targeting-metadata',
    });
    expect(mir4NativeRuntimeGuidePolicy(1601, 160101)).toMatchObject({
      skillId: 1601,
      attackId: 160101,
      guideEffectId: 103,
      guideShape: 'direct',
      aliveMs: 674,
      scalingMs: 474,
      indicatorNativeLength: 900,
      indicatorNativeWidth: 500,
    });
  });

  it('keeps setup contacts inert and admits only the native third-row hit reaction', () => {
    expect(mir4NativeRuntimeInertReaction(1601, 160101)).toMatchObject({
      probabilityPercent: 100,
      active: false,
    });
    expect(mir4NativeRuntimeInertReaction(1601, 160102)).toMatchObject({
      probabilityPercent: 100,
      active: false,
    });
    expect(mir4NativeRuntimeHitReaction(1601, 160103)).toEqual({
      durationMs: 200,
      stance: 'hit-01',
    });
  });

  it('admits exact damage, rage, aggro, and 101002 -> 10020 Smite evidence', () => {
    expect(mir4NativeRuntimeDamageSummary(1601)).toEqual({
      damageType: 1,
      coefficient: 180,
      levelUpCoefficient: 4,
      attackCoefficient: 18_000,
      attackLevelUpCoefficient: 400,
      attackIds: [160103],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
    expect(mir4NativeRuntimeAttackRagePolicy(1601, 160103)).toEqual({
      nativePoints: 990,
      appliesOnLandedDamageContact: true,
    });
    for (const [attackId, appliesOnLandedPlayerHit] of [
      [160101, false],
      [160102, false],
      [160103, true],
    ] as const) {
      expect(mir4NativeRuntimeHitRagePolicy(1601, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit,
      });
    }
    expect(mir4NativeRuntimeAggroPolicy(1601, 160103)).toEqual({
      nativeRateBasisPoints: 10_000,
      appliesOnLandedDamageContact: true,
    });
    expect(mir4NativeRuntimeSmiteDefenseDebuff(1601, 160103, 1)).toMatchObject({
      skillId: 1601,
      contactAttackIds: [160103],
      passiveId: 101002,
      buffId: 10020,
      durationMs: 5_000,
      magnitude: 0.25,
    });
    expect(mir4NativeRuntimeSkillSourceFacets(1601)).not.toBeNull();
  });

  it('promotes one native third-row damage contact without legacy area fields', () => {
    expect(mir4SkillById(1601)).toMatchObject({
      impactOffsetsMs: [750],
      minTargets: null,
      effect: null,
    });
    const authority = mir4RuntimeSkillExecutionAuthority(1601);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 1601,
      attackAnimationMs: 1533,
      endCutAnimationMs: 1200,
      sourceHitCount: 1,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([160101, 160102, 160103]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(1);
    expect(authority?.plan?.rows[1]?.motion).toEqual({
      kind: 'target',
      nativeRange: 100,
      delayMs: 0,
      durationMs: 330,
    });
  });
});
