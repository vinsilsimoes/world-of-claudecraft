import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeActivationRangePolicy } from '../../src/sim/mir4/native_skill_activation_range';
import { mir4NativeRuntimeAggroPolicy } from '../../src/sim/mir4/native_skill_aggro';
import { mir4NativeRuntimeAttackUseTypePolicy } from '../../src/sim/mir4/native_skill_attack_use_type';
import { mir4NativeRuntimeDamageSummary } from '../../src/sim/mir4/native_skill_damage_summary';
import { mir4NativeRuntimeHitReaction } from '../../src/sim/mir4/native_skill_hit_reaction';
import { mir4NativeRuntimeIndicator } from '../../src/sim/mir4/native_skill_indicator';
import {
  mir4NativeRuntimeAttackRagePolicy,
  mir4NativeRuntimeHitRagePolicy,
} from '../../src/sim/mir4/native_skill_rage';
import {
  mir4NativeRuntimeSkillPresentationFacets,
  mir4NativeRuntimeSkillSourceFacets,
} from '../../src/sim/mir4/native_skill_source_facets';
import { mir4NativeExpectedSuperState } from '../../src/sim/mir4/native_skill_super_state';

describe('MIR4 Warrior 1101 native contracts', () => {
  it('pins the targeted 4.5-yard activation envelope and self-centred footprint', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(1101)).toEqual({
      skillId: 1101,
      firstAttackId: 110100,
      targetDistanceMaxNative: 450,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeIndicator(1101)).toEqual({
      skillId: 1101,
      shape: 'circle',
      index: 0,
      angleDegrees: 360,
      nativeMin: 0,
      nativeMax: 0,
      nativeWidth: 0,
      nativeHeight: 400,
      nativeOffset: 0,
      presentation: 'targeting-metadata',
    });
  });

  it('executes both source contacts while retaining the divergent SKILL summary', () => {
    expect(mir4NativeRuntimeDamageSummary(1101)).toEqual({
      damageType: 1,
      coefficient: 80,
      levelUpCoefficient: 2,
      attackCoefficient: 16_000,
      attackLevelUpCoefficient: 400,
      attackIds: [110100, 110101],
      relationship: 'divergent-source-values',
      runtimeAuthority: 'skill-attack-rows',
    });
  });

  it('pins source-owned dispatch, protection, rage, aggro, and hit reaction per contact', () => {
    for (const attackId of [110100, 110101]) {
      expect(mir4NativeRuntimeAttackUseTypePolicy(1101, attackId)).toEqual({
        skillId: 1101,
        attackId,
        attackUseType: 1,
        dispatchOwner: 'source-owner',
      });
      expect(mir4NativeExpectedSuperState(1101, attackId)).toMatchObject({
        skillId: 1101,
        attackId,
        superIgnore: 0,
        superArmor: 9_000,
        actType: 0,
        ccUserCheck: 0,
      });
      expect(mir4NativeRuntimeAttackRagePolicy(1101, attackId)).toEqual({
        nativePoints: 880,
        appliesOnLandedDamageContact: true,
      });
      expect(mir4NativeRuntimeHitRagePolicy(1101, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit: true,
      });
      expect(mir4NativeRuntimeAggroPolicy(1101, attackId)).toEqual({
        nativeRateBasisPoints: 10_000,
        appliesOnLandedDamageContact: true,
      });
      expect(mir4NativeRuntimeHitReaction(1101, attackId)).toEqual({
        durationMs: 200,
        stance: 'hit-01',
      });
    }
  });

  it('preserves Berserk-specific presentation and eligibility instead of the shared Warrior tail', () => {
    const ability = {
      slotIndex: 0,
      type: 44,
      value: 12,
      levelUpValue: 2,
      time: 15,
      active: false,
      inactiveReason: 'attack-row-buff-metadata',
      sourceAttackId: 110101,
      sourceBuffId: 11012,
    } as const;
    expect(mir4NativeRuntimeSkillPresentationFacets(1101)).toEqual({
      darkChange: {
        nativeMode: 1,
        presentationOnly: true,
        clientOption: 'G_SkillDarkChange',
      },
      abilities: [
        ability,
        ...[1, 2, 3].map((slotIndex) => ({
          slotIndex,
          type: 0,
          value: 0,
          levelUpValue: 0,
          time: 0,
          active: false,
          inactiveReason: 'zero-type',
        })),
      ],
    });
    expect(mir4NativeRuntimeSkillSourceFacets(1101)).toEqual({
      skillId: 1101,
      darkChange: {
        nativeMode: 1,
        presentationOnly: true,
        clientOption: 'G_SkillDarkChange',
      },
      abilities: [
        ability,
        ...[1, 2, 3].map((slotIndex) => ({
          slotIndex,
          type: 0,
          value: 0,
          levelUpValue: 0,
          time: 0,
          active: false,
          inactiveReason: 'zero-type',
        })),
      ],
      passiveEligibilityIds: [204025, 205025],
      smiteBuffIds: [],
      autoLearnPassiveIds: [],
      skillModPassiveIds: [],
    });
  });
});
