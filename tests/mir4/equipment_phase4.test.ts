import { afterAll, describe, expect, it, vi } from 'vitest';
import { mir4EquipmentItem } from '../../src/sim/content/mir4/equipment_catalog';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  MIR4_EMPTY_MATERIALS,
  MIR4_ENHANCEMENT_CUMULATIVE_PERCENT,
  MIR4_ENHANCEMENT_SUCCESS_BPS,
  MIR4_EQUIPMENT_CATALOG_SIZE,
  mir4Enhance,
  mir4EquipItem,
  mir4ItemAttributes,
} from '../../src/sim/mir4/equipment';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 4.1: the generated 240-item catalog, the full-slot equipment bag, and
// the enhancement (+15) with the exact source table, destruction, and ward.

function makeSim(seed = 141, ownsEquipment = true): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  if (ownsEquipment) {
    sim.players.get(sim.playerId)!.mir4ArcRewards = { items: { '991010101': 1 } };
  }
  return sim;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the equipment catalog', () => {
  it('carries all 240 items with the sealed shape', () => {
    expect(MIR4_EQUIPMENT_CATALOG_SIZE).toBe(240);
    const first = mir4EquipmentItem(991010101);
    expect(first?.name).toBe('Espada Gasta');
    expect(first?.baseAttributes).toEqual([
      [20, 18],
      [28, 2],
    ]);
    expect(first?.maxEnhancementLevel).toBe(15);
  });
  it('pins the source enhancement table and cumulative percents', () => {
    expect(MIR4_ENHANCEMENT_SUCCESS_BPS[5]).toBe(100_000);
    expect(MIR4_ENHANCEMENT_SUCCESS_BPS[6]).toBe(50_000);
    expect(MIR4_ENHANCEMENT_SUCCESS_BPS[10]).toBe(10_000);
    expect(MIR4_ENHANCEMENT_CUMULATIVE_PERCENT[15]).toBe(61);
    expect(MIR4_ENHANCEMENT_CUMULATIVE_PERCENT[5]).toBe(15);
  });
});

describe('equipping catalog items', () => {
  it('does not materialize or equip a catalog item the character does not own', () => {
    const sim = makeSim(140, false);
    sim.player.level = 250;
    const meta = sim.players.get(sim.playerId)!;

    expect(mir4EquipItem(sim.ctx, sim.playerId, 991010106)).toBe('Unknown item.');
    expect(mir4Enhance(sim.ctx, sim.playerId, 991010106)).toEqual({
      ok: false,
      code: 'unknown-item',
    });
    expect(meta.mir4Equipment).toEqual({ 1: 200201000, 5: 301201000 });
    expect(meta.mir4EquipmentInstances).toEqual({
      200201000: { itemId: 200201000, enhancement: 0 },
      301201000: { itemId: 301201000, enhancement: 0 },
    });
  });

  it('validates class and level, then feeds the recalc', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    const taoist = mir4EquipmentItem(991010101)!;
    void taoist;
    // The warrior's rank-1 weapon: PA 18 + Acerto 2 on top of the table.
    expect(p.attackPower).toBe(125);
    expect(sim.mir4EquipItem(991010101)).toBe('Espada Gasta equipped.');
    expect(p.attackPower).toBe(50 + 18);
    expect(p.mir4?.accuracy).toBe(2);
  });

  it('inherits enhancement and resolved layers when a higher-rank native item replaces a slot', () => {
    const sim = makeSim(1411);
    const meta = sim.players.get(sim.playerId)!;
    sim.player.level = 105;
    meta.mir4ArcRewards = { items: { '991010101': 1, '991010106': 1 } };
    sim.mir4EquipItem(991010101);
    meta.mir4EquipmentInstances![991010101] = {
      itemId: 991010101,
      enhancement: 7,
      affixes: { enchantment: [[22, 7]], blessing: [[24, 5]] },
    };

    expect(sim.mir4EquipItem(991010106)).toBe('Lâmina do Rei equipped.');
    expect(meta.mir4EquipmentInstances?.[991010106]).toMatchObject({
      enhancement: 7,
      affixes: { enchantment: [[22, 7]], blessing: [[24, 5]] },
    });
  });

  it('does not resurrect a destroyed reward item or credit its tutorial receipt', () => {
    const sim = makeSim(145);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4EquipmentInstances = {
      991010101: { itemId: 991010101, enhancement: 5, destroyed: true },
    };
    meta.mir4ArcQuests = {
      'M01-Q03': {
        questId: 'M01-Q03',
        state: 'active',
        stageIndex: 3,
        stageProgress: 0,
      },
    };

    expect(mir4EquipItem(sim.ctx, sim.playerId, 991010101)).toBe('Unknown item.');
    expect(meta.mir4Equipment?.weapon).toBeUndefined();
    expect(meta.mir4EquipmentInstances[991010101]?.destroyed).toBe(true);
    expect(meta.mir4ArcQuests['M01-Q03']?.stageIndex).toBe(3);
  });
});

describe('the enhancement path', () => {
  it('+1..+5 always succeed: the scroll is consumed, stats rise exactly', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(142);
    const meta = sim.players.get(sim.playerId)!;
    const p = sim.entities.get(sim.playerId)!;
    sim.mir4EquipItem(991010101);
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 10 };
    const pa0 = p.attackPower;
    for (let step = 1; step <= 5; step++) {
      const out = mir4Enhance(sim.ctx, sim.playerId, 991010101);
      expect(out).toEqual({
        ok: true,
        level: step,
        destroyed: false,
        protected: false,
        effectiveChanceBps: 100_000,
      });
    }
    // +5: base 18 + floor(18 * 15% * 1.0 weapon-main-stat) = 18 + 2 = 20 applied.
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(mir4ItemAttributes(mir4EquipmentItem(991010101)!, inst)).toEqual([
      [20, 20],
      [28, 2],
    ]);
    expect(p.attackPower).toBe(pa0 + 20 - 18); // replaced the base 18 with 20
    expect(meta.mir4Materials.solarScroll).toBe(5);
  });
  it('a failure above +5 without a ward destroys and unequips', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(143);
    const meta = sim.players.get(sim.playerId)!;
    const p = sim.entities.get(sim.playerId)!;
    sim.mir4EquipItem(991010101);
    const inst: { itemId: number; enhancement: number; destroyed?: boolean } = {
      itemId: 991010101,
      enhancement: 5,
    };
    meta.mir4EquipmentInstances = { 991010101: inst };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1 };
    const paEquipped = p.attackPower;
    // Burn rolls until the +6 (50%) fails: with seed 143 it must eventually.
    let destroyed = false;
    for (let attempt = 0; attempt < 64 && !destroyed; attempt++) {
      meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1 };
      inst.enhancement = 5;
      const out = mir4Enhance(sim.ctx, sim.playerId, 991010101);
      if (out.ok && out.destroyed) destroyed = true;
    }
    expect(destroyed).toBe(true);
    expect(inst.destroyed).toBe(true);
    expect(p.attackPower).toBe(paEquipped - 18); // destroyed: unequipped, bare-handed table
  });
  it('a ward is consumed to save the item on a failure above +5', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(144);
    const meta = sim.players.get(sim.playerId)!;
    sim.mir4EquipItem(991010101);
    meta.mir4EquipmentInstances = { 991010101: { itemId: 991010101, enhancement: 5 } };
    let saved = false;
    for (let attempt = 0; attempt < 64 && !saved; attempt++) {
      meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1, solarWard: 1 };
      const out = mir4Enhance(sim.ctx, sim.playerId, 991010101);
      if (out.ok && out.protected) saved = true;
    }
    expect(saved).toBe(true);
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(inst.destroyed).toBeUndefined();
    expect(inst.enhancement).toBe(5); // level kept, ward consumed
  });

  it('applies the weapon enhancement success status to the actual roll', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(145);
    const meta = sim.players.get(sim.playerId)!;
    sim.mir4EquipItem(991010101);
    const mir4 = sim.player.mir4!;
    meta.mir4EquipmentInstances = { 991010101: { itemId: 991010101, enhancement: 5 } };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1 };
    mir4.statusValues = { ...mir4.statusValues, 110: 10_000 };
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0.99999);

    expect(mir4Enhance(sim.ctx, sim.playerId, 991010101)).toEqual({
      ok: true,
      level: 6,
      destroyed: false,
      protected: false,
      effectiveChanceBps: 100_000,
    });
  });

  it('consumes the campaign guarantee so the first +6 lesson cannot fail or destroy gear', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(146);
    const meta = sim.players.get(sim.playerId)!;
    sim.mir4EquipItem(991010101);
    meta.mir4EquipmentInstances = { 991010101: { itemId: 991010101, enhancement: 5 } };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1, solarWard: 1 };
    meta.mir4ArcRewards = {
      ...meta.mir4ArcRewards,
      guarantees: { 'tutorial-first-plus-six': 1 },
    };
    meta.mir4ArcQuests = {
      'M07-Q05': {
        questId: 'M07-Q05',
        state: 'active',
        stageIndex: 3,
        stageProgress: 0,
      },
    };
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0.99999);

    expect(mir4Enhance(sim.ctx, sim.playerId, 991010101)).toEqual({
      ok: true,
      level: 6,
      destroyed: false,
      protected: false,
      effectiveChanceBps: 100_000,
    });
    expect(meta.mir4ArcRewards.guarantees?.['tutorial-first-plus-six']).toBeUndefined();
    expect(meta.mir4Materials.solarWard).toBe(1);
    expect(meta.mir4ArcQuests['M07-Q05']?.stageIndex).toBe(4);
  });

  it('consumes the guided +10 guarantee so a mandatory main tutorial cannot destroy gear', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(147);
    const meta = sim.players.get(sim.playerId)!;
    sim.mir4EquipItem(991010101);
    meta.mir4EquipmentInstances = { 991010101: { itemId: 991010101, enhancement: 9 } };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1 };
    meta.mir4ArcRewards = {
      ...meta.mir4ArcRewards,
      guarantees: { 'tutorial-guided-plus-10': 1 },
    };
    meta.mir4ArcQuests = {
      'M19-Q06': {
        questId: 'M19-Q06',
        state: 'active',
        stageIndex: 3,
        stageProgress: 0,
      },
    };
    const next = vi.spyOn(sim.rng, 'next');

    expect(mir4Enhance(sim.ctx, sim.playerId, 991010101)).toEqual({
      ok: true,
      level: 10,
      destroyed: false,
      protected: false,
      effectiveChanceBps: 100_000,
    });
    expect(next).not.toHaveBeenCalled();
    expect(meta.mir4ArcRewards.guarantees?.['tutorial-guided-plus-10']).toBeUndefined();
    expect(meta.mir4ArcQuests['M19-Q06']?.stageIndex).toBe(4);
  });
});
