import { describe, expect, it, vi } from 'vitest';
import { spellHasteMult } from '../../src/sim/combat/spell_combat';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_MOUNTS_CATALOG } from '../../src/sim/content/mir4/mounts_catalog';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import {
  combineAllMir4Mounts,
  combineMir4Mounts,
  confirmAllMir4Mounts,
  confirmMir4Mount,
  equipMir4Mount,
  redeemMir4MountTicket,
} from '../../src/sim/mir4/mount_commands';
import {
  drawMir4Mount,
  MIR4_MOUNT_PENDING_LIMIT,
  MIR4_NATIVE_MOUNT_VISUAL_KEYS,
  mir4MountBonuses,
  mir4MountVisualKey,
  sanitizeMir4MountState,
} from '../../src/sim/mir4/mounts';
import { forceDismount, mountItemId } from '../../src/sim/mounts';
import { moveSpeedMult } from '../../src/sim/player_motion';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';

function makeSim(seed = 1_091, playerClassMir4: Mir4ClassKey = 'warrior'): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4,
    playerName: 'Mount Tester',
    gameProfile: 'mir4-gameplay-port',
  });
}

function spawnAttackTarget(sim: Sim): Entity {
  const target = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
  );
  sim.addEntity(target);
  return target;
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

function resolveContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Mount progression', () => {
  it('preserves Solitude bonuses across the native mount recalc path', () => {
    const sim = makeSim(1_115);
    const meta = required(sim.players.get(sim.playerId), 'Solitude player meta');
    sim.setPlayerLevel(70);
    meta.mir4Currencies = { darksteel: 1_000, energy: 0 };
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      noirsoulHerbRare: 1,
      unihornRare: 5,
    };
    vi.spyOn(sim.rng, 'next').mockReturnValue(0.1);
    expect(sim.mir4TrainSolitude(1, 0).code).toBe('success');
    expect(sim.player.mir4?.monsterDamageBps).toBe(50);

    sim.player.mountKey = 'valorsteed';
    forceDismount(sim.ctx, sim.player);
    expect(sim.player.mir4?.monsterDamageBps).toBe(50);
    expect(meta.mir4Training?.solitude?.conceptionVessel[0]).toBe(1);
  });

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

  it('applies equipped grade stats and one varied album bonus per unique discovery', () => {
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
    ).toMatchObject({
      moveSpeedBps: 1_000,
      basicAttackSpeedBps: 500,
      maxHp: 25,
      maxMana: 10,
      physicalAttack: 2,
      magicAttack: 2,
      physicalDefense: 4,
      magicDefense: 4,
    });
    expect(
      Object.values(
        mir4MountBonuses({
          discovered: MIR4_MOUNTS_CATALOG.map((mount) => mount.id),
          owned: {},
        }),
      ).filter((value) => value > 0),
    ).toHaveLength(14);
  });

  it('applies the exact movement-speed schedule for every Mount grade', () => {
    const expectedByGrade = new Map<number, readonly [number, number]>([
      [1, [1_000, 500]],
      [2, [1_500, 1_000]],
      [3, [2_000, 1_500]],
      [4, [2_500, 2_000]],
      [5, [5_000, 3_500]],
      [6, [8_000, 5_000]],
    ]);

    for (const [grade, [expectedMoveSpeedBps, expectedBasicAttackSpeedBps]] of expectedByGrade) {
      const mount = required(
        MIR4_MOUNTS_CATALOG.find((candidate) => candidate.grade === grade),
        `grade ${grade} Mount`,
      );
      const bonuses = mir4MountBonuses({
        owned: { [mount.id]: 1 },
        discovered: [mount.id],
        equippedMountId: mount.id,
      });
      expect(bonuses.moveSpeedBps).toBe(expectedMoveSpeedBps);
      expect(bonuses.basicAttackSpeedBps).toBe(expectedBasicAttackSpeedBps);
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
    expect(confirmAllMir4Mounts(classic.ctx, classic.playerId)).toEqual({
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
    expect(confirmAllMir4Mounts(confirmation.ctx, confirmation.playerId)).toEqual({
      ok: false,
      reason: 'pending-unknown',
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

  it('confirms the full pending Mount queue in one authoritative operation', () => {
    const sim = makeSim(1_110);
    const meta = required(sim.players.get(sim.playerId), 'batch confirmation player meta');
    meta.mir4Mounts = {
      pending: Array.from({ length: MIR4_MOUNT_PENDING_LIMIT }, (_, index) => ({
        id: `mount-pending-${sim.playerId}-${index + 1}`,
        mountId: index % 2 === 0 ? 'eclipse-lion' : 'crimson-wyvern',
        grade: 4,
      })),
    };

    expect(confirmAllMir4Mounts(sim.ctx, sim.playerId)).toEqual({
      ok: true,
      status: 'confirmed',
      batchCount: MIR4_MOUNT_PENDING_LIMIT,
    });
    expect(meta.mir4Mounts.pending).toBeUndefined();
    expect(meta.mir4Mounts.owned).toEqual({
      'eclipse-lion': MIR4_MOUNT_PENDING_LIMIT / 2,
      'crimson-wyvern': MIR4_MOUNT_PENDING_LIMIT / 2,
    });
    expect(meta.mir4Mounts.discovered).toEqual(['eclipse-lion', 'crimson-wyvern']);
  });

  it('uses the exact 20% 4-to-1 outcome and queues Epic rewards', () => {
    const success = makeSim();
    const meta = required(success.players.get(success.playerId), 'success player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
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
    failureMeta.mir4ArcRewards = { systems: ['mount-summon'] };
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

  it('combines every initially available Mount of one rarity without recycling rewards', () => {
    const sim = makeSim(1_102);
    const meta = required(sim.players.get(sim.playerId), 'batch player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'meadow-courser': 40 },
      discovered: ['meadow-courser'],
      equippedMountId: 'meadow-courser',
    };
    let draws = 0;
    vi.spyOn(sim.rng, 'next').mockImplementation(() => {
      draws += 1;
      return draws % 2 === 1 && draws <= 8 ? 0 : 0.999;
    });

    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 1)).toMatchObject({
      ok: true,
      batchCount: 10,
      successCount: 4,
      failureCount: 6,
      outcome: 'success',
    });
    expect(draws).toBe(20);
    expect(meta.mir4Mounts.owned).toEqual({
      'copper-ant-carrier': 6,
      'root-golem': 4,
    });
    expect(meta.mir4Mounts.equippedMountId).toBeUndefined();
  });

  it('enforces every independent combine-all Mount admission gate before RNG or mutation', () => {
    const classic = new Sim({ seed: 1_111, playerClass: 'warrior', playerName: 'Classic' });
    const classicMeta = required(classic.players.get(classic.playerId), 'classic player meta');
    classicMeta.mir4Mounts = { owned: { 'meadow-courser': 4 } };
    const classicBefore = structuredClone(classicMeta.mir4Mounts);
    const classicNext = vi.spyOn(classic.rng, 'next');
    expect(combineAllMir4Mounts(classic.ctx, classic.playerId, 1)).toEqual({
      ok: false,
      reason: 'wrong-profile',
    });
    expect(classicMeta.mir4Mounts).toEqual(classicBefore);
    expect(classicNext).not.toHaveBeenCalled();

    const sim = makeSim(1_112);
    const meta = required(sim.players.get(sim.playerId), 'combine-all gate player meta');
    meta.mir4Mounts = { owned: { 'meadow-courser': 4 } };
    const next = vi.spyOn(sim.rng, 'next');
    const locked = structuredClone(meta.mir4Mounts);
    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 1)).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(meta.mir4Mounts).toEqual(locked);
    const invalidGrade = structuredClone(meta.mir4Mounts);
    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 0)).toEqual({
      ok: false,
      reason: 'invalid-grade',
    });
    expect(meta.mir4Mounts).toEqual(invalidGrade);
    expect(combineAllMir4Mounts(sim.ctx, Number.MAX_SAFE_INTEGER, 1)).toEqual({
      ok: false,
      reason: 'unavailable',
    });

    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = { owned: { 'meadow-courser': 3 } };
    const insufficient = structuredClone(meta.mir4Mounts);
    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 1)).toEqual({
      ok: false,
      reason: 'insufficient-copies',
    });
    expect(meta.mir4Mounts).toEqual(insufficient);
    meta.mir4Mounts = {
      owned: { 'amber-bear': 4 },
      pending: Array.from({ length: MIR4_MOUNT_PENDING_LIMIT }, (_, index) => ({
        id: `mount-pending-${sim.playerId}-${index + 1}`,
        mountId: 'eclipse-lion',
        grade: 4,
      })),
    };
    const pendingFull = structuredClone(meta.mir4Mounts);
    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 3)).toEqual({
      ok: false,
      reason: 'pending-full',
    });
    expect(meta.mir4Mounts).toEqual(pendingFull);
    expect(next).not.toHaveBeenCalled();
  });

  it('consumes Mount copies in ordinal id order regardless of the host locale', () => {
    const sim = makeSim(1_104);
    const meta = required(sim.players.get(sim.playerId), 'deterministic player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'shaggy-yak': 4, 'tawny-mastiff': 1 },
      discovered: ['shaggy-yak', 'tawny-mastiff'],
    };
    const localeCompare = vi
      .spyOn(String.prototype, 'localeCompare')
      .mockImplementation(function reverseOrdinal(this: string, other) {
        const left = String(this);
        return left === other ? 0 : left < other ? 1 : -1;
      });
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    try {
      expect(combineMir4Mounts(sim.ctx, sim.playerId, 1)).toMatchObject({
        ok: true,
        outcome: 'success',
        grade: 2,
      });
    } finally {
      localeCompare.mockRestore();
    }

    expect(meta.mir4Mounts.owned?.['shaggy-yak']).toBeUndefined();
    expect(meta.mir4Mounts.owned?.['tawny-mastiff']).toBe(1);
  });

  it('aggregates combine-all copies across Mount identities and preserves the remainder', () => {
    const sim = makeSim(1_105);
    const meta = required(sim.players.get(sim.playerId), 'aggregate player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'shaggy-yak': 5, 'tawny-mastiff': 4 },
      discovered: ['shaggy-yak', 'tawny-mastiff'],
    };
    const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 1)).toMatchObject({
      ok: true,
      outcome: 'success',
      batchCount: 2,
      successCount: 2,
      failureCount: 0,
    });
    expect(next).toHaveBeenCalledTimes(4);
    expect(meta.mir4Mounts.owned?.['shaggy-yak']).toBeUndefined();
    expect(meta.mir4Mounts.owned?.['tawny-mastiff']).toBe(1);
  });

  it('reports an all-failure combine-all batch without recycling rewards', () => {
    const sim = makeSim(1_106);
    const meta = required(sim.players.get(sim.playerId), 'failure batch player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'shaggy-yak': 8 },
      discovered: ['shaggy-yak'],
    };
    const rolls = [0.999, 0, 0.999, 0];
    const next = vi.spyOn(sim.rng, 'next').mockImplementation(() => rolls.shift() ?? 0);

    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 1)).toMatchObject({
      ok: true,
      outcome: 'failure',
      batchCount: 2,
      successCount: 0,
      failureCount: 2,
    });
    expect(next).toHaveBeenCalledTimes(4);
    expect(
      Object.entries(meta.mir4Mounts.owned ?? {}).reduce((sum, [, count]) => sum + count, 0),
    ).toBe(2);
  });

  it('rejects combine-all above the abuse limit without RNG or mutation', () => {
    const sim = makeSim(1_107);
    const meta = required(sim.players.get(sim.playerId), 'limit player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'shaggy-yak': 100_004 },
      discovered: ['shaggy-yak'],
    };
    const before = structuredClone(meta.mir4Mounts);
    const next = vi.spyOn(sim.rng, 'next');

    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 1)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(meta.mir4Mounts).toEqual(before);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts the exact combine-all abuse boundary of 25,000 attempts', () => {
    const sim = makeSim(1_108);
    const meta = required(sim.players.get(sim.playerId), 'maximum batch player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'shaggy-yak': 100_000 },
      discovered: ['shaggy-yak'],
    };
    const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0.999);

    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 1)).toMatchObject({
      ok: true,
      outcome: 'failure',
      batchCount: 25_000,
      successCount: 0,
      failureCount: 25_000,
    });
    expect(next).toHaveBeenCalledTimes(50_000);
  });

  it('accepts high-grade combine-all at the exact pending capacity', () => {
    const sim = makeSim(1_109);
    const meta = required(sim.players.get(sim.playerId), 'exact capacity player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'amber-bear': 8 },
      discovered: ['amber-bear'],
      pending: Array.from({ length: MIR4_MOUNT_PENDING_LIMIT - 2 }, (_, index) => ({
        id: `mount-pending-${sim.playerId}-${index + 1}`,
        mountId: 'eclipse-lion',
        grade: 4,
      })),
      nextPendingId: MIR4_MOUNT_PENDING_LIMIT - 1,
    };
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 3)).toMatchObject({
      ok: true,
      batchCount: 2,
    });
    expect(meta.mir4Mounts.pending).toHaveLength(MIR4_MOUNT_PENDING_LIMIT);
  });

  it('combines as many high-grade Mounts as the remaining pending capacity allows', () => {
    const sim = makeSim(1_103);
    const meta = required(sim.players.get(sim.playerId), 'capacity player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'amber-bear': 8 },
      discovered: ['amber-bear'],
      pending: Array.from({ length: MIR4_MOUNT_PENDING_LIMIT - 1 }, (_, index) => ({
        id: `mount-pending-${sim.playerId}-${index + 1}`,
        mountId: 'eclipse-lion',
        grade: 4,
      })),
    };
    const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    expect(combineAllMir4Mounts(sim.ctx, sim.playerId, 3)).toMatchObject({
      ok: true,
      batchCount: 1,
      successCount: 1,
    });
    expect(meta.mir4Mounts.owned).toEqual({ 'amber-bear': 4 });
    expect(meta.mir4Mounts.pending).toHaveLength(MIR4_MOUNT_PENDING_LIMIT);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('uses MIR4 movement speed instead of stacking native shell tuning', () => {
    const sim = makeSim(1_093);
    const mir4 = required(sim.player.mir4, 'MIR4 player stats');
    mir4.mountMoveSpeedBps = 1_000;

    expect(moveSpeedMult(sim.player)).toBe(1);

    mir4.statusValues = { ...mir4.statusValues, 77: 1_000 };
    expect(moveSpeedMult(sim.player)).toBeCloseTo(1.1);

    sim.player.mountKey = mir4MountVisualKey('meadow-courser');
    expect(moveSpeedMult(sim.player)).toBeCloseTo(1.2);
  });

  it('shortens the real melee and ranged basic cooldown while dismounted without speeding spells', () => {
    const sim = makeSim(1_100);
    const meta = required(sim.players.get(sim.playerId), 'player meta');
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
    meta.mir4Mounts = {
      owned: { 'meadow-courser': 1 },
      discovered: ['meadow-courser'],
    };
    meta.ridingTrained = true;
    const spellHasteBefore = spellHasteMult(sim.player);
    const target = spawnAttackTarget(sim);
    target.maxHp = 5_000;
    target.hp = target.maxHp;
    expect(sim.mir4BasicAttack(target.id)).toEqual({ ok: true });
    expect(sim.player.cooldowns.get('mir4_basic')).toBeCloseTo(0.65, 8);
    resolveContacts(sim);
    sim.player.cooldowns.delete('mir4_basic');
    // Equipping is intentionally blocked in combat. End this test fixture's
    // synthetic encounter before testing the equipped passive cadence.
    sim.player.inCombat = false;
    sim.player.combatTimer = 10;

    expect(equipMir4Mount(sim.ctx, sim.playerId, 'meadow-courser')).toMatchObject({
      ok: true,
      status: 'equipped',
    });
    expect(sim.player.mountKey).toBe('');
    expect(required(sim.player.mir4, 'MIR4 player stats').mountBasicAttackSpeedBps).toBe(500);
    expect(sim.mir4BasicAttack(target.id)).toEqual({ ok: true });
    expect(sim.player.cooldowns.get('mir4_basic')).toBe(0.619);
    expect(spellHasteMult(sim.player)).toBe(spellHasteBefore);
    resolveContacts(sim);
    expect(sim.mir4CastSkill(1102, target.id)).toEqual({ ok: true });
    expect(sim.player.cooldowns.get('1102')).toBe(25);
    expect(sim.player.gcdRemaining).toBe(1);
    resolveContacts(sim);
    while (sim.players.get(sim.playerId)?.mir4SkillAction) sim.tick();

    expect(equipMir4Mount(sim.ctx, sim.playerId, null)).toMatchObject({
      ok: true,
      status: 'unequipped',
    });
    expect(required(sim.player.mir4, 'MIR4 player stats').mountBasicAttackSpeedBps).toBe(0);

    const ranged = makeSim(1_101, 'elementalist');
    const rangedMeta = required(ranged.players.get(ranged.playerId), 'ranged player meta');
    const mythicalMount = required(
      MIR4_MOUNTS_CATALOG.find((mount) => mount.grade === 6),
      'mythical Mount',
    );
    rangedMeta.mir4Mounts = {
      owned: { [mythicalMount.id]: 1 },
      discovered: [mythicalMount.id],
    };
    rangedMeta.ridingTrained = true;
    expect(equipMir4Mount(ranged.ctx, ranged.playerId, mythicalMount.id)).toMatchObject({
      ok: true,
      status: 'equipped',
    });
    const rangedTarget = spawnAttackTarget(ranged);
    expect(ranged.mir4BasicAttack(rangedTarget.id)).toEqual({ ok: true });
    expect(ranged.player.cooldowns.get('mir4_basic')).toBeCloseTo(0.75 / 1.5, 8);
  });

  it('enforces the real basic-attack PvE and PvP speed caps after aggregation', () => {
    const pve = makeSim(1_102);
    pve.player.mir4!.mountBasicAttackSpeedBps = 99_999;
    const mob = spawnAttackTarget(pve);
    expect(pve.mir4BasicAttack(mob.id)).toEqual({ ok: true });
    expect(pve.player.cooldowns.get('mir4_basic')).toBeCloseTo(0.325, 10);

    const pvp = makeSim(1_103);
    pvp.player.mir4!.mountBasicAttackSpeedBps = 99_999;
    const enemyId = pvp.addPlayer('warrior', 'PvP cadence target');
    const enemy = required(pvp.entities.get(enemyId), 'PvP cadence target');
    enemy.pos = pvp.groundPos(pvp.player.pos.x + 2, pvp.player.pos.z);
    const duel = { a: pvp.player.id, b: enemy.id, state: 'active' as const, timer: 0 };
    pvp.duels.set(pvp.player.id, duel);
    pvp.duels.set(enemy.id, duel);

    expect(pvp.mir4BasicAttack(enemy.id)).toEqual({ ok: true });
    expect(pvp.player.cooldowns.get('mir4_basic')).toBe(0.406);
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
    meta.mir4ArcRewards = { systems: ['mount-summon'] };
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
