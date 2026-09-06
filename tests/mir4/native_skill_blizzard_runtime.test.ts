import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4NativeTotemReaction } from '../../src/sim/mir4/native_skill_totem_reaction';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Blizzard Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, x: number, z = 0, suffix = String(sim.nextId)): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `blizzard_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z + z),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function moveRelativeToPlayer(sim: Sim, target: Entity, x: number, z = 0): void {
  target.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z + z);
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.leashAnchor = { ...target.pos };
  sim.rebucket(target);
}

function forcePendingContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 2203) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Blizzard integrated runtime', () => {
  it('schedules the direct strike and six Totem contacts at the fixed selected-target origin', () => {
    const sim = makeSorcerer(22_031);
    const target = spawnTarget(sim, 3);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 2203, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 2203 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1_000),
          impact.nativeTotem?.totemId ?? null,
          impact.nativeTotem
            ? [impact.nativeTotem.origin.x, impact.nativeTotem.origin.z]
            : null,
        ]),
    ).toEqual([
      [220302, 1600, null, null],
      [220311, 555, 1008, [target.pos.x, target.pos.z]],
      [220311, 750, 1008, [target.pos.x, target.pos.z]],
      [220312, 950, 1008, [target.pos.x, target.pos.z]],
      [220313, 1150, 1008, [target.pos.x, target.pos.z]],
      [220313, 1550, 1008, [target.pos.x, target.pos.z]],
      [220314, 1750, 1008, [target.pos.x, target.pos.z]],
    ]);
  });

  it('rebuilds field targets at each contact while preserving the original anchor', () => {
    const sim = makeSorcerer(22_032);
    const anchor = spawnTarget(sim, 3, 0, 'anchor');
    const leaves = spawnTarget(sim, 4, 0, 'leaves');
    const enters = spawnTarget(sim, 11, 0, 'enters');
    sim.player.targetId = anchor.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2203, anchor.id)).toEqual({ ok: true });
    forcePendingContacts(sim);

    sim.time = 0.555;
    updateMir4PendingImpacts(sim.ctx);
    const leavesAfterFirst = leaves.hp;
    expect(leavesAfterFirst).toBeLessThan(leaves.maxHp);
    expect(enters.hp).toBe(enters.maxHp);

    moveRelativeToPlayer(sim, anchor, 15);
    moveRelativeToPlayer(sim, leaves, 12);
    moveRelativeToPlayer(sim, enters, 4);
    sim.time = 0.75;
    updateMir4PendingImpacts(sim.ctx);

    expect(leaves.hp).toBe(leavesAfterFirst);
    expect(enters.hp).toBeLessThan(enters.maxHp);
    expect(
      (sim.player.mir4PendingImpacts ?? []).find((impact) => impact.nativeTotem)?.nativeTotem
        ?.origin.x,
    ).toBeCloseTo(sim.player.pos.x + 3, 6);
  });

  it('uses the exact 10% generic reaction chance without inventing Freeze or Slow', () => {
    const miss = makeSorcerer(22_033);
    const missTarget = spawnTarget(miss, 3);
    const contact = mir4NativeRuntimeTotemPlan(2203)?.contacts[0];
    if (!contact) throw new Error('Missing Blizzard Totem contact');
    const missNext = vi.spyOn(miss.ctx.rng, 'next').mockReturnValue(0.1);
    expect(
      applyMir4NativeTotemReaction(
        miss.ctx,
        miss.player,
        missTarget,
        2203,
        'Blizzard',
        missTarget.pos,
        contact,
      ),
    ).toBe(false);
    expect(missTarget.mir4Effects?.active ?? []).toEqual([]);
    missNext.mockRestore();

    const hit = makeSorcerer(22_034);
    const hitTarget = spawnTarget(hit, 3);
    vi.spyOn(hit.ctx.rng, 'next').mockReturnValue(0.0999);
    expect(
      applyMir4NativeTotemReaction(
        hit.ctx,
        hit.player,
        hitTarget,
        2203,
        'Blizzard',
        hitTarget.pos,
        contact,
      ),
    ).toBe(true);
    expect(hitTarget.mir4Effects?.active.map((effect) => effect.kind)).toEqual(['hit-react']);
    expect(hit.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 2203,
        attackId: 220311,
        targetId: hitTarget.id,
        durationMs: 200,
        stance: 'hit-01',
      }),
    );
  });

  it('suppresses all remaining field contacts after the caster dies', () => {
    const sim = makeSorcerer(22_035);
    const target = spawnTarget(sim, 3);
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2203, target.id)).toEqual({ ok: true });
    forcePendingContacts(sim);

    sim.time = 0.555;
    updateMir4PendingImpacts(sim.ctx);
    const hpAfterFirstContact = target.hp;
    sim.player.dead = true;
    sim.time = 3;
    updateMir4PendingImpacts(sim.ctx);

    expect(target.hp).toBe(hpAfterFirstContact);
  });
});
