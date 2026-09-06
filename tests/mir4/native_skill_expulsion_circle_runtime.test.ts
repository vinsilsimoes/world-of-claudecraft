import { describe, expect, it } from 'vitest';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4EffectKind } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number, skillLevel: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Expulsion Circle Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Taoist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3404: skillLevel };
  sim.drainEvents();
  return sim;
}

function addPartyMember(sim: Sim, name: string, x: number): Entity {
  const memberId = sim.addPlayer('warrior', name);
  const member = sim.entities.get(memberId);
  if (!member) throw new Error(`missing party member ${memberId}`);
  member.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z);
  member.pos.y = sim.player.pos.y;
  member.prevPos = { ...member.pos };
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

function addDebuff(sim: Sim, target: Entity, suffix: string, kind: Mir4EffectKind): void {
  applyMir4Effect(sim.ctx, target, {
    effectId: `test_expulsion_${suffix}_${target.id}`,
    kind,
    durationSeconds: 10,
    magnitude: kind === 'slow' ? 0.25 : 0,
    name: suffix,
    sourceId: 999,
  });
}

function resolveAt(sim: Sim, seconds: number): void {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Taoist 3404 Expulsion Circle integrated runtime', () => {
  it('applies only the rank-1 flat Spell DEF party buff at the authored 564 ms', () => {
    const sim = makeTaoist(34_101, 1);
    const ally = addPartyMember(sim, 'Expulsion Ally', 2);
    expect(castMir4Skill(sim.ctx, sim.playerId, 3404)).toEqual({ ok: true });
    resolveAt(sim, 0.563);
    expect(mir4NativeStatusBonus(sim.player, 26)).toBe(0);
    resolveAt(sim, 0.564);
    for (const target of [sim.player, ally]) {
      expect(mir4NativeStatusBonus(target, 26)).toBe(25);
      expect(mir4NativeStatusBonus(target, 24)).toBe(0);
      expect(mir4NativeStatusBonus(target, 45)).toBe(0);
    }
  });

  it('at rank 8 casts while Silenced, cleanses Silence and every removable Debilitation, and applies the split resistances', () => {
    const sim = makeTaoist(34_108, 8);
    const ally = addPartyMember(sim, 'Expulsion Rank 8 Ally', 2);
    for (const target of [sim.player, ally]) {
      addDebuff(sim, target, 'silence', 'silence');
      addDebuff(sim, target, 'slow', 'slow');
      addDebuff(sim, target, 'root', 'root');
    }
    addDebuff(sim, ally, 'stun', 'stun');

    expect(castMir4Skill(sim.ctx, sim.playerId, 3404)).toEqual({ ok: true });
    resolveAt(sim, 0.564);
    for (const target of [sim.player, ally]) {
      expect(target.mir4Effects?.active.some((effect) => effect.kind === 'silence')).toBe(false);
      expect(target.mir4Effects?.active.some((effect) => effect.kind === 'slow')).toBe(false);
      expect(target.mir4Effects?.active.some((effect) => effect.kind === 'root')).toBe(false);
      expect(mir4NativeStatusBonus(target, 26)).toBe(160);
      expect(mir4NativeStatusBonus(target, 43)).toBe(1_500);
      expect(mir4NativeStatusBonus(target, 45)).toBe(12);
    }
    expect(ally.mir4Effects?.active.some((effect) => effect.kind === 'stun')).toBe(true);
    expect(mir4NativeStatusBonus(sim.player, 51)).toBe(1_000);
    expect(mir4NativeStatusBonus(sim.player, 53)).toBe(1_000);
    expect(mir4NativeStatusBonus(ally, 51)).toBe(2_000);
    expect(mir4NativeStatusBonus(ally, 53)).toBe(2_000);
  });

  it('at rank 10 applies the final party package and preserves unremovable debuffs', () => {
    const sim = makeTaoist(34_110, 10);
    const ally = addPartyMember(sim, 'Expulsion Rank 10 Ally', 2);
    applyMir4Effect(sim.ctx, ally, {
      effectId: 'test_expulsion_unremovable_silence',
      kind: 'silence',
      durationSeconds: 10,
      magnitude: 0,
      unremovable: true,
      name: 'Unremovable Silence',
      sourceId: 999,
    });

    expect(castMir4Skill(sim.ctx, sim.playerId, 3404)).toEqual({ ok: true });
    resolveAt(sim, 0.564);
    expect(mir4NativeStatusBonus(sim.player, 26)).toBe(220);
    expect(mir4NativeStatusBonus(sim.player, 43)).toBe(2_000);
    expect(mir4NativeStatusBonus(sim.player, 45)).toBe(20);
    expect(mir4NativeStatusBonus(sim.player, 51)).toBe(5_000);
    expect(mir4NativeStatusBonus(sim.player, 53)).toBe(7_000);
    expect(mir4NativeStatusBonus(ally, 51)).toBe(2_500);
    expect(mir4NativeStatusBonus(ally, 53)).toBe(3_500);
    expect(ally.mir4Effects?.active.some((effect) => effect.unremovable)).toBe(true);
  });

  it('keeps rank 7 blocked by Silence and does not let rank 8 bypass Stun', () => {
    const rank7 = makeTaoist(34_107, 7);
    addDebuff(rank7, rank7.player, 'rank7-silence', 'silence');
    expect(castMir4Skill(rank7.ctx, rank7.playerId, 3404)).toEqual({
      ok: false,
      reason: 'silenced',
    });

    const rank8 = makeTaoist(34_118, 8);
    addDebuff(rank8, rank8.player, 'rank8-stun', 'stun');
    expect(castMir4Skill(rank8.ctx, rank8.playerId, 3404)).toEqual({
      ok: false,
      reason: 'controlled',
    });
  });
});
