import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  mir4Invincible,
  mir4NativeStatusBonus,
  updateMir4Effects,
} from '../../src/sim/mir4/effects';
import {
  applyMir4NativeCrushingBlowFinalContact,
  mir4NativeCrushingBlowConditionalDamageBasisPoints,
  mir4NativeCrushingBlowKnockdownChanceBasisPoints,
} from '../../src/sim/mir4/native_skill_crushing_blow';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 53_030,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Crushing Blow Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(
  sim: Sim,
  forward: number,
  side: number,
  suffix: string,
  boss = false,
): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `crushing_blow_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    boss,
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

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 5303) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Lancer 5303 Crushing Blow integrated runtime', () => {
  it('lands all four contacts while the live four-yard QA formation advances both motions', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 4, 0, 'live-qa');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5303, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const damageEvents: SimEvent[] = [];
    const damageTimesMs: number[] = [];
    for (let tick = 0; tick < 24; tick += 1) {
      const events = sim.tick();
      const contactDamage = events.filter(
        (event) => event.type === 'damage' && event.targetId === target.id,
      );
      damageEvents.push(...contactDamage);
      if (contactDamage.length > 0) damageTimesMs.push(Math.round(sim.time * 1_000));
    }

    expect(damageTimesMs).toEqual([400, 550, 700, 900]);
    expect(damageEvents).toHaveLength(4);
  });

  it('schedules exact contacts, movement, guide and one-second Invincible', () => {
    const sim = makeLancer();
    const start = { ...sim.player.pos };
    const target = spawnTarget(sim, 5, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5303, target.id)).toEqual({ ok: true });
    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 5303 && !impact.effectOnly,
    );
    expect(impacts.map((impact) => Math.round((impact.dueAt - sim.time) * 1_000))).toEqual([
      400, 550, 700, 890,
    ]);
    expect(impacts.map((impact) => impact.rawDamage)).toEqual([600, 600, 600, 600]);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4SkillGuide',
        sourceId: sim.playerId,
        skillId: 5303,
        attackId: 530302,
        shape: 'circle',
        radiusYards: 5,
        aliveMs: 700,
        scalingMs: 500,
      }),
    );

    sim.time = 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4Invincible(sim.player)).toBe(true);
    for (let tick = 0; tick < 20; tick += 1) updateMir4Effects(sim.ctx);
    expect(mir4Invincible(sim.player)).toBe(false);

    expect(castMir4Skill).toBeDefined();
    const action = sim.players.get(sim.playerId)?.mir4SkillAction;
    expect(
      action?.motions.map((motion) => ({
        startMs: motion.startMs,
        durationMs: motion.durationMs,
        distance: Math.hypot(motion.endX - motion.startX, motion.endZ - motion.startZ),
      })),
    ).toEqual([
      { startMs: 0, durationMs: 300, distance: 8 },
      { startMs: 350, durationMs: 400, distance: 4 },
    ]);
    expect(Math.hypot(start.x - sim.player.pos.x, start.z - sim.player.pos.z)).toBe(0);
  });

  it('caps every circular contact at eight targets and emits the authored reactions', () => {
    const sim = makeLancer();
    const primary = spawnTarget(sim, 5, 0, 'primary');
    const targets = [
      primary,
      ...Array.from({ length: 8 }, (_, index) =>
        spawnTarget(sim, 5 + index * 0.05, -2 + index * 0.5, String(index)),
      ),
    ];
    sim.player.targetId = primary.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5303, primary.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events: SimEvent[] = [];
    const contactTargetCounts: number[] = [];
    for (let tick = 0; tick < 20; tick += 1) {
      const healthBefore = new Map(targets.map((target) => [target.id, target.hp]));
      events.push(...sim.tick());
      const damagedTargets = targets.filter(
        (target) => target.hp < (healthBefore.get(target.id) ?? target.hp),
      ).length;
      if (damagedTargets > 0) contactTargetCounts.push(damagedTargets);
    }
    expect(contactTargetCounts.every((count) => count <= 8)).toBe(true);
    expect(contactTargetCounts).toContain(8);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 5303,
        attackId: 530302,
        stance: 'hit-01',
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 5303,
        attackId: 530303,
        stance: 'down-02',
      }),
    );
  });

  it('applies the boss package and source rank buffs through native status lanes', () => {
    const sim = makeLancer();
    const ordinary = spawnTarget(sim, 5, 0, 'ordinary');
    const boss = spawnTarget(sim, 5, 0, 'boss', true);
    expect(mir4NativeCrushingBlowConditionalDamageBasisPoints(sim.ctx, ordinary, 5303, 10)).toBe(
      10_000,
    );
    expect(mir4NativeCrushingBlowConditionalDamageBasisPoints(sim.ctx, boss, 5303, 5)).toBe(12_500);
    expect(mir4NativeCrushingBlowConditionalDamageBasisPoints(sim.ctx, boss, 5303, 8)).toBe(15_000);
    expect(mir4NativeCrushingBlowConditionalDamageBasisPoints(sim.ctx, boss, 5303, 10)).toBe(
      20_000,
    );

    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Lancer metadata');
    meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 5303: 10 };
    sim.player.targetId = ordinary.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5303, ordinary.id)).toEqual({ ok: true });
    sim.time = 0.4;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeStatusBonus(sim.player, 44)).toBe(3_000);
    expect(mir4NativeStatusBonus(sim.player, 95)).toBe(5_000);
  });

  it('uses the player chance ladder and applies resistance loss only after failed knockdown', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 5, 0, 'control');
    target.kind = 'player';
    target.ownerId = null;
    expect(mir4NativeCrushingBlowKnockdownChanceBasisPoints(sim.player, target, 1)).toBe(1_000);
    expect(mir4NativeCrushingBlowKnockdownChanceBasisPoints(sim.player, target, 5)).toBe(3_000);
    expect(mir4NativeCrushingBlowKnockdownChanceBasisPoints(sim.player, target, 8)).toBe(6_000);
    expect(mir4NativeCrushingBlowKnockdownChanceBasisPoints(sim.player, target, 10)).toBe(10_000);

    const failed = applyMir4NativeCrushingBlowFinalContact(
      sim.ctx,
      sim.player,
      target,
      530303,
      0,
      8,
      () => 9_999,
    );
    expect(failed).toEqual({ knockedDown: false, failureResistanceDebuffApplied: true });
    expect(mir4NativeStatusBonus(target, 120)).toBe(-1_500);

    const landed = applyMir4NativeCrushingBlowFinalContact(
      sim.ctx,
      sim.player,
      target,
      530303,
      0,
      10,
      () => 9_999,
    );
    expect(landed).toEqual({ knockedDown: true, failureResistanceDebuffApplied: false });
  });
});
