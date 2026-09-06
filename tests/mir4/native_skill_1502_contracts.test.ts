import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeDamageSummary } from '../../src/sim/mir4/native_skill_damage_summary';
import { mir4NativeRuntimeIndicator } from '../../src/sim/mir4/native_skill_indicator';
import {
  mir4NativeRuntimeUnbreakableStancePolicy,
  mir4NativeUnbreakableStanceImpactBuffsMatchRow,
} from '../../src/sim/mir4/native_skill_unbreakable_stance';

describe('MIR4 Warrior 1502 native contracts', () => {
  it('compiles the direct rank-scaled EVA and monster-reduction buffs', () => {
    expect(mir4NativeRuntimeUnbreakableStancePolicy(1)).toMatchObject({
      skillId: 1502,
      skillLevel: 1,
      usableWhileStunned: false,
      persistentAllDamageReductionBasisPoints: 0,
      always: [
        {
          buffId: 15011,
          durationMs: 20_000,
          statuses: [{ statusId: 29, magnitude: 60 }],
        },
        {
          buffId: 15012,
          durationMs: 10_000,
          statuses: [{ statusId: 42, magnitude: 2_000 }],
        },
      ],
      whileStunned: [],
    });
    expect(mir4NativeRuntimeUnbreakableStancePolicy(10)?.always.slice(0, 2)).toEqual([
      {
        buffId: 15011,
        durationMs: 20_000,
        statuses: [{ statusId: 29, magnitude: 150 }],
      },
      {
        buffId: 15012,
        durationMs: 10_000,
        statuses: [{ statusId: 42, magnitude: 2_000 }],
      },
    ]);
  });

  it('compiles the exact rank 5, 8, and 10 milestones as native status modifiers', () => {
    expect(mir4NativeRuntimeUnbreakableStancePolicy(5)).toMatchObject({
      usableWhileStunned: false,
      persistentAllDamageReductionBasisPoints: 0,
      always: [
        {},
        {},
        { buffId: 10113, durationMs: 10_000, statuses: [{ statusId: 43, magnitude: 2_000 }] },
        {
          buffId: 10127,
          durationMs: 5_000,
          statuses: [
            { statusId: 24, magnitude: 250 },
            { statusId: 26, magnitude: 250 },
          ],
        },
        { buffId: 10134, durationMs: 10_000, statuses: [{ statusId: 35, magnitude: 2_000 }] },
      ],
    });

    expect(mir4NativeRuntimeUnbreakableStancePolicy(8)).toMatchObject({
      usableWhileStunned: true,
      persistentAllDamageReductionBasisPoints: 300,
      always: [
        {},
        {},
        { buffId: 10113, durationMs: 10_000, statuses: [{ statusId: 43, magnitude: 3_000 }] },
        {
          buffId: 10114,
          durationMs: 6_000,
          statuses: [
            { statusId: 24, magnitude: 500 },
            { statusId: 26, magnitude: 500 },
          ],
        },
        { buffId: 10116, durationMs: 6_000, statuses: [{ statusId: 49, magnitude: 5_000 }] },
        { buffId: 10134, durationMs: 10_000, statuses: [{ statusId: 35, magnitude: 3_500 }] },
      ],
      whileStunned: [
        { buffId: 10117, durationMs: 6_000, statuses: [{ statusId: 29, magnitude: 250 }] },
      ],
    });

    expect(mir4NativeRuntimeUnbreakableStancePolicy(10)).toMatchObject({
      usableWhileStunned: true,
      persistentAllDamageReductionBasisPoints: 600,
      always: [
        {},
        {},
        { buffId: 10113, durationMs: 10_000, statuses: [{ statusId: 43, magnitude: 5_000 }] },
        {
          buffId: 10114,
          durationMs: 8_000,
          statuses: [
            { statusId: 24, magnitude: 600 },
            { statusId: 26, magnitude: 600 },
          ],
        },
        { buffId: 10116, durationMs: 8_000, statuses: [{ statusId: 49, magnitude: 8_000 }] },
        { buffId: 10134, durationMs: 10_000, statuses: [{ statusId: 35, magnitude: 5_000 }] },
      ],
      whileStunned: [
        { buffId: 10117, durationMs: 8_000, statuses: [{ statusId: 29, magnitude: 400 }] },
      ],
    });
  });

  it('pins the exact native row, indicator metadata, and damage summary', () => {
    expect(mir4NativeUnbreakableStanceImpactBuffsMatchRow()).toBe(true);
    expect(mir4NativeRuntimeIndicator(1502)).toEqual({
      skillId: 1502,
      shape: 'none',
      index: 0,
      angleDegrees: 0,
      nativeMin: 0,
      nativeMax: 0,
      nativeWidth: 0,
      nativeHeight: 400,
      nativeOffset: 0,
      presentation: 'targeting-metadata',
    });
    expect(mir4NativeRuntimeDamageSummary(1502)).toEqual({
      damageType: 1,
      coefficient: 80,
      levelUpCoefficient: 2,
      attackCoefficient: 8_000,
      attackLevelUpCoefficient: 200,
      attackIds: [150202],
      relationship: 'exact-scaled-summary',
      runtimeAuthority: 'skill-attack-rows',
    });
    const runtimeSkill = mir4SkillById(1502);
    expect(runtimeSkill).toMatchObject({
      hitCount: 1,
      impactOffsetsMs: [240],
      minTargets: null,
    });
    expect(runtimeSkill?.additionalEffects).toBeUndefined();
  });
});
