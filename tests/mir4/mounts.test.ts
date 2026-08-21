import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOUNTS_CATALOG } from '../../src/sim/content/mir4/mounts_catalog';
import {
  combineMir4Mounts,
  confirmMir4Mount,
  equipMir4Mount,
  redeemMir4MountTicket,
} from '../../src/sim/mir4/mount_commands';
import {
  drawMir4Mount,
  MIR4_NATIVE_MOUNT_VISUAL_KEYS,
  mir4MountBonuses,
  mir4MountVisualKey,
  sanitizeMir4MountState,
} from '../../src/sim/mir4/mounts';
import { mountItemId } from '../../src/sim/mounts';
import { moveSpeedMult } from '../../src/sim/player_motion';
import { Sim } from '../../src/sim/sim';

function makeSim(seed = 1_091): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Mount Tester',
    gameProfile: 'mir4-gameplay-port',
  });
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

describe('MIR4 Mount progression', () => {
  it('pins exact ticket boundaries and deterministic native visual shells', () => {
    expect(MIR4_NATIVE_MOUNT_VISUAL_KEYS).toEqual([
      'valorsteed',
      'stormfeather_griffin',
      'shadowjump_toad',
      'grag_bear',
      'stalkglider_snail',
      'aether_hover_cycle',
      'thunderstrut_gobbler',
      'drakemaw_raptor',
    ]);
    expect(drawMir4Mount('mount-ticket-dawn', 0, 0).id).toBe('meadow-courser');
    expect(drawMir4Mount('mount-ticket-dawn', 0.789999, 0.999).grade).toBe(1);
    expect(drawMir4Mount('mount-ticket-dawn', 0.79, 0).grade).toBe(2);
    expect(drawMir4Mount('mount-ticket-dawn', 0.99, 0).grade).toBe(3);
    expect(drawMir4Mount('mount-ticket-twilight', 0.989999, 0).grade).toBe(3);
    expect(drawMir4Mount('mount-ticket-twilight', 0.99, 0).grade).toBe(4);
    expect(mir4MountVisualKey('meadow-courser')).toBe('valorsteed');
  });

  it('applies equipped grade stats and every exact unique-discovery collection step', () => {
    expect(
      mir4MountBonuses({
        owned: {
          'meadow-courser': 1,
          'moss-boar': 1,
          'brook-stag': 1,
          'gray-wolf': 1,
        },
        discovered: ['meadow-courser', 'moss-boar', 'brook-stag', 'gray-wolf'],
        equippedMountId: 'meadow-courser',
      }),
    ).toEqual({
      moveSpeedBps: 400,
      physicalDefense: 9,
      magicDefense: 9,
    });

    const expectedByGrade: Readonly<Record<number, readonly number[]>> = {
      1: [2, 5],
      2: [4, 10],
      3: [8, 20],
      4: [16, 40, 72],
      5: [32, 80, 144],
      6: [60, 150, 270],
    };
    const requiredByStep = [2, 4, 6] as const;
    for (const [gradeText, expectedSteps] of Object.entries(expectedByGrade)) {
      const grade = Number(gradeText);
      const ids = MIR4_MOUNTS_CATALOG.filter((mount) => mount.grade === grade).map(
        (mount) => mount.id,
      );
      expect(ids.length).toBeGreaterThanOrEqual(Math.min(expectedSteps.length * 2, 5));
      for (let index = 0; index < expectedSteps.length; index++) {
        const threshold = Math.min(
          required(requiredByStep[index], `grade ${grade} threshold ${index}`),
          ids.length,
        );
        const previousExpected =
          index === 0
            ? 0
            : required(expectedSteps[index - 1], `grade ${grade} previous defense ${index}`);
        const expected = required(expectedSteps[index], `grade ${grade} defense ${index}`);
        expect(
          mir4MountBonuses({ discovered: ids.slice(0, threshold - 1), owned: {} }).physicalDefense,
        ).toBe(previousExpected);
        expect(
          mir4MountBonuses({ discovered: ids.slice(0, threshold), owned: {} }).physicalDefense,
        ).toBe(expected);
      }
    }
  });

  it('fails closed at every command boundary and confirms queued rewards atomically', () => {
    const classic = new Sim({ seed: 1_096, playerClass: 'warrior', playerName: 'Classic' });
    expect(redeemMir4MountTicket(classic.ctx, classic.playerId, 'mount-ticket-dawn')).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });
    expect(confirmMir4Mount(classic.ctx, classic.playerId, 'pending')).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });
    expect(equipMir4Mount(classic.ctx, classic.playerId, null)).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });
    expect(combineMir4Mounts(classic.ctx, classic.playerId, 1)).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });

    const locked = makeSim(1_097);
    const lockedMeta = required(locked.players.get(locked.playerId), 'locked player meta');
    const lockedBefore = structuredClone(lockedMeta);
    expect(redeemMir4MountTicket(locked.ctx, locked.playerId, 'mount-ticket-dawn')).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(lockedMeta).toEqual(lockedBefore);

    lockedMeta.mir4ArcRewards = { systems: ['mount-summon'] };
    const unlockedBefore = structuredClone(lockedMeta);
    expect(redeemMir4MountTicket(locked.ctx, locked.playerId, 'mount-ticket-dawn')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(lockedMeta).toEqual(unlockedBefore);

    const confirmation = makeSim(1_098);
    const confirmationMeta = required(
      confirmation.players.get(confirmation.playerId),
      'confirmation player meta',
    );
    confirmationMeta.mir4Mounts = {
      pending: [{ id: 'pending-epic', mountId: 'eclipse-lion', grade: 4 }],
    };
    expect(confirmMir4Mount(confirmation.ctx, confirmation.playerId, 'pending-epic')).toEqual({
      ok: true,
      status: 'confirmed',
      mountId: 'eclipse-lion',
      grade: 4,
    });
    expect(confirmationMeta.mir4Mounts).toEqual({
      owned: { 'eclipse-lion': 1 },
      discovered: ['eclipse-lion'],
    });

    const missingPid = Number.MAX_SAFE_INTEGER;
    expect(equipMir4Mount(confirmation.ctx, missingPid, null)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(combineMir4Mounts(confirmation.ctx, missingPid, 1)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(confirmMir4Mount(confirmation.ctx, missingPid, 'pending-epic')).toEqual({
      ok: false,
      reason: 'pending-unknown',
    });
    expect(redeemMir4MountTicket(confirmation.ctx, missingPid, 'mount-ticket-dawn')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('keeps a full-bag equip failure atomic', () => {
    const sim = makeSim(1_099);
    const meta = required(sim.players.get(sim.playerId), 'full-bag player meta');
    meta.mir4Mounts = {
      owned: { 'meadow-courser': 1 },
      discovered: ['meadow-courser'],
    };
    meta.ridingTrained = true;
    const before = structuredClone(meta.mir4Mounts);
    const canAddItem = vi.spyOn(sim.ctx, 'canAddItem').mockReturnValue(false);

    expect(equipMir4Mount(sim.ctx, sim.playerId, 'meadow-courser')).toEqual({
      ok: false,
      reason: 'bags-full',
    });
    expect(canAddItem).toHaveBeenCalledTimes(1);
    expect(meta.mir4Mounts).toEqual(before);
    expect(sim.player.mountKey).toBe('');
    expect(sim.player.mountCastRemaining).toBe(0);
    const visualKey = mir4MountVisualKey('meadow-courser');
    const reinsId = required(mountItemId(visualKey), 'native reins');
    expect(sim.countItem(reinsId)).toBe(0);
  });

  it('uses the exact 20% 4-to-1 outcome and queues Epic rewards', () => {
    const success = makeSim();
    const meta = required(success.players.get(success.playerId), 'success player meta');
    meta.mir4Mounts = {
      owned: { 'amber-bear': 4 },
      discovered: ['amber-bear'],
      equippedMountId: 'amber-bear',
    };
    vi.spyOn(success.rng, 'next').mockReturnValueOnce(0.1999).mockReturnValueOnce(0);
    expect(combineMir4Mounts(success.ctx, success.playerId, 3)).toMatchObject({
      ok: true,
      status: 'pending-confirmation',
      outcome: 'success',
      mountId: 'eclipse-lion',
      grade: 4,
    });
    expect(meta.mir4Mounts.owned).toEqual({});
    expect(meta.mir4Mounts.equippedMountId).toBeUndefined();

    const failure = makeSim(1_092);
    const failureMeta = required(failure.players.get(failure.playerId), 'failure player meta');
    failureMeta.mir4Mounts = {
      owned: { 'meadow-courser': 4 },
      discovered: ['meadow-courser'],
    };
    vi.spyOn(failure.rng, 'next').mockReturnValueOnce(0.2).mockReturnValueOnce(0);
    expect(combineMir4Mounts(failure.ctx, failure.playerId, 1)).toMatchObject({
      ok: true,
      status: 'owned',
      outcome: 'failure',
      mountId: 'meadow-courser',
      grade: 1,
    });
    expect(failureMeta.mir4Mounts.owned).toEqual({ 'meadow-courser': 1 });
  });

  it('uses source movement speed instead of stacking native shell tuning', () => {
    const sim = makeSim(1_093);
    sim.player.mountKey = mir4MountVisualKey('meadow-courser');
    required(sim.player.mir4, 'MIR4 player stats').mountMoveSpeedBps = 400;
    expect(moveSpeedMult(sim.player)).toBeCloseTo(1.04);
  });

  it('sanitizes forged ownership, equips, and pending rows', () => {
    expect(
      sanitizeMir4MountState({
        owned: { 'meadow-courser': 2.8, forged: 99 },
        discovered: ['moss-boar', 'forged'],
        equippedMountId: 'forged',
        pending: [
          { id: 'low', mountId: 'meadow-courser', grade: 1 },
          { id: 'valid', mountId: 'eclipse-lion', grade: 4 },
        ],
        nextPendingId: 3,
      }),
    ).toEqual({
      owned: { 'meadow-courser': 2 },
      discovered: ['moss-boar', 'meadow-courser'],
      pending: [{ id: 'valid', mountId: 'eclipse-lion', grade: 4 }],
      nextPendingId: 3,
    });
  });

  it('fails closed for invalid combine, missing pending rows, and unowned equips', () => {
    const sim = makeSim(1_094);
    const meta = required(sim.players.get(sim.playerId), 'player meta');
    meta.mir4Mounts = { owned: { 'meadow-courser': 3 }, discovered: ['meadow-courser'] };
    const before = structuredClone(meta.mir4Mounts);

    expect(combineMir4Mounts(sim.ctx, sim.playerId, 0)).toEqual({
      ok: false,
      reason: 'invalid-grade',
    });
    expect(combineMir4Mounts(sim.ctx, sim.playerId, 1)).toEqual({
      ok: false,
      reason: 'insufficient-copies',
    });
    expect(confirmMir4Mount(sim.ctx, sim.playerId, 'missing')).toEqual({
      ok: false,
      reason: 'pending-unknown',
    });
    expect(equipMir4Mount(sim.ctx, sim.playerId, 'moss-boar')).toEqual({
      ok: false,
      reason: 'not-owned',
    });
    expect(meta.mir4Mounts).toEqual(before);
  });

  it('keeps a blocked summon atomic and fully clears the native ride on unequip', () => {
    const sim = makeSim(1_095);
    const meta = required(sim.players.get(sim.playerId), 'player meta');
    meta.mir4Mounts = {
      owned: { 'meadow-courser': 1 },
      discovered: ['meadow-courser'],
    };
    meta.ridingTrained = true;
    const visualKey = mir4MountVisualKey('meadow-courser');
    const reinsId = required(mountItemId(visualKey), 'native reins');
    sim.player.inCombat = true;

    expect(equipMir4Mount(sim.ctx, sim.playerId, 'meadow-courser')).toEqual({
      ok: false,
      reason: 'summon-blocked',
    });
    expect(sim.countItem(reinsId)).toBe(0);
    expect(meta.mir4Mounts.equippedMountId).toBeUndefined();
    expect(sim.player.mountKey).toBe('');
    expect(sim.player.mountCastRemaining).toBe(0);

    sim.player.inCombat = false;
    sim.player.mountKey = visualKey;
    meta.mir4Mounts.equippedMountId = 'meadow-courser';
    expect(equipMir4Mount(sim.ctx, sim.playerId, null)).toEqual({
      ok: true,
      status: 'unequipped',
    });
    expect(meta.mir4Mounts.equippedMountId).toBeUndefined();
    expect(sim.player.mountKey).toBe('');
    expect(sim.player.mountCastRemaining).toBe(0);
  });
});
