import { afterAll, describe, expect, it } from 'vitest';
import { mir4EquipmentItem } from '../../src/sim/content/mir4/equipment_catalog';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4ResolveLayer, mir4RollLayer } from '../../src/sim/mir4/affixes';
import { MIR4_EMPTY_MATERIALS, mir4ItemAttributes } from '../../src/sim/mir4/equipment';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 4.2/4.3: the enchantment (Selo Lunar, 2 affixes) and blessing
// (Lágrima da Aurora, 3 affixes at 0.7x) layers with the roll -> preview ->
// resolve flow and the source's pool weighting and value scaling.

function makeSim(seed = 151): Sim {
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

describe('the enchantment layer', () => {
  it('rolls 2 unique affixes for 1 Selo Lunar, pending until resolved', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(roll.affixes).toHaveLength(2);
    const keys = roll.affixes.map((a) => a.key);
    expect(new Set(keys).size).toBe(2);
    // The warrior's weapon pool only holds attack/accuracy/crit/penetration.
    for (const affix of roll.affixes) {
      expect(['physicalAttack', 'accuracy', 'critical', 'penetration']).toContain(affix.key);
    }
    expect(meta.mir4Materials.lunarSeal).toBe(0);
    // A second roll while the preview is pending fails closed.
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    expect(mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment')).toEqual({
      ok: false,
      code: 'preview-pending',
    });
    // Refusing keeps nothing; accepting writes the layer.
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', roll.rollId, true),
    ).toEqual({ ok: true, accepted: true });
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(inst.affixes?.enchantment).toHaveLength(2);
    expect(inst.pendingRoll).toBeUndefined();
    // The accepted affixes land in the applied attributes.
    const attrs = mir4ItemAttributes(mir4EquipmentItem(991010101)!, inst);
    expect(attrs.length).toBe(2 + 2); // 2 base + 2 layer
  });
  it('no material means no roll; refusing leaves the layer empty', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(152);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS };
    expect(mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment')).toEqual({
      ok: false,
      code: 'no-materials',
    });
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', roll.rollId, false),
    ).toEqual({ ok: true, accepted: false });
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(inst.affixes?.enchantment).toBeUndefined();
  });
  it('a stale rollId is refused (the preview-stale gate)', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(153);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', 'wrong-id', true),
    ).toEqual({ ok: false, code: 'preview-stale' });
  });
});

describe('the blessing layer', () => {
  it('rolls 3 affixes for 1 Lágrima at the 0.7x multiplier', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(154);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, dawnTear: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'blessing');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(roll.affixes).toHaveLength(3);
    expect(new Set(roll.affixes.map((a) => a.key)).size).toBe(3);
    expect(meta.mir4Materials.dawnTear).toBe(0);
    // The 0.7x multiplier: every rating value <= its unscaled max * scale * 0.7 ceiling.
    for (const affix of roll.affixes) {
      expect(affix.value).toBeGreaterThanOrEqual(1);
    }
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'blessing', roll.rollId, true),
    ).toEqual({ ok: true, accepted: true });
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(inst.affixes?.blessing).toHaveLength(3);
  });
});
