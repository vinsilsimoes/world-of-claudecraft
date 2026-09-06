import { describe, expect, it } from 'vitest';
import { mir4DuelQaBootRequest } from '../../src/game/mir4_duel_qa_boot';
import { MIR4_SKILL_QA_WORLD } from '../../src/sim/content/mir4';
import type { PlayerMeta } from '../../src/sim/sim';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';

function makeDuelQaSim(): Sim {
  return new Sim({
    seed: 44_021,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Warrior Duel QA',
    gameProfile: 'mir4-gameplay-port',
    devCommands: true,
    world: MIR4_SKILL_QA_WORLD,
  });
}

function requireEntity(sim: Sim, id: number): Entity {
  const entity = sim.entities.get(id);
  if (!entity) throw new Error(`missing duel QA entity ${id}`);
  return entity;
}

function requireMeta(sim: Sim, id: number): PlayerMeta {
  const meta = sim.players.get(id);
  if (!meta) throw new Error(`missing duel QA player ${id}`);
  return meta;
}

describe('MIR4 autonomous duel QA', () => {
  it('boots only from the explicit development URL', () => {
    expect(mir4DuelQaBootRequest(new URLSearchParams({ mir4DuelQa: '1' }), true)).toEqual({
      playerClass: 'warrior',
      playerName: 'Warrior Duel QA',
    });
    expect(mir4DuelQaBootRequest(new URLSearchParams({ mir4DuelQa: '1' }), false)).toBeNull();
    expect(mir4DuelQaBootRequest(new URLSearchParams(), true)).toBeNull();
  });

  it('creates a level-cap Warrior and Elementalist who duel with every skill automated', () => {
    const sim = makeDuelQaSim();
    const setup = sim.startMir4DuelQa();

    expect(setup).not.toBeNull();
    if (!setup) throw new Error('expected duel QA setup');
    const warrior = requireEntity(sim, setup.warriorId);
    const elementalist = requireEntity(sim, setup.elementalistId);
    const warriorMeta = requireMeta(sim, setup.warriorId);
    const elementalistMeta = requireMeta(sim, setup.elementalistId);

    expect(warrior.mir4?.classId).toBe(1);
    expect(elementalist.mir4?.classId).toBe(2);
    expect(warrior.level).toBe(250);
    expect(elementalist.level).toBe(250);
    expect(warriorMeta.mir4DisabledAutoSkills ?? []).toEqual([]);
    expect(elementalistMeta.mir4DisabledAutoSkills ?? []).toEqual([]);
    expect(warriorMeta.autoBattle?.mode).toBe('battle');
    expect(elementalistMeta.autoBattle?.mode).toBe('battle');

    const initialWarriorHp = warrior.hp;
    const initialElementalistHp = elementalist.hp;
    const usedSkillIds = new Set<string>();
    for (let tick = 0; tick < 700; tick++) {
      sim.tick();
      for (const id of warrior.cooldowns.keys()) if (/^\d{4}$/.test(id)) usedSkillIds.add(id);
      for (const id of elementalist.cooldowns.keys()) if (/^\d{4}$/.test(id)) usedSkillIds.add(id);
    }

    expect(usedSkillIds.size).toBeGreaterThanOrEqual(4);
    expect(warrior.hp).toBeLessThan(initialWarriorHp);
    expect(elementalist.hp).toBeLessThan(initialElementalistHp);
  });

  it('automatically resets and starts another bout after one duelist reaches one health', () => {
    const sim = makeDuelQaSim();
    const setup = sim.startMir4DuelQa();
    if (!setup) throw new Error('expected duel QA setup');

    const elementalist = requireEntity(sim, setup.elementalistId);
    elementalist.hp = 1;
    for (let tick = 0; tick < 180; tick++) sim.tick();

    expect(elementalist.hp).toBeGreaterThan(1);
    expect(sim.duelFor(setup.warriorId)).not.toBeNull();
    expect(sim.players.get(setup.warriorId)?.autoBattle?.mode).toBe('battle');
    expect(sim.players.get(setup.elementalistId)?.autoBattle?.mode).toBe('battle');
  });
});
