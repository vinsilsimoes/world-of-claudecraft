import { describe, expect, it } from "vitest";
import { mir4SkillById } from "../../src/sim/content/mir4";
import { MIR4_NATIVE_SORCERER_SKILL_ACTIONS } from "../../src/sim/content/mir4/native_skill_actions_sorcerer";
import {
  mir4NativeProjectileMatchesPolicy,
  mir4NativeRuntimeProjectilePolicy,
} from "../../src/sim/mir4/native_skill_projectile";
import { compileMir4SkillExecutionPlan } from "../../src/sim/mir4/skill_execution_plan";

function frostOrbAction() {
  const action = MIR4_NATIVE_SORCERER_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === 2111,
  );
  if (!action) throw new Error("Missing Frost Orb native action");
  return action;
}

function flameOrbAction() {
  const action = MIR4_NATIVE_SORCERER_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === 2101,
  );
  if (!action) throw new Error("Missing Flame Orb native action");
  return action;
}

describe("MIR4 native projectile policy", () => {
  it("pins Venom Mist Shell curved launch data without moving its authored contact", () => {
    expect(mir4NativeRuntimeProjectilePolicy(4104, 410401)).toEqual({
      skillId: 4104,
      attackId: 410401,
      bulletType: 1,
      moveType: 3,
      count: 1,
      nativeSpeed: 1200,
      travelSpeedYardsPerSecond: 12,
      lifetimeMs: 700,
      socketName: "Hand_L",
      releaseOffsetMs: 220,
      launchGapMs: 0,
      effectId: 2040069,
      effectScale: 1,
      curveData:
        "ParticleSystem'/Game/Blueprint/Projectile/MissileCurve/MissileCurve02.MissileCurve02",
      speedData: "0",
      rotationOffset: { x: 0, y: 0, z: 0 },
      angleSpeed: 0,
      curveTimeMs: 850,
      nativeHeight: 250,
      movement: "target-curve",
      authoritativeContact: "authored-attack-row",
    });
  });

  it("pins Flame Orb launch data without changing its authored contact time", () => {
    const policy = mir4NativeRuntimeProjectilePolicy(2101, 210101);

    expect(policy).toEqual({
      skillId: 2101,
      attackId: 210101,
      bulletType: 1,
      moveType: 1,
      count: 1,
      nativeSpeed: 4000,
      travelSpeedYardsPerSecond: 40,
      lifetimeMs: 2000,
      socketName: "Hand_L",
      releaseOffsetMs: 530,
      launchGapMs: 0,
      effectId: 2040003,
      effectScale: 1,
      curveData: "0",
      speedData: "0",
      rotationOffset: { x: 0, y: 0, z: 0 },
      angleSpeed: 0,
      curveTimeMs: 0,
      nativeHeight: 0,
      movement: "target-homing",
      authoritativeContact: "authored-attack-row",
    });

    const action = flameOrbAction();
    expect(action.rows[0]?.impactStartMs).toBe(0);
    expect(action.rows[1]?.impactStartMs).toBe(680);
    expect(action.rows[1]?.impactOffsetsMs).toEqual([780]);
  });

  it("pins Frost Orb launch data without changing its authored contact time", () => {
    const policy = mir4NativeRuntimeProjectilePolicy(2111, 211101);

    expect(policy).toEqual({
      skillId: 2111,
      attackId: 211101,
      bulletType: 1,
      moveType: 1,
      count: 1,
      nativeSpeed: 4000,
      travelSpeedYardsPerSecond: 40,
      lifetimeMs: 2000,
      socketName: "head",
      releaseOffsetMs: 574,
      launchGapMs: 0,
      effectId: 2040032,
      effectScale: 1,
      curveData: "0",
      speedData: "0",
      rotationOffset: { x: 0, y: 0, z: 0 },
      angleSpeed: 0,
      curveTimeMs: 0,
      nativeHeight: 0,
      movement: "target-homing",
      authoritativeContact: "authored-attack-row",
    });

    const action = frostOrbAction();
    expect(action.rows[0]?.impactStartMs).toBe(0);
    expect(action.rows[1]?.impactStartMs).toBe(724);
    expect(action.rows[1]?.impactOffsetsMs).toEqual([824]);
  });

  it("admits only the exact reviewed source row", () => {
    const action = frostOrbAction();
    const setupRow = action.rows[0];
    const policy = mir4NativeRuntimeProjectilePolicy(2111, 211101);
    if (!setupRow || !policy)
      throw new Error("Missing Frost Orb projectile policy");

    expect(mir4NativeProjectileMatchesPolicy(setupRow, policy)).toBe(true);
    expect(
      mir4NativeProjectileMatchesPolicy(
        {
          ...setupRow,
          nativeBehavior: {
            ...setupRow.nativeBehavior,
            projectile: setupRow.nativeBehavior.projectile
              ? { ...setupRow.nativeBehavior.projectile, speed: 3999 }
              : null,
          },
        },
        policy,
      ),
    ).toBe(false);
    expect(mir4NativeRuntimeProjectilePolicy(2111, 211102)).toBeNull();
    expect(mir4NativeRuntimeProjectilePolicy(2101, 210102)).toBeNull();
  });

  it("compiles Frost Orb with an immutable projectile plan", () => {
    const action = frostOrbAction();
    const skill = mir4SkillById(2111);
    if (!skill) throw new Error("Missing Frost Orb runtime skill");

    const result = compileMir4SkillExecutionPlan({
      source: "runtime-approved",
      action,
      skill,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.rows[0]?.projectile).toEqual(
      mir4NativeRuntimeProjectilePolicy(2111, 211101),
    );
    expect(
      result.plan.rows[1]?.contacts.map((contact) => contact.offsetMs),
    ).toEqual([824]);
    expect(Object.isFrozen(result.plan.rows[0]?.projectile)).toBe(true);
    expect(
      Object.isFrozen(result.plan.rows[0]?.projectile?.rotationOffset),
    ).toBe(true);
  });
});
