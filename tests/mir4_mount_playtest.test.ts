import { describe, expect, it, vi } from 'vitest';

import { MIR4_MOUNT_PLAYTEST_TICKET_COUNT } from '../src/sim/dev/mir4_mount_playtest';
import { MIR4_MOUNT_PENDING_LIMIT } from '../src/sim/mir4/mounts';
import { Sim } from '../src/sim/sim';
import { EMPTY_TEST_WORLD } from './sim_shared';

function playtestSim(
  devCommands = true,
  gameProfile: 'mir4-gameplay-port' | 'woc-classic' = 'mir4-gameplay-port',
): Sim {
  return new Sim({
    seed: 91,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Mount Tester',
    gameProfile,
    devCommands,
    world: EMPTY_TEST_WORLD,
  });
}

describe('MIR4 Mount playtest kit', () => {
  it('adds 100,000 tickets and real fusion copies through the existing Mount dev command', () => {
    const sim = playtestSim();
    sim.chat('/dev mounts');

    expect(sim.mir4PlayerState()).toMatchObject({
      mir4ArcRewards: {
        systems: ['mount-summon'],
        tickets: {
          'mount-ticket-dawn': MIR4_MOUNT_PLAYTEST_TICKET_COUNT,
          'mount-ticket-twilight': MIR4_MOUNT_PLAYTEST_TICKET_COUNT,
        },
      },
      mir4Mounts: {
        owned: { 'meadow-courser': 4 },
        discovered: ['meadow-courser'],
      },
    });
  });

  it('keeps the Mount kit behind dev mode and the MIR4 profile without consuming RNG', () => {
    const production = playtestSim(false);
    production.chat('/dev mounts');
    expect(production.mir4PlayerState()?.mir4ArcRewards?.tickets).toBeUndefined();

    const classic = playtestSim(true, 'woc-classic');
    classic.chat('/dev mounts');
    expect(classic.players.get(classic.playerId)?.mir4ArcRewards?.tickets).toBeUndefined();

    const sim = playtestSim();
    const next = vi.spyOn(sim.rng, 'next');
    sim.chat('/dev mounts');
    expect(next).not.toHaveBeenCalled();
  });

  it('tops up idempotently without reducing existing Mount progress', () => {
    const sim = playtestSim();
    sim.chat('/dev mounts');
    const meta = sim.players.get(sim.playerId);
    if (!meta?.mir4ArcRewards?.tickets || !meta.mir4Mounts?.owned)
      throw new Error('missing Mount playtest kit');
    meta.mir4ArcRewards.tickets['mount-ticket-dawn'] = 100_001;
    meta.mir4Mounts.owned['meadow-courser'] = 7;
    meta.mir4Mounts.owned['shaggy-yak'] = 3;

    sim.chat('/dev mounts');

    expect(meta.mir4ArcRewards.tickets['mount-ticket-dawn']).toBe(100_001);
    expect(meta.mir4Mounts.owned['meadow-courser']).toBe(7);
    expect(meta.mir4Mounts.owned['shaggy-yak']).toBe(3);
  });

  it('redeems 100 independent Mounts and emits one authoritative summary', () => {
    const sim = playtestSim();
    sim.chat('/dev mounts');
    sim.drainEvents();
    const rolls = Array.from({ length: 100 }, (_, index) =>
      index === 99 ? [0.9999, 0] : [0, 0],
    ).flat();
    const next = vi.spyOn(sim.rng, 'next').mockImplementation(() => rolls.shift() ?? 0);

    sim.mir4RedeemTicket('mount-ticket-dawn', 100);

    expect(next).toHaveBeenCalledTimes(200);
    expect(sim.mir4PlayerState()?.mir4Mounts?.owned?.['meadow-courser']).toBe(103);
    expect(sim.drainEvents()).toEqual([
      expect.objectContaining({
        type: 'mir4CollectionResult',
        pid: sim.playerId,
        collection: 'mount',
        ticketId: 'mount-ticket-dawn',
        grade: 3,
        status: 'owned',
        batchCount: 100,
        gradeCounts: [99, 0, 1, 0, 0, 0],
      }),
    ]);
  });

  it('redeems a real ten-Mount batch with independent authoritative draws', () => {
    const sim = playtestSim();
    sim.chat('/dev mounts');
    sim.drainEvents();
    const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    sim.mir4RedeemTicket('mount-ticket-dawn', 10);

    expect(next).toHaveBeenCalledTimes(20);
    expect(sim.mir4PlayerState()?.mir4ArcRewards?.tickets?.['mount-ticket-dawn']).toBe(99_990);
    expect(sim.drainEvents()).toEqual([
      expect.objectContaining({
        collection: 'mount',
        ticketId: 'mount-ticket-dawn',
        batchCount: 10,
        gradeCounts: [10, 0, 0, 0, 0, 0],
      }),
    ]);
  });

  it('queues one hundred unique Epic confirmations for a full Twilight batch', () => {
    const sim = playtestSim();
    sim.chat('/dev mounts');
    sim.drainEvents();
    const rolls = Array.from({ length: 100 }, () => [0.9999, 0]).flat();
    const next = vi.spyOn(sim.rng, 'next').mockImplementation(() => rolls.shift() ?? 0);

    sim.mir4RedeemTicket('mount-ticket-twilight', 100);

    const state = sim.mir4PlayerState();
    expect(next).toHaveBeenCalledTimes(200);
    expect(state?.mir4ArcRewards?.tickets?.['mount-ticket-twilight']).toBe(99_900);
    expect(state?.mir4Mounts?.pending).toHaveLength(100);
    expect(new Set(state?.mir4Mounts?.pending?.map((entry) => entry.id))).toHaveLength(100);
    expect(state?.mir4Mounts?.pending?.every((entry) => entry.grade === 4)).toBe(true);
    expect(sim.drainEvents()).toEqual([
      expect.objectContaining({
        collection: 'mount',
        ticketId: 'mount-ticket-twilight',
        grade: 4,
        status: 'pending-confirmation',
        batchCount: 100,
        gradeCounts: [0, 0, 0, 100, 0, 0],
      }),
    ]);
  });

  it('accepts a Twilight x100 batch at the exact pending capacity', () => {
    const sim = playtestSim();
    sim.chat('/dev mounts');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Mount player');
    meta.mir4Mounts = {
      pending: Array.from({ length: MIR4_MOUNT_PENDING_LIMIT - 100 }, (_, index) => ({
        id: `mount-pending-${sim.playerId}-${index + 1}`,
        mountId: 'eclipse-lion',
        grade: 4,
      })),
      nextPendingId: MIR4_MOUNT_PENDING_LIMIT - 99,
    };
    vi.spyOn(sim.rng, 'next').mockReturnValue(0.9999);

    sim.mir4RedeemTicket('mount-ticket-twilight', 100);

    expect(meta.mir4Mounts.pending).toHaveLength(MIR4_MOUNT_PENDING_LIMIT);
    expect(meta.mir4ArcRewards?.tickets?.['mount-ticket-twilight']).toBe(99_900);
    expect(sim.drainEvents()).toHaveLength(1);
  });

  it('rejects Twilight batches atomically when confirmation capacity is too small', () => {
    const sim = playtestSim();
    sim.chat('/dev mounts');
    sim.drainEvents();
    const meta = sim.players.get(sim.playerId);
    if (!meta?.mir4ArcRewards?.tickets) throw new Error('missing Mount playtest tickets');
    meta.mir4Mounts = {
      pending: Array.from({ length: MIR4_MOUNT_PENDING_LIMIT - 50 }, (_, index) => ({
        id: `mount-pending-${sim.playerId}-${index + 1}`,
        mountId: 'eclipse-lion',
        grade: 4,
      })),
    };
    const next = vi.spyOn(sim.rng, 'next');

    sim.mir4RedeemTicket('mount-ticket-twilight', 100);

    expect(meta.mir4ArcRewards.tickets['mount-ticket-twilight']).toBe(100_000);
    expect(meta.mir4Mounts.pending).toHaveLength(MIR4_MOUNT_PENDING_LIMIT - 50);
    expect(next).not.toHaveBeenCalled();
    expect(sim.drainEvents()).toEqual([]);
  });
});
