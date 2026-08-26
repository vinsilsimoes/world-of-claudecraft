import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import { initMir4Player } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.7: the mob->player attack rides the mir4 bps pipeline (the mob's
// attack cut by blind, resolved against the PLAYER's dodge/defense, shaved by
// the magic shield) and wolf kills pay the m01 map model XP (34).

function makeSim(seed = 121): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  sim.mir4UnequipSlot(1);
  sim.mir4UnequipSlot(5);
  return sim;
}

function spawnWolf(sim: Sim): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + 2, p.pos.z + 0.5),
  );
  sim.addEntity(wolf);
  return wolf;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the mob->player pipeline', () => {
  it('a tutorial wolf swing lands for 6% HP against zero defenses (0/0 = always hit)', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    const wolf = spawnWolf(sim);
    const hp = p.hp;
    sim.mobSwing(wolf, p);
    expect(hp - p.hp).toBe(240); // live level-1 tutorial pressure, unmitigated
  });
  it('the magic shield shaves 22% off what lands', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(122);
    const p = sim.entities.get(sim.playerId)!;
    const wolf = spawnWolf(sim);
    p.mir4Shield = { remaining: 10, magnitude: 0.22 };
    const hp = p.hp;
    sim.mobSwing(wolf, p);
    expect(hp - p.hp).toBe(Math.floor(240 * (1 - 0.22))); // 187
  });
  it('blind on the mob cuts its outgoing attack by the magnitude', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(123);
    const p = sim.entities.get(sim.playerId)!;
    const wolf = spawnWolf(sim);
    applyMir4Effect(sim.ctx, wolf, {
      effectId: 'test_blind',
      kind: 'blind',
      durationSeconds: 5,
      magnitude: 0.5,
      name: 'Blind',
      sourceId: p.id,
    });
    const hp = p.hp;
    sim.mobSwing(wolf, p);
    expect(hp - p.hp).toBe(Math.floor(240 * 0.5)); // 120
  });
  it('the level-40 warrior passive set mitigates through the table defense', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(124);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 40; // Pele de Ferro raises the L40 defense columns
    initMir4Player(sim.ctx, sim.playerId);
    const def = p.mir4?.physicalDefense ?? 0;
    expect(def).toBe(210); // 195 row + floor(195*800/10000) Pele de Ferro
    p.mir4!.dodge = 0; // deterministic hit: the L40 dodge would roll misses
    const wolf = spawnWolf(sim);
    const hp = p.hp;
    sim.mobSwing(wolf, p);
    expect(hp - p.hp).toBe(Math.floor((240 * 100) / (100 + def))); // 77
  });
  it('wolf kills pay the m01 map model: 34 per normal kill', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(125);
    const wolf = spawnWolf(sim);
    const p = sim.entities.get(sim.playerId)!;
    p.mir4!.accuracy = 3000; // deterministic land for the finisher
    sim.mir4CastSkill(1102, wolf.id); // facet order: pid defaults
    for (let t = 0; t < 21; t++) sim.tick(); // clear the 1s GCD
    for (let hit = 0; hit < 10 && !wolf.dead; hit += 1) {
      sim.mir4BasicAttack(wolf.id);
      for (let tick = 0; tick < 21; tick += 1) sim.tick();
    }
    expect(wolf.dead).toBe(true);
    expect(sim.players.get(sim.playerId)?.xp).toBe(34);
  });
});
