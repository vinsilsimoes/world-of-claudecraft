import { describe, expect, it, vi } from 'vitest';

import {
  combineAllMir4Spirits,
  combineMir4Spirits,
  confirmAllMir4Spirits,
  confirmMir4Spirit,
  equipMir4Spirit,
  summonMir4Spirit,
} from '../../src/sim/mir4/spirit_commands';
import {
  drawMir4Spirit,
  MIR4_SPIRIT_PENDING_LIMIT,
  mir4SpiritBonuses,
  sanitizeMir4SpiritState,
} from '../../src/sim/mir4/spirits';
import { Sim } from '../../src/sim/sim';

function mir4Sim(seed = 991): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Spirit Tester',
    gameProfile: 'mir4-gameplay-port',
  });
}

function armSpiritTicket(sim: Sim, ticketId: 'spirit-ticket-dawn' | 'spirit-ticket-sunset') {
  const meta = sim.players.get(sim.playerId)!;
  meta.mir4ArcRewards = { systems: ['spirit-summon'], tickets: { [ticketId]: 1 } };
  return meta;
}

describe('MIR4 Spirit progression', () => {
  it('pins exact ticket grade boundaries and the uniform within-grade draw', () => {
    expect(drawMir4Spirit('spirit-ticket-dawn', 0, 0).id).toBe('spirit-common-01');
    expect(drawMir4Spirit('spirit-ticket-dawn', 0.7899999, 0.999).id).toBe('spirit-common-04');
    expect(drawMir4Spirit('spirit-ticket-dawn', 0.79, 0).id).toBe('spirit-uncommon-01');
    expect(drawMir4Spirit('spirit-ticket-dawn', 0.99, 0).id).toBe('spirit-rare-01');
    expect(drawMir4Spirit('spirit-ticket-sunset', 0.945, 0).id).toBe('spirit-rare-01');
    expect(drawMir4Spirit('spirit-ticket-sunset', 0.995, 0.999).id).toBe('spirit-epic-06');
  });

  it('consumes a valid ticket, owns low grades immediately, and applies equip stats', () => {
    const sim = mir4Sim();
    const meta = armSpiritTicket(sim, 'spirit-ticket-dawn');
    const next = vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0).mockReturnValueOnce(0);
    const attackBefore = sim.player.attackPower;
    const accuracyBefore = sim.player.mir4?.accuracy ?? 0;

    expect(summonMir4Spirit(sim.ctx, sim.playerId, 'spirit-ticket-dawn')).toEqual({
      ok: true,
      status: 'owned',
      spiritId: 'spirit-common-01',
      grade: 1,
    });
    expect(next).toHaveBeenCalledTimes(2);
    expect(meta.mir4ArcRewards?.tickets).toBeUndefined();
    expect(meta.mir4Spirits).toMatchObject({
      owned: { 'spirit-common-01': 1 },
      discovered: ['spirit-common-01'],
    });
    expect(equipMir4Spirit(sim.ctx, sim.playerId, 'spirit-common-01').ok).toBe(true);
    expect(sim.player.attackPower).toBe(attackBefore + 2);
    expect(sim.player.mir4?.accuracy).toBe(accuracyBefore + 1);
  });

  it('queues Epic results for deterministic confirmation before ownership', () => {
    const sim = mir4Sim(992);
    const meta = armSpiritTicket(sim, 'spirit-ticket-sunset');
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0.999).mockReturnValueOnce(0.999);

    const result = summonMir4Spirit(sim.ctx, sim.playerId, 'spirit-ticket-sunset');

    expect(result).toEqual({
      ok: true,
      status: 'pending-confirmation',
      pendingId: `spirit-pending-${sim.playerId}-1`,
      spiritId: 'spirit-epic-06',
      grade: 4,
    });
    expect(meta.mir4Spirits?.owned).toBeUndefined();
    expect(confirmMir4Spirit(sim.ctx, sim.playerId, `spirit-pending-${sim.playerId}-1`)).toEqual({
      ok: true,
      status: 'confirmed',
      spiritId: 'spirit-epic-06',
      grade: 4,
    });
    expect(meta.mir4Spirits?.owned?.['spirit-epic-06']).toBe(1);
    equipMir4Spirit(sim.ctx, sim.playerId, 'spirit-epic-06');
    expect(sim.player.mir4?.penetrationBps).toBe(50);
  });

  it('applies one varied collection bonus for every unique Spirit discovery', () => {
    expect(
      mir4SpiritBonuses({
        discovered: ['spirit-common-01', 'spirit-common-02'],
      }),
    ).toMatchObject({
      maxHp: 25,
      maxMana: 10,
      physicalAttack: 0,
      magicAttack: 0,
      physicalDefense: 0,
      magicDefense: 0,
      accuracy: 0,
      critical: 0,
      penetrationBps: 0,
    });
  });

  it('confirms the full pending Spirit queue in one authoritative operation', () => {
    const sim = mir4Sim(998);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Spirits = {
      pending: Array.from({ length: MIR4_SPIRIT_PENDING_LIMIT }, (_, index) => ({
        id: `spirit-pending-${sim.playerId}-${index + 1}`,
        spiritId: index % 2 === 0 ? 'spirit-epic-01' : 'spirit-epic-02',
        grade: 4,
      })),
    };

    expect(confirmAllMir4Spirits(sim.ctx, sim.playerId)).toEqual({
      ok: true,
      status: 'confirmed',
      batchCount: MIR4_SPIRIT_PENDING_LIMIT,
    });
    expect(meta.mir4Spirits.pending).toBeUndefined();
    expect(meta.mir4Spirits.owned).toEqual({
      'spirit-epic-01': MIR4_SPIRIT_PENDING_LIMIT / 2,
      'spirit-epic-02': MIR4_SPIRIT_PENDING_LIMIT / 2,
    });
    expect(meta.mir4Spirits.discovered).toEqual(['spirit-epic-01', 'spirit-epic-02']);
  });

  it('consumes Spirit copies in ordinal id order regardless of the host locale', () => {
    const sim = mir4Sim(999);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcRewards = { systems: ['spirit-summon'] };
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 4, 'spirit-common-02': 1 },
      discovered: ['spirit-common-01', 'spirit-common-02'],
    };
    const localeCompare = vi.spyOn(String.prototype, 'localeCompare').mockImplementation(() => -1);
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    try {
      expect(combineAllMir4Spirits(sim.ctx, sim.playerId, 1)).toMatchObject({
        ok: true,
        batchCount: 1,
      });
    } finally {
      localeCompare.mockRestore();
    }

    expect(meta.mir4Spirits.owned?.['spirit-common-01']).toBeUndefined();
    expect(meta.mir4Spirits.owned?.['spirit-common-02']).toBe(1);
  });

  it('accepts the exact combine-all abuse boundary of 25,000 Spirit attempts', () => {
    const sim = mir4Sim(1_000);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcRewards = { systems: ['spirit-summon'] };
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 100_000 },
      discovered: ['spirit-common-01'],
    };
    const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0.999);

    expect(combineAllMir4Spirits(sim.ctx, sim.playerId, 1)).toMatchObject({
      ok: true,
      outcome: 'failure',
      batchCount: 25_000,
      successCount: 0,
      failureCount: 25_000,
    });
    expect(next).toHaveBeenCalledTimes(50_000);
  });

  it('combines four copies with the exact 20% success and same-grade failure return', () => {
    const success = mir4Sim(995);
    const successMeta = success.players.get(success.playerId)!;
    successMeta.mir4ArcRewards = { systems: ['spirit-summon'] };
    successMeta.mir4Spirits = {
      owned: { 'spirit-common-01': 4 },
      discovered: ['spirit-common-01'],
      equippedSpiritId: 'spirit-common-01',
    };
    vi.spyOn(success.rng, 'next').mockReturnValueOnce(0.1999).mockReturnValueOnce(0.999);
    expect(combineMir4Spirits(success.ctx, success.playerId, 1)).toEqual({
      ok: true,
      status: 'owned',
      outcome: 'success',
      spiritId: 'spirit-uncommon-04',
      grade: 2,
    });
    expect(successMeta.mir4Spirits.owned).toEqual({ 'spirit-uncommon-04': 1 });
    expect(successMeta.mir4Spirits.equippedSpiritId).toBeUndefined();

    const failure = mir4Sim(996);
    const failureMeta = failure.players.get(failure.playerId)!;
    failureMeta.mir4ArcRewards = { systems: ['spirit-summon'] };
    failureMeta.mir4Spirits = {
      owned: { 'spirit-rare-01': 4 },
      discovered: ['spirit-rare-01'],
    };
    vi.spyOn(failure.rng, 'next').mockReturnValueOnce(0.2).mockReturnValueOnce(0);
    expect(combineMir4Spirits(failure.ctx, failure.playerId, 3)).toEqual({
      ok: true,
      status: 'owned',
      outcome: 'failure',
      spiritId: 'spirit-rare-01',
      grade: 3,
    });
    expect(failureMeta.mir4Spirits.owned).toEqual({ 'spirit-rare-01': 1 });
  });

  it('enforces every independent combine-all Spirit admission gate before RNG or mutation', () => {
    const classic = new Sim({ seed: 1_001, playerClass: 'warrior', playerName: 'Classic' });
    const classicMeta = classic.players.get(classic.playerId)!;
    classicMeta.mir4Spirits = { owned: { 'spirit-common-01': 4 } };
    const classicBefore = structuredClone(classicMeta.mir4Spirits);
    const classicNext = vi.spyOn(classic.rng, 'next');
    expect(combineAllMir4Spirits(classic.ctx, classic.playerId, 1)).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });
    expect(classicMeta.mir4Spirits).toEqual(classicBefore);
    expect(classicNext).not.toHaveBeenCalled();

    const sim = mir4Sim(1_002);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Spirits = { owned: { 'spirit-common-01': 4 } };
    const next = vi.spyOn(sim.rng, 'next');
    const locked = structuredClone(meta.mir4Spirits);
    expect(combineAllMir4Spirits(sim.ctx, sim.playerId, 1)).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(meta.mir4Spirits).toEqual(locked);
    const invalidGrade = structuredClone(meta.mir4Spirits);
    expect(combineAllMir4Spirits(sim.ctx, sim.playerId, 6)).toEqual({
      ok: false,
      reason: 'invalid-grade',
    });
    expect(meta.mir4Spirits).toEqual(invalidGrade);
    expect(combineAllMir4Spirits(sim.ctx, Number.MAX_SAFE_INTEGER, 1)).toEqual({
      ok: false,
      reason: 'unavailable',
    });

    meta.mir4ArcRewards = { systems: ['spirit-summon'] };
    meta.mir4ArcQuests = {
      'M10-Q03': { questId: 'M10-Q03', state: 'active', stageIndex: 4, stageProgress: 0 },
    };
    expect(combineAllMir4Spirits(sim.ctx, sim.playerId, 1)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(meta.mir4Spirits).toEqual({ owned: { 'spirit-common-01': 4 } });
    delete meta.mir4ArcQuests;
    meta.mir4Spirits = { owned: { 'spirit-common-01': 3 } };
    const insufficient = structuredClone(meta.mir4Spirits);
    expect(combineAllMir4Spirits(sim.ctx, sim.playerId, 1)).toEqual({
      ok: false,
      reason: 'insufficient-copies',
    });
    expect(meta.mir4Spirits).toEqual(insufficient);
    meta.mir4Spirits = {
      owned: { 'spirit-rare-01': 4 },
      pending: Array.from({ length: MIR4_SPIRIT_PENDING_LIMIT }, (_, index) => ({
        id: `spirit-pending-${sim.playerId}-${index + 1}`,
        spiritId: 'spirit-epic-01',
        grade: 4,
      })),
    };
    const pendingFull = structuredClone(meta.mir4Spirits);
    expect(combineAllMir4Spirits(sim.ctx, sim.playerId, 3)).toEqual({
      ok: false,
      reason: 'pending-full',
    });
    expect(meta.mir4Spirits).toEqual(pendingFull);
    expect(next).not.toHaveBeenCalled();
  });

  it('uses M10 bound replicas without mutating the real Spirit collection', () => {
    const sim = mir4Sim(997);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcRewards = {
      systems: ['spirit-summon'],
      items: { 'bound-spirit-replica': 4 },
    };
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 2 },
      discovered: ['spirit-common-01'],
      equippedSpiritId: 'spirit-common-01',
    };
    meta.mir4ArcQuests = {
      'M10-Q03': {
        questId: 'M10-Q03',
        state: 'active',
        stageIndex: 4,
        stageProgress: 0,
      },
    };
    vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0.2);

    expect(combineMir4Spirits(sim.ctx, sim.playerId, 1)).toEqual({
      ok: true,
      status: 'tutorial-fusion',
      outcome: 'failure',
      grade: 1,
    });
    expect(meta.mir4ArcRewards.items).toEqual({ 'bound-spirit-replica': 1 });
    expect(meta.mir4Spirits).toEqual({
      owned: { 'spirit-common-01': 2 },
      discovered: ['spirit-common-01'],
      equippedSpiritId: 'spirit-common-01',
    });
    expect(meta.mir4ArcQuests['M10-Q03']?.stageIndex).toBe(5);
  });

  it('sanitizes forged ownership, invalid equips, and low-grade pending entries', () => {
    expect(
      sanitizeMir4SpiritState({
        owned: { 'spirit-common-01': 2.8, forged: 999 },
        discovered: ['spirit-common-02', 'forged'],
        equippedSpiritId: 'forged',
        pending: [
          { id: 'bad-low', spiritId: 'spirit-common-01', grade: 1 },
          { id: 'valid', spiritId: 'spirit-epic-01', grade: 4 },
        ],
        nextPendingId: 3,
      }),
    ).toEqual({
      owned: { 'spirit-common-01': 2 },
      discovered: ['spirit-common-02', 'spirit-common-01'],
      pending: [{ id: 'valid', spiritId: 'spirit-epic-01', grade: 4 }],
      nextPendingId: 3,
    });
  });

  it('fails closed without profile, unlock, ownership, or pending id', () => {
    const classic = new Sim({ seed: 993, playerClass: 'warrior', playerName: 'Classic' });
    expect(summonMir4Spirit(classic.ctx, classic.playerId, 'spirit-ticket-dawn')).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });
    expect(confirmAllMir4Spirits(classic.ctx, classic.playerId)).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });
    const sim = mir4Sim(994);
    sim.players.get(sim.playerId)!.mir4ArcRewards = { tickets: { 'spirit-ticket-dawn': 1 } };
    expect(summonMir4Spirit(sim.ctx, sim.playerId, 'spirit-ticket-dawn')).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(equipMir4Spirit(sim.ctx, sim.playerId, 'spirit-rare-01')).toEqual({
      ok: false,
      reason: 'not-owned',
    });
    expect(confirmMir4Spirit(sim.ctx, sim.playerId, 'spirit-pending-1-1')).toEqual({
      ok: false,
      reason: 'pending-unknown',
    });
    expect(confirmAllMir4Spirits(sim.ctx, sim.playerId)).toEqual({
      ok: false,
      reason: 'pending-unknown',
    });
  });
});
