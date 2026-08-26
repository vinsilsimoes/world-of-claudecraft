import { describe, expect, it, vi } from 'vitest';

import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import { Sim } from '../src/sim/sim';

function mir4Sim(seed = 4401): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Result Tester',
    gameProfile: 'mir4-gameplay-port',
  });
}

describe('MIR4 player-result events', () => {
  it('emits the authoritative enhancement outcome with the attempted levels and chance', () => {
    const sim = mir4Sim();
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) return;
    meta.mir4ArcRewards = { items: { '991010101': 1 } };
    expect(sim.mir4EquipItem(991010101)).toContain('equipped');
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1 };

    sim.mir4EnhanceItem(991010101);

    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4EnhancementResult',
      pid: sim.playerId,
      itemId: 991010101,
      outcome: 'success',
      previousLevel: 0,
      targetLevel: 1,
      level: 1,
      chanceBps: 100_000,
    });
  });

  it('distinguishes a protected failure from item destruction', () => {
    const protectedSim = mir4Sim(4402);
    const protectedMeta = protectedSim.players.get(protectedSim.playerId);
    expect(protectedMeta).toBeDefined();
    if (!protectedMeta) return;
    protectedMeta.mir4ArcRewards = { items: { '991010101': 1 } };
    protectedSim.mir4EquipItem(991010101);
    protectedMeta.mir4EquipmentInstances = {
      991010101: { itemId: 991010101, enhancement: 5 },
    };
    protectedMeta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      solarScroll: 1,
      solarWard: 1,
    };
    vi.spyOn(protectedSim.rng, 'next').mockReturnValue(0.99999);

    protectedSim.mir4EnhanceItem(991010101);

    expect(protectedSim.drainEvents()).toContainEqual({
      type: 'mir4EnhancementResult',
      pid: protectedSim.playerId,
      itemId: 991010101,
      outcome: 'protected',
      previousLevel: 5,
      targetLevel: 6,
      level: 5,
      chanceBps: 50_000,
    });

    const destroyedSim = mir4Sim(4403);
    const destroyedMeta = destroyedSim.players.get(destroyedSim.playerId);
    expect(destroyedMeta).toBeDefined();
    if (!destroyedMeta) return;
    destroyedMeta.mir4ArcRewards = { items: { '991010101': 1 } };
    destroyedSim.mir4EquipItem(991010101);
    destroyedMeta.mir4EquipmentInstances = {
      991010101: { itemId: 991010101, enhancement: 5 },
    };
    destroyedMeta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1 };
    vi.spyOn(destroyedSim.rng, 'next').mockReturnValue(0.99999);

    destroyedSim.mir4EnhanceItem(991010101);

    expect(destroyedSim.drainEvents()).toContainEqual({
      type: 'mir4EnhancementResult',
      pid: destroyedSim.playerId,
      itemId: 991010101,
      outcome: 'destroyed',
      previousLevel: 5,
      targetLevel: 6,
      level: 5,
      chanceBps: 50_000,
    });
  });

  it('reports the effective 100% chance when a tutorial guarantee is consumed', () => {
    const sim = mir4Sim(4405);
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) return;
    meta.mir4ArcRewards = {
      items: { '991010101': 1 },
      guarantees: { 'tutorial-first-plus-six': 1 },
    };
    sim.mir4EquipItem(991010101);
    meta.mir4EquipmentInstances = {
      991010101: { itemId: 991010101, enhancement: 5 },
    };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 1 };
    vi.spyOn(sim.rng, 'next').mockReturnValue(0.99999);

    sim.mir4EnhanceItem(991010101);

    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4EnhancementResult',
      pid: sim.playerId,
      itemId: 991010101,
      outcome: 'success',
      previousLevel: 5,
      targetLevel: 6,
      level: 6,
      chanceBps: 100_000,
    });
    expect(sim.rng.next).not.toHaveBeenCalled();
  });

  it('emits a denied enhancement result without mutating an unowned item', () => {
    const sim = mir4Sim(4406);

    sim.mir4EnhanceItem(991010106);

    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4EnhancementResult',
      pid: sim.playerId,
      itemId: 991010106,
      outcome: 'denied',
      previousLevel: 0,
      targetLevel: 1,
      level: 0,
      chanceBps: 100_000,
      reason: 'unknown-item',
    });
  });

  it('emits the revealed Spirit and the combination outcome', () => {
    const sim = mir4Sim(4404);
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) return;
    meta.mir4ArcRewards = {
      systems: ['spirit-summon'],
      tickets: { 'spirit-ticket-sunset': 1 },
    };
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0.999).mockReturnValueOnce(0.999);

    sim.mir4RedeemTicket('spirit-ticket-sunset');

    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4CollectionResult',
      pid: sim.playerId,
      collection: 'spirit',
      ticketId: 'spirit-ticket-sunset',
      collectionId: 'spirit-epic-06',
      grade: 4,
      status: 'pending-confirmation',
    });

    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 4 },
      discovered: ['spirit-common-01'],
    };
    vi.restoreAllMocks();
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0.1999).mockReturnValueOnce(0);

    sim.mir4CombineSpirits(1);

    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4CombinationResult',
      pid: sim.playerId,
      collection: 'spirit',
      sourceGrade: 1,
      outcome: 'success',
      collectionId: 'spirit-uncommon-01',
      grade: 2,
      status: 'owned',
    });
  });

  it('emits Mount summon and failed-combination outcomes and ignores refused commands', () => {
    const sim = mir4Sim(4407);
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) return;
    meta.mir4ArcRewards = {
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
    };
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0).mockReturnValueOnce(0);

    sim.mir4RedeemTicket('mount-ticket-dawn');

    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4CollectionResult',
      pid: sim.playerId,
      collection: 'mount',
      ticketId: 'mount-ticket-dawn',
      collectionId: 'meadow-courser',
      grade: 1,
      status: 'owned',
    });

    meta.mir4Mounts = {
      owned: { 'meadow-courser': 4 },
      discovered: ['meadow-courser'],
    };
    vi.restoreAllMocks();
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0.999).mockReturnValueOnce(0);
    sim.mir4CombineMounts(1);
    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4CombinationResult',
      pid: sim.playerId,
      collection: 'mount',
      sourceGrade: 1,
      outcome: 'failure',
      collectionId: 'meadow-courser',
      grade: 1,
      status: 'owned',
    });

    sim.mir4RedeemTicket('not-a-ticket');
    sim.mir4CombineMounts(5);
    expect(sim.drainEvents()).toEqual([]);
  });

  it('emits one aggregate Mount combine-all outcome', () => {
    const sim = mir4Sim(4408);
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) return;
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'meadow-courser': 8 },
      discovered: ['meadow-courser'],
    };
    const rolls = [0, 0, 0.999, 0];
    vi.spyOn(sim.rng, 'next').mockImplementation(() => rolls.shift() ?? 0);

    sim.mir4CombineMounts(1, true);

    expect(sim.drainEvents()).toEqual([
      expect.objectContaining({
        type: 'mir4CombinationResult',
        pid: sim.playerId,
        collection: 'mount',
        sourceGrade: 1,
        outcome: 'success',
        batchCount: 2,
        successCount: 1,
        failureCount: 1,
      }),
    ]);
  });
});
