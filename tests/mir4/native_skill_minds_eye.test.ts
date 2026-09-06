import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4NativeMindsEyeBuffsMatchRow,
  mir4NativeMindsEyePolicy,
} from '../../src/sim/mir4/native_skill_minds_eye';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe("MIR4 Arbalist 4111 Mind's Eye source contract", () => {
  it('seals the targetless five-player buff row and exact base scaling', () => {
    const action = mir4NativeSkillActionById(4111);
    const row = action?.rows[0];
    if (!row) throw new Error("missing Mind's Eye action row");

    expect(mir4NativeMindsEyeBuffsMatchRow(row)).toBe(true);
    expect(mir4NativeMindsEyePolicy(1)).toEqual({
      skillId: 4111,
      skillLevel: 1,
      attackId: 411101,
      sourceAttackId: 411101,
      buffId: 43041,
      applyAtMs: 564,
      radiusYards: 15,
      heightYards: 4,
      targetCap: 5,
      physicalAttackFlat: 10,
      buffDurationMs: 30_000,
      focusBuffId: 41010,
      milestone: null,
      persistentBossDamageBasisPoints: 0,
      persistentAllDamageReductionBasisPoints: 0,
    });
    expect(mir4RuntimeSkillExecutionPlan(4111)).toMatchObject({
      skillId: 4111,
      cooldownMs: 30_000,
      attackAnimationMs: 1_000,
      endCutAnimationMs: 850,
      requiresTarget: false,
      rows: [
        {
          attackId: 411101,
          contacts: [],
        },
      ],
    });
  });

  it('maps ranks 5, 8 and 10 to the official on-use and persistent packages', () => {
    expect(mir4NativeMindsEyePolicy(5)).toMatchObject({
      physicalAttackFlat: 50,
      milestone: {
        accuracy: 100,
        critical: 50,
        durationMs: 10_000,
        dispelsBlind: false,
        mpPotionEfficiencyBasisPoints: 0,
      },
      persistentBossDamageBasisPoints: 0,
      persistentAllDamageReductionBasisPoints: 0,
    });
    expect(mir4NativeMindsEyePolicy(8)).toMatchObject({
      physicalAttackFlat: 80,
      milestone: {
        accuracy: 160,
        critical: 80,
        durationMs: 10_000,
        dispelsBlind: true,
        mpPotionEfficiencyBasisPoints: 2_000,
      },
      persistentBossDamageBasisPoints: 1_000,
      persistentAllDamageReductionBasisPoints: 1_000,
    });
    expect(mir4NativeMindsEyePolicy(10)).toMatchObject({
      physicalAttackFlat: 100,
      milestone: {
        accuracy: 240,
        critical: 120,
        durationMs: 15_000,
        dispelsBlind: true,
        mpPotionEfficiencyBasisPoints: 3_000,
      },
      persistentBossDamageBasisPoints: 1_500,
      persistentAllDamageReductionBasisPoints: 2_000,
    });
  });
});
