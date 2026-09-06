import { describe, expect, it } from "vitest";
import {
  mir4NativeSkillActionById,
  mir4SkillById,
} from "../../src/sim/content/mir4";
import { mir4NativeImpactType3RuntimeAttack } from "../../src/sim/mir4/native_impact_type3_targets";
import { mir4NativeRuntimeAttackBackReaction } from "../../src/sim/mir4/native_skill_attack_back";
import { mir4NativeRuntimeKnockbackReaction } from "../../src/sim/mir4/native_skill_knockback";
import { mir4NativeRuntimeMultiImpactPolicy } from "../../src/sim/mir4/native_skill_multi_impact";
import { mir4NativeRuntimeUninterruptibleBuff } from "../../src/sim/mir4/native_skill_uninterruptible";
import { mir4NativeWindWallPolicy } from "../../src/sim/mir4/native_skill_wind_wall_policy";
import { mir4RuntimeSkillExecutionAuthority } from "../../src/sim/mir4/runtime_skill_execution";

describe("MIR4 Lancer 5403 Wind Wall compiled contracts", () => {
  it("promotes the exact five-contact hybrid action without generic fallback effects", () => {
    const action = mir4NativeSkillActionById(5403);
    const skill = mir4SkillById(5403);
    const authority = mir4RuntimeSkillExecutionAuthority(5403);
    expect(action?.rows.map((row) => row.attackId)).toEqual([
      540301, 540302, 540303, 540304, 540305,
    ]);
    expect(skill).toMatchObject({
      requiresTarget: true,
      browserRangePx: 96,
      impactOffsetsMs: [20, 300, 400, 510, 620],
      minTargets: null,
      effect: null,
      damage: {
        aggregateCoefficient: 22_000,
        aggregateLevelUpCoefficient: 500,
        allocationMode: "row-total-impact-vector",
      },
    });
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 5403,
      cooldownMs: 45_000,
      attackAnimationMs: 800,
      endCutAnimationMs: 720,
      sourceHitCount: 5,
      requiredClassLevel: 32,
      damageAllocation: "row-total-impact-vector",
    });
    expect(
      authority?.plan?.rows.map((row) =>
        row.contacts.map((contact) => [
          contact.offsetMs,
          contact.damage.damageType,
          contact.damage.coefficient,
          contact.damage.levelUpCoefficient,
        ]),
      ),
    ).toEqual([
      [
        [20, 1, 3_000, 70],
        [20, 2, 2_000, 40],
      ],
      [],
      [
        [300, 1, 3_000, 70],
        [400, 1, 3_000, 70],
        [300, 2, 2_000, 40],
        [400, 2, 2_000, 40],
      ],
      [
        [510, 1, 4_000, 80],
        [510, 2, 2_000, 60],
      ],
      [
        [620, 1, 4_000, 80],
        [620, 2, 2_000, 60],
      ],
    ]);
  });

  it("pins the rectangle contacts and alternating reactions", () => {
    for (const attackId of [540301, 540303, 540304, 540305]) {
      expect(mir4NativeImpactType3RuntimeAttack(5403, attackId)).toBe(true);
    }
    for (const [attackId, value] of [
      [540301, 40],
      [540304, 80],
    ]) {
      expect(mir4NativeRuntimeAttackBackReaction(5403, attackId)).toEqual({
        kind: "attack-back",
        stance: "hit-01",
        durationMs: 400,
        triggerSourceImpactIndex: 0,
      });
      expect(value).toBeGreaterThan(0);
    }
    for (const attackId of [540303, 540305]) {
      expect(mir4NativeRuntimeKnockbackReaction(5403, attackId)).toEqual({
        kind: "knock-back",
        stance: "hit-01",
        durationMs: attackId === 540303 ? 800 : 400,
        moveDurationMs: attackId === 540303 ? 400 : 200,
        moveDistanceYards: attackId === 540303 ? 1.6 : 0.8,
        heightYards: 0,
        displacementDirection: "radial",
        triggerSourceImpactIndex: 0,
      });
    }
  });

  it("pins multi-impact allocation, casting immunity and every rank milestone", () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(5403)).toMatchObject({
      summaryCoefficient: 220,
      summaryLevelUpCoefficient: 5,
      totalImpactCount: 5,
    });
    expect(mir4NativeRuntimeUninterruptibleBuff(5403)).toMatchObject({
      attackId: 540301,
      buffId: 51011,
      durationMs: 1_500,
      applyPhase: "action-start",
    });
    expect([1, 5, 8, 10].map((rank) => mir4NativeWindWallPolicy(rank))).toEqual(
      [
        expect.objectContaining({
          monsterDamageReductionBasisPoints: 500,
          bossDamageReductionBasisPoints: 0,
          partyAllDamageReductionBasisPoints: 0,
          persistentPartySpellAttack: 0,
        }),
        expect.objectContaining({
          monsterDamageReductionBasisPoints: 1_500,
          partyAllDamageReductionBasisPoints: 3_000,
          partyBossDamageReductionBasisPoints: 2_000,
          persistentPartySpellAttack: 20,
        }),
        expect.objectContaining({
          monsterDamageReductionBasisPoints: 2_000,
          bossDamageReductionBasisPoints: 2_000,
          partyAllDamageReductionBasisPoints: 5_000,
          persistentPartySpellAttack: 60,
        }),
        expect.objectContaining({
          monsterDamageReductionBasisPoints: 3_000,
          bossDamageReductionBasisPoints: 3_000,
          partyAllDamageReductionBasisPoints: 7_000,
          persistentPartySpellAttack: 100,
        }),
      ],
    );
  });
});
