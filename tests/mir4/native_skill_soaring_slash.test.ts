import { describe, expect, it, vi } from 'vitest';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import {
  applyMir4NativeSoaringSlashContact,
  mir4NativeSoaringSlashConditionalDamageBasisPoints,
  mir4NativeSoaringSlashPartySkillDamageReductionBps,
  mir4NativeSoaringSlashPolicy,
} from '../../src/sim/mir4/native_skill_soaring_slash';

function entity(id: number, kind: 'player' | 'mob' = 'player'): Entity {
  return {
    id,
    kind,
    dead: false,
    ownerId: null,
    hostile: kind === 'mob',
    auras: [],
    mir4Effects: { active: [], controlImmuneUntil: 0 },
    mir4: { statusValues: {} },
    pos: { x: id * 2, y: 0, z: 0 },
    prevPos: { x: id * 2, y: 0, z: 0 },
    vx: 0,
    vy: 0,
    vz: 0,
  } as unknown as Entity;
}

function context(source: Entity, skillLevel = 10): SimContext {
  return {
    time: 10,
    tickCount: 200,
    players: new Map([[source.id, { entityId: source.id, mir4SkillLevels: { 3203: skillLevel } }]]),
    entities: new Map([[source.id, source]]),
    rng: { next: vi.fn(() => 0) },
    isHostileTo: (left: Entity, right: Entity) => left.id !== right.id,
    partyOf: () => null,
    breakStealth: () => undefined,
    applyAura: (target: Entity, aura: Entity['auras'][number]) => target.auras.push(aura),
    tryApplyAura: (target: Entity, aura: Entity['auras'][number]) => {
      target.auras.push(aura);
      return true;
    },
    emit: vi.fn(),
  } as unknown as SimContext;
}

function addBuff(target: Entity, buffId: number): void {
  target.mir4Effects?.active.push({
    effectId: `mir4_native_buff_${buffId}`,
    kind: 'native-status-boost',
    remaining: 5,
    duration: 5,
    magnitude: 0,
    sourceId: 99,
  });
}

describe('MIR4 Taoist 3203 Soaring Slash rank effects', () => {
  it('pins the exact rank 1/5/8/10 evolution', () => {
    expect(mir4NativeSoaringSlashPolicy(1)).toMatchObject({
      skillLevel: 1,
      bashBonusBasisPoints: 5_000,
      refreshDebilitationDurationMs: 0,
      damagedArmor: null,
      bothDebilitationsSkillDamageBasisPoints: 0,
      criticalEvasionLoss: null,
      partySkillDamageReductionBasisPoints: 0,
    });
    expect(mir4NativeSoaringSlashPolicy(5)).toMatchObject({
      bashBonusBasisPoints: 6_500,
      refreshDebilitationDurationMs: 10_000,
      damagedArmor: { defenseLoss: 10, durationMs: 60_000 },
      bothDebilitationsSkillDamageBasisPoints: 0,
      criticalEvasionLoss: null,
      partySkillDamageReductionBasisPoints: 400,
    });
    expect(mir4NativeSoaringSlashPolicy(8)).toMatchObject({
      bashBonusBasisPoints: 8_000,
      damagedArmor: { defenseLoss: 20, durationMs: 120_000 },
      bothDebilitationsSkillDamageBasisPoints: 5_000,
      criticalEvasionLoss: null,
      partySkillDamageReductionBasisPoints: 800,
    });
    expect(mir4NativeSoaringSlashPolicy(10)).toMatchObject({
      bashBonusBasisPoints: 10_000,
      damagedArmor: { defenseLoss: 30, durationMs: 180_000 },
      bothDebilitationsSkillDamageBasisPoints: 10_000,
      criticalEvasionLoss: { amount: 500, durationMs: 10_000 },
      partySkillDamageReductionBasisPoints: 1_200,
    });
  });

  it('applies Confuse and Chill, refreshes row 320302, and applies critical Damaged Armor', () => {
    const source = entity(1);
    const target = entity(2, 'mob');
    const ctx = context(source, 10);
    ctx.entities.set(target.id, target);

    const result = applyMir4NativeSoaringSlashContact(ctx, source, target, 320302, 0, 10, true);

    expect(result).toMatchObject({
      applied: true,
      confuseApplied: true,
      chillApplied: true,
      debilitationRefreshed: true,
      damagedArmorApplied: true,
      criticalEvasionReduced: false,
    });
    expect(target.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: 'mir4_native_buff_10020',
          nativeStatusId: 24,
          magnitude: -25,
          remaining: 10,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_20020',
          nativeStatusId: 45,
          magnitude: -25,
          remaining: 10,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30515_24',
          nativeStatusId: 24,
          magnitude: -30,
          duration: 180,
          unremovable: true,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30515_26',
          nativeStatusId: 26,
          magnitude: -30,
          duration: 180,
          unremovable: true,
        }),
      ]),
    );
  });

  it('adds the rank-8 dual-debilitation damage lane and rank-10 Confuse plus Quell CRIT EVA loss', () => {
    const source = entity(1);
    const target = entity(2, 'mob');
    const ctx = context(source, 10);
    ctx.entities.set(target.id, target);
    addBuff(target, 10020);
    addBuff(target, 20020);
    addBuff(target, 30010);

    expect(mir4NativeSoaringSlashConditionalDamageBasisPoints(target, 8)).toBe(5_000);
    expect(mir4NativeSoaringSlashConditionalDamageBasisPoints(target, 10)).toBe(10_000);
    const result = applyMir4NativeSoaringSlashContact(ctx, source, target, 320301, 0, 10, false);
    expect(result.criticalEvasionReduced).toBe(true);
    expect(mir4NativeStatusBonus(target, 31)).toBe(-500);
  });

  it('grants the strongest persistent party reduction from a learned rank', () => {
    const source = entity(1);
    const ally = entity(2);
    const ctx = context(source, 10);
    ctx.entities.set(ally.id, ally);
    ctx.partyOf = () => ({ members: [source.id, ally.id] }) as never;

    expect(mir4NativeSoaringSlashPartySkillDamageReductionBps(ctx, ally)).toBe(1_200);
  });
});
