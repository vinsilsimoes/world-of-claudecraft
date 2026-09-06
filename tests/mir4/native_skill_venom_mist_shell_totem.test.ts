import { describe, expect, it } from "vitest";
import { mir4NativeRuntimeTotemPlan } from "../../src/sim/mir4/native_skill_totem_runtime";

describe("MIR4 Venom Mist Shell Totem contract", () => {
  it("compiles the reviewed eight-contact poison-field timeline", () => {
    const plan = mir4NativeRuntimeTotemPlan(4104);
    expect(plan).toMatchObject({
      skillId: 4104,
      spawnAttackId: 410402,
      totemId: 1405,
      spawnOffsetMs: 390,
      reconstruction: {
        policyId: "mir4-authorial.skill4104.totem-anchor-lifetime-v1",
        anchor: "selected-target-position-at-cast",
        lifetimeMs: 6000,
      },
      ownerSnapshot: {
        damagePower: "owner-physical-power-at-cast",
        accuracyNative: 3000,
        criticalNative: 1300,
        criticalOutcomeNative: 12000,
      },
      aggregateCoefficient: 22_000,
      aggregateLevelUpCoefficient: 440,
    });
    expect(
      plan?.contacts.map(
        ({ attackId, offsetMs, coefficient, levelUpCoefficient }) => ({
          attackId,
          offsetMs,
          coefficient,
          levelUpCoefficient,
        }),
      ),
    ).toEqual([
      {
        attackId: 410411,
        offsetMs: 890,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
      {
        attackId: 410411,
        offsetMs: 1290,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
      {
        attackId: 410412,
        offsetMs: 1490,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
      {
        attackId: 410412,
        offsetMs: 1690,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
      {
        attackId: 410413,
        offsetMs: 1890,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
      {
        attackId: 410413,
        offsetMs: 2090,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
      {
        attackId: 410414,
        offsetMs: 2290,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
      {
        attackId: 410414,
        offsetMs: 2490,
        coefficient: 2750,
        levelUpCoefficient: 55,
      },
    ]);
  });
});
