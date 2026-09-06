import { describe, expect, it } from "vitest";
import { updateAuras } from "../../src/sim/combat/auras";
import { mir4NativeSkillActionById } from "../../src/sim/content/mir4";
import { MIR4_MOBS } from "../../src/sim/content/mir4/mobs";
import { createMob } from "../../src/sim/entity";
import {
  castMir4Skill,
  updateMir4PendingImpacts,
} from "../../src/sim/mir4/combat";
import {
  applyMir4Effect,
  mir4NativeStatusBonus,
} from "../../src/sim/mir4/effects";
import {
  mir4NativeCloakingFocusBuffMatchesRow,
  mir4NativeCloakingPolicy,
} from "../../src/sim/mir4/native_skill_cloaking";
import { mir4NativeRuntimeTotemPlan } from "../../src/sim/mir4/native_skill_totem_runtime";
import { mir4RuntimeSkillExecutionAuthority } from "../../src/sim/mir4/runtime_skill_execution";
import { Sim } from "../../src/sim/sim";
import type { Entity, SimEvent } from "../../src/sim/types";
import { dist2d } from "../../src/sim/types";
import { placePlayerInOpenField } from "../helpers/open_field";
import { EMPTY_TEST_WORLD } from "../sim_shared";

function makeArbalist(seed: number, skillLevel: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: "hunter",
    playerClassMir4: "arbalist",
    playerName: "Cloaking Runtime QA",
    gameProfile: "mir4-gameplay-port",
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error("missing MIR4 player stats");
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error("missing Arbalist metadata");
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 4112: skillLevel };
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, x: number, z: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `cloaking_${suffix}`,
    hpBase: 10_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4PhysicalDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 10_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function resolveAt(sim: Sim, seconds: number): SimEvent[] {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
  return sim.drainEvents();
}

describe("MIR4 Arbalist 4112 Cloaking integrated runtime", () => {
  it("seals the exact three-row action and one-contact decoy plan", () => {
    const action = mir4NativeSkillActionById(4112);
    const focusRow = action?.rows[0];
    if (!focusRow) throw new Error("missing Cloaking focus row");

    expect(mir4NativeCloakingFocusBuffMatchesRow(focusRow)).toBe(true);
    const authority = mir4RuntimeSkillExecutionAuthority(4112);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 4112,
      cooldownMs: 60_000,
      skillCost: 5_500,
      attackAnimationMs: 600,
      endCutAnimationMs: 560,
      requiredClassLevel: 56,
      requiresTarget: false,
      sourceHitCount: 5,
      totem: { totemId: 1402 },
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([
      411201, 411202, 411203,
    ]);
    expect(authority?.plan?.rows[1]?.motion).toEqual({
      kind: "direct",
      nativeRange: 1_000,
      delayMs: 60,
      durationMs: 500,
    });
    expect(mir4NativeRuntimeTotemPlan(4112)).toMatchObject({
      skillId: 4112,
      spawnAttackId: 411201,
      totemId: 1402,
      spawnOffsetMs: 20,
      reconstruction: {
        anchor: "source-position-at-cast",
        lifetimeMs: 1_000,
      },
      aggregateCoefficient: 9_000,
      aggregateLevelUpCoefficient: 200,
      contacts: [
        {
          attackId: 411211,
          offsetMs: 720,
          area: { radiusMaxYards: 3.5, targetCap: 8 },
          reaction: { kind: "knock-back", moveDistanceYards: 0.3 },
        },
      ],
    });
  });

  it("maps every official rank band without interpolating milestone effects", () => {
    expect(mir4NativeCloakingPolicy(1)).toMatchObject({
      stealthDurationMs: 2_000,
      healingBasisPoints: 0,
      exitSkillDamageBasisPoints: 2_000,
      allDamageReductionBasisPoints: 0,
      knockdownResistanceBasisPoints: 0,
      stunResistanceBasisPoints: 0,
      movementSpeedNative: 0,
      usableWhileSilenced: false,
    });
    expect(mir4NativeCloakingPolicy(5)).toMatchObject({
      stealthDurationMs: 3_000,
      healingBasisPoints: 1_000,
      exitSkillDamageBasisPoints: 3_000,
    });
    expect(mir4NativeCloakingPolicy(8)).toMatchObject({
      stealthDurationMs: 4_000,
      healingBasisPoints: 2_000,
      exitSkillDamageBasisPoints: 5_000,
      allDamageReductionBasisPoints: 2_500,
      knockdownResistanceBasisPoints: 2_000,
      stunResistanceBasisPoints: 0,
      movementSpeedNative: 100,
      usableWhileSilenced: true,
    });
    expect(mir4NativeCloakingPolicy(10)).toMatchObject({
      stealthDurationMs: 5_000,
      healingBasisPoints: 3_000,
      exitSkillDamageBasisPoints: 8_000,
      allDamageReductionBasisPoints: 5_000,
      knockdownResistanceBasisPoints: 5_000,
      stunResistanceBasisPoints: 5_000,
      movementSpeedNative: 300,
      usableWhileSilenced: true,
    });
  });

  it("commits targetless, applies Focus at 20 ms and cloaks at 80 ms", () => {
    const sim = makeArbalist(41_121, 10);
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error("missing Arbalist metadata");
    meta.autoBattle = {
      mode: "battle",
      anchorX: sim.player.pos.x,
      anchorZ: sim.player.pos.z,
      acquireRadiusYards: 30,
      suspended: false,
    };
    const hostile = spawnTarget(
      sim,
      "threat_reset",
      sim.player.pos.x,
      sim.player.pos.z + 2,
    );
    hostile.threat.set(sim.playerId, 100);
    hostile.aggroTargetId = sim.playerId;
    hostile.inCombat = true;
    hostile.aiState = "chase";
    sim.player.maxHp = 1_000;
    sim.player.hp = 500;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4112)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4112)
        .map((impact) => [
          impact.nativeSetup ?? impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1_000),
        ]),
    ).toEqual([
      ["arbalist-focus", 20],
      ["arbalist-cloaking", 80],
      [411211, 720],
    ]);

    resolveAt(sim, 0.02);
    expect(
      sim.player.mir4Effects?.active.find(
        (effect) => effect.effectId === "mir4_native_buff_41010",
      ),
    ).toMatchObject({ nativeStacks: 1 });
    expect(sim.player.stealthed).toBe(false);

    resolveAt(sim, 0.08);
    expect(sim.player.stealthed).toBe(true);
    expect(sim.player.hp).toBe(800);
    expect(meta.autoBattle.mode).toBe("off");
    expect(sim.player.targetId).toBeNull();
    expect(hostile.threat.has(sim.playerId)).toBe(false);
    expect(hostile.aggroTargetId).toBeNull();
    expect(hostile.aiState).toBe("evade");
    expect(mir4NativeStatusBonus(sim.player, 47)).toBe(5_000);
    expect(mir4NativeStatusBonus(sim.player, 49)).toBe(5_000);
    expect(mir4NativeStatusBonus(sim.player, 76)).toBe(300);
    expect(mir4NativeStatusBonus(sim.player, 120)).toBe(5_000);
  });

  it("moves ten yards along the captured facing from 60 to 560 ms", () => {
    const sim = makeArbalist(41_122, 1);
    sim.player.facing = Math.PI / 2;
    const start = { ...sim.player.pos };

    expect(castMir4Skill(sim.ctx, sim.playerId, 4112)).toEqual({ ok: true });
    sim.tick();
    expect(dist2d(start, sim.player.pos)).toBe(0);
    sim.tick();
    expect(dist2d(start, sim.player.pos)).toBeCloseTo(0.8, 3);
    for (let tick = 0; tick < 10; tick += 1) sim.tick();
    expect(dist2d(start, sim.player.pos)).toBeCloseTo(10, 3);
    expect(sim.player.pos.x).toBeGreaterThan(start.x + 9.9);
    expect(sim.player.pos.z).toBeCloseTo(start.z, 3);
  });

  it("keeps the decoy contact at the cast origin and caps it at eight nearby enemies", () => {
    const sim = makeArbalist(41_123, 1);
    const origin = { ...sim.player.pos };
    const near = Array.from({ length: 9 }, (_, index) =>
      spawnTarget(
        sim,
        `origin_${index}`,
        origin.x + 0.2 + index * 0.15,
        origin.z + 0.2,
      ),
    );
    const destination = spawnTarget(
      sim,
      "destination",
      origin.x + 10,
      origin.z,
    );

    expect(castMir4Skill(sim.ctx, sim.playerId, 4112)).toEqual({ ok: true });
    const decoy = (sim.player.mir4PendingImpacts ?? []).find(
      (impact) => impact.skillId === 4112 && impact.attackId === 411211,
    );
    expect(decoy?.nativeTotem?.origin).toEqual(origin);
    if (decoy) {
      decoy.forceHit = true;
      decoy.forceCritical = false;
    }

    const events = resolveAt(sim, 0.72);
    expect(
      events.filter(
        (event) => event.type === "damage" && event.ability === "Ocultação",
      ),
    ).toHaveLength(8);
    expect(near.filter((target) => target.hp < target.maxHp)).toHaveLength(8);
    expect(destination.hp).toBe(destination.maxHp);
    expect(sim.player.stealthed).toBe(true);
  });

  it("applies the two-second exit damage buff on attack and natural expiry", () => {
    const attacked = makeArbalist(41_124, 10);
    const target = spawnTarget(
      attacked,
      "break_target",
      attacked.player.pos.x,
      attacked.player.pos.z + 4,
    );
    expect(castMir4Skill(attacked.ctx, attacked.playerId, 4112)).toEqual({
      ok: true,
    });
    for (let tick = 0; tick < 21; tick += 1) attacked.tick();
    expect(
      castMir4Skill(attacked.ctx, attacked.playerId, 4101, target.id),
    ).toEqual({ ok: true });
    expect(attacked.player.stealthed).toBe(false);
    expect(mir4NativeStatusBonus(attacked.player, 44)).toBe(8_000);

    const expired = makeArbalist(41_125, 5);
    expect(castMir4Skill(expired.ctx, expired.playerId, 4112)).toEqual({
      ok: true,
    });
    resolveAt(expired, 0.08);
    const cloak = expired.player.auras.find(
      (aura) => aura.id === "mir4_native_buff_40108",
    );
    if (!cloak) throw new Error("missing Cloaking aura");
    cloak.remaining = 0;
    updateAuras(expired.ctx, expired.player);
    expect(expired.player.stealthed).toBe(false);
    expect(mir4NativeStatusBonus(expired.player, 44)).toBe(3_000);
  });

  it("admits rank 8 while silenced but keeps rank 7 blocked", () => {
    for (const [rank, expected] of [
      [7, { ok: false, reason: "silenced" }],
      [8, { ok: true }],
    ] as const) {
      const sim = makeArbalist(41_130 + rank, rank);
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: `cloaking_silence_${rank}`,
        kind: "silence",
        durationSeconds: 10,
        magnitude: 0,
        name: "Silence",
        sourceId: 999,
      });
      expect(castMir4Skill(sim.ctx, sim.playerId, 4112)).toEqual(expected);
    }
  });
});
