import { describe, expect, it } from 'vitest';
import { mir4EquipmentRequiredLevelForRank } from '../../src/sim/content/mir4/item_progression';
import {
  MIR4_POTION_RULES,
  mir4PotionRule,
  mir4PotionStockForMap,
} from '../../src/sim/content/mir4/potions';
import { ITEMS } from '../../src/sim/data';
import { Sim } from '../../src/sim/sim';
import { buildVendorView } from '../../src/ui/hud/vendor/vendor_view';
import { EMPTY_TEST_WORLD } from '../sim_shared';

describe('Aeldrune potion economy', () => {
  it('has four health and four mana tiers with increasing price, recovery and level gates', () => {
    const hp = MIR4_POTION_RULES.filter((rule) => rule.kind === 'hp');
    const mp = MIR4_POTION_RULES.filter((rule) => rule.kind === 'mp');

    expect(hp).toHaveLength(4);
    expect(mp).toHaveLength(4);
    expect(hp.map((rule) => rule.priceCopper)).toEqual([4, 20, 100, 500]);
    expect(hp.map((rule) => rule.requiredLevel)).toEqual([1, 40, 90, 150]);
    expect(hp.map((rule) => rule.restoreBps)).toEqual([500, 1_000, 1_800, 3_000]);
    expect(mp.map((rule) => rule.priceCopper)).toEqual([4, 20, 100, 500]);
    expect(mp.map((rule) => rule.requiredLevel)).toEqual([1, 40, 90, 150]);
  });

  it('offers stronger potion tiers only as the campaign reaches their map bands', () => {
    expect(mir4PotionStockForMap(1)).toEqual(['minor_healing_potion', 'minor_mana_potion']);
    expect(mir4PotionStockForMap(5)).toHaveLength(4);
    expect(mir4PotionStockForMap(10)).toHaveLength(6);
    expect(mir4PotionStockForMap(15)).toHaveLength(8);
    expect(mir4PotionRule('not-a-potion')).toBeNull();
  });

  it('uses the Aeldrune price in the vendor view', () => {
    const price = (itemId: string) => mir4PotionRule(itemId)?.priceCopper;
    const view = buildVendorView(
      ['sunpetal_healing_draught'],
      [],
      ITEMS,
      { copper: 1_000, honor: 0, gatheringProficiency: {} },
      1,
      price,
    );
    expect(view.goods[0]?.price.copper).toBe(500);
  });

  it('refuses a higher-tier potion below its level and restores a percentage once unlocked', () => {
    const sim = new Sim({
      seed: 8801,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      world: EMPTY_TEST_WORLD,
    });
    sim.addItem('lesser_healing_potion', 1);
    sim.player.level = 39;
    sim.player.hp = Math.floor(sim.player.maxHp * 0.5);
    const lockedHp = sim.player.hp;
    const lockedCount = sim.countItem('lesser_healing_potion');

    sim.useItem('lesser_healing_potion');
    expect(sim.player.hp).toBe(lockedHp);
    expect(sim.countItem('lesser_healing_potion')).toBe(lockedCount);

    sim.player.level = 40;
    sim.useItem('lesser_healing_potion');
    expect(sim.player.hp).toBe(lockedHp + Math.round(sim.player.maxHp * 0.1));
    expect(sim.countItem('lesser_healing_potion')).toBe(lockedCount - 1);
  });
});

describe('Aeldrune equipment use gates', () => {
  it('stretches equipment requirements across the level-200 progression', () => {
    expect(
      Array.from({ length: 6 }, (_, index) => mir4EquipmentRequiredLevelForRank(index + 1)),
    ).toEqual([1, 30, 70, 120, 160, 200]);
  });
});
