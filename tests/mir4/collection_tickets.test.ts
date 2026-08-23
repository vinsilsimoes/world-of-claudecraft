import { describe, expect, it, vi } from 'vitest';

import { ITEMS } from '../../src/sim/data';
import { redeemMir4CollectionTicket } from '../../src/sim/mir4/collection_tickets';
import { confirmMir4Mount, equipMir4Mount } from '../../src/sim/mir4/mount_commands';
import { mir4MountVisualKey } from '../../src/sim/mir4/mounts';
import { Sim } from '../../src/sim/sim';

function mir4Sim(seed = 881): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Ticket Tester',
    gameProfile: 'mir4-gameplay-port',
  });
}

function armTicket(sim: Sim, ticketId: 'mount-ticket-dawn' | 'mount-ticket-twilight', count = 1) {
  const meta = sim.players.get(sim.playerId)!;
  meta.mir4ArcRewards = {
    systems: ['mount-summon'],
    tickets: { [ticketId]: count },
  };
  return meta;
}

describe('MIR4 collection tickets use native WoC visual shells', () => {
  it('draws grade then identity, owns the logical Mount, and consumes one dawn ticket', () => {
    const sim = mir4Sim();
    const meta = armTicket(sim, 'mount-ticket-dawn', 2);
    const next = vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0).mockReturnValueOnce(0);

    const result = redeemMir4CollectionTicket(sim.ctx, sim.playerId, 'mount-ticket-dawn');

    expect(result).toEqual({
      ok: true,
      status: 'owned',
      mountId: 'meadow-courser',
      grade: 1,
    });
    expect(next).toHaveBeenCalledTimes(2);
    expect(meta.mir4Mounts).toMatchObject({
      owned: { 'meadow-courser': 1 },
      discovered: ['meadow-courser'],
    });
    expect(meta.mir4ArcRewards?.tickets?.['mount-ticket-dawn']).toBe(1);
    expect(meta.ridingTrained).toBe(true);
  });

  it('queues the exact one-percent Epic twilight boundary for confirmation', () => {
    const sim = mir4Sim(882);
    const meta = armTicket(sim, 'mount-ticket-twilight');
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0.99).mockReturnValueOnce(0);

    const result = redeemMir4CollectionTicket(sim.ctx, sim.playerId, 'mount-ticket-twilight');

    expect(result).toMatchObject({
      ok: true,
      status: 'pending-confirmation',
      mountId: 'eclipse-lion',
      grade: 4,
      pendingId: `mount-pending-${sim.playerId}-1`,
    });
    expect(meta.mir4Mounts?.owned).toBeUndefined();
    if (!result.ok || !result.pendingId) return;
    expect(confirmMir4Mount(sim.ctx, sim.playerId, result.pendingId)).toMatchObject({
      ok: true,
      status: 'confirmed',
      mountId: 'eclipse-lion',
    });
  });

  it('equips source stats while creating and summoning only a native WoC reins shell', () => {
    const sim = mir4Sim(883);
    const meta = armTicket(sim, 'mount-ticket-dawn');
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0).mockReturnValueOnce(0);
    const result = redeemMir4CollectionTicket(sim.ctx, sim.playerId, 'mount-ticket-dawn');
    if (!result.ok || !result.mountId) throw new Error('expected Mount');

    expect(equipMir4Mount(sim.ctx, sim.playerId, result.mountId)).toMatchObject({
      ok: true,
      status: 'equipped',
    });
    const visualKey = mir4MountVisualKey(result.mountId);
    expect(
      meta.inventory.some((slot) => {
        const item = ITEMS[slot.itemId];
        return item?.kind === 'mount' && item.mount === visualKey;
      }),
    ).toBe(true);
    expect(sim.player.mountCastKey).toBe(visualKey);
    expect(sim.player.mir4).toMatchObject({
      mountMoveSpeedBps: 1_000,
      mountBasicAttackSpeedBps: 500,
    });

    const sourceStatsBeforeNativeTransition = {
      maxHp: sim.player.maxHp,
      maxMana: sim.player.maxResource,
      physicalDefense: sim.player.mir4!.physicalDefense,
      magicDefense: sim.player.mir4!.magicDefense,
      mountMoveSpeedBps: sim.player.mir4!.mountMoveSpeedBps,
      mountBasicAttackSpeedBps: sim.player.mir4!.mountBasicAttackSpeedBps,
    };
    for (let tick = 0; tick < 31; tick++) sim.tick();
    expect(sim.player.mountKey).toBe(visualKey);
    expect({
      maxHp: sim.player.maxHp,
      maxMana: sim.player.maxResource,
      physicalDefense: sim.player.mir4!.physicalDefense,
      magicDefense: sim.player.mir4!.magicDefense,
      mountMoveSpeedBps: sim.player.mir4!.mountMoveSpeedBps,
      mountBasicAttackSpeedBps: sim.player.mir4!.mountBasicAttackSpeedBps,
    }).toEqual(sourceStatsBeforeNativeTransition);
  });

  it('fails closed without profile, unlock, ownership, or bag room at equip time', () => {
    const classic = new Sim({ seed: 884, playerClass: 'warrior', playerName: 'Classic' });
    const classicMeta = classic.players.get(classic.playerId)!;
    classicMeta.mir4ArcRewards = { systems: ['mount-summon'], tickets: { 'mount-ticket-dawn': 1 } };
    expect(redeemMir4CollectionTicket(classic.ctx, classic.playerId, 'mount-ticket-dawn')).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });

    const locked = mir4Sim(885);
    locked.players.get(locked.playerId)!.mir4ArcRewards = { tickets: { 'mount-ticket-dawn': 1 } };
    expect(redeemMir4CollectionTicket(locked.ctx, locked.playerId, 'mount-ticket-dawn')).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(equipMir4Mount(locked.ctx, locked.playerId, 'meadow-courser')).toEqual({
      ok: false,
      reason: 'not-owned',
    });

    const full = mir4Sim(886);
    const fullMeta = full.players.get(full.playerId)!;
    fullMeta.mir4Mounts = { owned: { 'meadow-courser': 1 }, discovered: ['meadow-courser'] };
    fullMeta.ridingTrained = true;
    fullMeta.inventory = Object.values(ITEMS)
      .filter((item) => item.kind === 'weapon' || item.kind === 'armor')
      .slice(0, 16)
      .map((item) => ({ itemId: item.id, count: 1 }));
    expect(equipMir4Mount(full.ctx, full.playerId, 'meadow-courser')).toEqual({
      ok: false,
      reason: 'bags-full',
    });
  });
});
