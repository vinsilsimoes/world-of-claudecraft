import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Guardian Circle Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.spellPower = 1_000;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 combat state');
  sim.player.mir4.accuracy = 1_000_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Taoist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3501: skillLevel };
  sim.drainEvents();
  return sim;
}

function addPartyMember(sim: Sim, name: string, x: number, hp = 10_000): Entity {
  const memberId = sim.addPlayer('warrior', name);
  const member = sim.entities.get(memberId);
  if (!member) throw new Error(`missing party member ${memberId}`);
  member.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z);
  member.pos.y = sim.player.pos.y;
  member.prevPos = { ...member.pos };
  member.maxHp = 10_000;
  member.hp = hp;
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

function spawnTarget(sim: Sim, suffix: string, x: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `guardian_circle_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 1_000_000,
  };
  const target = createMob(
    sim.nextId++,
    template as never,
    1,
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function resolveAt(sim: Sim, seconds: number): void {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Taoist 3501 Guardian Circle integrated runtime', () => {
  it('casts without a target, damages at 400 ms, and caps the six-yard circle at five enemies', () => {
    const sim = makeTaoist(35_101);
    const targets = Array.from({ length: 6 }, (_, index) =>
      spawnTarget(sim, `target_${index}`, index + 1),
    );
    const outside = spawnTarget(sim, 'outside', 6.1);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3501)).toEqual({ ok: true });
    expect(sim.player.targetId).toBeNull();
    expect(
      (sim.player.mir4PendingImpacts ?? []).find(
        (impact) => impact.skillId === 3501 && impact.attackId === 350102,
      ),
    ).toMatchObject({ rawDamage: 600, dueAt: 0.4, targetId: sim.playerId });

    resolveAt(sim, 0.399);
    expect(targets.every((target) => target.hp === target.maxHp)).toBe(true);
    resolveAt(sim, 0.4);
    expect(targets.slice(0, 5).every((target) => target.hp < target.maxHp)).toBe(true);
    const sixth = targets[5];
    if (!sixth) throw new Error('missing sixth Guardian Circle target fixture');
    expect(sixth.hp).toBe(sixth.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('applies the rank-1 base buffs to the party only at 550 ms', () => {
    const sim = makeTaoist(35_102);
    const ally = addPartyMember(sim, 'Guardian Ally', 2);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3501)).toEqual({ ok: true });
    resolveAt(sim, 0.549);
    expect(mir4NativeStatusBonus(sim.player, 24)).toBe(0);
    expect(mir4NativeStatusBonus(ally, 35)).toBe(0);
    resolveAt(sim, 0.55);

    for (const target of [sim.player, ally]) {
      expect(mir4NativeStatusBonus(target, 24)).toBe(25);
      expect(mir4NativeStatusBonus(target, 35)).toBe(1_000);
      expect(
        target.mir4Effects?.active.find(
          (effect) => effect.effectId === 'mir4_native_buff_35011_24',
        ),
      ).toMatchObject({ duration: 60, remaining: 60 });
    }
  });

  it('at rank 8 casts while Stunned, cleanses the party at 20 ms, and applies all buffs', () => {
    const sim = makeTaoist(35_108, 8);
    const ally = addPartyMember(sim, 'Guardian Rank 8 Ally', 2);
    for (const target of [sim.player, ally]) {
      applyMir4Effect(sim.ctx, target, {
        effectId: `test_guardian_stun_${target.id}`,
        kind: 'stun',
        durationSeconds: 10,
        magnitude: 0,
        name: 'Stun',
        sourceId: 999,
      });
    }

    expect(castMir4Skill(sim.ctx, sim.playerId, 3501)).toEqual({ ok: true });
    resolveAt(sim, 0.019);
    expect([sim.ctx.isStunned(sim.player), sim.ctx.isStunned(ally)]).toEqual([true, true]);
    resolveAt(sim, 0.02);
    expect([sim.ctx.isStunned(sim.player), sim.ctx.isStunned(ally)]).toEqual([false, false]);
    resolveAt(sim, 0.55);

    for (const target of [sim.player, ally]) {
      expect(mir4NativeStatusBonus(target, 24)).toBe(160);
      expect(mir4NativeStatusBonus(target, 35)).toBe(4_400);
      expect(mir4NativeStatusBonus(target, 42)).toBe(1_500);
      expect(mir4NativeStatusBonus(target, 33)).toBe(1_500);
      expect(mir4NativeStatusBonus(target, 49)).toBe(2_000);
      expect(mir4NativeStatusBonus(target, 147)).toBe(1_000);
    }
  });

  it('at rank 10 gives only the lowest-health party member the 30% all-damage reduction', () => {
    const sim = makeTaoist(35_110, 10);
    sim.player.maxHp = 10_000;
    sim.player.hp = 9_000;
    const healthy = addPartyMember(sim, 'Guardian Healthy', 2, 8_000);
    const lowest = addPartyMember(sim, 'Guardian Lowest', 3, 2_000);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3501)).toEqual({ ok: true });
    resolveAt(sim, 0.55);

    expect(mir4NativeStatusBonus(sim.player, 49)).toBe(5_000);
    expect(mir4NativeStatusBonus(healthy, 49)).toBe(2_000);
    expect(
      lowest.mir4Effects?.active.find(
        (effect) => effect.effectId === 'mir4_native_buff_30302_all_damage_reduction',
      ),
    ).toMatchObject({ kind: 'all-damage-reduction', magnitude: 3_000, duration: 15 });
    expect(
      healthy.mir4Effects?.active.some((effect) => effect.kind === 'all-damage-reduction'),
    ).toBe(false);
  });

  it('does not allow rank 7 to cast while Stunned or rank 8 to bypass Knockdown', () => {
    const rank7 = makeTaoist(35_107, 7);
    applyMir4Effect(rank7.ctx, rank7.player, {
      effectId: 'test_guardian_rank7_stun',
      kind: 'stun',
      durationSeconds: 10,
      magnitude: 0,
      name: 'Stun',
      sourceId: 999,
    });
    expect(castMir4Skill(rank7.ctx, rank7.playerId, 3501)).toEqual({
      ok: false,
      reason: 'controlled',
    });

    const rank8 = makeTaoist(35_118, 8);
    applyMir4Effect(rank8.ctx, rank8.player, {
      effectId: 'test_guardian_rank8_knockdown',
      kind: 'knockdown',
      durationSeconds: 10,
      magnitude: 0,
      name: 'Knockdown',
      sourceId: 999,
    });
    expect(castMir4Skill(rank8.ctx, rank8.playerId, 3501)).toEqual({
      ok: false,
      reason: 'controlled',
    });
  });
});
