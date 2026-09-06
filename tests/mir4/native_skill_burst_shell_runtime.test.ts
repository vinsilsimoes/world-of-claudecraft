import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_030): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Burst Shell Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, x: number, z: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `burst_shell_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4PhysicalDefense: 0,
    mir4MagicDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function forceSkillContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4103 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let tick = 0; tick < count; tick += 1) events.push(...sim.tick());
  return events;
}

describe('MIR4 Burst Shell integrated runtime', () => {
  it('approaches from outside 12 yards and schedules the Focus plus five Totem contacts', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'approach', sim.player.pos.x, sim.player.pos.z + 18);
    sim.player.targetId = target.id;
    const resource = sim.player.resource;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_4103', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(sim.player.resource).toBe(resource);

    let ticks = 0;
    while (!sim.player.cooldowns.has('4103') && ticks++ < 240) sim.tick();

    expect(ticks).toBeLessThan(240);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
    expect(sim.player.resource).toBeLessThan(resource);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4103)
        .map((impact) => [
          impact.effectOnly === true ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
        ]),
    ).toEqual([
      ['arbalist-focus', 400],
      [410311, 1450],
      [410311, 1500],
      [410312, 1600],
      [410313, 1700],
      [410313, 1750],
    ]);
  });

  it('grants Focus at 400ms and refreshes five circular contacts against at most five mobs', () => {
    const sim = makeArbalist(41_031);
    const origin = { ...sim.player.pos };
    const targets = Array.from({ length: 6 }, (_, index) =>
      spawnTarget(sim, `wave_${index}`, origin.x + index * 0.15, origin.z + 4 + index * 0.15),
    );
    const outside = spawnTarget(sim, 'outside', origin.x, origin.z + 12.1);
    sim.player.targetId = targets[0]!.id;
    sim.player.mir4UltGauge = 0;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4103, targets[0]!.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    tickMany(sim, 9);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1, duration: 30 });

    const events = tickMany(sim, 28);
    const damageEvents = events.filter(
      (event): event is Extract<SimEvent, { type: 'damage' }> =>
        event.type === 'damage' && event.ability === 'Projétil Explosivo',
    );
    expect(damageEvents).toHaveLength(5 * 5);
    for (const target of targets.slice(0, 5)) {
      expect(damageEvents.filter((event) => event.targetId === target.id)).toHaveLength(5);
    }
    expect(damageEvents.some((event) => event.targetId === targets[5]!.id)).toBe(false);
    expect(damageEvents.some((event) => event.targetId === outside.id)).toBe(false);
    expect(
      events.filter((event) => event.type === 'damage' && event.ability !== 'Projétil Explosivo'),
    ).toEqual([]);
    expect(sim.player.mir4UltGauge).toBeCloseTo(16.25, 6);
    expect(targets.slice(0, 5).every((target) => (target.threat.get(sim.playerId) ?? 0) > 0)).toBe(
      true,
    );
  });

  it('releases the actor after 1100ms while the independent device keeps resolving', () => {
    const sim = makeArbalist(41_033);
    const target = spawnTarget(sim, 'actor_release', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4103, target.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    tickMany(sim, 23);
    expect(
      (sim.player.mir4PendingImpacts ?? []).some(
        (impact) => impact.skillId === 4103 && impact.nativeTotem !== undefined,
      ),
    ).toBe(true);
    expect(castMir4Skill(sim.ctx, sim.playerId, 4101, target.id)).toEqual({ ok: true });
  });

  it('applies rank-10 defense, burn and amplification on the first landed explosion', () => {
    const sim = makeArbalist(41_032);
    const target = spawnTarget(sim, 'rank10', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;
    sim.players.get(sim.playerId)!.mir4SkillLevels = { 4103: 10 };

    expect(castMir4Skill(sim.ctx, sim.playerId, 4103, target.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    tickMany(sim, 30);

    expect(mir4NativeStatusBonus(target, 24)).toBe(-200);
    expect(mir4NativeStatusBonus(target, 26)).toBe(-200);
    expect(mir4NativeStatusBonus(target, 47)).toBe(-2500);
    expect(target.mir4NativePeriodicDamage).toEqual([
      expect.objectContaining({
        buffId: 40505,
        skillId: 4103,
        attackId: 410311,
        entries: [{ buffIndex: 2002, channel: 'physical', rawDamage: 200 }],
      }),
    ]);
  });
});
