import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 52_010,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Ravaging Blow Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, forward: number, side: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `ravaging_blow_target_${suffix}`,
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

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 5201) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Lancer 5201 Ravaging Blow integrated runtime', () => {
  it('schedules both hybrid channels at the exact six contact times', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 4, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5201, target.id)).toEqual({ ok: true });
    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 5201 && !impact.effectOnly,
    );
    expect(impacts).toHaveLength(12);
    expect([...new Set(impacts.map((impact) => Math.round((impact.dueAt - sim.time) * 1_000)))]).toEqual([
      480,
      690,
      880,
      1_000,
      1_150,
      1_300,
    ]);
    expect(new Set(impacts.map((impact) => impact.channel))).toEqual(
      new Set(['physical', 'magic']),
    );
  });

  it('advances two yards before the first contact and rebuilds a capped frontal strip', () => {
    const sim = makeLancer();
    const start = { ...sim.player.pos };
    const targets = [
      spawnTarget(sim, 4, 0, '0'),
      ...Array.from({ length: 8 }, (_, index) =>
        spawnTarget(sim, 5 + index * 0.1, -2.1 + index * 0.5, String(index + 1)),
      ),
    ];
    const behind = spawnTarget(sim, -1, 0, 'behind');
    const outsideSide = spawnTarget(sim, 5, 3.2, 'outside-side');
    sim.player.targetId = targets[0].id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5201, targets[0].id)).toEqual({ ok: true });
    forceContacts(sim);
    for (let tick = 0; tick < 10; tick += 1) sim.tick();

    expect(Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z)).toBeCloseTo(2, 5);
    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(targets[8].hp).toBe(targets[8].maxHp);
    expect(behind.hp).toBe(behind.maxHp);
    expect(outsideSide.hp).toBe(outsideSide.maxHp);
  });

  it('lands six hybrid moments, knocks back only on the fourth, and applies no invented slow', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 4, 0, 'six-hits');
    const start = { ...target.pos };
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5201, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events: SimEvent[] = [];

    for (const time of [0.48, 0.69, 0.88, 1, 1.15, 1.3]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
      events.push(...sim.drainEvents());
      if (time < 1) expect(target.pos).toEqual(start);
    }

    expect(
      events.filter((event) => event.type === 'damage' && event.targetId === target.id),
    ).toHaveLength(12);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        targetId: target.id,
        skillId: 5201,
        attackId: 520102,
        stance: 'hit-02',
      }),
    );
    expect(Math.hypot(target.pos.x - start.x, target.pos.z - start.z)).toBeCloseTo(1, 5);
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'slow')).toBe(false);
  });
});
