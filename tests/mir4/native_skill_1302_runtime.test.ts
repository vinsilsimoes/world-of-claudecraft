import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4PhysicalAttackFlatReduction } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4PendingImpact, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed: number, devCommands = false): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: "Lion's Roar Runtime QA",
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

function spawnTarget(sim: Sim, offsetX: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `lion_roar_runtime_${suffix}`,
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
  return target;
}

function pendingSkillContacts(sim: Sim): Mir4PendingImpact[] {
  return (sim.player.mir4PendingImpacts ?? []).filter(
    (impact) => impact.skillId === 1302 && impact.effectOnly !== true,
  );
}

describe('MIR4 Warrior 1302 integrated runtime', () => {
  it('commits two actor-centered contacts, one circle guide, no movement, and a 39 second cooldown', () => {
    const sim = makeWarrior(51_302);
    const primary = spawnTarget(sim, 3, 'primary');
    sim.player.targetId = primary.id;
    const actorStart = { ...sim.player.pos };
    const resourceBefore = sim.player.resource;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1302, primary.id)).toEqual({ ok: true });

    expect(sim.player.resource).toBeLessThan(resourceBefore);
    expect(sim.player.cooldowns.get('1302')).toBe(39);
    expect(
      pendingSkillContacts(sim).map((impact) => [
        impact.attackId,
        impact.sourceImpactIndex,
        Math.round((impact.dueAt - sim.time) * 1_000),
      ]),
    ).toEqual([
      [130202, 0, 500],
      [130203, 0, 600],
    ]);
    expect(
      sim
        .drainEvents()
        .filter((event) => event.type === 'mir4SkillGuide')
        .map((event) => [event.attackId, event.shape, event.applyTo, event.aliveMs]),
    ).toEqual([[130201, 'circle', 'self', 700]]);

    for (let tick = 0; tick < 14; tick += 1) sim.tick();
    expect(sim.player.pos).toEqual(actorStart);
  });

  it('uses the 6/12-yard native circles and applies ATK Drop only from row 130202', () => {
    const sim = makeWarrior(51_303);
    const primary = spawnTarget(sim, 3, 'primary');
    const inner = spawnTarget(sim, 5, 'inner');
    const outer = spawnTarget(sim, 10, 'outer');
    const outside = spawnTarget(sim, 13, 'outside');
    sim.player.targetId = primary.id;
    const events: SimEvent[] = [];

    expect(castMir4Skill(sim.ctx, sim.playerId, 1302, primary.id)).toEqual({ ok: true });
    for (let tick = 0; tick < 16; tick += 1) events.push(...sim.tick());

    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(inner.hp).toBeLessThan(inner.maxHp);
    expect(outer.hp).toBeLessThan(outer.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
    expect(
      events.filter((event) => event.type === 'damage' && event.ability === 'Rugido de Leão'),
    ).toHaveLength(5);

    for (const target of [primary, inner]) {
      expect(
        target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_13021'),
      ).toMatchObject({ kind: 'physical-attack-flat-reduction', duration: 10, magnitude: 80 });
      expect(mir4PhysicalAttackFlatReduction(target)).toBe(80);
    }
    expect(mir4PhysicalAttackFlatReduction(outer)).toBe(0);
    expect(
      events.filter(
        (event) =>
          event.type === 'mir4HitReaction' &&
          event.targetId === outer.id &&
          event.attackId === 130203,
      ),
    ).toHaveLength(1);
    expect(primary.threat?.get(sim.playerId)).toBeGreaterThan(0);
  });

  it('keeps mana fixed only when the development QA resource lock is enabled', () => {
    const qa = makeWarrior(51_304, true);
    const target = spawnTarget(qa, 3, 'qa');
    qa.player.targetId = target.id;
    qa.chat('/dev resource infinite on');
    const resourceBefore = qa.player.resource;

    expect(castMir4Skill(qa.ctx, qa.playerId, 1302, target.id)).toEqual({ ok: true });
    expect(qa.player.resource).toBe(resourceBefore);
  });
});
