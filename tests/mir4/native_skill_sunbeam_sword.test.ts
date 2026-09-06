import { describe, expect, it, vi } from 'vitest';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';
import {
  applyMir4NativeSunbeamSwordSpecialContact,
  mir4NativeSunbeamSwordMpPotionBonusBasisPoints,
  mir4NativeSunbeamSwordPolicy,
} from '../../src/sim/mir4/native_skill_sunbeam_sword';

function entity(id: number, kind: 'player' | 'mob'): Entity {
  return {
    id,
    kind,
    dead: false,
    auras: [],
    mir4Effects: { active: [], controlImmuneUntil: 0 },
  } as unknown as Entity;
}

function context(rolls: number[] = []): SimContext {
  const next = vi.fn(() => rolls.shift() ?? 0);
  return {
    time: 10,
    players: new Map(),
    rng: { next },
    isHostileTo: () => true,
  } as unknown as SimContext;
}

function addBuff(target: Entity, buffId: number): void {
  target.mir4Effects?.active.push({
    effectId: `mir4_native_buff_${buffId}`,
    kind: 'native-status-boost',
    remaining: 30,
    duration: 30,
    magnitude: 0,
    sourceId: 99,
  });
}

describe('MIR4 Sunbeam Sword rank policy', () => {
  it('pins the exact rank 1/5/8/10 ladders', () => {
    expect(mir4NativeSunbeamSwordPolicy(1)).toMatchObject({
      skillLevel: 1,
      mpPotionRecoveryBasisPoints: 0,
      pvpKnockdownResistanceChanceBasisPoints: 0,
      brokenArmorChanceBasisPoints: 0,
    });
    expect(mir4NativeSunbeamSwordPolicy(5)).toMatchObject({
      skillLevel: 5,
      mpPotionRecoveryBasisPoints: 500,
      pvpKnockdownResistanceReductionBasisPoints: 1000,
      pvpKnockdownResistanceChanceBasisPoints: 5000,
    });
    expect(mir4NativeSunbeamSwordPolicy(8)).toMatchObject({
      skillLevel: 8,
      mpPotionRecoveryBasisPoints: 1000,
      pvpKnockdownResistanceChanceBasisPoints: 10_000,
      brokenArmorDefenseReduction: 0.5,
      brokenArmorChanceBasisPoints: 6500,
      brokenArmorDurationMs: 300_000,
    });
    expect(mir4NativeSunbeamSwordPolicy(10)).toMatchObject({
      skillLevel: 10,
      mpPotionRecoveryBasisPoints: 1500,
      brokenArmorDefenseReduction: 0.8,
      brokenArmorChanceBasisPoints: 10_000,
    });
    expect(mir4NativeSunbeamSwordMpPotionBonusBasisPoints({ 3101: 8 })).toBe(1000);
  });

  it('applies rank-8 PvP resistance loss and conditional Broken Armor on the first 310102 contact', () => {
    const ctx = context([0]);
    const source = entity(1, 'player');
    const target = entity(2, 'player');
    addBuff(target, 30010);
    addBuff(target, 30514);
    addBuff(target, 30515);

    expect(applyMir4NativeSunbeamSwordSpecialContact(ctx, source, target, 310102, 0, 8)).toBe(true);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_30501_128',
        kind: 'native-status-boost',
        nativeStatusId: 128,
        magnitude: -1000,
        duration: 15,
      }),
    );
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_30518',
        kind: 'defense-break',
        magnitude: 0.5,
        duration: 300,
      }),
    );
  });

  it('does not duplicate the special roll on the second impact or without Quell', () => {
    const ctx = context();
    const source = entity(1, 'player');
    const target = entity(2, 'player');
    addBuff(target, 30010);
    expect(applyMir4NativeSunbeamSwordSpecialContact(ctx, source, target, 310102, 1, 10)).toBe(
      false,
    );
    target.mir4Effects!.active = [];
    expect(applyMir4NativeSunbeamSwordSpecialContact(ctx, source, target, 310102, 0, 10)).toBe(
      false,
    );
  });
});
