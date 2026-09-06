import { describe, expect, it } from 'vitest';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import {
  mir4NativeBashPolicy,
  mir4NativeBashResolution,
  mir4NativeBashScaledRawDamage,
  mir4NativeWarriorBashPassiveBonusBasisPoints,
} from '../../src/sim/mir4/native_skill_bash';
import { applyMir4NativeUnbreakableStanceBuffs } from '../../src/sim/mir4/native_skill_unbreakable_stance_runtime';
import { Sim } from '../../src/sim/sim';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSim(): Sim {
  const sim = new Sim({
    seed: 15_020_034,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Bash Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  const targetId = sim.addPlayer('warrior', 'Native Bash Defender');
  placePlayerInOpenField(sim, targetId, { x: sim.player.pos.x + 2, z: sim.player.pos.z });
  sim.setPlayerLevel(120, targetId);
  const duel = { a: sim.playerId, b: targetId, state: 'active' as const, timer: 0 };
  sim.duels.set(sim.playerId, duel);
  sim.duels.set(targetId, duel);
  return sim;
}

function applyDebilitation(sim: Sim, targetId: number, buffId: 10010 | 10020 | 30010): void {
  const target = sim.entities.get(targetId);
  if (!target) throw new Error('missing target');
  expect(
    applyMir4Effect(sim.ctx, target, {
      effectId: `mir4_native_buff_${buffId}`,
      kind: buffId === 10010 ? 'physical-attack-reduction' : 'physical-defense-reduction',
      durationSeconds: 10,
      magnitude: 0.25,
      name: 'Native Debilitation QA',
      sourceId: sim.playerId,
    }),
  ).toEqual({ ok: true });
}

function resolveFixedSkillContact(sim: Sim, targetId: number, skillId: 1104): number {
  const target = sim.entities.get(targetId);
  if (!target) throw new Error('missing target');
  const healthBefore = target.hp;
  sim.player.mir4PendingImpacts = [
    {
      dueAt: sim.time,
      sourceId: sim.playerId,
      targetId,
      rawDamage: 100_000,
      channel: 'physical',
      attackKind: 'skill',
      name: 'Native Bash Contact QA',
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      skillLevel: 1,
      forceHit: true,
      forceCritical: false,
      attackAnimationStarted: true,
    },
  ];
  updateMir4PendingImpacts(sim.ctx);
  return healthBefore - target.hp;
}

describe('MIR4 native Warrior Bash runtime', () => {
  it('compiles the exact four rank ladders and debilitation requirements', () => {
    expect(
      [1, 5, 8, 10].map((rank) => mir4NativeBashPolicy(1104, rank)?.skillBonusBasisPoints),
    ).toEqual([5_000, 6_500, 8_000, 10_000]);
    expect(
      [1, 5, 8, 10].map((rank) => mir4NativeBashPolicy(1501, rank)?.skillBonusBasisPoints),
    ).toEqual([5_000, 8_000, 10_000, 12_000]);
    expect(mir4NativeBashPolicy(1401, 1)).toMatchObject({
      passiveId: 101001,
      requiredDebilitationBuffIds: [10010],
    });
    expect(mir4NativeBashPolicy(1601, 1)).toMatchObject({
      passiveId: 101002,
      requiredDebilitationBuffIds: [10020, 30010],
    });
    expect(mir4NativeBashPolicy(2303, 10)).toMatchObject({
      passiveId: 102001,
      requiredDebilitationBuffIds: [20020],
      skillBonusBasisPoints: 10_000,
    });
    expect(mir4NativeBashPolicy(1502, 10)).toBeNull();
  });

  it('projects the permanent Bash ATK boosts learned from both skill ladders', () => {
    expect(mir4NativeWarriorBashPassiveBonusBasisPoints({ 1104: 4, 1401: 4 })).toBe(0);
    expect(mir4NativeWarriorBashPassiveBonusBasisPoints({ 1104: 5, 1401: 5 })).toBe(2_000);
    expect(mir4NativeWarriorBashPassiveBonusBasisPoints({ 1104: 8, 1401: 8 })).toBe(3_500);
    expect(mir4NativeWarriorBashPassiveBonusBasisPoints({ 1104: 10, 1401: 10 })).toBe(5_000);
  });

  it('does not Bash without the required debilitation and admits Daze/Confuse/Quell exactly', () => {
    const sim = makeSim();
    const targetId = [...sim.players.keys()].find((id) => id !== sim.playerId);
    if (targetId === undefined) throw new Error('missing defender');
    const target = sim.entities.get(targetId)!;

    expect(mir4NativeBashResolution(sim.ctx, sim.player, target, 1104, 1).triggered).toBe(false);
    applyDebilitation(sim, targetId, 10010);
    expect(mir4NativeBashResolution(sim.ctx, sim.player, target, 1104, 1)).toMatchObject({
      triggered: true,
      damageMultiplierBasisPoints: 15_000,
    });
    expect(mir4NativeBashResolution(sim.ctx, sim.player, target, 1501, 1).triggered).toBe(false);

    target.mir4Effects = undefined;
    applyDebilitation(sim, targetId, 30010);
    expect(mir4NativeBashResolution(sim.ctx, sim.player, target, 1501, 10)).toMatchObject({
      triggered: true,
      skillBonusBasisPoints: 12_000,
      damageMultiplierBasisPoints: 22_000,
    });
  });

  it('feeds rank-10 Unbreakable Stance Bash reduction into the live raw contact', () => {
    const sim = makeSim();
    const targetId = [...sim.players.keys()].find((id) => id !== sim.playerId);
    if (targetId === undefined) throw new Error('missing defender');
    const target = sim.entities.get(targetId)!;
    applyDebilitation(sim, targetId, 10020);
    expect(applyMir4NativeUnbreakableStanceBuffs(sim.ctx, target, 10, false)).toBe(true);

    const resolution = mir4NativeBashResolution(sim.ctx, sim.player, target, 1501, 1);
    expect(resolution).toMatchObject({
      triggered: true,
      skillBonusBasisPoints: 5_000,
      defenderReductionBasisPoints: 5_000,
      damageMultiplierBasisPoints: 10_000,
    });
    expect(mir4NativeBashScaledRawDamage(sim.ctx, sim.player, target, 1501, 1, 1_234)).toBe(1_234);
  });

  it('applies Magic Shield Bash reduction only to the native Bash bonus', () => {
    const sim = makeSim();
    const targetId = [...sim.players.keys()].find((id) => id !== sim.playerId);
    if (targetId === undefined) throw new Error('missing defender');
    const target = sim.entities.get(targetId)!;
    applyDebilitation(sim, targetId, 10010);
    target.mir4Shield = {
      remaining: 25,
      damageReductionBasisPoints: 2_400,
      bashDamageReductionBasisPoints: 1_500,
      absorptionRemaining: 2_000,
      hitsRemaining: 20,
    };

    expect(mir4NativeBashResolution(sim.ctx, sim.player, target, 1104, 1)).toMatchObject({
      triggered: true,
      skillBonusBasisPoints: 5_000,
      defenderReductionBasisPoints: 1_500,
      damageMultiplierBasisPoints: 13_500,
    });
    expect(mir4NativeBashScaledRawDamage(sim.ctx, sim.player, target, 1104, 1, 2_000)).toBe(2_700);
  });

  it('cancels the native rank-1 Bash bonus inside the real pending-impact resolver', () => {
    const sim = makeSim();
    const targetId = [...sim.players.keys()].find((id) => id !== sim.playerId);
    if (targetId === undefined) throw new Error('missing defender');
    const target = sim.entities.get(targetId)!;
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 1104: 1, 1401: 1 };
    target.maxHp = 1_000_000;
    target.hp = target.maxHp;
    expect(applyMir4NativeUnbreakableStanceBuffs(sim.ctx, target, 10, false)).toBe(true);

    const nonBashDamage = resolveFixedSkillContact(sim, targetId, 1104);
    target.hp = target.maxHp;
    if (target.mir4Effects) {
      target.mir4Effects.active = target.mir4Effects.active.filter(
        (effect) => effect.effectId !== 'mir4_native_buff_10010',
      );
    }
    applyDebilitation(sim, targetId, 10010);
    const reducedBashDamage = resolveFixedSkillContact(sim, targetId, 1104);

    expect(nonBashDamage).toBeGreaterThan(0);
    expect(reducedBashDamage).toBe(nonBashDamage);
  });

  it('combines persistent and learned Bash ATK boosts before defender reduction', () => {
    const sim = makeSim();
    const targetId = [...sim.players.keys()].find((id) => id !== sim.playerId);
    if (targetId === undefined) throw new Error('missing defender');
    const target = sim.entities.get(targetId)!;
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 1104: 10, 1401: 10 };
    sim.player.mir4!.statusValues = { ...sim.player.mir4!.statusValues, 34: 100 };
    target.mir4!.statusValues = { ...target.mir4!.statusValues, 35: 200 };
    applyDebilitation(sim, targetId, 10010);

    expect(mir4NativeBashResolution(sim.ctx, sim.player, target, 1104, 1)).toMatchObject({
      attackerBonusBasisPoints: 6_000,
      defenderReductionBasisPoints: 2_000,
      damageMultiplierBasisPoints: 19_000,
    });
  });
});
