import { describe, expect, it, vi } from 'vitest';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';
import { mir4NativeBashPolicy } from '../../src/sim/mir4/native_skill_bash';
import {
  applyMir4NativeRainOfBladesSpecialContact,
  mir4NativeRainOfBladesPartySkillDamageReductionBps,
  mir4NativeRainOfBladesPolicy,
} from '../../src/sim/mir4/native_skill_rain_of_blades';

function entity(id: number): Entity {
  return {
    id,
    kind: 'player',
    dead: false,
    auras: [],
    mir4Effects: { active: [], controlImmuneUntil: 0 },
  } as unknown as Entity;
}

function context(): SimContext {
  return {
    time: 10,
    players: new Map<number, { mir4SkillLevels?: Record<number, number> }>(),
    entities: new Map<number, Entity>(),
    rng: { next: vi.fn(() => 0) },
    isHostileTo: () => true,
    partyOf: () => null,
    breakStealth: () => undefined,
    applyAura: (target: Entity, aura: Entity['auras'][number]) => {
      target.auras.push(aura);
    },
    tryApplyAura: (target: Entity, aura: Entity['auras'][number]) => {
      target.auras.push(aura);
      return true;
    },
  } as unknown as SimContext;
}

describe('MIR4 Rain of Blades rank effects', () => {
  it('pins the exact rank 1/5/8/10 ladder recovered from native special and BUFF rows', () => {
    expect(mir4NativeRainOfBladesPolicy(1)).toMatchObject({
      skillLevel: 1,
      unavoidable: false,
      bashBonusBasisPoints: 5_000,
      refreshDebilitationDurationMs: 0,
      damagedWeapon: null,
      evasionLoss: null,
      silence: null,
      bashDamageReductionLossBasisPoints: 0,
      partySkillDamageReductionBasisPoints: 0,
    });
    expect(mir4NativeRainOfBladesPolicy(5)).toMatchObject({
      skillLevel: 5,
      unavoidable: false,
      bashBonusBasisPoints: 6_500,
      refreshDebilitationDurationMs: 10_000,
      damagedWeapon: { attackLoss: 10, durationMs: 60_000 },
      evasionLoss: { chanceBasisPoints: 3_000, amount: 300, durationMs: 4_000 },
      silence: null,
      bashDamageReductionLossBasisPoints: 0,
      partySkillDamageReductionBasisPoints: 400,
    });
    expect(mir4NativeRainOfBladesPolicy(8)).toMatchObject({
      skillLevel: 8,
      unavoidable: true,
      bashBonusBasisPoints: 8_000,
      refreshDebilitationDurationMs: 10_000,
      damagedWeapon: { attackLoss: 20, durationMs: 120_000 },
      evasionLoss: { chanceBasisPoints: 4_000, amount: 500, durationMs: 4_000 },
      silence: { curseChanceBasisPoints: 4_000, durationMs: 4_000 },
      bashDamageReductionLossBasisPoints: 2_000,
      partySkillDamageReductionBasisPoints: 800,
    });
    expect(mir4NativeRainOfBladesPolicy(10)).toMatchObject({
      skillLevel: 10,
      unavoidable: true,
      bashBonusBasisPoints: 10_000,
      refreshDebilitationDurationMs: 10_000,
      damagedWeapon: { attackLoss: 30, durationMs: 180_000 },
      evasionLoss: { chanceBasisPoints: 6_000, amount: 800, durationMs: 6_000 },
      silence: { curseChanceBasisPoints: 6_000, durationMs: 6_000 },
      bashDamageReductionLossBasisPoints: 5_000,
      partySkillDamageReductionBasisPoints: 1_200,
    });
  });

  it('keeps Bash on the direct contact and follows the same rank ladder', () => {
    expect(mir4NativeBashPolicy(3104, 1)).toMatchObject({
      skillBonusBasisPoints: 5_000,
      requiredDebilitationBuffIds: [10020, 20020],
    });
    expect(mir4NativeBashPolicy(3104, 10)?.skillBonusBasisPoints).toBe(10_000);
  });

  it('refreshes one debilitation stack and applies rank-10 direct-contact effects', () => {
    const ctx = context();
    const source = entity(1);
    const target = entity(2);
    target.mir4Effects?.active.push({
      effectId: 'mir4_native_buff_10020',
      kind: 'physical-attack-reduction',
      remaining: 2,
      duration: 5,
      magnitude: 0.25,
      sourceId: source.id,
      nativeStacks: 1,
    });

    expect(
      applyMir4NativeRainOfBladesSpecialContact(
        ctx,
        source,
        target,
        310402,
        0,
        10,
        true,
        () => 0,
      ),
    ).toEqual({
      applied: true,
      debilitationRefreshed: true,
      evasionReduced: true,
      silenced: true,
    });
    expect(target.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: 'mir4_native_buff_10020',
          duration: 10,
          remaining: 10,
          nativeStacks: 2,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30514_20',
          nativeStatusId: 20,
          magnitude: -30,
          duration: 180,
          unremovable: true,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30514_22',
          nativeStatusId: 22,
          magnitude: -30,
          duration: 180,
          unremovable: true,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30521_29',
          nativeStatusId: 29,
          magnitude: -800,
          duration: 6,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30522',
          kind: 'silence',
          duration: 6,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30513_35',
          nativeStatusId: 35,
          magnitude: -5_000,
          duration: 10,
        }),
      ]),
    );
  });

  it('uses only the strongest learned party Skill DMG Reduction contribution', () => {
    const ctx = context();
    const first = entity(1);
    const ally = entity(2);
    const second = entity(3);
    ctx.entities.set(first.id, first);
    ctx.entities.set(ally.id, ally);
    ctx.entities.set(second.id, second);
    ctx.players.set(first.id, { mir4SkillLevels: { 3104: 8 } } as never);
    ctx.players.set(ally.id, { mir4SkillLevels: {} } as never);
    ctx.players.set(second.id, { mir4SkillLevels: { 3104: 5 } } as never);
    ctx.partyOf = () => ({ members: [1, 2, 3] }) as never;

    expect(mir4NativeRainOfBladesPartySkillDamageReductionBps(ctx, ally)).toBe(800);
  });
});
