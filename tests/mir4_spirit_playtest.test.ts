import { describe, expect, it, vi } from 'vitest';

import { MIR4_SPIRIT_PENDING_LIMIT } from '../src/sim/mir4/spirits';
import { mir4WireRevision } from '../src/sim/mir4/wire_revision';
import { Sim } from '../src/sim/sim';
import { EMPTY_TEST_WORLD } from './sim_shared';

function playtestSim(): Sim {
  return new Sim({
    seed: 81,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Spirit Tester',
    gameProfile: 'mir4-gameplay-port',
    devCommands: true,
    world: EMPTY_TEST_WORLD,
  });
}

describe('MIR4 Spirit playtest kit', () => {
  it('arms real summon and combination flows without drawing RNG', () => {
    const sim = playtestSim();
    let draws = 0;
    sim.rng.setObserver(() => {
      draws += 1;
    });

    sim.chat('/dev spirits');

    const meta = sim.players.get(sim.playerId);
    expect(meta?.mir4ArcRewards).toMatchObject({
      systems: ['spirit-summon'],
      tickets: {
        'spirit-ticket-dawn': 100_000,
        'spirit-ticket-sunset': 100_000,
      },
    });
    expect(meta?.mir4Spirits).toMatchObject({
      owned: { 'spirit-common-01': 4 },
      discovered: ['spirit-common-01'],
    });
    expect(draws).toBe(0);

    sim.rng.setObserver(null);
    vi.spyOn(sim.rng, 'next')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.1999)
      .mockReturnValueOnce(0);

    sim.mir4RedeemTicket('spirit-ticket-dawn');
    expect(meta?.mir4ArcRewards?.tickets?.['spirit-ticket-dawn']).toBe(99_999);
    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4CollectionResult',
      pid: sim.playerId,
      collection: 'spirit',
      ticketId: 'spirit-ticket-dawn',
      collectionId: 'spirit-common-01',
      grade: 1,
      status: 'owned',
    });

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

  it('redeems 100 independent Spirits and summarizes the best result in one event', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    let draws = 0;
    vi.spyOn(sim.rng, 'next').mockImplementation(() => {
      draws += 1;
      return draws > 198 ? 0.999 : 0;
    });

    sim.mir4RedeemTicket('spirit-ticket-sunset', 100);

    const state = sim.mir4PlayerState();
    expect(state?.mir4ArcRewards?.tickets?.['spirit-ticket-sunset']).toBe(99_900);
    expect(state?.mir4Spirits?.owned?.['spirit-uncommon-01']).toBe(99);
    expect(state?.mir4Spirits?.pending).toHaveLength(1);
    expect(draws).toBe(200);
    expect(sim.drainEvents()).toEqual([
      {
        type: 'mir4CollectionResult',
        pid: sim.playerId,
        collection: 'spirit',
        ticketId: 'spirit-ticket-sunset',
        collectionId: 'spirit-epic-06',
        grade: 4,
        status: 'pending-confirmation',
        batchCount: 100,
        gradeCounts: [0, 99, 0, 1, 0, 0],
      },
    ]);
  });

  it('redeems a real x10 batch with twenty independent rolls and one summary', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    let draws = 0;
    vi.spyOn(sim.rng, 'next').mockImplementation(() => {
      draws += 1;
      return 0;
    });

    sim.mir4RedeemTicket('spirit-ticket-dawn', 10);

    const state = sim.mir4PlayerState();
    expect(state?.mir4ArcRewards?.tickets?.['spirit-ticket-dawn']).toBe(99_990);
    expect(state?.mir4Spirits?.owned?.['spirit-common-01']).toBe(14);
    expect(draws).toBe(20);
    expect(sim.drainEvents()).toEqual([
      {
        type: 'mir4CollectionResult',
        pid: sim.playerId,
        collection: 'spirit',
        ticketId: 'spirit-ticket-dawn',
        collectionId: 'spirit-common-01',
        grade: 1,
        status: 'owned',
        batchCount: 10,
        gradeCounts: [10, 0, 0, 0, 0, 0],
      },
    ]);
  });

  it('preserves every pending Spirit from an all-epic x100 summon', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    vi.spyOn(sim.rng, 'next').mockReturnValue(0.999);

    sim.mir4RedeemTicket('spirit-ticket-sunset', 100);

    const state = sim.mir4PlayerState();
    const pending = state?.mir4Spirits?.pending ?? [];
    expect(state?.mir4ArcRewards?.tickets?.['spirit-ticket-sunset']).toBe(99_900);
    expect(pending).toHaveLength(100);
    expect(new Set(pending.map((entry) => entry.id))).toHaveLength(100);
    const events = sim.drainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'mir4CollectionResult',
      collection: 'spirit',
      ticketId: 'spirit-ticket-sunset',
      grade: 4,
      status: 'pending-confirmation',
      batchCount: 100,
      gradeCounts: [0, 0, 0, 100, 0, 0],
    });
    const event = events[0];
    if (event?.type !== 'mir4CollectionResult') throw new Error('missing collection result');
    expect(pending.some((entry) => entry.spiritId === event.collectionId)).toBe(true);
  });

  it('rejects a batch atomically when the pending confirmation capacity cannot hold it', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    expect(meta?.mir4ArcRewards?.tickets).toBeDefined();
    if (!meta?.mir4ArcRewards?.tickets) throw new Error('missing Spirit test tickets');
    meta.mir4Spirits = {
      pending: Array.from({ length: MIR4_SPIRIT_PENDING_LIMIT - 50 }, (_, index) => ({
        id: `spirit-pending-${sim.playerId}-${index + 1}`,
        spiritId: 'spirit-epic-01',
        grade: 4,
      })),
      nextPendingId: MIR4_SPIRIT_PENDING_LIMIT,
    };
    let draws = 0;
    sim.rng.setObserver(() => {
      draws += 1;
    });

    sim.mir4RedeemTicket('spirit-ticket-sunset', 100);

    expect(meta.mir4ArcRewards.tickets['spirit-ticket-sunset']).toBe(100_000);
    expect(meta.mir4Spirits.pending).toHaveLength(MIR4_SPIRIT_PENDING_LIMIT - 50);
    expect(draws).toBe(0);
    expect(sim.drainEvents()).toEqual([]);
  });

  it('does not reserve pending capacity for Dawn batches that cannot roll Epic Spirits', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Spirit tester metadata');
    meta.mir4Spirits ??= {};
    meta.mir4Spirits.pending = Array.from({ length: MIR4_SPIRIT_PENDING_LIMIT }, (_, index) => ({
      id: `spirit-pending-${sim.playerId}-${index + 1}`,
      spiritId: 'spirit-epic-01',
      grade: 4,
    }));
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    sim.mir4RedeemTicket('spirit-ticket-dawn', 100);

    expect(meta.mir4ArcRewards?.tickets?.['spirit-ticket-dawn']).toBe(99_900);
    expect(meta.mir4Spirits.owned?.['spirit-common-01']).toBe(104);
  });

  it('combines every initially available Spirit of one rarity in one authoritative batch', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Spirit tester metadata');
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 40 },
      discovered: ['spirit-common-01'],
    };
    let draws = 0;
    vi.spyOn(sim.rng, 'next').mockImplementation(() => {
      draws += 1;
      if (draws % 2 === 0) return 0;
      return draws <= 8 ? 0 : 0.999;
    });

    sim.mir4CombineSpirits(1, true);

    expect(draws).toBe(20);
    expect(meta.mir4Spirits.owned).toEqual({
      'spirit-common-01': 6,
      'spirit-uncommon-01': 4,
    });
    expect(sim.drainEvents()).toEqual([
      {
        type: 'mir4CombinationResult',
        pid: sim.playerId,
        collection: 'spirit',
        sourceGrade: 1,
        outcome: 'success',
        collectionId: 'spirit-uncommon-01',
        grade: 2,
        status: 'owned',
        batchCount: 10,
        successCount: 4,
        failureCount: 6,
      },
    ]);
  });

  it('combines copies across Spirit ids of the same rarity and preserves the remainder', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Spirit tester metadata');
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 3, 'spirit-common-02': 6 },
      discovered: ['spirit-common-01', 'spirit-common-02'],
    };
    let draws = 0;
    vi.spyOn(sim.rng, 'next').mockImplementation(() => {
      draws += 1;
      return 0;
    });

    sim.mir4CombineSpirits(1, true);

    expect(draws).toBe(4);
    expect(meta.mir4Spirits.owned).toEqual({
      'spirit-common-02': 1,
      'spirit-uncommon-01': 2,
    });
    expect(sim.drainEvents()).toEqual([
      expect.objectContaining({
        type: 'mir4CombinationResult',
        batchCount: 2,
        successCount: 2,
        failureCount: 0,
      }),
    ]);
  });

  it('summarizes a combine-all batch when every attempt fails', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Spirit tester metadata');
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 8 },
      discovered: ['spirit-common-01'],
    };
    let draws = 0;
    vi.spyOn(sim.rng, 'next').mockImplementation(() => {
      draws += 1;
      return draws % 2 === 1 ? 0.999 : 0;
    });

    sim.mir4CombineSpirits(1, true);

    expect(draws).toBe(4);
    expect(meta.mir4Spirits.owned).toEqual({ 'spirit-common-01': 2 });
    expect(sim.drainEvents()).toEqual([
      {
        type: 'mir4CombinationResult',
        pid: sim.playerId,
        collection: 'spirit',
        sourceGrade: 1,
        outcome: 'failure',
        collectionId: 'spirit-common-01',
        grade: 1,
        status: 'owned',
        batchCount: 2,
        successCount: 0,
        failureCount: 2,
      },
    ]);
  });

  it('rejects an abusive combine-all request before RNG or state mutation', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Spirit tester metadata');
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 100_004 },
      discovered: ['spirit-common-01'],
    };
    let draws = 0;
    sim.rng.setObserver(() => {
      draws += 1;
    });

    sim.mir4CombineSpirits(1, true);

    expect(draws).toBe(0);
    expect(meta.mir4Spirits.owned).toEqual({ 'spirit-common-01': 100_004 });
    expect(sim.drainEvents()).toEqual([]);
  });

  it('caps combine-all to the remaining Spirit confirmation capacity', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Spirit tester metadata');
    meta.mir4Spirits = {
      owned: { 'spirit-rare-01': 400 },
      discovered: ['spirit-rare-01'],
      pending: Array.from({ length: 200 }, (_, index) => ({
        id: `spirit-pending-${sim.playerId}-${index + 1}`,
        spiritId: 'spirit-epic-01',
        grade: 4,
      })),
      nextPendingId: 201,
    };
    const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    sim.mir4CombineSpirits(3, true);

    expect(meta.mir4Spirits.owned).toEqual({ 'spirit-rare-01': 176 });
    expect(meta.mir4Spirits.pending).toHaveLength(MIR4_SPIRIT_PENDING_LIMIT);
    expect(next).toHaveBeenCalledTimes(112);
    expect(sim.drainEvents()).toEqual([
      expect.objectContaining({
        type: 'mir4CombinationResult',
        collection: 'spirit',
        batchCount: 56,
        successCount: 56,
      }),
    ]);
  });

  it('requires the MIR4 development profile and tops up without replacing greater progress', () => {
    const production = new Sim({
      seed: 82,
      playerClass: 'warrior',
      playerName: 'Production Tester',
      gameProfile: 'mir4-gameplay-port',
      devCommands: false,
      world: EMPTY_TEST_WORLD,
    });
    production.chat('/dev spirits');
    expect(production.players.get(production.playerId)?.mir4ArcRewards).toBeUndefined();

    const classic = new Sim({
      seed: 83,
      playerClass: 'warrior',
      playerName: 'Classic Tester',
      gameProfile: 'woc-classic',
      devCommands: true,
      world: EMPTY_TEST_WORLD,
    });
    classic.chat('/dev spirits');
    expect(classic.players.get(classic.playerId)?.mir4ArcRewards).toBeUndefined();
    expect(classic.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'log',
        text: '[dev] The Spirit playtest kit is available only in the MIR4 profile.',
      }),
    );

    const sim = playtestSim();
    sim.chat('/dev spirits');
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) throw new Error('missing Spirit tester metadata');
    meta.mir4ArcRewards ??= {};
    meta.mir4ArcRewards.systems = ['mount-summon', 'spirit-summon'];
    meta.mir4ArcRewards.tickets ??= {};
    meta.mir4ArcRewards.tickets['spirit-ticket-dawn'] = 100_500;
    meta.mir4ArcRewards.tickets['spirit-ticket-sunset'] = 5;
    meta.mir4Spirits ??= {};
    meta.mir4Spirits.owned = { 'spirit-common-01': 9, 'spirit-uncommon-01': 2 };
    meta.mir4Spirits.discovered = ['spirit-common-01', 'spirit-uncommon-01'];
    const revision = mir4WireRevision(meta);

    sim.chat('/dev spirits');

    expect(mir4WireRevision(meta)).toBeGreaterThan(revision);
    expect(sim.mir4PlayerState()).toMatchObject({
      mir4ArcRewards: {
        systems: ['mount-summon', 'spirit-summon'],
        tickets: {
          'spirit-ticket-dawn': 100_500,
          'spirit-ticket-sunset': 100_000,
        },
      },
      mir4Spirits: {
        owned: { 'spirit-common-01': 9, 'spirit-uncommon-01': 2 },
        discovered: ['spirit-common-01', 'spirit-uncommon-01'],
      },
    });
  });

  it('keeps a stale batch request atomic when the authoritative balance is insufficient', () => {
    const sim = playtestSim();
    sim.chat('/dev spirits');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    expect(meta?.mir4ArcRewards?.tickets).toBeDefined();
    if (!meta?.mir4ArcRewards?.tickets) throw new Error('missing Spirit test tickets');
    meta.mir4ArcRewards.tickets['spirit-ticket-dawn'] = 9;
    let draws = 0;
    sim.rng.setObserver(() => {
      draws += 1;
    });

    sim.mir4RedeemTicket('spirit-ticket-dawn', 10);

    expect(meta.mir4ArcRewards.tickets['spirit-ticket-dawn']).toBe(9);
    expect(draws).toBe(0);
    expect(sim.drainEvents()).toEqual([]);
  });
});
