import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4TargetCombat } from '../../src/sim/mir4/target_combat';
import { Sim } from '../../src/sim/sim';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSim(devCommands: boolean): Sim {
  return new Sim({
    seed: 6_217,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Warrior QA',
    gameProfile: 'mir4-gameplay-port',
    devCommands,
    world: EMPTY_TEST_WORLD,
  });
}

function addTarget(sim: Sim): number {
  const target = createMob(
    sim.nextId++,
    {
      ...MIR4_MOBS.mir4_forest_wolf,
      id: 'skill_qa_isolation_target',
      hpBase: 5_000,
      hpPerLevel: 0,
      moveSpeed: 0,
    } as never,
    1,
    sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
  );
  sim.addEntity(target);
  sim.player.targetId = target.id;
  return target.id;
}

describe('MIR4 skill-QA combat isolation', () => {
  it('keeps the dedicated dev arena free of repeated target combat', () => {
    const sim = makeSim(true);
    addTarget(sim);
    sim.chat('/dev skillqa isolate on');

    sim.startAutoAttack();

    expect(sim.player.autoAttack).toBe(false);
    expect(sim.players.get(sim.playerId)?.mir4TargetCombat).toBeUndefined();
  });

  it('tears down focused combat that is armed after isolation was enabled', () => {
    const sim = makeSim(true);
    const targetId = addTarget(sim);
    sim.chat('/dev skillqa isolate on');
    sim.player.autoAttack = true;
    sim.players.get(sim.playerId)!.mir4TargetCombat = { targetId, owner: 'player' };
    const targetHp = sim.entities.get(targetId)!.hp;

    updateMir4TargetCombat(sim.ctx);

    expect(sim.player.autoAttack).toBe(false);
    expect(sim.players.get(sim.playerId)?.mir4TargetCombat).toBeUndefined();
    expect(sim.entities.get(targetId)?.hp).toBe(targetHp);
  });

  it('cannot change normal gameplay when dev commands are not enabled', () => {
    const sim = makeSim(false);
    const targetId = addTarget(sim);
    sim.player.devSkillQaIsolation = true;

    sim.startAutoAttack();

    expect(sim.player.autoAttack).toBe(true);
    expect(sim.players.get(sim.playerId)?.mir4TargetCombat).toMatchObject({
      targetId,
      owner: 'player',
    });
  });
});
