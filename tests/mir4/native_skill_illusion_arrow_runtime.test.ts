import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4NativeControlImmune } from '../../src/sim/mir4/native_control_immunity';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_020): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Illusion Arrow Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, x: number, z: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `illusion_arrow_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function forceSkillContacts(sim: Sim, critical = false): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4102 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = critical;
  }
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let tick = 0; tick < count; tick += 1) events.push(...sim.tick());
  return events;
}

function isDamageEvent(event: SimEvent): event is Extract<SimEvent, { type: 'damage' }> {
  return event.type === 'damage';
}

describe('MIR4 Illusion Arrow integrated runtime', () => {
  it('approaches from outside 7 yards and commits only at native trace reach', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'approach', sim.player.pos.x, sim.player.pos.z + 12);
    sim.player.targetId = target.id;
    const resource = sim.player.resource;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_4102', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(sim.player.resource).toBe(resource);

    let ticks = 0;
    while (!sim.player.cooldowns.has('4102') && ticks++ < 180) sim.tick();

    expect(ticks).toBeLessThan(180);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(6.5);
    expect(sim.player.resource).toBeLessThan(resource);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4102)
        .map((impact) => [
          impact.effectOnly === true ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1_000),
        ]),
    ).toEqual([
      [410201, 20],
      [410202, 400],
      [410203, 600],
      [410204, 800],
      [410205, 1000],
      ['arbalist-illusion-arrow-source-buffs', 20],
    ]);
  });

  it('grants Focus and 1.5 seconds of control immunity at the 20ms source contact', () => {
    const sim = makeArbalist(41_021);
    const target = spawnTarget(sim, 'source_buffs', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4102, target.id)).toEqual({ ok: true });
    sim.tick();

    expect(mir4NativeControlImmune(sim.player)).toBe(true);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1, duration: 30 });
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_40114'),
    ).toMatchObject({ kind: 'control-immunity', duration: 1.5 });

    tickMany(sim, 30);
    expect(mir4NativeControlImmune(sim.player)).toBe(false);
  });

  it('re-resolves five 10-yard waves with full damage to at most eight enemies', () => {
    const sim = makeArbalist(41_022);
    const origin = { ...sim.player.pos };
    const targets = Array.from({ length: 9 }, (_, index) =>
      spawnTarget(sim, `wave_${index}`, origin.x + index * 0.15, origin.z + 4 + index * 0.15),
    );
    const outside = spawnTarget(sim, 'outside', origin.x, origin.z + 10.1);
    sim.player.targetId = targets[0]!.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4102, targets[0]!.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    const events = tickMany(sim, 21);
    const damageEvents = events
      .filter(isDamageEvent)
      .filter((event) => event.ability === 'Seta da Ilusão');

    expect(damageEvents).toHaveLength(8 * 5);
    for (const target of targets.slice(0, 8)) {
      expect(damageEvents.filter((event) => event.targetId === target.id)).toHaveLength(5);
    }
    expect(damageEvents.some((event) => event.targetId === targets[8]!.id)).toBe(false);
    expect(damageEvents.some((event) => event.targetId === outside.id)).toBe(false);
  });

  it('applies rank-10 EVA after the second landed wave and refreshes it for five seconds', () => {
    const sim = makeArbalist(41_023);
    const target = spawnTarget(sim, 'rank10', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;
    sim.players.get(sim.playerId)!.mir4SkillLevels = { 4102: 10 };

    expect(castMir4Skill(sim.ctx, sim.playerId, 4102, target.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    tickMany(sim, 9);

    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_40102'),
    ).toMatchObject({ kind: 'dodge-boost', duration: 5, magnitude: 500 });
  });
});
