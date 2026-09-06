import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { applyMir4NativeDarknessStack } from '../../src/sim/mir4/native_darkness';
import {
  applyMir4NativePiercingSpearContact,
  mir4NativePiercingSpearKnockdownChanceBasisPoints,
} from '../../src/sim/mir4/native_skill_piercing_spear';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 52_050,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Piercing Spear Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1_000;
  sim.player.spellPower = 1_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, forward: number, side: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `piercing_spear_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const sin = Math.sin(sim.player.facing);
  const cos = Math.cos(sim.player.facing);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(
      sim.player.pos.x + sin * forward + cos * side,
      sim.player.pos.z + cos * forward - sin * side,
    ),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 5205) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Lancer 5205 Piercing Spear integrated runtime', () => {
  it('queues approach outside native reach without spending resource or cooldown', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 20, 0, 'distant');
    const resourceBefore = sim.player.resource;

    expect(sim.mir4CastSkill(5205, target.id)).toEqual({ ok: true, queued: true });
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toMatchObject({
      phase: 'approach',
      abilityId: 'mir4_skill_5205',
      targetId: target.id,
    });
    expect(sim.player.resource).toBe(resourceBefore);
    expect(sim.player.cooldowns.has('5205')).toBe(false);
  });

  it('schedules two hybrid contacts and emits the exact preparation guide', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 10, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5205, target.id)).toEqual({ ok: true });
    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 5205 && !impact.effectOnly,
    );
    expect(impacts).toHaveLength(4);
    expect(
      impacts.map((impact) => [
        impact.attackId,
        impact.channel,
        Math.round((impact.dueAt - sim.time) * 1_000),
        impact.rawDamage,
      ]),
    ).toEqual([
      [520502, 'physical', 380, 800],
      [520502, 'magic', 380, 1_300],
      [520503, 'physical', 400, 800],
      [520503, 'magic', 400, 1_300],
    ]);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4SkillGuide',
        skillId: 5205,
        attackId: 520501,
        shape: 'direct',
        lengthYards: 8.5,
        widthYards: 4,
        aliveMs: 760,
        scalingMs: 560,
      }),
    );
  });

  it('gives only far-band enemies the second hybrid hit', () => {
    const sim = makeLancer();
    const close = spawnTarget(sim, 10, 0, 'close');
    const far = spawnTarget(sim, 16, 0, 'far');
    sim.player.targetId = close.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5205, close.id)).toEqual({ ok: true });
    forceContacts(sim);

    sim.time = 0.38;
    updateMir4PendingImpacts(sim.ctx);
    const closeAfterFirst = close.hp;
    const farAfterFirst = far.hp;
    expect(closeAfterFirst).toBeLessThan(close.maxHp);
    expect(farAfterFirst).toBeLessThan(far.maxHp);

    sim.time = 0.4;
    updateMir4PendingImpacts(sim.ctx);
    expect(close.hp).toBe(closeAfterFirst);
    expect(far.hp).toBeLessThan(farAfterFirst);
    const events = sim.drainEvents() as SimEvent[];
    const reactions = events.filter(
      (event): event is Extract<SimEvent, { type: 'mir4HitReaction' }> =>
        event.type === 'mir4HitReaction' && event.skillId === 5205,
    );
    expect(reactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attackId: 520502, targetId: close.id, stance: 'down-02' }),
        expect.objectContaining({ attackId: 520502, targetId: far.id, stance: 'down-02' }),
      ]),
    );
    expect(reactions.some((event) => event.attackId === 520503)).toBe(false);
  });

  it('uses the exact player chance ladder and applies resistance loss only on first-hit failure', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 10, 0, 'player-control');
    target.kind = 'player';
    target.ownerId = null;

    expect(mir4NativePiercingSpearKnockdownChanceBasisPoints(sim.player, target, 1)).toBe(1_000);
    expect(mir4NativePiercingSpearKnockdownChanceBasisPoints(sim.player, target, 5)).toBe(3_000);
    expect(mir4NativePiercingSpearKnockdownChanceBasisPoints(sim.player, target, 8)).toBe(6_000);
    expect(mir4NativePiercingSpearKnockdownChanceBasisPoints(sim.player, target, 10)).toBe(10_000);

    const failed = applyMir4NativePiercingSpearContact(
      sim.ctx,
      sim.player,
      target,
      520502,
      0,
      8,
      () => 9_999,
    );
    expect(failed).toEqual({
      applied: true,
      knockedDown: false,
      failureResistanceDebuffApplied: true,
      blinded: false,
    });
    expect(mir4NativeStatusBonus(target, 120)).toBe(-1_500);

    const landed = applyMir4NativePiercingSpearContact(
      sim.ctx,
      sim.player,
      target,
      520503,
      0,
      10,
      () => 9_999,
    );
    expect(landed).toEqual({
      applied: true,
      knockedDown: true,
      failureResistanceDebuffApplied: false,
      blinded: false,
    });
  });

  it('uses Darkness stacks for the first-hit Blind branch only', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 10, 0, 'darkness');
    for (let stack = 0; stack < 3; stack += 1) {
      applyMir4NativeDarknessStack(sim.ctx, sim.player, target, 10_000, 'Darkness');
    }

    const result = applyMir4NativePiercingSpearContact(
      sim.ctx,
      sim.player,
      target,
      520502,
      0,
      5,
      () => 4_999,
    );
    expect(result).toEqual({
      applied: true,
      knockedDown: true,
      failureResistanceDebuffApplied: false,
      blinded: true,
    });
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_50514_blind',
        kind: 'blind',
        duration: 2,
      }),
    );

    if (!target.mir4Effects) throw new Error('missing applied MIR4 effects');
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== 'mir4_native_buff_50514_blind',
    );
    expect(
      applyMir4NativePiercingSpearContact(sim.ctx, sim.player, target, 520503, 0, 10, () => 0)
        .blinded,
    ).toBe(false);
  });
});
