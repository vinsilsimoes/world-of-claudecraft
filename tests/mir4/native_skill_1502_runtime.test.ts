import { describe, expect, it } from 'vitest';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  applyMir4NativeUnbreakableStanceBuffs,
  mir4NativeUnbreakableStancePersistentCombatBonuses,
} from '../../src/sim/mir4/native_skill_unbreakable_stance_runtime';
import { applyMir4Effect, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from '../../src/sim/mir4/control';
import { Sim } from '../../src/sim/sim';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed: number, skillLevel: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Unbreakable Stance Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = 100_000;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 player metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 1502: skillLevel };
  return sim;
}

describe('MIR4 Warrior 1502 integrated runtime', () => {
  it('applies rank-1 direct buffs with independent native durations', () => {
    const sim = makeWarrior(15_021, 1);
    expect(applyMir4NativeUnbreakableStanceBuffs(sim.ctx, sim.player, 1, false)).toBe(true);
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(60);
    expect(mir4NativeStatusBonus(sim.player, 42)).toBe(2_000);
    expect(sim.player.mir4Effects?.active).toMatchObject([
      { effectId: 'mir4_native_buff_15011_29', duration: 20, magnitude: 60 },
      { effectId: 'mir4_native_buff_15012_42', duration: 10, magnitude: 2_000 },
    ]);
  });

  it('applies all rank-10 status lanes and the conditional stunned EVA bonus', () => {
    const sim = makeWarrior(15_022, 10);
    expect(applyMir4NativeUnbreakableStanceBuffs(sim.ctx, sim.player, 10, true)).toBe(true);
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(550);
    expect(mir4NativeStatusBonus(sim.player, 42)).toBe(2_000);
    expect(mir4NativeStatusBonus(sim.player, 43)).toBe(5_000);
    expect(mir4NativeStatusBonus(sim.player, 24)).toBe(600);
    expect(mir4NativeStatusBonus(sim.player, 26)).toBe(600);
    expect(mir4NativeStatusBonus(sim.player, 49)).toBe(8_000);
    expect(mir4NativeStatusBonus(sim.player, 35)).toBe(5_000);
    expect(mir4NativeUnbreakableStancePersistentCombatBonuses(sim.ctx, sim.player)).toEqual({
      allDamageReductionBasisPoints: 600,
    });
  });

  it('does not grant the conditional EVA bonus when the rank-10 cast starts unstunned', () => {
    const sim = makeWarrior(15_023, 10);
    expect(applyMir4NativeUnbreakableStanceBuffs(sim.ctx, sim.player, 10, false)).toBe(true);
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(150);
  });

  it('expires each native rank-10 lane independently', () => {
    const sim = makeWarrior(15_026, 10);
    expect(applyMir4NativeUnbreakableStanceBuffs(sim.ctx, sim.player, 10, true)).toBe(true);

    for (let tick = 0; tick < 161; tick += 1) sim.tick();
    expect(mir4NativeStatusBonus(sim.player, 24)).toBe(0);
    expect(mir4NativeStatusBonus(sim.player, 26)).toBe(0);
    expect(mir4NativeStatusBonus(sim.player, 49)).toBe(0);
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(150);
    expect(mir4NativeStatusBonus(sim.player, 35)).toBe(5_000);

    for (let tick = 161; tick < 201; tick += 1) sim.tick();
    expect(mir4NativeStatusBonus(sim.player, 35)).toBe(0);
    expect(mir4NativeStatusBonus(sim.player, 42)).toBe(0);
    expect(mir4NativeStatusBonus(sim.player, 43)).toBe(0);
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(150);

    for (let tick = 201; tick < 401; tick += 1) sim.tick();
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(0);
  });

  it('feeds the exact temporary Stun RES lane into chance and duration math', () => {
    expect(mir4ControlChanceFromStatuses(10_000, 'stun', undefined, undefined, 'monster', 5_000)).toBe(
      5_000,
    );
    expect(mir4ControlDurationMs(2_000, 'stun', undefined, undefined, 'monster', 5_000)).toBe(
      1_000,
    );
    expect(mir4ControlChanceFromStatuses(10_000, 'stun', undefined, undefined, 'monster', 8_000)).toBe(
      2_000,
    );
    expect(mir4ControlDurationMs(2_000, 'stun', undefined, undefined, 'monster', 8_000)).toBe(
      700,
    );
  });

  it('rejects stunned casts before rank 8 and admits the exact stunned branch at rank 8', () => {
    const beforeRank8 = makeWarrior(15_024, 7);
    expect(
      applyMir4Effect(beforeRank8.ctx, beforeRank8.player, {
        effectId: 'qa_stun',
        kind: 'stun',
        durationSeconds: 2,
        name: 'QA Stun',
        sourceId: 9_999,
      }),
    ).toEqual({ ok: true });
    expect(castMir4Skill(beforeRank8.ctx, beforeRank8.playerId, 1502)).toEqual({
      ok: false,
      reason: 'controlled',
    });

    const rank8 = makeWarrior(15_025, 8);
    expect(
      applyMir4Effect(rank8.ctx, rank8.player, {
        effectId: 'qa_stun',
        kind: 'stun',
        durationSeconds: 2,
        name: 'QA Stun',
        sourceId: 9_999,
      }),
    ).toEqual({ ok: true });
    rank8.player.resource = 100_000;
    expect(castMir4Skill(rank8.ctx, rank8.playerId, 1502)).toEqual({ ok: true });
    for (const impact of rank8.player.mir4PendingImpacts ?? []) impact.dueAt = rank8.time;
    updateMir4PendingImpacts(rank8.ctx);
    expect(mir4NativeStatusBonus(rank8.player, 29)).toBe(380);
    expect(mir4NativeStatusBonus(rank8.player, 49)).toBe(5_000);
  });
});
