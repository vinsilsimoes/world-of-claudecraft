import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(): Sim {
  const sim = new Sim({
    seed: 41_010,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Quick Shot Runtime QA',
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

function spawnTarget(sim: Sim, id: string, x: number, z: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id,
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

describe('MIR4 Quick Shot integrated runtime', () => {
  it('approaches an out-of-range selected target and commits exactly once at native trace reach', () => {
    const sim = makeArbalist();
    const target = spawnTarget(
      sim,
      'quick_shot_approach_target',
      sim.player.pos.x,
      sim.player.pos.z + 20,
    );
    sim.player.targetId = target.id;
    const start = { ...sim.player.pos };
    const startDistance = dist2d(sim.player.pos, target.pos);
    const resource = sim.player.resource;

    expect(
      requestMir4SkillActivation(sim.ctx, 'mir4_skill_4101', sim.playerId, target.id),
    ).toEqual({ ok: true, queued: true });
    expect(
      requestMir4SkillActivation(sim.ctx, 'mir4_skill_4101', sim.playerId, target.id),
    ).toEqual({ ok: true, queued: true });
    expect(sim.player.resource).toBe(resource);
    expect(sim.player.cooldowns.has('4101')).toBe(false);

    const events: SimEvent[] = [];
    let ticks = 0;
    while (!sim.player.cooldowns.has('4101') && ticks++ < 240) events.push(...sim.tick());

    expect(ticks).toBeLessThan(240);
    expect(dist2d(start, sim.player.pos)).toBeGreaterThan(0);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThan(startDistance);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
    expect(sim.player.cooldowns.has('4101')).toBe(true);
    expect(sim.player.resource).toBeLessThan(resource);
    expect(
      (sim.player.mir4PendingImpacts ?? []).filter(
        (impact) => impact.skillId === 4101 && !impact.effectOnly,
      ),
    ).toHaveLength(6);
    expect(events.filter((event) => event.type === 'damage')).toHaveLength(0);
  });

  it('schedules six server damage resolutions at the second arrow of each visual pair', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'quick_shot_target', sim.player.pos.x, sim.player.pos.z + 8);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4101, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4101 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          impact.sourceImpactIndex,
          Math.round((impact.dueAt - sim.time) * 1_000),
        ]),
    ).toEqual([
      [410101, 1, 213],
      [410102, 1, 413],
      [410103, 1, 619],
      [410104, 1, 819],
      [410105, 1, 1013],
      [410106, 1, 1216],
    ]);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4101 && impact.effectOnly)
        .map((impact) => [impact.nativeSetup, Math.round((impact.dueAt - sim.time) * 1_000)]),
    ).toEqual([['arbalist-focus', 213]]);
  });

  it('re-resolves the 4-yard target circle at every row and damages up to five targets fully', () => {
    const sim = makeArbalist();
    const anchor = spawnTarget(sim, 'quick_shot_anchor', sim.player.pos.x, sim.player.pos.z + 8);
    const near = Array.from({ length: 4 }, (_, index) =>
      spawnTarget(
        sim,
        `quick_shot_near_${index}`,
        anchor.pos.x + (index + 1) * 0.5,
        anchor.pos.z,
      ),
    );
    const outside = spawnTarget(sim, 'quick_shot_outside', anchor.pos.x + 8, anchor.pos.z);
    sim.player.targetId = anchor.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4101, anchor.id)).toEqual({ ok: true });
    for (const impact of sim.player.mir4PendingImpacts ?? []) {
      if (impact.skillId === 4101) {
        impact.forceHit = true;
        impact.forceCritical = false;
      }
    }
    const events: SimEvent[] = [];
    for (const time of [0.213, 0.413, 0.619, 0.819, 1.013, 1.216]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
      events.push(...sim.drainEvents());
    }

    for (const target of [anchor, ...near]) {
      expect(
        events.filter(
          (event) =>
            event.type === 'damage' &&
            event.targetId === target.id &&
            event.ability === 'Tiro Rápido',
        ),
      ).toHaveLength(6);
    }
    const admittedDamage = [anchor, ...near].map((target) => target.maxHp - target.hp);
    expect(admittedDamage[0]).toBeGreaterThan(0);
    expect(new Set(admittedDamage).size).toBe(1);
    expect(events.some((event) => event.type === 'damage' && event.targetId === outside.id)).toBe(
      false,
    );
  });
});
