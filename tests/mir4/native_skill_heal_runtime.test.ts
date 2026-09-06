import { describe, expect, it, vi } from 'vitest';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect, mir4BossDamageReductionBonusBps } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number, skillLevel = 1, spellPower = 1_000): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Heal Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.spellPower = spellPower;
  sim.player.maxHp = 10_000;
  sim.player.hp = 1_000;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Taoist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3503: skillLevel };
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
  member.maxHp = 10_000;
  member.hp = 1_000;
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

function resolveAt(sim: Sim, seconds: number): void {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Taoist 3503 Heal integrated runtime', () => {
  it('allows the native targetless cast at full health', () => {
    const sim = makeTaoist(35_030);
    sim.player.hp = sim.player.maxHp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3503)).toEqual({ ok: true });
    expect(sim.player.cooldowns.get('3503')).toBe(20);
    expect(
      (sim.player.mir4PendingImpacts ?? []).some(
        (impact) => impact.skillId === 3503 && impact.nativeSetup === 'taoist-heal-pulse',
      ),
    ).toBe(true);
  });

  it('starts the caster and party HoTs at their native contacts and heals five times', () => {
    const sim = makeTaoist(35_031);
    const ally = addPartyMember(sim, 'Heal Ally', 2);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3503)).toEqual({ ok: true });
    expect(sim.player.hp).toBe(1_000);
    expect(ally.hp).toBe(1_000);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 3503)
        .map((impact) => [
          impact.attackId,
          impact.nativeSetup ?? null,
          Math.round((impact.dueAt - sim.time) * 1_000),
          impact.targetId,
        ]),
    ).toEqual([
      [350301, 'taoist-heal-control-immunity', 20, sim.playerId],
      [350301, 'taoist-heal-pulse', 1_020, sim.playerId],
      [350301, 'taoist-heal-pulse', 2_020, sim.playerId],
      [350301, 'taoist-heal-pulse', 3_020, sim.playerId],
      [350301, 'taoist-heal-pulse', 4_020, sim.playerId],
      [350301, 'taoist-heal-pulse', 5_020, sim.playerId],
      [350303, 'taoist-heal-pulse', 1_840, ally.id],
      [350303, 'taoist-heal-pulse', 2_840, ally.id],
      [350303, 'taoist-heal-pulse', 3_840, ally.id],
      [350303, 'taoist-heal-pulse', 4_840, ally.id],
      [350303, 'taoist-heal-pulse', 5_840, ally.id],
    ]);

    resolveAt(sim, 1.019);
    expect(sim.player.hp).toBe(1_000);
    resolveAt(sim, 1.02);
    expect(sim.player.hp).toBe(1_460);
    expect(ally.hp).toBe(1_000);
    resolveAt(sim, 1.84);
    expect(ally.hp).toBe(1_460);
    resolveAt(sim, 5.84);
    expect(sim.player.hp).toBe(3_300);
    expect(ally.hp).toBe(3_300);
  });

  it('snapshots the caster plus four party members and excludes outsiders', () => {
    const sim = makeTaoist(35_032);
    const members = Array.from({ length: 5 }, (_, index) =>
      addPartyMember(sim, `Heal Party ${index}`, index + 1),
    );
    const outsiderId = sim.addPlayer('warrior', 'Heal Outsider');
    const outsider = sim.entities.get(outsiderId);
    if (!outsider) throw new Error('missing outsider');
    outsider.pos = { ...members[0]!.pos };
    outsider.prevPos = { ...outsider.pos };
    outsider.maxHp = 10_000;
    outsider.hp = 1_000;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3503)).toEqual({ ok: true });
    resolveAt(sim, 5.84);

    expect(sim.player.hp).toBe(3_300);
    expect(members.slice(0, 4).map((member) => member.hp)).toEqual([3_300, 3_300, 3_300, 3_300]);
    expect(members[4]!.hp).toBe(1_000);
    expect(outsider.hp).toBe(1_000);
  });

  it('applies rank-5 immediate bonuses at 590 ms before the first periodic pulse', () => {
    const sim = makeTaoist(35_035, 5);
    const ally = addPartyMember(sim, 'Rank 5 Ally', 2);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3503)).toEqual({ ok: true });
    resolveAt(sim, 0.589);
    expect([sim.player.hp, ally.hp]).toEqual([1_000, 1_000]);
    resolveAt(sim, 0.59);
    expect(sim.player.hp).toBe(2_000);
    expect(ally.hp).toBe(2_500);
  });

  it('at rank 8 casts while silenced, cleanses the party, and grants boss reduction', () => {
    const sim = makeTaoist(35_038, 8);
    const ally = addPartyMember(sim, 'Rank 8 Ally', 2);
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);
    for (const target of [sim.player, ally]) {
      applyMir4Effect(sim.ctx, target, {
        effectId: 'mir4_native_buff_10020',
        kind: 'physical-attack-reduction',
        durationSeconds: 10,
        magnitude: 0.2,
        name: 'Debilitation',
        sourceId: 999,
      });
      applyMir4Effect(sim.ctx, target, {
        effectId: `test_heal_silence_${target.id}`,
        kind: 'silence',
        durationSeconds: 10,
        magnitude: 0,
        name: 'Silence',
        sourceId: 999,
      });
    }

    expect(castMir4Skill(sim.ctx, sim.playerId, 3503)).toEqual({ ok: true });
    resolveAt(sim, 0.59);

    for (const target of [sim.player, ally]) {
      expect(target.mir4Effects?.active.some((effect) => effect.kind === 'silence')).toBe(false);
      expect(
        target.mir4Effects?.active.some((effect) => effect.effectId === 'mir4_native_buff_10020'),
      ).toBe(false);
      expect(mir4BossDamageReductionBonusBps(target)).toBe(1_000);
    }
  });

  it('at rank 10 removes Stun from party members and grants the 60-second reduction', () => {
    const sim = makeTaoist(35_030, 10);
    const ally = addPartyMember(sim, 'Rank 10 Ally', 2);
    applyMir4Effect(sim.ctx, ally, {
      effectId: 'test_heal_stun',
      kind: 'stun',
      durationSeconds: 10,
      magnitude: 0,
      name: 'Stun',
      sourceId: 999,
    });
    expect(sim.ctx.isStunned(ally)).toBe(true);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3503)).toEqual({ ok: true });
    resolveAt(sim, 0.59);

    expect(sim.ctx.isStunned(ally)).toBe(false);
    expect(ally.mir4Effects?.active.some((effect) => effect.kind === 'stun')).toBe(false);
    expect(mir4BossDamageReductionBonusBps(ally)).toBe(2_000);
    expect(
      ally.mir4Effects?.active.find((effect) => effect.kind === 'boss-damage-reduction'),
    ).toMatchObject({ duration: 60, remaining: 60 });
  });
});
