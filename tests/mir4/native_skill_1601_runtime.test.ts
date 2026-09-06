import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4DefenseMultiplier } from '../../src/sim/mir4/effects';
import { mir4HitReacting } from '../../src/sim/mir4/native_skill_hit_reaction';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4PendingImpact, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed: number, devCommands = false): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Crescent Strike Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    devCommands,
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

function spawnTarget(sim: Sim, offsetX = 3): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `crescent_strike_runtime_target_${offsetX}`,
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
    sim.groundPos(sim.player.pos.x + offsetX, sim.player.pos.z),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  sim.player.targetId = target.id;
  return target;
}

function pendingSkillContacts(sim: Sim): Mir4PendingImpact[] {
  return (sim.player.mir4PendingImpacts ?? []).filter(
    (impact) => impact.skillId === 1601 && impact.effectOnly !== true,
  );
}

describe('MIR4 Warrior 1601 integrated runtime', () => {
  it('commits one damaging contact, one direct guide, native pursuit, and a 19 second cooldown', () => {
    const sim = makeWarrior(51_601);
    const target = spawnTarget(sim);
    const actorStartX = sim.player.pos.x;
    const resourceBefore = sim.player.resource;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1601, target.id)).toEqual({ ok: true });

    expect(sim.player.resource).toBeLessThan(resourceBefore);
    expect(sim.player.cooldowns.get('1601')).toBe(19);
    expect(
      pendingSkillContacts(sim).map((impact) => [
        impact.attackId,
        impact.sourceImpactIndex,
        Math.round((impact.dueAt - sim.time) * 1_000),
      ]),
    ).toEqual([[160103, 0, 750]]);
    expect(
      sim
        .drainEvents()
        .filter((event) => event.type === 'mir4SkillGuide')
        .map((event) => [event.attackId, event.shape, event.applyTo, event.aliveMs]),
    ).toEqual([[160101, 'direct', 'self', 674]]);

    for (let tick = 0; tick < 18; tick += 1) sim.tick();
    expect(sim.player.pos.x).toBeGreaterThan(actorStartX);
    expect(sim.player.pos.x).toBeCloseTo(target.pos.x + 1, 1);
  });

  it('applies damage, Hit01, Confuse, and native threat only on the third row', () => {
    const sim = makeWarrior(51_602);
    const target = spawnTarget(sim);
    const events: SimEvent[] = [];

    expect(castMir4Skill(sim.ctx, sim.playerId, 1601, target.id)).toEqual({ ok: true });
    for (let tick = 0; tick < 16; tick += 1) events.push(...sim.tick());

    expect(pendingSkillContacts(sim)).toHaveLength(0);
    const damageEvents = events.filter(
      (event) => event.type === 'damage' && event.targetId === target.id,
    );
    expect(damageEvents).toHaveLength(1);
    expect(
      damageEvents.every((event) => event.type === 'damage' && event.ability === 'Golpe Crescente'),
    ).toBe(true);
    expect(
      events.filter(
        (event) =>
          event.type === 'mir4HitReaction' &&
          event.targetId === target.id &&
          event.attackId === 160103,
      ),
    ).toHaveLength(1);
    expect(mir4HitReacting(target)).toBe(true);
    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_10020'),
    ).toMatchObject({ kind: 'physical-defense-reduction', duration: 5 });
    expect(mir4DefenseMultiplier(target, 'physical')).toBeCloseTo(0.75, 10);
    expect(mir4DefenseMultiplier(target, 'magic')).toBe(1);
    expect(target.threat?.get(sim.playerId)).toBeGreaterThan(0);
  });

  it('keeps mana fixed only when the development QA resource lock is enabled', () => {
    const qa = makeWarrior(51_603, true);
    const target = spawnTarget(qa);
    qa.chat('/dev resource infinite on');
    const resourceBefore = qa.player.resource;

    expect(castMir4Skill(qa.ctx, qa.playerId, 1601, target.id)).toEqual({ ok: true });
    expect(qa.player.resource).toBe(resourceBefore);
  });
});
