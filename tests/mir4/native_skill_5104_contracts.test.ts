import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeImpactType3RuntimeAttack } from '../../src/sim/mir4/native_impact_type3_targets';
import { mir4NativeRuntimeCrowdControlReaction } from '../../src/sim/mir4/native_skill_crowd_control';
import { mir4NativeRuntimeGuidePolicy } from '../../src/sim/mir4/native_skill_guide';
import {
  mir4NativeNirvanaKickAutoCondition,
  mir4NativeNirvanaKickPolicy,
  mir4NativeNirvanaKickSourceMatches,
} from '../../src/sim/mir4/native_skill_nirvana_kick';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5104 Nirvana Kick compiled contracts', () => {
  it('promotes the exact dash and strike rows without the old generic effect', () => {
    const action = mir4NativeSkillActionById(5104);
    const skill = mir4SkillById(5104);
    const authority = mir4RuntimeSkillExecutionAuthority(5104);

    expect(mir4NativeNirvanaKickSourceMatches()).toBe(true);
    expect(action?.rows.map((row) => row.attackId)).toEqual([510401, 510402]);
    expect(skill).toMatchObject({
      requiresTarget: true,
      minTargets: null,
      effect: null,
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(5104));
    expect(authority?.plan).toMatchObject({
      skillId: 5104,
      cooldownMs: 18_000,
      skillCostType: 2,
      skillCost: 1_800,
      attackAnimationMs: 1_233,
      endCutAnimationMs: 1_000,
      sourceHitCount: 2,
      requiredClassLevel: 1,
      requiresTarget: true,
      damageAllocation: 'per-impact',
    });
    expect(
      authority?.plan?.rows.map((row) => ({
        attackId: row.attackId,
        motion: row.motion,
        contacts: row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
        ]),
      })),
    ).toEqual([
      {
        attackId: 510401,
        motion: { kind: 'target', nativeRange: 100, delayMs: 0, durationMs: 350 },
        contacts: [],
      },
      {
        attackId: 510402,
        motion: null,
        contacts: [[600, 16_000, 300]],
      },
    ]);
  });

  it('pins the frontal path, target-facing strike, guide and down reaction', () => {
    expect(mir4NativeImpactType3RuntimeAttack(5104, 510402)).toBe(true);
    expect(mir4NativeRuntimeGuidePolicy(5104, 510402)).toMatchObject({
      guideShape: 'direct',
      aliveMs: 500,
      scalingMs: 300,
      indicatorIndex: 0,
      indicatorNativeLength: 450,
      indicatorNativeWidth: 500,
    });
    expect(mir4NativeRuntimeCrowdControlReaction(5104, 510402)).toEqual({
      effectId: 'mir4_5104_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: 3,
      heightYards: 4,
      displacementDirection: 'radial',
    });
  });

  it('compiles every rank milestone without interpolating between them', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeNirvanaKickPolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        playerKnockdownChanceBasisPoints: 1_000,
        failureResistanceDebuff: null,
        bleed: null,
        persistentMonsterDamageBasisPoints: 0,
        persistentBossDamageBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 5,
        playerKnockdownChanceBasisPoints: 3_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_000,
          durationMs: 10_000,
        }),
        bleed: { buffId: 50_519, buffLevel: 3, durationMs: 2_000 },
      }),
      expect.objectContaining({
        skillLevel: 8,
        playerKnockdownChanceBasisPoints: 6_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -1_500,
          durationMs: 15_000,
        }),
        bleed: { buffId: 50_519, buffLevel: 7, durationMs: 2_000 },
        persistentMonsterDamageBasisPoints: 800,
        persistentBossDamageBasisPoints: 1_000,
      }),
      expect.objectContaining({
        skillLevel: 10,
        playerKnockdownChanceBasisPoints: 10_000,
        failureResistanceDebuff: expect.objectContaining({
          magnitudeBasisPoints: -2_000,
          durationMs: 20_000,
        }),
        bleed: { buffId: 50_519, buffLevel: 13, durationMs: 2_000 },
        persistentMonsterDamageBasisPoints: 1_200,
        persistentBossDamageBasisPoints: 1_500,
      }),
    ]);
  });

  it('pins the exact target HP gate used by Auto Battle', () => {
    expect(mir4NativeNirvanaKickAutoCondition()).toEqual({
      skillId: 5104,
      useControlTime: 3,
      target: 'target',
      condition: 'less-hp',
      searchRangeYards: 10,
      thresholdPercent: 30,
    });
  });
});
