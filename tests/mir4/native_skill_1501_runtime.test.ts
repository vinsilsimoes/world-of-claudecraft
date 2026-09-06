import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4DefenseMultiplier } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4PendingImpact } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

const EXPECTED_CONTACTS = [
  [150101, 0, 20],
  [150101, 1, 225],
  [150101, 2, 375],
  [150102, 0, 540],
  [150102, 1, 640],
  [150103, 0, 840],
  [150103, 1, 900],
  [150104, 0, 1050],
  [150105, 0, 1275],
] as const;

function makeWarrior(seed: number, devCommands = false): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Gale Slash Runtime QA',
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
    id: 'gale_slash_runtime_target',
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
    (impact) => impact.skillId === 1501 && impact.effectOnly !== true,
  );
}

describe('MIR4 Warrior 1501 integrated runtime', () => {
  it('commits the exact nine-contact timeline and five independent circle guides', () => {
    const sim = makeWarrior(51_501);
    const target = spawnTarget(sim);
    const resourceBefore = sim.player.resource;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1501, target.id)).toEqual({ ok: true });

    expect(sim.player.resource).toBeLessThan(resourceBefore);
    expect(sim.player.cooldowns.get('1501')).toBe(44);
    expect(
      pendingSkillContacts(sim).map((impact) => [
        impact.attackId,
        impact.sourceImpactIndex,
        Math.round((impact.dueAt - sim.time) * 1_000),
      ]),
    ).toEqual(EXPECTED_CONTACTS);
    expect(
      sim
        .drainEvents()
        .filter((event) => event.type === 'mir4SkillGuide')
        .map((event) => [event.attackId, event.shape, event.applyTo]),
    ).toEqual([
      [150101, 'circle', 'self'],
      [150102, 'circle', 'self'],
      [150103, 'circle', 'self'],
      [150104, 'circle', 'self'],
      [150105, 'circle', 'self'],
    ]);
  });

  it('applies the exact source buff, landed Smite debuff, and row-level knockbacks', () => {
    const sim = makeWarrior(51_502);
    const target = spawnTarget(sim);
    const targetStartX = target.pos.x;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1501, target.id)).toEqual({ ok: true });
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_11031'),
    ).toMatchObject({ kind: 'control-immunity', duration: 2, remaining: 2 });

    const events = [...sim.tick()];
    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_10020'),
    ).toMatchObject({ kind: 'physical-defense-reduction', duration: 5, remaining: 5 });
    expect(mir4DefenseMultiplier(target, 'physical')).toBeCloseTo(0.75, 10);
    expect(mir4DefenseMultiplier(target, 'magic')).toBe(1);

    for (let tick = 1; tick < 40; tick += 1) events.push(...sim.tick());

    expect(pendingSkillContacts(sim)).toHaveLength(0);
    expect(
      sim.player.mir4Effects?.active.some(
        (effect) => effect.effectId === 'mir4_native_buff_11031',
      ) ?? false,
    ).toBe(false);
    expect(
      target.mir4Effects?.active.filter((effect) => effect.effectId === 'mir4_native_buff_10020'),
    ).toHaveLength(1);
    expect(target.pos.x).toBeCloseTo(targetStartX - 1, 8);
    const damageEvents = events.filter(
      (event) => event.type === 'damage' && event.targetId === target.id,
    );
    expect(damageEvents).toHaveLength(9);
    expect(
      damageEvents.every((event) => event.type === 'damage' && event.ability === 'Corte Vendaval'),
    ).toBe(true);
  });

  it('bypasses mana only behind the development-only QA resource lock', () => {
    const productionLike = makeWarrior(51_503);
    const ordinaryTarget = spawnTarget(productionLike);
    const productionResourceBefore = productionLike.player.resource;
    expect(
      castMir4Skill(productionLike.ctx, productionLike.playerId, 1501, ordinaryTarget.id),
    ).toEqual({ ok: true });
    expect(productionLike.player.resource).toBeLessThan(productionResourceBefore);

    const qa = makeWarrior(51_504, true);
    const qaTarget = spawnTarget(qa);
    qa.chat('/dev resource infinite on');
    const qaResourceBefore = qa.player.resource;
    expect(castMir4Skill(qa.ctx, qa.playerId, 1501, qaTarget.id)).toEqual({ ok: true });
    expect(qa.player.resource).toBe(qaResourceBefore);
  });
});
