import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { mir4NativeControlImmune } from '../../src/sim/mir4/native_control_immunity';
import { applyMir4NativeSweepingStormContact } from '../../src/sim/mir4/native_skill_sweeping_storm';
import { mir4ModifiedSkillCooldownSeconds } from '../../src/sim/mir4/status_effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 54_010,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Sweeping Storm Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_700 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1_000;
  sim.player.spellPower = 1_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, forward: number, side: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `sweeping_storm_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const sin = Math.sin(sim.player.facing);
  const cos = Math.cos(sim.player.facing);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(
      sim.player.pos.x + sin * forward + cos * side,
      sim.player.pos.z + cos * forward - sin * side,
    ),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Lancer 5401 Sweeping Storm integrated runtime', () => {
  it('schedules both damage channels for all six native contact moments', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 4, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5401, target.id)).toEqual({ ok: true });
    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 5401 && !impact.effectOnly,
    );
    expect(impacts).toHaveLength(12);
    expect(impacts.map((impact) => Math.round((impact.dueAt - sim.time) * 1_000))).toEqual([
      20, 20, 240, 240, 400, 400, 510, 510, 660, 660, 840, 840,
    ]);
    expect(impacts.map((impact) => impact.channel)).toEqual([
      'physical',
      'magic',
      'physical',
      'magic',
      'physical',
      'magic',
      'physical',
      'magic',
      'physical',
      'magic',
      'physical',
      'magic',
    ]);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4SkillGuide',
        sourceId: sim.playerId,
        skillId: 5401,
        attackId: 540102,
        shape: 'circle',
        radiusYards: 5.5,
        aliveMs: 300,
        scalingMs: 100,
      }),
    );
  });

  it('grants control immunity at action start and preserves six distinct contacts', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 4, 0, 'immunity');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5401, target.id)).toEqual({ ok: true });
    expect(mir4NativeControlImmune(sim.player)).toBe(true);
    expect(sim.player.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_51011',
        duration: 1.5,
        remaining: 1.5,
      }),
    );

    for (const impact of sim.player.mir4PendingImpacts ?? []) {
      if (impact.skillId === 5401) {
        impact.forceHit = true;
        impact.forceCritical = false;
      }
    }
    const healthBefore = target.hp;
    for (const time of [0.02, 0.24, 0.4, 0.51, 0.66, 0.84]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
    }
    expect(target.hp).toBeLessThan(healthBefore);
    expect(
      (sim.player.mir4PendingImpacts ?? []).filter((impact) => impact.skillId === 5401),
    ).toEqual([]);
  });

  it('uses the 12-yard opening radius, then the 5.5-yard radius, with an eight-target cap', () => {
    const sim = makeLancer();
    const closeTargets = [1, 1.5, 2, 2.5, 3, 3.5, 4].map((forward, index) =>
      spawnTarget(sim, forward, index * 0.02, `radius_close_${index}`),
    );
    const eightYards = spawnTarget(sim, 8, 0, 'radius_eight');
    const nineYards = spawnTarget(sim, 9, 0, 'radius_nine');
    const primary = closeTargets[0];
    if (!primary) throw new Error('missing Sweeping Storm primary target');
    sim.player.targetId = primary.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5401, primary.id)).toEqual({ ok: true });
    for (const impact of sim.player.mir4PendingImpacts ?? []) {
      if (impact.skillId === 5401) {
        impact.forceHit = true;
        impact.forceCritical = false;
      }
    }

    const startedAt = sim.time;
    sim.time = startedAt + 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(closeTargets.every((target) => target.hp < target.maxHp)).toBe(true);
    expect(eightYards.hp).toBeLessThan(eightYards.maxHp);
    expect(nineYards.hp).toBe(nineYards.maxHp);

    const hpAfterOpening = new Map(
      [...closeTargets, eightYards, nineYards].map((target) => [target.id, target.hp]),
    );
    sim.time = startedAt + 0.24;
    updateMir4PendingImpacts(sim.ctx);
    expect(closeTargets.every((target) => target.hp < (hpAfterOpening.get(target.id) ?? 0))).toBe(
      true,
    );
    expect(eightYards.hp).toBe(hpAfterOpening.get(eightYards.id));
    expect(nineYards.hp).toBe(hpAfterOpening.get(nineYards.id));
  });

  it('applies the exact rank-1 monster package on the second contact', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 4, 0, 'rank1');
    const result = applyMir4NativeSweepingStormContact(
      sim.ctx,
      sim.player,
      target,
      540102,
      0,
      1,
      () => 9_999,
    );

    expect(result).toMatchObject({ applied: true, darknessStacks: 1 });
    expect(mir4NativeStatusBonus(target, 53)).toBe(-250);
    expect(mir4NativeStatusBonus(target, 20)).toBe(-100);
    expect(mir4NativeStatusBonus(target, 22)).toBe(-100);
    expect(mir4NativeStatusBonus(target, 95)).toBe(0);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_native_buff_30020_53', duration: 5 }),
    );
  });

  it('resolves rank-10 extra Darkness before the third-contact cooldown debuff', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 4, 0, 'rank10');
    const rolls = [0, 0];
    const second = applyMir4NativeSweepingStormContact(
      sim.ctx,
      sim.player,
      target,
      540102,
      0,
      10,
      () => rolls.shift() ?? 9_999,
    );
    expect(second.darknessStacks).toBe(3);
    expect(mir4NativeStatusBonus(target, 20)).toBe(-300);
    expect(mir4NativeStatusBonus(target, 22)).toBe(-300);
    expect(mir4NativeStatusBonus(target, 95)).toBe(0);

    const third = applyMir4NativeSweepingStormContact(
      sim.ctx,
      sim.player,
      target,
      540103,
      0,
      10,
      () => 9_999,
    );
    expect(third.cooldownReductionReduced).toBe(true);
    expect(mir4NativeStatusBonus(target, 95)).toBe(-10_000);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_native_buff_50508_95', duration: 20 }),
    );
  });

  it('uses the lower player attack reduction against a duel opponent', () => {
    const sim = makeLancer();
    const targetId = sim.addPlayer('warrior', 'Sweeping Storm PvP target');
    const target = sim.entities.get(targetId);
    if (!target) throw new Error('missing Sweeping Storm PvP target');
    sim.setPlayerLevel(120, targetId);
    target.pos = sim.groundPos(sim.player.pos.x + 4, sim.player.pos.z);
    target.prevPos = { ...target.pos };
    sim.rebucket(target);
    sim.duelRequest(targetId, sim.playerId);
    sim.duelAccept(targetId);
    for (let tick = 0; tick < 80 && sim.duelFor(sim.playerId)?.state !== 'active'; tick += 1) {
      sim.tick();
    }
    expect(sim.duelFor(sim.playerId)?.state).toBe('active');

    const result = applyMir4NativeSweepingStormContact(
      sim.ctx,
      sim.player,
      target,
      540102,
      0,
      10,
      () => 9_999,
    );

    expect(result).toMatchObject({ applied: true, darknessStacks: 1, attackReduced: true });
    expect(mir4NativeStatusBonus(target, 20)).toBe(-200);
    expect(mir4NativeStatusBonus(target, 22)).toBe(-200);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_native_buff_50507_20', duration: 20 }),
    );
  });

  it('lets the native debuff offset existing Skill Cooldown Reduction without exceeding base cooldown', () => {
    expect(mir4ModifiedSkillCooldownSeconds(10, { 95: 4_000 }, 'pve', -3_000)).toBe(9);
    expect(mir4ModifiedSkillCooldownSeconds(10, { 95: 4_000 }, 'pve', -5_000)).toBe(10);
    expect(mir4ModifiedSkillCooldownSeconds(10, { 95: 0 }, 'pve', -10_000)).toBe(10);
  });
});
