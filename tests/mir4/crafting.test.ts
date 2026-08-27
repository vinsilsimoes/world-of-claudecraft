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

function playerMeta(sim: Sim) {
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing crafting test player metadata');
  return meta;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('material crafting', () => {
  it('converts exactly ten metals into one metal of the next rarity', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = playerMeta(sim);
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      metalCommon: 10,
      metalUncommon: 10,
      metalRare: 10,
      metalEpic: 10,
      metalLegendary: 10,
    };
    for (const recipeId of [
      'metal-uncommon',
      'metal-rare',
      'metal-epic',
      'metal-legendary',
      'metal-mythic',
    ]) {
      expect(mir4Craft(sim.ctx, sim.playerId, recipeId).ok).toBe(true);
    }
    expect(meta.mir4Materials).toMatchObject({
      metalCommon: 0,
      metalUncommon: 1,
      metalRare: 1,
      metalEpic: 1,
      metalLegendary: 1,
      metalMythic: 1,
    });
  });

  it('pins the equipment recipes and the complete knowledge-tome chain', () => {
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
    expect(MIR4_CRAFT_RECIPES['knowledge-tome-common']).toMatchObject({
      output: 'knowledgeTomeCommon',
      outputCount: 1,
      materials: { knowledgeFragment: 5 },
    });
    expect(MIR4_CRAFT_RECIPES['knowledge-tome-rare']).toMatchObject({
      output: 'knowledgeTomeRare',
      materials: { knowledgeTomeCommon: 10 },
    });
    expect(MIR4_CRAFT_RECIPES['knowledge-tome-epic']).toMatchObject({
      output: 'knowledgeTomeEpic',
      materials: { knowledgeTomeRare: 10 },
    });
    expect(MIR4_CRAFT_RECIPES['knowledge-tome-legendary']).toMatchObject({
      output: 'knowledgeTomeLegendary',
      materials: { knowledgeTomeEpic: 10 },
    });
    expect(MIR4_CRAFT_RECIPES['greater-yang-pill']).toMatchObject({
      output: 'greaterYangPill',
      materials: { solarShard: 1, boundlessShard: 1 },
      copperCost: 300,
    });
    expect(MIR4_CRAFT_RECIPES['greater-yin-pill']).toMatchObject({
      output: 'greaterYinPill',
      materials: { etherealShard: 1, boundlessShard: 1 },
      copperCost: 300,
    });
    expect(MIR4_CRAFT_RECIPES['lesser-yang-pill']).toMatchObject({
      output: 'lesserYangPill',
      materials: { lunarShard: 1, solarShard: 1 },
      copperCost: 300,
    });
    expect(MIR4_CRAFT_RECIPES['lesser-yin-pill']).toMatchObject({
      output: 'lesserYinPill',
      materials: { etherealShard: 1, lunarShard: 1 },
      copperCost: 300,
    });
    expect(MIR4_CRAFT_RECIPES['greater-yang-pill-rare']).toMatchObject({
      output: 'greaterYangPillRare',
      materials: { greaterYangPill: 10 },
    });
    expect(MIR4_CRAFT_RECIPES['lesser-yin-pill-legendary']).toMatchObject({
      output: 'lesserYinPillLegendary',
      materials: { lesserYinPillEpic: 10 },
    });
  });
  it('crafts first-manual pills from the extracted shard pairs', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(165);
    const meta = playerMeta(sim);
    meta.copper = 1_200;
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      etherealShard: 2,
      lunarShard: 2,
      solarShard: 2,
      boundlessShard: 2,
    };

    for (const recipeId of [
      'greater-yang-pill',
      'greater-yin-pill',
      'lesser-yang-pill',
      'lesser-yin-pill',
    ]) {
      expect(mir4Craft(sim.ctx, sim.playerId, recipeId).ok).toBe(true);
    }
    expect(meta.copper).toBe(0);
    expect(meta.mir4Materials).toMatchObject({
      etherealShard: 0,
      lunarShard: 0,
      solarShard: 0,
      boundlessShard: 0,
      greaterYangPill: 1,
      greaterYinPill: 1,
      lesserYangPill: 1,
      lesserYinPill: 1,
    });
  });
  it('crafts the knowledge chain from monster fragments without copper', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(163);
    const meta = playerMeta(sim);
    meta.copper = 0;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 5 };

    expect(mir4Craft(sim.ctx, sim.playerId, 'knowledge-tome-common')).toMatchObject({ ok: true });
    expect(meta.mir4Materials).toMatchObject({
      knowledgeFragment: 0,
      knowledgeTomeCommon: 1,
    });
  });
  it('promotes all four Solitude Training pill families through every rarity tier', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(166);
    const meta = playerMeta(sim);
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      greaterYangPill: 10,
      greaterYangPillRare: 10,
      greaterYangPillEpic: 10,
      greaterYinPill: 10,
      greaterYinPillRare: 10,
      greaterYinPillEpic: 10,
      lesserYangPill: 10,
      lesserYangPillRare: 10,
      lesserYangPillEpic: 10,
      lesserYinPill: 10,
      lesserYinPillRare: 10,
      lesserYinPillEpic: 10,
    };

    for (const family of ['greater-yang', 'greater-yin', 'lesser-yang', 'lesser-yin']) {
      for (const rarity of ['rare', 'epic', 'legendary']) {
        expect(mir4Craft(sim.ctx, sim.playerId, `${family}-pill-${rarity}`)).toMatchObject({
          ok: true,
        });
      }
    }
    expect(meta.mir4Materials).toMatchObject({
      greaterYangPill: 0,
      greaterYangPillRare: 1,
      greaterYangPillEpic: 1,
      greaterYangPillLegendary: 1,
      greaterYinPill: 0,
      greaterYinPillRare: 1,
      greaterYinPillEpic: 1,
      greaterYinPillLegendary: 1,
      lesserYangPill: 0,
      lesserYangPillRare: 1,
      lesserYangPillEpic: 1,
      lesserYangPillLegendary: 1,
      lesserYinPill: 0,
      lesserYinPillRare: 1,
      lesserYinPillEpic: 1,
      lesserYinPillLegendary: 1,
    });
  });
  it('executes every upper tome conversion and preserves the wallet on a failed retry', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(164);
    const meta = playerMeta(sim);
    meta.copper = 0;
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      knowledgeTomeCommon: 10,
      knowledgeTomeRare: 10,
      knowledgeTomeEpic: 10,
    };

    expect(mir4Craft(sim.ctx, sim.playerId, 'knowledge-tome-rare')).toEqual({
      ok: true,
      output: 'knowledgeTomeRare',
      count: 1,
    });
    expect(mir4Craft(sim.ctx, sim.playerId, 'knowledge-tome-epic')).toEqual({
      ok: true,
      output: 'knowledgeTomeEpic',
      count: 1,
    });
    expect(mir4Craft(sim.ctx, sim.playerId, 'knowledge-tome-legendary')).toEqual({
      ok: true,
      output: 'knowledgeTomeLegendary',
      count: 1,
    });
    expect(meta.mir4Materials).toMatchObject({
      knowledgeTomeCommon: 0,
      knowledgeTomeRare: 1,
      knowledgeTomeEpic: 1,
      knowledgeTomeLegendary: 1,
    });

    const before = structuredClone(meta.mir4Materials);
    expect(mir4Craft(sim.ctx, sim.playerId, 'knowledge-tome-rare')).toEqual({
      ok: false,
      code: 'no-materials',
    });
    expect(meta.mir4Materials).toEqual(before);
  });
  it('crafts atomically: consumes materials + copper, credits the output', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = playerMeta(sim);
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
    const meta = playerMeta(sim);
    meta.copper = 99999;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, moonStone: 4 };
    expect(mir4Craft(sim.ctx, sim.playerId, 'nope')).toEqual({
      ok: false,
      code: 'unknown-recipe',
    });
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
