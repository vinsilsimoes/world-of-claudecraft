import { describe, expect, it, vi } from 'vitest';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';
import {
  applyMir4NativeTaiChiFinalContact,
  applyMir4NativeTaiChiPartyRecoveryBuff,
  applyMir4NativeTaiChiSourceEffects,
  applyMir4NativeTaiChiSpecialContact,
  mir4NativeTaiChiPolicy,
} from '../../src/sim/mir4/native_skill_tai_chi';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { applyMir4NativeHealPulse } from '../../src/sim/mir4/native_skill_heal';

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
    spellPower: 1_000,
    maxResource: 10_000,
    resource: 0,
    maxHp: 10_000,
    hp: 1_000,
  } as unknown as Entity;
}

function context(): SimContext {
  return {
    time: 10,
    tickCount: 200,
    players: new Map(),
    entities: new Map(),
    rng: { next: vi.fn(() => 0) },
    isHostileTo: (source: Entity, target: Entity) => source.id !== target.id,
    partyOf: () => null,
    breakStealth: () => undefined,
    applyAura: (target: Entity, aura: Entity['auras'][number]) => target.auras.push(aura),
    tryApplyAura: (target: Entity, aura: Entity['auras'][number]) => {
      target.auras.push(aura);
      return true;
    },
    resolveMove: (_sx: number, _sz: number, x: number, z: number) => ({ x, z }),
    groundPos: (x: number, z: number) => ({ x, y: 0, z }),
    rebucket: () => undefined,
    emit: vi.fn(),
  } as unknown as SimContext;
}

function addNativeBuff(target: Entity, buffId: number): void {
  target.mir4Effects?.active.push({
    effectId: `mir4_native_buff_${buffId}`,
    kind: 'native-status-boost',
    remaining: 60,
    duration: 60,
    magnitude: 0,
    sourceId: 99,
  });
}

describe('MIR4 Taoist 3201 Tai Chi rank effects', () => {
  it('pins the exact rank 1/5/8/10 native ladder', () => {
    expect(mir4NativeTaiChiPolicy(1)).toMatchObject({
      skillId: 3201,
      skillLevel: 1,
      controlImmunityDurationMs: 5_000,
      permanentEvasion: 0,
      burstEvasion: 0,
      monsterSkillDamageAmplificationBasisPoints: 0,
      playerSkillDamageAmplificationBasisPoints: 0,
      partySkillHealingBasisPoints: 0,
      monsterKnockdownChanceBasisPoints: 10_000,
      playerKnockdownChanceBasisPoints: 1_000,
      brokenWeapon: null,
      accuracyLoss: null,
      targetCountChanceRule: 'client-passed-unused',
    });
    expect(mir4NativeTaiChiPolicy(5)).toMatchObject({
      permanentEvasion: 50,
      burstEvasion: 250,
      monsterSkillDamageAmplificationBasisPoints: 1_000,
      playerSkillDamageAmplificationBasisPoints: 500,
      partySkillHealingBasisPoints: 1_500,
      playerKnockdownChanceBasisPoints: 3_000,
      brokenWeapon: null,
      accuracyLoss: null,
    });
    expect(mir4NativeTaiChiPolicy(8)).toMatchObject({
      permanentEvasion: 50,
      burstEvasion: 500,
      monsterSkillDamageAmplificationBasisPoints: 1_500,
      playerSkillDamageAmplificationBasisPoints: 1_000,
      partySkillHealingBasisPoints: 3_000,
      playerKnockdownChanceBasisPoints: 6_000,
      brokenWeapon: { chanceBasisPoints: 6_500, amount: 50, durationMs: 300_000 },
      accuracyLoss: null,
    });
    expect(mir4NativeTaiChiPolicy(10)).toMatchObject({
      permanentEvasion: 50,
      burstEvasion: 750,
      monsterSkillDamageAmplificationBasisPoints: 2_000,
      playerSkillDamageAmplificationBasisPoints: 1_500,
      partySkillHealingBasisPoints: 5_000,
      playerKnockdownChanceBasisPoints: 10_000,
      brokenWeapon: { chanceBasisPoints: 10_000, amount: 80, durationMs: 300_000 },
      accuracyLoss: { amount: 300, durationMs: 15_000 },
    });
  });

  it('applies cast immunity, both source evasion windows, and party recovery', () => {
    const ctx = context();
    const source = entity(1);
    const ally = entity(2);

    expect(applyMir4NativeTaiChiSourceEffects(ctx, source, 10)).toBe(true);
    expect(source.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ effectId: 'mir4_native_buff_31051', kind: 'control-immunity', duration: 5 }),
        expect.objectContaining({ effectId: 'mir4_native_buff_30103_29', nativeStatusId: 29, magnitude: 50, duration: 30 }),
        expect.objectContaining({ effectId: 'mir4_native_buff_30104_29', nativeStatusId: 29, magnitude: 750, duration: 5 }),
        expect.objectContaining({ effectId: 'mir4_native_buff_10101_127', nativeStatusId: 127, magnitude: 9_000, duration: 3 }),
      ]),
    );
    expect(applyMir4NativeTaiChiPartyRecoveryBuff(ctx, source, ally, 10)).toBe(true);
    expect(mir4NativeStatusBonus(ally, 148)).toBe(5_000);

    expect(applyMir4NativeTaiChiPartyRecoveryBuff(ctx, source, source, 10)).toBe(true);
    expect(applyMir4NativeHealPulse(source, ally, 1)).toBe(690);
  });

  it('uses monster/player amplification and applies rank-10 Broken Weapon only with both prerequisites', () => {
    const ctx = context();
    const source = entity(1);
    const monster = entity(2, 'mob');
    const player = entity(3);

    expect(applyMir4NativeTaiChiSpecialContact(ctx, source, monster, 320102, 0, 10, () => 0)).toBe(true);
    expect(mir4NativeStatusBonus(monster, 45)).toBe(-20);
    expect(applyMir4NativeTaiChiSpecialContact(ctx, source, player, 320102, 0, 10, () => 0)).toBe(true);
    expect(mir4NativeStatusBonus(player, 45)).toBe(-15);
    expect(mir4NativeStatusBonus(player, 20)).toBe(0);

    addNativeBuff(player, 30514);
    addNativeBuff(player, 30515);
    expect(applyMir4NativeTaiChiSpecialContact(ctx, source, player, 320102, 0, 10, () => 0)).toBe(true);
    expect(player.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ effectId: 'mir4_native_buff_30516_28', nativeStatusId: 28, magnitude: -80, unremovable: true }),
        expect.objectContaining({ effectId: 'mir4_native_buff_30516_29', nativeStatusId: 29, magnitude: -80, unremovable: true }),
        expect.objectContaining({ effectId: 'mir4_native_buff_30517_20', nativeStatusId: 20, magnitude: -80, unremovable: true }),
        expect.objectContaining({ effectId: 'mir4_native_buff_30517_22', nativeStatusId: 22, magnitude: -80, unremovable: true }),
        expect.objectContaining({ effectId: 'mir4_native_buff_30504_28', nativeStatusId: 28, magnitude: -300, duration: 15 }),
      ]),
    );
  });

  it('guarantees the last-hit monster knockdown and follows the exact PvP rank chance', () => {
    const ctx = context();
    const source = entity(1);
    const monster = entity(2, 'mob');
    const player = entity(3);

    expect(applyMir4NativeTaiChiFinalContact(ctx, source, monster, 320106, 0, 1, () => 9_999)).toBe(true);
    expect(monster.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_3201_knockdown', kind: 'knockdown' }),
    );
    expect(applyMir4NativeTaiChiFinalContact(ctx, source, player, 320106, 0, 8, () => 5_999)).toBe(true);
    expect(applyMir4NativeTaiChiFinalContact(ctx, source, entity(4), 320106, 0, 8, () => 6_000)).toBe(false);
  });
});
