import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim/sim';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSim(): Sim {
  return new Sim({
    seed: 8172,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'PotionTester',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
}

describe('MIR4 automatic potions', () => {
  it('uses a health potion at the configured threshold without Auto Battle or a target', () => {
    const sim = makeSim();
    const player = sim.player;
    sim.addItem('minor_healing_potion', 1);
    sim.setMir4AutoPotionThreshold('health', 80);
    player.hp = Math.floor(player.maxHp * 0.79);
    player.targetId = null;

    expect(sim.players.get(sim.playerId)?.autoBattle).toBeUndefined();
    const before = sim.countItem('minor_healing_potion');

    sim.tick();

    expect(sim.countItem('minor_healing_potion')).toBe(before - 1);
    expect(player.hp).toBeGreaterThan(Math.floor(player.maxHp * 0.79));
  });

  it('uses a mana potion at the configured threshold without Auto Battle or a target', () => {
    const sim = makeSim();
    const player = sim.player;
    sim.addItem('minor_mana_potion', 1);
    sim.setMir4AutoPotionThreshold('mana', 70);
    player.resource = Math.floor(player.maxResource * 0.69);
    player.targetId = null;

    expect(sim.players.get(sim.playerId)?.autoBattle).toBeUndefined();
    const before = sim.countItem('minor_mana_potion');

    sim.tick();

    expect(sim.countItem('minor_mana_potion')).toBe(before - 1);
    expect(player.resource).toBeGreaterThan(Math.floor(player.maxResource * 0.69));
  });
});
