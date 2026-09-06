import { describe, expect, it, vi } from 'vitest';
import { mir4NativeBashPolicy } from '../../src/sim/mir4/native_skill_bash';
import {
  applyMir4NativePiercingBladesSpecialContact,
  mir4NativePiercingBladesPersistentBossDamageBps,
  mir4NativePiercingBladesPolicy,
} from '../../src/sim/mir4/native_skill_piercing_blades';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';

function entity(id: number, kind: 'player' | 'mob'): Entity {
  return {
    id,
    kind,
    ownerId: null,
    dead: false,
    auras: [],
    mir4: { statusValues: {} },
    mir4Effects: { active: [], controlImmuneUntil: 0 },
  } as unknown as Entity;
}

function context(rolls: number[] = []): SimContext {
  const players = new Map<number, { mir4SkillLevels?: Record<number, number> }>();
  const entities = new Map<number, Entity>();
  return {
    time: 10,
    players,
    entities,
    rng: { next: vi.fn(() => (rolls.shift() ?? 0) / 10_000) },
    isHostileTo: () => true,
    tryApplyAura: (target: Entity, aura: Entity['auras'][number]) => {
      target.auras.push(aura);
      return true;
    },
  } as unknown as SimContext;
}

function addDebilitation(target: Entity, buffId: 10_020 | 20_020 | 30_010): void {
  target.mir4Effects?.active.push({
    effectId: `mir4_native_buff_${buffId}`,
    kind: 'native-status-boost',
    remaining: 30,
    duration: 30,
    magnitude: 0,
    sourceId: 99,
  });
}

describe('MIR4 Piercing Blades native policy', () => {
  it('pins the exact rank 1/5/8/10 milestones and Bash eligibility', () => {
    expect(mir4NativePiercingBladesPolicy(1)).toMatchObject({
      skillLevel: 1,
      stun: null,
      skillDamageReductionLoss: null,
      bashDebilitationDurationMs: 0,
      bossDamageBasisPoints: 0,
    });
    expect(mir4NativePiercingBladesPolicy(5)).toMatchObject({
      skillLevel: 5,
      stun: { monsterChanceBasisPoints: 10_000, playerChanceBasisPoints: 2_000, durationMs: 2_000 },
      skillDamageReductionLoss: null,
      bossDamageBasisPoints: 1_000,
    });
    expect(mir4NativePiercingBladesPolicy(8)).toMatchObject({
      skillLevel: 8,
      stun: { monsterChanceBasisPoints: 10_000, playerChanceBasisPoints: 4_000, durationMs: 3_000 },
      skillDamageReductionLoss: {
        monsterBasisPoints: 2_000,
        playerBasisPoints: 1_500,
        durationMs: 30_000,
      },
      bashDebilitationDurationMs: 8_000,
      bossDamageBasisPoints: 1_500,
    });
    expect(mir4NativePiercingBladesPolicy(10)).toMatchObject({
      skillLevel: 10,
      stun: { monsterChanceBasisPoints: 10_000, playerChanceBasisPoints: 6_000, durationMs: 5_000 },
      skillDamageReductionLoss: {
        monsterBasisPoints: 3_000,
        playerBasisPoints: 2_000,
        durationMs: 30_000,
      },
      bashDebilitationDurationMs: 16_000,
      bossDamageBasisPoints: 2_000,
    });
    expect(mir4NativeBashPolicy(3103, 10)).toMatchObject({
      passiveId: 103001,
      requiredDebilitationBuffIds: [30_010, 10_020, 20_020],
      skillBonusBasisPoints: 10_000,
    });
  });

  it('applies the rank-8 monster stun, vulnerability, Chaos and Chill after Bash', () => {
    const ctx = context();
    const source = entity(1, 'player');
    const target = entity(2, 'mob');
    addDebilitation(target, 30_010);

    expect(applyMir4NativePiercingBladesSpecialContact(ctx, source, target, 310302, 0, 8)).toEqual({
      applied: true,
      stunned: true,
      bashTriggered: true,
      bashDebilitationsApplied: true,
    });
    expect(target.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'stun', duration: 3 }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30502_45',
          kind: 'native-status-boost',
          nativeStatusId: 45,
          magnitude: -20,
          duration: 30,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_10020',
          kind: 'physical-attack-reduction',
          magnitude: 0.25,
          duration: 8,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_20020',
          kind: 'native-status-boost',
          nativeStatusId: 45,
          magnitude: -25,
          duration: 8,
        }),
      ]),
    );
  });

  it('uses the player-specific rank-10 vulnerability and exposes the persistent Boss bonus', () => {
    const ctx = context([0]);
    const source = entity(1, 'player');
    const target = entity(2, 'player');
    addDebilitation(target, 10_020);
    ctx.players.set(source.id, { mir4SkillLevels: { 3103: 10 } } as never);

    expect(
      applyMir4NativePiercingBladesSpecialContact(ctx, source, target, 310302, 0, 10),
    ).toMatchObject({ stunned: true, bashTriggered: true, bashDebilitationsApplied: true });
    expect(target.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'stun', duration: 5 }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30502_45',
          magnitude: -20,
          duration: 30,
        }),
        expect.objectContaining({ effectId: 'mir4_native_buff_10020', duration: 16 }),
        expect.objectContaining({ effectId: 'mir4_native_buff_20020', duration: 16 }),
      ]),
    );
    expect(mir4NativePiercingBladesPersistentBossDamageBps(ctx, source)).toBe(2_000);
  });

  it('ignores setup, final-row and non-hostile contacts', () => {
    const ctx = context();
    const source = entity(1, 'player');
    const target = entity(2, 'mob');
    const empty = {
      applied: false,
      stunned: false,
      bashTriggered: false,
      bashDebilitationsApplied: false,
    };

    expect(applyMir4NativePiercingBladesSpecialContact(ctx, source, target, 310301, 0, 10)).toEqual(
      empty,
    );
    expect(applyMir4NativePiercingBladesSpecialContact(ctx, source, target, 310303, 0, 10)).toEqual(
      empty,
    );
    ctx.isHostileTo = () => false;
    expect(applyMir4NativePiercingBladesSpecialContact(ctx, source, target, 310302, 0, 10)).toEqual(
      empty,
    );
  });
});
