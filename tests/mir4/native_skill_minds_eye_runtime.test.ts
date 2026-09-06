import { describe, expect, it } from 'vitest';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import {
  mir4NativeMindsEyePersistentAllDamageReductionBps,
  mir4NativeMindsEyePersistentBossDamageBps,
} from '../../src/sim/mir4/native_skill_minds_eye';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed: number, skillLevel: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: "Mind's Eye Runtime QA",
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Arbalist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 4111: skillLevel };
  sim.drainEvents();
  return sim;
}

function addPartyMember(sim: Sim, name: string, distance: number): Entity {
  const memberId = sim.addPlayer('warrior', name);
  const member = sim.entities.get(memberId);
  if (!member) throw new Error(`missing party member ${memberId}`);
  member.pos = sim.groundPos(sim.player.pos.x + distance, sim.player.pos.z);
  member.pos.y = sim.player.pos.y;
  member.prevPos = { ...member.pos };
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

function resolveAt(sim: Sim, seconds: number): void {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe("MIR4 Arbalist 4111 Mind's Eye integrated runtime", () => {
  it('casts without a target and applies the party buff plus Focus only at 564 ms', () => {
    const sim = makeArbalist(41_111, 1);
    const ally = addPartyMember(sim, 'Mind Eye Ally', 2);

    expect(castMir4Skill(sim.ctx, sim.playerId, 4111)).toEqual({ ok: true });
    expect(mir4NativeStatusBonus(sim.player, 20)).toBe(0);
    expect(mir4NativeStatusBonus(ally, 20)).toBe(0);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4111)
        .map((impact) => [impact.nativeSetup, impact.targetId, Math.round(impact.dueAt * 1_000)]),
    ).toEqual([
      ['arbalist-minds-eye-party-buffs', sim.playerId, 564],
      ['arbalist-minds-eye-party-buffs', ally.id, 564],
      ['arbalist-focus', sim.playerId, 564],
    ]);

    resolveAt(sim, 0.563);
    expect(mir4NativeStatusBonus(sim.player, 20)).toBe(0);
    resolveAt(sim, 0.564);
    expect(mir4NativeStatusBonus(sim.player, 20)).toBe(10);
    expect(mir4NativeStatusBonus(ally, 20)).toBe(10);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1 });
  });

  it('caps recipients at five party members and never buffs outsiders or distant allies', () => {
    const sim = makeArbalist(41_112, 1);
    const members = Array.from({ length: 5 }, (_, index) =>
      addPartyMember(sim, `Mind Eye Party ${index}`, index + 1),
    );
    const distant = addPartyMember(sim, 'Mind Eye Distant', 15.1);
    const outsiderId = sim.addPlayer('warrior', 'Mind Eye Outsider');
    const outsider = sim.entities.get(outsiderId);
    if (!outsider) throw new Error('missing outsider');
    outsider.pos = sim.groundPos(sim.player.pos.x + 1, sim.player.pos.z + 1);
    outsider.pos.y = sim.player.pos.y;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4111)).toEqual({ ok: true });
    resolveAt(sim, 0.564);

    expect(mir4NativeStatusBonus(sim.player, 20)).toBe(10);
    expect(members.slice(0, 4).map((member) => mir4NativeStatusBonus(member, 20))).toEqual([
      10, 10, 10, 10,
    ]);
    const cappedMember = members[4];
    if (!cappedMember) throw new Error('missing capped party member');
    expect(mir4NativeStatusBonus(cappedMember, 20)).toBe(0);
    expect(mir4NativeStatusBonus(distant, 20)).toBe(0);
    expect(mir4NativeStatusBonus(outsider, 20)).toBe(0);
  });

  it('at rank 8 dispels Blind and grants the official temporary and persistent effects', () => {
    const sim = makeArbalist(41_118, 8);
    const ally = addPartyMember(sim, 'Mind Eye Rank 8', 2);
    for (const target of [sim.player, ally]) {
      applyMir4Effect(sim.ctx, target, {
        effectId: `mind_eye_blind_${target.id}`,
        kind: 'blind',
        durationSeconds: 20,
        magnitude: 0,
        name: 'Blind',
        sourceId: 999,
      });
    }

    expect(castMir4Skill(sim.ctx, sim.playerId, 4111)).toEqual({ ok: true });
    resolveAt(sim, 0.564);

    for (const target of [sim.player, ally]) {
      expect(target.mir4Effects?.active.some((effect) => effect.kind === 'blind')).toBe(false);
      expect(mir4NativeStatusBonus(target, 20)).toBe(80);
      expect(mir4NativeStatusBonus(target, 28)).toBe(160);
      expect(mir4NativeStatusBonus(target, 30)).toBe(80);
      expect(mir4NativeStatusBonus(target, 147)).toBe(2_000);
    }
    expect(mir4NativeMindsEyePersistentBossDamageBps(sim.ctx, sim.player)).toBe(1_000);
    expect(mir4NativeMindsEyePersistentAllDamageReductionBps(sim.ctx, sim.player)).toBe(1_000);
  });

  it('upgrades rank 10 values and durations without stacking stale rank-8 effects', () => {
    const sim = makeArbalist(41_110, 10);
    expect(castMir4Skill(sim.ctx, sim.playerId, 4111)).toEqual({ ok: true });
    resolveAt(sim, 0.564);

    expect(mir4NativeStatusBonus(sim.player, 20)).toBe(100);
    expect(mir4NativeStatusBonus(sim.player, 28)).toBe(240);
    expect(mir4NativeStatusBonus(sim.player, 30)).toBe(120);
    expect(mir4NativeStatusBonus(sim.player, 147)).toBe(3_000);
    expect(
      sim.player.mir4Effects?.active.find(
        (effect) => effect.effectId === 'mir4_native_buff_40104_28',
      ),
    ).toMatchObject({ duration: 15, remaining: 15 });
    expect(mir4NativeMindsEyePersistentBossDamageBps(sim.ctx, sim.player)).toBe(1_500);
    expect(mir4NativeMindsEyePersistentAllDamageReductionBps(sim.ctx, sim.player)).toBe(2_000);
  });
});
