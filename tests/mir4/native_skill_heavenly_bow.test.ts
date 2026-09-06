import { describe, expect, it, vi } from 'vitest';
import {
  mir4NativeBashPolicy,
  mir4NativeBashScaledRawDamage,
} from '../../src/sim/mir4/native_skill_bash';
import {
  applyMir4NativeHeavenlyBowReload,
  mir4NativeHeavenlyBowPersistentMonsterDamageBps,
  mir4NativeHeavenlyBowPolicy,
} from '../../src/sim/mir4/native_skill_heavenly_bow';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';

function entity(id: number, kind: 'player' | 'mob' = 'player'): Entity {
  return {
    id,
    kind,
    dead: false,
    auras: [],
    cooldowns: new Map([['4108', 20]]),
    procReadyAt: {},
    mir4Effects: { active: [], controlImmuneUntil: 0 },
  } as unknown as Entity;
}

function context(rolls: number[] = []): SimContext {
  return {
    time: 10,
    players: new Map(),
    rng: { next: vi.fn(() => (rolls.shift() ?? 0) / 10_000) },
    isHostileTo: () => true,
  } as unknown as SimContext;
}

function mark(target: Entity): void {
  target.mir4Effects?.active.push({
    effectId: 'mir4_native_buff_40010_31',
    kind: 'native-status-boost',
    remaining: 10,
    duration: 10,
    magnitude: -25,
    nativeStatusId: 31,
    sourceId: 1,
  });
}

describe('MIR4 Heavenly Bow rank mechanics', () => {
  it('pins Bash, Reload and persistent monster-damage milestones', () => {
    expect([1, 5, 8, 10].map((rank) => mir4NativeHeavenlyBowPolicy(rank))).toEqual([
      expect.objectContaining({
        bashBonusBasisPoints: 5_000,
        reloadChanceBasisPoints: 0,
        monsterDamageBps: 0,
      }),
      expect.objectContaining({
        bashBonusBasisPoints: 6_500,
        reloadChanceBasisPoints: 500,
        monsterDamageBps: 0,
      }),
      expect.objectContaining({
        bashBonusBasisPoints: 8_000,
        reloadChanceBasisPoints: 1_500,
        monsterDamageBps: 800,
      }),
      expect.objectContaining({
        bashBonusBasisPoints: 10_000,
        reloadChanceBasisPoints: 4_000,
        monsterDamageBps: 1_200,
      }),
    ]);
    expect(mir4NativeBashPolicy(4108, 10)).toMatchObject({
      requiredDebilitationBuffIds: [40010],
      skillBonusBasisPoints: 10_000,
    });
  });

  it('applies the skill-wide Bash boost to direct and Totem contacts against a Marked target', () => {
    const ctx = context();
    const source = entity(1);
    const target = entity(2, 'mob');
    mark(target);
    expect(mir4NativeBashScaledRawDamage(ctx, source, target, 4108, 10, 1_000, 410802)).toBe(2_000);
    expect(mir4NativeBashScaledRawDamage(ctx, source, target, 4108, 10, 1_000, 410811)).toBe(2_000);
  });

  it('resets the cooldown on a successful rank-5 proc and enforces the native 10-second lock', () => {
    const ctx = context([0, 0]);
    const source = entity(1);
    const target = entity(2, 'mob');
    mark(target);

    expect(applyMir4NativeHeavenlyBowReload(ctx, source, target, 410802, 5)).toEqual({
      eligible: true,
      reset: true,
      chanceBasisPoints: 500,
      readyAt: 20,
    });
    expect(source.cooldowns.has('4108')).toBe(false);
    source.cooldowns.set('4108', 20);
    expect(applyMir4NativeHeavenlyBowReload(ctx, source, target, 410802, 5)).toMatchObject({
      eligible: false,
      reset: false,
      readyAt: 20,
    });
    expect(source.cooldowns.has('4108')).toBe(true);
    expect(ctx.rng.next).toHaveBeenCalledTimes(1);
  });

  it('does not roll without Mark, below rank 5, or on a Totem contact', () => {
    const ctx = context([0]);
    const source = entity(1);
    const target = entity(2, 'mob');
    expect(applyMir4NativeHeavenlyBowReload(ctx, source, target, 410802, 10).eligible).toBe(false);
    mark(target);
    expect(applyMir4NativeHeavenlyBowReload(ctx, source, target, 410802, 1).eligible).toBe(false);
    expect(applyMir4NativeHeavenlyBowReload(ctx, source, target, 410811, 10).eligible).toBe(false);
    expect(ctx.rng.next).not.toHaveBeenCalled();
  });

  it('projects the learned rank-8 and rank-10 monster damage passives', () => {
    const ctx = context();
    const source = entity(1);
    ctx.players.set(source.id, { mir4SkillLevels: { 4108: 7 } } as never);
    expect(mir4NativeHeavenlyBowPersistentMonsterDamageBps(ctx, source)).toBe(0);
    ctx.players.set(source.id, { mir4SkillLevels: { 4108: 8 } } as never);
    expect(mir4NativeHeavenlyBowPersistentMonsterDamageBps(ctx, source)).toBe(800);
    ctx.players.set(source.id, { mir4SkillLevels: { 4108: 10 } } as never);
    expect(mir4NativeHeavenlyBowPersistentMonsterDamageBps(ctx, source)).toBe(1_200);
  });
});
