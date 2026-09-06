import { describe, expect, it, vi } from 'vitest';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';
import {
  applyMir4NativeMoonlightOrbSpecialContact,
  mir4NativeMoonlightOrbPartyDefenseBonus,
  mir4NativeMoonlightOrbPersistentMonsterDamageBps,
  mir4NativeMoonlightOrbPolicy,
} from '../../src/sim/mir4/native_skill_moonlight_orb';

function entity(id: number, kind: 'player' | 'mob' = 'player'): Entity {
  return {
    id,
    kind,
    dead: false,
    auras: [],
    stealthed: false,
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
    partyOf: () => null,
    breakStealth: (target: Entity) => {
      target.auras = target.auras.filter((aura) => aura.kind !== 'stealth');
      target.stealthed = false;
    },
  } as unknown as SimContext;
}

describe('MIR4 Moonlight Orb rank effects', () => {
  it('pins the exact rank 1/5/8/10 ladder recovered from native special rows', () => {
    expect(mir4NativeMoonlightOrbPolicy(1)).toMatchObject({
      skillLevel: 1,
      quellDurationMs: 8_000,
      skillDamageReductionLossBps: 0,
      enhancementDispelChanceBps: { monster: 0, player: 0 },
      monsterDamageBps: 0,
      partyDefenseFlat: 0,
    });
    expect(mir4NativeMoonlightOrbPolicy(5)).toMatchObject({
      skillLevel: 5,
      quellDurationMs: 10_000,
      skillDamageReductionLossBps: 1_000,
      skillDamageReductionLossDurationMs: 15_000,
      enhancementDispelChanceBps: { monster: 3_500, player: 2_000 },
      monsterDamageBps: 400,
      partyDefenseFlat: 20,
    });
    expect(mir4NativeMoonlightOrbPolicy(8)).toMatchObject({
      skillLevel: 8,
      quellDurationMs: 12_000,
      chaosDurationMs: 10_000,
      skillDamageReductionLossBps: 1_500,
      skillDamageReductionLossDurationMs: 30_000,
      enhancementDispelChanceBps: { monster: 7_000, player: 4_000 },
      magicShieldOrStealthDispelChanceBps: 4_000,
      monsterDamageBps: 800,
      partyDefenseFlat: 60,
    });
    expect(mir4NativeMoonlightOrbPolicy(10)).toMatchObject({
      skillLevel: 10,
      quellDurationMs: 15_000,
      chaosDurationMs: 10_000,
      criticalEvasionLoss: 300,
      criticalEvasionLossDurationMs: 10_000,
      skillDamageReductionLossBps: 2_000,
      enhancementDispelChanceBps: { monster: 10_000, player: 6_000 },
      magicShieldOrStealthDispelChanceBps: 6_000,
      monsterDamageBps: 1_200,
      partyDefenseFlat: 100,
    });
  });

  it('applies rank-10 Quell, Chaos, skill vulnerability and critical-evasion loss once', () => {
    const ctx = context([9_999, 9_999]);
    const source = entity(1);
    const target = entity(2);

    expect(applyMir4NativeMoonlightOrbSpecialContact(ctx, source, target, 330102, 0, 10)).toEqual({
      applied: true,
      enhancementDispelled: false,
      magicShieldOrStealthDispelled: false,
    });
    expect(target.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: 'mir4_native_buff_30010',
          kind: 'spell-attack-reduction',
          duration: 15,
          magnitude: 0.25,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_10020',
          kind: 'physical-attack-reduction',
          duration: 10,
          magnitude: 0.25,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30502_45',
          kind: 'native-status-boost',
          nativeStatusId: 45,
          duration: 30,
          magnitude: -20,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30503_31',
          kind: 'native-status-boost',
          nativeStatusId: 31,
          duration: 10,
          magnitude: -300,
        }),
      ]),
    );
    const count = target.mir4Effects?.active.length;
    expect(applyMir4NativeMoonlightOrbSpecialContact(ctx, source, target, 330102, 1, 10)).toEqual({
      applied: false,
      enhancementDispelled: false,
      magicShieldOrStealthDispelled: false,
    });
    expect(target.mir4Effects?.active).toHaveLength(count ?? 0);
  });

  it('uses distinct native chances to remove an enhancement and Magic Shield or Stealth', () => {
    const ctx = context([0, 0]);
    const source = entity(1);
    const target = entity(2, 'mob');
    target.mir4Shield = {
      remaining: 20,
      damageReductionBasisPoints: 3_000,
      bashDamageReductionBasisPoints: 0,
      absorptionRemaining: 5_000,
      hitsRemaining: 10,
    };
    target.auras.push({
      id: 'qa_stealth',
      name: 'QA Stealth',
      kind: 'stealth',
      duration: 20,
      remaining: 20,
      value: 1,
      sourceId: target.id,
      school: 'shadow',
    });
    target.stealthed = true;
    target.mir4Effects?.active.push({
      effectId: 'qa_enhancement',
      kind: 'defense-boost',
      remaining: 20,
      duration: 20,
      magnitude: 0.2,
      sourceId: target.id,
    });

    expect(applyMir4NativeMoonlightOrbSpecialContact(ctx, source, target, 330102, 0, 8)).toEqual({
      applied: true,
      enhancementDispelled: true,
      magicShieldOrStealthDispelled: true,
    });
    expect(target.mir4Effects?.active.some((effect) => effect.effectId === 'qa_enhancement')).toBe(
      false,
    );
    expect(target.mir4Shield).toBeUndefined();
    expect(target.stealthed).toBe(false);
  });

  it('exposes persistent monster damage and the strongest party defense without stacking Taoists', () => {
    const ctx = context();
    const taoist = entity(1);
    const ally = entity(2);
    const secondTaoist = entity(3);
    ctx.entities.set(taoist.id, taoist);
    ctx.entities.set(ally.id, ally);
    ctx.entities.set(secondTaoist.id, secondTaoist);
    ctx.players.set(taoist.id, { mir4SkillLevels: { 3301: 8 } } as never);
    ctx.players.set(ally.id, { mir4SkillLevels: {} } as never);
    ctx.players.set(secondTaoist.id, { mir4SkillLevels: { 3301: 5 } } as never);
    ctx.partyOf = () => ({ members: [1, 2, 3] }) as never;

    expect(mir4NativeMoonlightOrbPersistentMonsterDamageBps(ctx, taoist)).toBe(800);
    expect(mir4NativeMoonlightOrbPersistentMonsterDamageBps(ctx, ally)).toBe(0);
    expect(mir4NativeMoonlightOrbPartyDefenseBonus(ctx, ally)).toBe(60);
  });
});
