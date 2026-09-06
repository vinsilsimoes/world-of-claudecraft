import { describe, expect, it } from "vitest";
import { mir4NativeSkillActionById } from "../../src/sim/content/mir4";
import { MIR4_MOBS } from "../../src/sim/content/mir4/mobs";
import { createMob } from "../../src/sim/entity";
import {
  castMir4Skill,
  updateMir4PendingImpacts,
} from "../../src/sim/mir4/combat";
import {
  applyMir4Effect,
  mir4EffectAdmits,
  mir4NativeStatusBonus,
} from "../../src/sim/mir4/effects";
import { mir4NativeRuntimeProjectilePolicy } from "../../src/sim/mir4/native_skill_projectile";
import {
  applyMir4NativeSeekingBoltCastingImmunity,
  applyMir4NativeSeekingBoltDirectContact,
  mir4NativeSeekingBoltFocusBuffMatchesRow,
  mir4NativeSeekingBoltPartyAccuracy,
  mir4NativeSeekingBoltPolicy,
  mir4NativeSeekingBoltSetupBuffsMatchRow,
} from "../../src/sim/mir4/native_skill_seeking_bolt";
import { mir4RuntimeSkillExecutionAuthority } from "../../src/sim/mir4/runtime_skill_execution";
import { requestMir4SkillActivation } from "../../src/sim/mir4/skill_activation";
import { Sim } from "../../src/sim/sim";
import type { Entity, SimEvent } from "../../src/sim/types";
import { dist2d } from "../../src/sim/types";
import { placePlayerInOpenField } from "../helpers/open_field";
import { EMPTY_TEST_WORLD } from "../sim_shared";

function makeArbalist(seed = 41_100, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: "hunter",
    playerClassMir4: "arbalist",
    playerName: "Seeking Bolt Runtime QA",
    gameProfile: "mir4-gameplay-port",
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error("missing MIR4 player stats");
  sim.player.mir4.accuracy = 0;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error("missing MIR4 player metadata");
  meta.mir4SkillLevels = {
    ...(meta.mir4SkillLevels ?? {}),
    4110: skillLevel,
  };
  meta.mir4DisabledAutoSkills = [
    4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109, 4110, 4111, 4112,
    4501,
  ];
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, distance: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `seeking_bolt_${suffix}`,
    hpBase: 10_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4PhysicalDefense: 0,
    mir4Dodge: 100_000,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z + distance),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function resolveAt(sim: Sim, seconds: number): SimEvent[] {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
  return sim.drainEvents();
}

describe("MIR4 Arbalist 4110 Seeking Bolt integrated runtime", () => {
  it("pins the exact rank 1, 5, 8, and 10 milestone policy", () => {
    expect(mir4NativeSeekingBoltPolicy(1)).toMatchObject({
      immunity: { attackId: 411000, applyAtMs: 20, durationMs: 1_500 },
      focus: { attackId: 411001, applyAtMs: 1_000 },
      directAttackId: 411002,
      unavoidable: false,
      soulDestruction: null,
      evasionLoss: null,
      persistentPartyAccuracy: 0,
    });
    expect(mir4NativeSeekingBoltPolicy(5)).toMatchObject({
      unavoidable: false,
      soulDestruction: {
        chanceBasisPoints: 2_000,
        stunDurationMs: 2_000,
        buffId: 40534,
      },
    });
    expect(mir4NativeSeekingBoltPolicy(8)).toMatchObject({
      unavoidable: true,
      soulDestruction: {
        chanceBasisPoints: 5_000,
        stunDurationMs: 3_000,
        buffId: 40535,
      },
      evasionLoss: { amount: 200, durationMs: 5_000, buffId: 40538 },
      persistentPartyAccuracy: 20,
    });
    expect(mir4NativeSeekingBoltPolicy(10)).toMatchObject({
      unavoidable: true,
      soulDestruction: {
        chanceBasisPoints: 10_000,
        stunDurationMs: 4_000,
        buffId: 40536,
      },
      evasionLoss: { amount: 300, durationMs: 10_000, buffId: 40538 },
      persistentPartyAccuracy: 50,
    });
  });

  it("admits only the exact setup and Focus rows and compiles the native action", () => {
    const action = mir4NativeSkillActionById(4110);
    if (!action) throw new Error("missing Seeking Bolt action");
    const [setup, focus] = action.rows;
    if (!setup || !focus) throw new Error("missing Seeking Bolt setup rows");

    expect(mir4NativeSeekingBoltSetupBuffsMatchRow(setup)).toBe(true);
    expect(mir4NativeSeekingBoltFocusBuffMatchesRow(focus)).toBe(true);
    expect(
      mir4NativeSeekingBoltSetupBuffsMatchRow({
        ...setup,
        impactOffsetsMs: [21],
        nativeBehavior: setup.nativeBehavior,
      }),
    ).toBe(false);
    expect(
      mir4NativeSeekingBoltFocusBuffMatchesRow({
        ...focus,
        nativeBehavior: { ...focus.nativeBehavior, buffIds: [] },
      }),
    ).toBe(false);

    const authority = mir4RuntimeSkillExecutionAuthority(4110);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 4110,
      attackAnimationMs: 1_900,
      endCutAnimationMs: 1_710,
      sourceHitCount: 5,
      requiresTarget: true,
      range: { nativeContactDistanceMax: 2_500, blockingCheck: true },
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([
      411000, 411001, 411002,
    ]);
    expect(authority?.plan?.rows[1]?.projectile).toEqual(
      mir4NativeRuntimeProjectilePolicy(4110, 411001),
    );
    expect(authority?.plan?.rows[2]?.contacts).toEqual([
      expect.objectContaining({
        offsetMs: 1_250,
        damage: expect.objectContaining({
          coefficient: 42_000,
          levelUpCoefficient: 840,
        }),
      }),
    ]);
  });

  it("blocks only Knockdown and Stun during the 1.5-second casting window", () => {
    const sim = makeArbalist();
    expect(applyMir4NativeSeekingBoltCastingImmunity(sim.ctx, sim.player)).toBe(
      true,
    );
    expect(
      mir4EffectAdmits(sim.player, "incoming_stun", "stun", sim.time),
    ).toEqual({ ok: false, code: "MIR4_CC_IMMUNE" });
    expect(
      mir4EffectAdmits(sim.player, "incoming_knockdown", "knockdown", sim.time),
    ).toEqual({ ok: false, code: "MIR4_CC_IMMUNE" });
    expect(
      mir4EffectAdmits(sim.player, "incoming_freeze", "freeze", sim.time),
    ).toEqual({ ok: true });
    expect(
      mir4EffectAdmits(sim.player, "incoming_silence", "silence", sim.time),
    ).toEqual({ ok: true });
  });

  it("approaches a distant target and commits at the 24.5-yard trace stop", () => {
    const sim = makeArbalist(41_101, 8);
    const target = spawnTarget(sim, "approach", 35);
    sim.player.targetId = target.id;

    expect(
      requestMir4SkillActivation(
        sim.ctx,
        "mir4_skill_4110",
        sim.playerId,
        target.id,
      ),
    ).toEqual({ ok: true, queued: true });
    let ticks = 0;
    while (!sim.player.cooldowns.has("4110") && ticks++ < 300) sim.tick();

    expect(ticks).toBeLessThan(300);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(24.5);
  });

  it("schedules immunity, Focus, and one unavoidable rank-8 damage contact", () => {
    const sim = makeArbalist(41_102, 8);
    const target = spawnTarget(sim, "timeline", 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4110, target.id)).toEqual({
      ok: true,
    });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4110)
        .map((impact) => ({
          step: impact.effectOnly ? impact.nativeSetup : impact.attackId,
          dueMs: Math.round((impact.dueAt - sim.time) * 1_000),
          forceHit: impact.forceHit,
        })),
    ).toEqual([
      { step: 411002, dueMs: 1_250, forceHit: true },
      {
        step: "arbalist-seeking-bolt-immunity",
        dueMs: 20,
        forceHit: undefined,
      },
      { step: "arbalist-focus", dueMs: 1_000, forceHit: undefined },
    ]);

    resolveAt(sim, 0.02);
    expect(
      sim.player.mir4Effects?.active.find(
        (effect) => effect.kind === "knockdown-stun-immunity",
      ),
    ).toMatchObject({ remaining: 1.5 });
    resolveAt(sim, 1);
    expect(
      sim.player.mir4Effects?.active.find(
        (effect) => effect.effectId === "mir4_native_buff_41010",
      ),
    ).toMatchObject({ nativeStacks: 1 });
    const events = resolveAt(sim, 1.25);
    expect(
      events.filter(
        (event) =>
          event.type === "damage" &&
          event.targetId === target.id &&
          event.ability === "Seta da Procura",
      ),
    ).toHaveLength(1);
    expect(mir4NativeStatusBonus(target, 29)).toBe(-200);
  });

  it("applies the rank-10 critical Soul Destruction and Evasion package", () => {
    const sim = makeArbalist(41_103, 10);
    const target = spawnTarget(sim, "rank10", 4);
    const rolls = [0, 0];

    expect(
      applyMir4NativeSeekingBoltDirectContact(
        sim.ctx,
        sim.player,
        target,
        411002,
        10,
        true,
        () => rolls.shift() ?? 9_999,
      ),
    ).toEqual({
      applied: true,
      evasionReduced: true,
      soulDestructionTriggered: true,
      stunned: true,
    });
    expect(mir4NativeStatusBonus(target, 29)).toBe(-300);
    expect(
      target.mir4Effects?.active.find(
        (effect) => effect.effectId === "mir4_native_buff_40536",
      ),
    ).toMatchObject({ kind: "stun", remaining: 4 });
  });

  it("uses the exact rank-5 Critical Hit proc threshold before attempting Stun", () => {
    const sim = makeArbalist(41_106, 5);
    const target = spawnTarget(sim, "rank5_threshold", 4);
    const successRolls = [1_999, 0];

    expect(
      applyMir4NativeSeekingBoltDirectContact(
        sim.ctx,
        sim.player,
        target,
        411002,
        5,
        true,
        () => successRolls.shift() ?? 9_999,
      ),
    ).toMatchObject({
      soulDestructionTriggered: true,
      stunned: true,
    });
    target.mir4Effects = undefined;
    target.auras = [];
    expect(
      applyMir4NativeSeekingBoltDirectContact(
        sim.ctx,
        sim.player,
        target,
        411002,
        5,
        true,
        () => 2_000,
      ),
    ).toMatchObject({
      soulDestructionTriggered: false,
      stunned: false,
    });
  });

  it("grants the strongest learned rank-8 or rank-10 party Accuracy aura", () => {
    const sim = makeArbalist(41_104, 8);
    expect(mir4NativeSeekingBoltPartyAccuracy(sim.ctx, sim.player)).toBe(20);

    const allyId = sim.addPlayer("arbalist", "Seeking Bolt Party QA");
    const ally = sim.entities.get(allyId);
    const allyMeta = sim.players.get(allyId);
    if (!ally?.mir4 || !allyMeta) throw new Error("missing Arbalist ally");
    ally.mir4.classId = 4;
    allyMeta.mir4SkillLevels = {
      ...(allyMeta.mir4SkillLevels ?? {}),
      4110: 10,
    };
    sim.partyInvite(allyId, sim.playerId);
    sim.partyAccept(allyId);

    expect(mir4NativeSeekingBoltPartyAccuracy(sim.ctx, sim.player)).toBe(50);
    expect(mir4NativeSeekingBoltPartyAccuracy(sim.ctx, ally)).toBe(50);

    ally.dead = true;
    expect(mir4NativeSeekingBoltPartyAccuracy(sim.ctx, sim.player)).toBe(20);
  });

  it("keeps lower ranks evadable and never applies the critical package without a Critical Hit", () => {
    const sim = makeArbalist(41_105, 5);
    const target = spawnTarget(sim, "rank5", 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4110, target.id)).toEqual({
      ok: true,
    });
    const damage = (sim.player.mir4PendingImpacts ?? []).find(
      (impact) => impact.skillId === 4110 && !impact.effectOnly,
    );
    expect(damage?.forceHit).toBeUndefined();
    expect(
      applyMir4NativeSeekingBoltDirectContact(
        sim.ctx,
        sim.player,
        target,
        411002,
        5,
        false,
        () => 0,
      ),
    ).toEqual({
      applied: false,
      evasionReduced: false,
      soulDestructionTriggered: false,
      stunned: false,
    });
    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: "unrelated_immunity_probe",
        kind: "control-immunity",
        durationSeconds: 1,
        name: "Control Immunity Probe",
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
  });
});
