import { describe, expect, it, vi } from 'vitest';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect, mir4Invincible } from '../../src/sim/mir4/effects';
import { updateMir4GreaterHealDeathDelay } from '../../src/sim/mir4/native_skill_greater_heal';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Greater Heal Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.maxHp = 10_000;
  sim.player.hp = 1_000;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Taoist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3504: skillLevel };
  sim.drainEvents();
  return sim;
}

function addPartyMember(sim: Sim, name: string, x: number, dead = false): Entity {
  const memberId = sim.addPlayer('warrior', name);
  const member = sim.entities.get(memberId);
  if (!member) throw new Error(`missing party member ${memberId}`);
  member.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z);
  member.pos.y = sim.player.pos.y;
  member.prevPos = { ...member.pos };
  member.maxHp = 10_000;
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  member.hp = dead ? 0 : 1_000;
  member.dead = dead;
  member.ghost = dead;
  member.corpsePos = dead ? { ...member.pos } : null;
  return member;
}

function resolveAt(sim: Sim, seconds: number): void {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Taoist 3504 Greater Heal integrated runtime', () => {
  it('casts without a target and resolves the base party heal at 740 ms', () => {
    const sim = makeTaoist(35_040);
    const ally = addPartyMember(sim, 'Greater Heal Ally', 2);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3504)).toEqual({ ok: true });
    expect(sim.player.cooldowns.get('3504')).toBe(46);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 3504)
        .map((impact) => [
          impact.attackId,
          impact.nativeSetup ?? null,
          Math.round((impact.dueAt - sim.time) * 1_000),
          impact.targetId,
        ]),
    ).toEqual([
      [350401, 'taoist-greater-heal-control-immunity', 20, sim.playerId],
      [350402, 'taoist-greater-heal-living', 740, sim.playerId],
      [350402, 'taoist-greater-heal-living', 740, ally.id],
    ]);

    resolveAt(sim, 0.739);
    expect([sim.player.hp, ally.hp]).toEqual([1_000, 1_000]);
    resolveAt(sim, 0.74);
    expect([sim.player.hp, ally.hp]).toEqual([2_120, 2_120]);
  });

  it('at rank 5 applies recipient-specific bonus healing and deterministic Stun dispel', () => {
    const sim = makeTaoist(35_045, 5);
    const ally = addPartyMember(sim, 'Rank 5 Greater Heal Ally', 2);
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);
    applyMir4Effect(sim.ctx, ally, {
      effectId: `greater_heal_stun_${ally.id}`,
      kind: 'stun',
      durationSeconds: 10,
      magnitude: 0,
      name: 'Stun',
      sourceId: 999,
    });
    const allyMaxHpAtCast = ally.maxHp;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3504)).toEqual({ ok: true });
    resolveAt(sim, 0.74);

    expect(sim.player.hp).toBe(3_140);
    expect(ally.hp).toBe(1_000 + Math.floor(allyMaxHpAtCast * 0.3) + 140);
    expect(sim.ctx.isStunned(ally)).toBe(false);
  });

  it('at rank 8 casts while Stunned or Silenced and protects the living party at 20 ms', () => {
    const sim = makeTaoist(35_048, 8);
    const ally = addPartyMember(sim, 'Rank 8 Greater Heal Ally', 2);
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);
    applyMir4Effect(sim.ctx, sim.player, {
      effectId: 'greater_heal_source_stun',
      kind: 'stun',
      durationSeconds: 10,
      magnitude: 0,
      name: 'Stun',
      sourceId: 999,
    });
    applyMir4Effect(sim.ctx, sim.player, {
      effectId: 'greater_heal_source_silence',
      kind: 'silence',
      durationSeconds: 10,
      magnitude: 0,
      name: 'Silence',
      sourceId: 999,
    });

    expect(castMir4Skill(sim.ctx, sim.playerId, 3504)).toEqual({ ok: true });
    resolveAt(sim, 0.02);

    expect(sim.ctx.isStunned(sim.player)).toBe(false);
    expect(mir4Invincible(sim.player)).toBe(true);
    expect(mir4Invincible(ally)).toBe(true);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.kind === 'invincible'),
    ).toMatchObject({ duration: 2, remaining: 2 });
  });

  it('at rank 8 revives one dead party member with 20% HP at the 350404 contact', () => {
    const sim = makeTaoist(35_049, 8);
    const first = addPartyMember(sim, 'First Dead Ally', 2, true);
    const second = addPartyMember(sim, 'Second Dead Ally', 3, true);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3504)).toEqual({ ok: true });
    resolveAt(sim, 1.049);
    expect([first.dead, second.dead]).toEqual([true, true]);
    resolveAt(sim, 1.05);

    expect(first.dead).toBe(false);
    expect(first.hp).toBe(Math.round(first.maxHp * 0.2));
    expect(second.dead).toBe(true);
  });

  it('at rank 10 revives up to five dead party members with 50% HP at 900 ms', () => {
    const sim = makeTaoist(35_041, 10);
    const dead = Array.from({ length: 6 }, (_, index) =>
      addPartyMember(sim, `Rank 10 Dead Ally ${index}`, index + 1, true),
    );

    expect(castMir4Skill(sim.ctx, sim.playerId, 3504)).toEqual({ ok: true });
    resolveAt(sim, 0.9);

    expect(dead.slice(0, 4).map((member) => [member.dead, member.hp])).toEqual(
      dead.slice(0, 4).map((member) => [false, Math.round(member.maxHp * 0.5)]),
    );
    expect(dead.slice(4).map((member) => [member.dead, member.hp])).toEqual([
      [true, 0],
      [true, 0],
    ]);
  });

  it('at rank 8 delays a lethal world hit for five seconds, then dies if not rescued', () => {
    const sim = makeTaoist(35_042, 8);

    sim.ctx.dealDamage(null, sim.player, sim.player.hp + 1, false, 'physical', null, 'hit');
    expect([sim.player.dead, sim.player.hp]).toEqual([false, 1]);
    expect(sim.player.mir4GreaterHealDeathDelayUntil).toBe(5);

    sim.time = 4.99;
    updateMir4GreaterHealDeathDelay(sim.ctx);
    expect(sim.player.dead).toBe(false);
    sim.time = 5;
    updateMir4GreaterHealDeathDelay(sim.ctx);
    expect(sim.player.dead).toBe(true);
  });

  it('Greater Heal rescues its caster during the delay, while the 120-second ICD remains', () => {
    const sim = makeTaoist(35_043, 8);

    sim.ctx.dealDamage(null, sim.player, sim.player.hp + 1, false, 'physical', null, 'hit');
    expect(castMir4Skill(sim.ctx, sim.playerId, 3504)).toEqual({ ok: true });
    resolveAt(sim, 0.74);

    expect(sim.player.mir4GreaterHealDeathDelayUntil).toBeUndefined();
    expect(sim.player.hp).toBeGreaterThan(1);
    expect(sim.player.procState?.icds.mir4_greater_heal_death_delay).toBe(120);
    sim.time = 5;
    updateMir4GreaterHealDeathDelay(sim.ctx);
    expect(sim.player.dead).toBe(false);

    sim.player.mir4Effects = undefined;
    sim.player.hp = 1;
    sim.ctx.dealDamage(null, sim.player, 2, false, 'physical', null, 'hit');
    expect(sim.player.dead).toBe(true);
  });
});
