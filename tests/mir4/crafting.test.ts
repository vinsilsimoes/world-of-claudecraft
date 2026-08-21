import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { MIR4_CRAFT_RECIPES, mir4Craft } from '../../src/sim/mir4/crafting';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 4.4: the material wallet's crafting recipes (atomic consume + credit)
// with the source's exact costs.

function makeSim(seed = 161): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('material crafting', () => {
  it('pins the two authorial recipes exactly', () => {
    expect(MIR4_CRAFT_RECIPES['solar-scroll']).toEqual({
      recipeId: 'solar-scroll',
      label: 'Pergaminho Solar',
      output: 'solarScroll',
      outputCount: 1,
      materials: { sunStone: 1 },
      copperCost: 5000,
    });
    expect(MIR4_CRAFT_RECIPES['lunar-seal']).toEqual({
      recipeId: 'lunar-seal',
      label: 'Selo Lunar',
      output: 'lunarSeal',
      outputCount: 1,
      materials: { moonStone: 5 },
      copperCost: 0,
    });
  });
  it('crafts atomically: consumes materials + copper, credits the output', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.copper = 6000;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, sunStone: 2 };
    expect(mir4Craft(sim.ctx, sim.playerId, 'solar-scroll')).toEqual({
      ok: true,
      output: 'solarScroll',
      count: 1,
    });
    expect(meta.mir4Materials.sunStone).toBe(1);
    expect(meta.mir4Materials.solarScroll).toBe(1);
    expect(meta.copper).toBe(1000);
    // No copper for a second: fails without consuming.
    expect(mir4Craft(sim.ctx, sim.playerId, 'solar-scroll')).toEqual({
      ok: false,
      code: 'no-copper',
    });
    expect(meta.mir4Materials.sunStone).toBe(1);
    expect(meta.copper).toBe(1000);
  });
  it('refuses unknown recipes and missing materials without mutation', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(162);
    const meta = sim.players.get(sim.playerId)!;
    meta.copper = 99999;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, moonStone: 4 };
    expect(mir4Craft(sim.ctx, sim.playerId, 'nope')).toEqual({ ok: false, code: 'unknown-recipe' });
    expect(mir4Craft(sim.ctx, sim.playerId, 'lunar-seal')).toEqual({
      ok: false,
      code: 'no-materials',
    });
    expect(meta.mir4Materials.moonStone).toBe(4);
    meta.mir4Materials.moonStone = 5;
    expect(mir4Craft(sim.ctx, sim.playerId, 'lunar-seal')).toEqual({
      ok: true,
      output: 'lunarSeal',
      count: 1,
    });
    expect(meta.mir4Materials.moonStone).toBe(0);
    expect(meta.mir4Materials.lunarSeal).toBe(1);
  });
});
