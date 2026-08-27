import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4Craft } from '../../src/sim/mir4/crafting';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import {
  MIR4_EQUIPMENT_CRAFT_RECIPES,
  mir4CraftEquipment,
} from '../../src/sim/mir4/equipment_crafting';
import { Sim } from '../../src/sim/sim';

function makeSim(): Sim {
  return new Sim({
    seed: 441,
    playerClass: 'warrior',
    playerName: 'Forjador',
    gameProfile: 'mir4-gameplay-port',
    world: MIR4_SLICE_WORLD,
  });
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 equipment crafting chain', () => {
  it('generates one exact recipe for every class-specific catalog item', () => {
    expect(Object.keys(MIR4_EQUIPMENT_CRAFT_RECIPES)).toHaveLength(240);
    expect(MIR4_EQUIPMENT_CRAFT_RECIPES['equipment-991010101']).toMatchObject({
      itemId: 991010101,
      previousItemId: null,
      metal: 'metalCommon',
      metalCount: 50,
      darksteelCost: 100,
    });
    expect(MIR4_EQUIPMENT_CRAFT_RECIPES['equipment-991010106']).toMatchObject({
      itemId: 991010106,
      previousItemId: 991010105,
      metal: 'metalMythic',
      metalCount: 50,
      darksteelCost: 10_000_000,
    });
  });

  it('crafts every rarity at level 1 through the public crafting router', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    sim.setPlayerLevel(1);
    const meta = sim.players.get(sim.playerId)!;
    const chain = [
      [991010101, 'metalCommon', 100],
      [991010102, 'metalUncommon', 1_000],
      [991010103, 'metalRare', 10_000],
      [991010104, 'metalEpic', 100_000],
      [991010105, 'metalLegendary', 1_000_000],
      [991010106, 'metalMythic', 10_000_000],
    ] as const;

    for (const [itemId, metal, darksteel] of chain) {
      meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, [metal]: 50 };
      meta.mir4Currencies = { darksteel, energy: 0 };
      const previousItemId = itemId === 991010101 ? null : itemId - 1;
      expect(mir4Craft(sim.ctx, sim.playerId, `equipment-${itemId}`)).toEqual({
        ok: true,
        itemId,
        consumedItemId: previousItemId,
      });
      expect(meta.mir4Materials[metal]).toBe(0);
      expect(meta.mir4Currencies.darksteel).toBe(0);
      expect(meta.mir4EquipmentInstances?.[itemId]).toMatchObject({ itemId, enhancement: 0 });
    }
  });

  it('consumes only the same class and slot predecessor and preserves its investment', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Equipment = { 1: 991010101 };
    meta.mir4EquipmentInstances = {
      991010101: {
        itemId: 991010101,
        enhancement: 7,
        affixes: { enchantment: [[28, 11]], blessing: [[44, 5]] },
      },
    };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, metalUncommon: 50 };
    meta.mir4Currencies = { darksteel: 1_000, energy: 0 };

    expect(mir4CraftEquipment(sim.ctx, sim.playerId, 'equipment-991010102')).toEqual({
      ok: true,
      itemId: 991010102,
      consumedItemId: 991010101,
    });
    expect(meta.mir4EquipmentInstances?.[991010101]).toBeUndefined();
    expect(meta.mir4EquipmentInstances?.[991010102]).toEqual({
      itemId: 991010102,
      enhancement: 7,
      affixes: { enchantment: [[28, 11]], blessing: [[44, 5]] },
    });
    expect(meta.mir4Equipment?.[1]).toBe(991010102);
  });

  it('refuses every invalid input atomically', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const snapshot = () =>
      structuredClone({
        materials: meta.mir4Materials,
        currencies: meta.mir4Currencies,
        instances: meta.mir4EquipmentInstances,
        logicalItems: meta.mir4ArcRewards?.items,
      });
    const current = () => ({
      materials: meta.mir4Materials,
      currencies: meta.mir4Currencies,
      instances: meta.mir4EquipmentInstances,
      logicalItems: meta.mir4ArcRewards?.items,
    });

    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, metalUncommon: 50 };
    meta.mir4Currencies = { darksteel: 1_000, energy: 0 };
    let before = snapshot();

    expect(mir4CraftEquipment(sim.ctx, sim.playerId, 'equipment-991010102')).toEqual({
      ok: false,
      code: 'no-previous-item',
    });
    expect(current()).toEqual(before);

    meta.mir4EquipmentInstances = { 991010101: { itemId: 991010101, enhancement: 0 } };
    meta.mir4Materials.metalUncommon = 49;
    before = snapshot();
    expect(mir4CraftEquipment(sim.ctx, sim.playerId, 'equipment-991010102')).toEqual({
      ok: false,
      code: 'no-materials',
    });
    expect(current()).toEqual(before);

    meta.mir4Materials.metalUncommon = 50;
    meta.mir4Currencies.darksteel = 999;
    before = snapshot();
    expect(mir4CraftEquipment(sim.ctx, sim.playerId, 'equipment-991010102')).toEqual({
      ok: false,
      code: 'no-darksteel',
    });
    expect(current()).toEqual(before);

    meta.mir4EquipmentInstances[991010102] = { itemId: 991010102, enhancement: 0 };
    meta.mir4Currencies.darksteel = 1_000;
    before = snapshot();
    expect(mir4CraftEquipment(sim.ctx, sim.playerId, 'equipment-991010102')).toEqual({
      ok: false,
      code: 'already-owned',
    });
    expect(current()).toEqual(before);

    before = snapshot();
    expect(mir4CraftEquipment(sim.ctx, sim.playerId, 'equipment-991010201')).toEqual({
      ok: false,
      code: 'wrong-class',
    });
    expect(current()).toEqual(before);

    before = snapshot();
    expect(mir4Craft(sim.ctx, sim.playerId, 'equipment-not-real')).toEqual({
      ok: false,
      code: 'unknown-recipe',
    });
    expect(current()).toEqual(before);
  });

  it('keeps a predecessor with an unresolved affix preview intact', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4EquipmentInstances = {
      991010101: {
        itemId: 991010101,
        enhancement: 3,
        pendingRoll: {
          rollId: 'pending-enchantment',
          layer: 'enchantment',
          affixes: [[28, 7]],
        },
      },
    };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, metalUncommon: 50 };
    meta.mir4Currencies = { darksteel: 1_000, energy: 0 };
    const before = structuredClone(meta.mir4EquipmentInstances);

    expect(mir4CraftEquipment(sim.ctx, sim.playerId, 'equipment-991010102')).toEqual({
      ok: false,
      code: 'preview-pending',
    });
    expect(meta.mir4EquipmentInstances).toEqual(before);
    expect(meta.mir4Materials.metalUncommon).toBe(50);
    expect(meta.mir4Currencies.darksteel).toBe(1_000);
  });
});
