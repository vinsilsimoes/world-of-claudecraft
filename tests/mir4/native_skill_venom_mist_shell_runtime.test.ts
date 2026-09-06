import { describe, expect, it } from "vitest";
import { MIR4_MOBS } from "../../src/sim/content/mir4/mobs";
import { createMob } from "../../src/sim/entity";
import { castMir4Skill } from "../../src/sim/mir4/combat";
import {
  applyMir4Effect,
  mir4EffectAdmits,
  mir4InvincibilityBlocked,
  mir4NativeStatusBonus,
  updateMir4Effects,
} from "../../src/sim/mir4/effects";
import { mir4NativeDarknessStacks } from "../../src/sim/mir4/native_darkness";
import { mir4NativeRuntimeProjectilePolicy } from "../../src/sim/mir4/native_skill_projectile";
import {
  applyMir4NativeVenomMistShellDirectContact,
  mir4NativeVenomMistShellPersistentBossDamageReductionBps,
  mir4NativeVenomMistShellPolicy,
} from "../../src/sim/mir4/native_skill_venom_mist_shell";
import { mir4RuntimeSkillExecutionAuthority } from "../../src/sim/mir4/runtime_skill_execution";
import { requestMir4SkillActivation } from "../../src/sim/mir4/skill_activation";
import {
  mir4ModifiedPotionAmount,
  mir4ModifiedSkillHealing,
} from "../../src/sim/mir4/status_effects";
import { Sim } from "../../src/sim/sim";
import type { SimEvent } from "../../src/sim/types";
import { dist2d } from "../../src/sim/types";
import { placePlayerInOpenField } from "../helpers/open_field";
import { EMPTY_TEST_WORLD } from "../sim_shared";

function makeArbalist(seed = 41_040): Sim {
  const sim = new Sim({
    seed,
    playerClass: "hunter",
    playerClassMir4: "arbalist",
    playerName: "Venom Mist Runtime QA",
    gameProfile: "mir4-gameplay-port",
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error("missing MIR4 player stats");
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error("missing MIR4 player metadata");
  meta.mir4DisabledAutoSkills = [
    4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109, 4110, 4111, 4112,
    4501,
  ];
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, distance: number) {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `venom_mist_${suffix}`,
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

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4104 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  return Array.from({ length: count }, () => sim.tick()).flat();
}

describe("MIR4 Venom Mist Shell integrated runtime", () => {
  it("pins the exact rank 1, 5, 8, and 10 milestone policy", () => {
    expect(mir4NativeVenomMistShellPolicy(1)).toMatchObject({
      mark: { durationMs: 5_000, nativeStatusId: 31, nativeMagnitude: -25 },
      darkness: { durationMs: 5_000, extraStackChanceBasisPoints: 0 },
      skillHealingReduction: null,
      hpPotionReduction: null,
      invincibilityBlock: null,
      persistentBossDamageReductionBasisPoints: 0,
    });
    expect(mir4NativeVenomMistShellPolicy(5)).toMatchObject({
      mark: { durationMs: 8_000 },
      darkness: { durationMs: 8_000, extraStackChanceBasisPoints: 0 },
      skillHealingReduction: {
        buffId: 40507,
        durationMs: 10_000,
        nativeMagnitudeBasisPoints: -3_000,
      },
    });
    expect(mir4NativeVenomMistShellPolicy(8)).toMatchObject({
      mark: { durationMs: 10_000 },
      darkness: { durationMs: 10_000, extraStackChanceBasisPoints: 5_000 },
      skillHealingReduction: {
        buffId: 40507,
        durationMs: 15_000,
        nativeMagnitudeBasisPoints: -4_000,
      },
      invincibilityBlock: { durationMs: 10_000, unremovable: true },
      persistentBossDamageReductionBasisPoints: 1_000,
    });
    expect(mir4NativeVenomMistShellPolicy(10)).toMatchObject({
      darkness: { extraStackChanceBasisPoints: 9_000 },
      skillHealingReduction: {
        buffId: 40508,
        durationMs: 20_000,
        nativeMagnitudeBasisPoints: -5_000,
      },
      hpPotionReduction: {
        durationMs: 20_000,
        nativeMagnitudeBasisPoints: -1_000,
      },
      invincibilityBlock: { durationMs: 20_000, unremovable: true },
      persistentBossDamageReductionBasisPoints: 1_500,
    });
  });

  it("admits the curved projectile, one direct hit, and eight Totem contacts", () => {
    const authority = mir4RuntimeSkillExecutionAuthority(4104);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 4104,
      attackAnimationMs: 1267,
      endCutAnimationMs: 1140,
      sourceHitCount: 5,
      requiresTarget: true,
      range: { nativeContactDistanceMax: 1200, blockingCheck: true },
      totem: { totemId: 1405 },
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([
      410401, 410402, 410403,
    ]);
    expect(authority?.plan?.rows[0]?.projectile).toEqual(
      mir4NativeRuntimeProjectilePolicy(4104, 410401),
    );
    expect(authority?.plan?.rows[2]?.contacts).toEqual([
      expect.objectContaining({
        offsetMs: 750,
        damage: expect.objectContaining({
          coefficient: 5500,
          levelUpCoefficient: 110,
        }),
      }),
    ]);
    expect(authority?.plan?.totem?.contacts).toHaveLength(8);
  });

  it("approaches to trace stop and schedules Focus plus all nine damage contacts", () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, "approach", 18);
    sim.player.targetId = target.id;

    expect(
      requestMir4SkillActivation(
        sim.ctx,
        "mir4_skill_4104",
        sim.playerId,
        target.id,
      ),
    ).toEqual({
      ok: true,
      queued: true,
    });
    let ticks = 0;
    while (!sim.player.cooldowns.has("4104") && ticks++ < 240) sim.tick();

    expect(ticks).toBeLessThan(240);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4104)
        .map((impact) => [
          impact.effectOnly ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
        ])
        .sort((left, right) => Number(left[1]) - Number(right[1])),
    ).toEqual([
      ["arbalist-focus", 220],
      [410403, 750],
      [410411, 890],
      [410411, 1290],
      [410412, 1490],
      [410412, 1690],
      [410413, 1890],
      [410413, 2090],
      [410414, 2290],
      [410414, 2490],
    ]);
  });

  it("resolves nine damage contacts and grants one Focus stack", () => {
    const sim = makeArbalist(41_041);
    const target = spawnTarget(sim, "contacts", 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4104, target.id)).toEqual({
      ok: true,
    });
    sim.player.targetId = null;
    forceContacts(sim);
    const events = tickMany(sim, 55);

    expect(
      events.filter(
        (event) =>
          event.type === "damage" &&
          event.targetId === target.id &&
          event.ability === "Escudo da Névoa Venenosa",
      ),
    ).toHaveLength(9);
    expect(
      sim.player.mir4Effects?.active.find(
        (effect) => effect.effectId === "mir4_native_buff_41010",
      ),
    ).toMatchObject({ nativeStacks: 1 });
    expect(mir4NativeStatusBonus(target, 31)).toBe(-25);
    expect(mir4NativeDarknessStacks(target)).toBe(1);
  });

  it("applies rank-10 recovery penalties, extra Darkness, and the unremovable Invincible block", () => {
    const sim = makeArbalist(41_042);
    const target = spawnTarget(sim, "rank10", 4);
    (sim.ctx.rng as { next: () => number }).next = () => 0;

    expect(
      applyMir4NativeVenomMistShellDirectContact(
        sim.ctx,
        sim.player,
        target,
        410411,
        10,
      ),
    ).toMatchObject({ applied: false });
    expect(
      applyMir4NativeVenomMistShellDirectContact(
        sim.ctx,
        sim.player,
        target,
        410403,
        10,
      ),
    ).toEqual({
      applied: true,
      markApplied: true,
      darknessStacks: 2,
      extraDarknessApplied: true,
      skillHealingReduced: true,
      hpPotionReduced: true,
      invincibilityBlocked: true,
    });
    expect(mir4NativeStatusBonus(target, 31)).toBe(-25);
    expect(mir4NativeStatusBonus(target, 53)).toBe(-500);
    expect(mir4NativeStatusBonus(target, 148)).toBe(-5_000);
    expect(mir4NativeStatusBonus(target, 146)).toBe(-1_000);
    expect(
      mir4ModifiedSkillHealing(
        1_000,
        undefined,
        mir4NativeStatusBonus(target, 148),
      ),
    ).toBe(500);
    expect(
      mir4ModifiedPotionAmount(
        1_000,
        "hp",
        undefined,
        mir4NativeStatusBonus(target, 146),
      ),
    ).toBe(900);
    expect(mir4InvincibilityBlocked(target)).toBe(true);
    expect(
      target.mir4Effects?.active.find(
        (effect) => effect.kind === "invincibility-blocked",
      ),
    ).toMatchObject({ remaining: 20, unremovable: true });
    expect(
      mir4EffectAdmits(target, "new_invincible", "invincible", sim.time),
    ).toEqual({
      ok: false,
      code: "MIR4_CC_IMMUNE",
    });
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: "new_invincible",
        kind: "invincible",
        durationSeconds: 1,
        name: "Invincible",
        sourceId: target.id,
      }),
    ).toEqual({ ok: false, code: "MIR4_CC_IMMUNE" });

    const blocker = target.mir4Effects?.active.find(
      (effect) => effect.kind === "invincibility-blocked",
    );
    if (!blocker) throw new Error("missing invincibility blocker");
    blocker.remaining = 0;
    updateMir4Effects(sim.ctx);
    expect(mir4InvincibilityBlocked(target)).toBe(false);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: "new_invincible",
        kind: "invincible",
        durationSeconds: 1,
        name: "Invincible",
        sourceId: target.id,
      }),
    ).toEqual({ ok: true });
  });

  it("grants only the exact learned rank-8 and rank-10 persistent boss reduction", () => {
    const sim = makeArbalist(41_043);
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error("missing MIR4 player metadata");
    meta.mir4SkillLevels ??= {};
    const levels = meta.mir4SkillLevels;
    levels[4104] = 7;
    expect(
      mir4NativeVenomMistShellPersistentBossDamageReductionBps(
        sim.ctx,
        sim.player,
      ),
    ).toBe(0);
    levels[4104] = 8;
    expect(
      mir4NativeVenomMistShellPersistentBossDamageReductionBps(
        sim.ctx,
        sim.player,
      ),
    ).toBe(1_000);
    levels[4104] = 10;
    expect(
      mir4NativeVenomMistShellPersistentBossDamageReductionBps(
        sim.ctx,
        sim.player,
      ),
    ).toBe(1_500);
  });
});
