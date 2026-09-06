import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(skillLevel = 10): Sim {
  const sim = new Sim({
    seed: 32_030,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Soaring Slash Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_000 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3203: skillLevel };
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, forward: number, side: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `soaring_slash_target_${suffix}`,
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
    if (impact.skillId !== 3203) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Taoist 3203 Soaring Slash integrated runtime', () => {
  it('schedules both hybrid channels on the exact nine native contact times', () => {
    const sim = makeTaoist();
    const target = spawnTarget(sim, 3, 0, 'anchor');
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3203, target.id)).toEqual({ ok: true });

    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 3203 && !impact.effectOnly,
    );
    expect(impacts).toHaveLength(18);
    expect([
      ...new Set(impacts.map((impact) => Math.round((impact.dueAt - sim.time) * 1000))),
    ]).toEqual([350, 500, 650, 800, 950, 1_100, 1_250, 1_450, 1_650]);
    expect(new Set(impacts.map((impact) => impact.channel))).toEqual(
      new Set(['physical', 'magic']),
    );
  });

  it('rebuilds each 12-by-4-yard frontal target list and caps it at eight enemies', () => {
    const sim = makeTaoist();
    const targets = [
      spawnTarget(sim, 5, 0, '0'),
      ...Array.from({ length: 8 }, (_, index) =>
        spawnTarget(sim, 5 + index * 0.1, -1.75 + index * 0.43, String(index + 1)),
      ),
    ];
    const behind = spawnTarget(sim, -2, 0, 'behind');
    const outsideSide = spawnTarget(sim, 5, 2.7, 'outside-side');
    sim.player.targetId = targets[0].id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3203, targets[0].id)).toEqual({ ok: true });
    forceContacts(sim);
    sim.time = 0.35;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(targets[8].hp).toBe(targets[8].maxHp);
    expect(behind.hp).toBe(behind.maxHp);
    expect(outsideSide.hp).toBe(outsideSide.maxHp);
  });

  it('lands nine hybrid moments, applies the debilitation once per moment, and knocks back all waves', () => {
    const sim = makeTaoist(10);
    const target = spawnTarget(sim, 3, 0, 'nine-hits');
    const start = { ...target.pos };
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3203, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events: SimEvent[] = [];

    for (const time of [0.35, 0.5, 0.65, 0.8, 0.95, 1.1, 1.25, 1.45, 1.65]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
      events.push(...sim.drainEvents());
    }

    expect(
      events.filter((event) => event.type === 'damage' && event.targetId === target.id),
    ).toHaveLength(18);
    expect(
      target.mir4Effects?.active.filter((effect) => effect.effectId === 'mir4_native_buff_10020'),
    ).toHaveLength(1);
    expect(
      target.mir4Effects?.active.filter((effect) => effect.effectId === 'mir4_native_buff_20020'),
    ).toHaveLength(1);
    expect(Math.hypot(target.pos.x - start.x, target.pos.z - start.z)).toBeGreaterThan(1);
  });
});
