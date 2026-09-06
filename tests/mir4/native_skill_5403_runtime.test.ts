import { describe, expect, it } from "vitest";
import { MIR4_MOBS } from "../../src/sim/content/mir4/mobs";
import { DUNGEON_X_THRESHOLD } from "../../src/sim/data";
import { createMob } from "../../src/sim/entity";
import {
  castMir4Skill,
  updateMir4PendingImpacts,
} from "../../src/sim/mir4/combat";
import {
  mir4EffectiveSpellPower,
  mir4NativeStatusBonus,
} from "../../src/sim/mir4/effects";
import { mir4NativeControlImmune } from "../../src/sim/mir4/native_control_immunity";
import {
  applyMir4NativeWindWallPartyBuffs,
  applyMir4NativeWindWallSourceBuffs,
} from "../../src/sim/mir4/native_skill_wind_wall";
import { Sim } from "../../src/sim/sim";
import { placePlayerInOpenField } from "../helpers/open_field";
import { EMPTY_TEST_WORLD } from "../sim_shared";

function makeLancer(rank = 1): Sim {
  const sim = new Sim({
    seed: 54_030,
    playerClass: "warrior",
    playerClassMir4: "lancer",
    playerName: "Wind Wall QA",
    gameProfile: "mir4-gameplay-port",
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, {
    x: DUNGEON_X_THRESHOLD + 100,
    z: 2_700,
  });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1_000;
  sim.player.spellPower = 1_000;
  sim.players.get(sim.playerId)!.mir4SkillLevels = { 5403: rank };
  if (!sim.player.mir4) throw new Error("missing MIR4 player stats");
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim) {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: "wind_wall_target",
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z + 4),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

describe("MIR4 Lancer 5403 Wind Wall integrated runtime", () => {
  it("schedules both damage channels at all five native contacts and grants casting immunity", () => {
    const sim = makeLancer(1);
    const target = spawnTarget(sim);
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5403, target.id)).toEqual({
      ok: true,
    });
    expect(mir4NativeControlImmune(sim.player)).toBe(true);
    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 5403 && !impact.effectOnly,
    );
    expect(impacts).toHaveLength(10);
    expect(
      impacts.map((impact) => Math.round((impact.dueAt - sim.time) * 1_000)),
    ).toEqual([20, 20, 300, 300, 400, 400, 510, 510, 620, 620]);
    expect(impacts.map((impact) => impact.channel)).toEqual([
      "physical",
      "magic",
      "physical",
      "magic",
      "physical",
      "magic",
      "physical",
      "magic",
      "physical",
      "magic",
    ]);
  });

  it("applies base source defenses and the rank-10 source/party package at authored times", () => {
    const sim = makeLancer(10);
    expect(applyMir4NativeWindWallSourceBuffs(sim.ctx, sim.player, 10)).toBe(
      true,
    );
    expect(mir4NativeStatusBonus(sim.player, 47)).toBe(2_000);
    expect(mir4NativeStatusBonus(sim.player, 35)).toBe(4_200);
    expect(
      applyMir4NativeWindWallPartyBuffs(sim.ctx, sim.player, sim.player, 10),
    ).toBe(true);
    expect(mir4NativeStatusBonus(sim.player, 42)).toBe(3_000);
    expect(mir4NativeStatusBonus(sim.player, 43)).toBe(8_000);
    expect(mir4NativeStatusBonus(sim.player, 47)).toBe(9_000);
    expect(mir4EffectiveSpellPower(sim.player, sim.ctx)).toBe(1_100);
  });

  it("dispatches source and party buffs from the integrated pending-impact queue", () => {
    const sim = makeLancer(5);
    const target = spawnTarget(sim);
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5403, target.id)).toEqual({
      ok: true,
    });
    const startedAt = sim.time;
    sim.time = startedAt + 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeStatusBonus(sim.player, 47)).toBe(2_000);
    sim.time = startedAt + 0.2;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeStatusBonus(sim.player, 42)).toBe(1_500);
    expect(mir4NativeStatusBonus(sim.player, 47)).toBe(5_000);
    expect(mir4NativeStatusBonus(sim.player, 43)).toBe(2_000);
  });
});
