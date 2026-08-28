import { describe, expect, it } from 'vitest';
import { mir4PotionBarItems, useMir4AutomaticPotion } from '../../src/sim/mir4/potion_inventory';
import { Sim } from '../../src/sim/sim';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSim(seed: number): Sim {
  return new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
}

describe('MIR4 potion inventory policy', () => {
  it('selects the strongest carried potion for each fixed HUD role', () => {
    const items = new Map([
      ['small_hp', { id: 'small_hp', kind: 'potion' as const, potionHp: 25 }],
      ['large_hp', { id: 'large_hp', kind: 'potion' as const, potionHp: 100 }],
      ['mana', { id: 'mana', kind: 'potion' as const, potionMana: 80 }],
    ]);

    expect(
      mir4PotionBarItems(
        [{ itemId: 'small_hp' }, { itemId: 'mana' }, { itemId: 'large_hp' }],
        (itemId) => items.get(itemId),
        [],
      ),
    ).toEqual(['large_hp', 'mana']);
  });

  it('consumes one real carried potion and applies its canonical recovery', () => {
    const healthSim = makeSim(9251);
    healthSim.player.hp = healthSim.player.maxHp * 0.4;
    const healthBefore = healthSim.countItem('minor_healing_potion');
    const hpBefore = healthSim.player.hp;

    expect(useMir4AutomaticPotion(healthSim.ctx, healthSim.playerId, 'hp')).toBe(true);
    expect(healthSim.countItem('minor_healing_potion')).toBe(healthBefore - 1);
    expect(healthSim.player.hp).toBeGreaterThan(hpBefore);

    const manaSim = makeSim(9252);
    manaSim.player.resource = manaSim.player.maxResource * 0.4;
    const manaBefore = manaSim.countItem('minor_mana_potion');
    const resourceBefore = manaSim.player.resource;

    expect(useMir4AutomaticPotion(manaSim.ctx, manaSim.playerId, 'mp')).toBe(true);
    expect(manaSim.countItem('minor_mana_potion')).toBe(manaBefore - 1);
    expect(manaSim.player.resource).toBeGreaterThan(resourceBefore);
  });

  it('does nothing when the matching potion is not carried', () => {
    const sim = makeSim(9253);
    const carried = sim.countItem('minor_healing_potion');
    sim.removeItem('minor_healing_potion', carried);
    sim.player.hp = sim.player.maxHp * 0.4;
    const hpBefore = sim.player.hp;

    expect(useMir4AutomaticPotion(sim.ctx, sim.playerId, 'hp')).toBe(false);
    expect(sim.player.hp).toBe(hpBefore);
  });

  it('ignores carried potions above the player level and uses the strongest unlocked tier', () => {
    const sim = makeSim(9254);
    sim.player.level = 1;
    sim.addItem('sunpetal_healing_draught', 1);
    sim.player.hp = sim.player.maxHp * 0.4;
    const minorBefore = sim.countItem('minor_healing_potion');
    const lockedBefore = sim.countItem('sunpetal_healing_draught');

    expect(useMir4AutomaticPotion(sim.ctx, sim.playerId, 'hp')).toBe(true);
    expect(sim.countItem('minor_healing_potion')).toBe(minorBefore - 1);
    expect(sim.countItem('sunpetal_healing_draught')).toBe(lockedBefore);
  });
});
