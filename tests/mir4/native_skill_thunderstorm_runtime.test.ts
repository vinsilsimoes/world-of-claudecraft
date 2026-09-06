import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4SkillDamageReductionBonusBps } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Thunderstorm Runtime QA',
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
    id: `thunderstorm_target_${suffix}`,
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
    if (impact.skillId !== 2301) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Thunderstorm integrated runtime', () => {
  it('schedules exactly four Totem-owned contacts at the fixed selected-target origin', () => {
    const sim = makeSorcerer(23_011);
    const target = spawnTarget(sim, 3);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 2301, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 2301 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1_000),
          impact.nativeTotem?.totemId ?? null,
          impact.nativeTotem
            ? [impact.nativeTotem.origin.x, impact.nativeTotem.origin.z]
            : null,
        ]),
    ).toEqual([
      [230113, 900, 1001, [target.pos.x, target.pos.z]],
      [230114, 950, 1001, [target.pos.x, target.pos.z]],
      [230115, 1000, 1001, [target.pos.x, target.pos.z]],
      [230116, 1050, 1001, [target.pos.x, target.pos.z]],
    ]);
  });

  it('rebuilds targets at every contact while the field stays at its cast position', () => {
    const sim = makeSorcerer(23_012);
    const anchor = spawnTarget(sim, 3, 0, 'anchor');
    const leaves = spawnTarget(sim, 4, 0, 'leaves');
    const enters = spawnTarget(sim, 11, 0, 'enters');
    sim.player.targetId = anchor.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2301, anchor.id)).toEqual({ ok: true });
    forcePendingContacts(sim);

    sim.time = 0.9;
    updateMir4PendingImpacts(sim.ctx);
    const leavesAfterFirst = leaves.hp;
    expect(leavesAfterFirst).toBeLessThan(leaves.maxHp);
    expect(enters.hp).toBe(enters.maxHp);

    moveRelativeToPlayer(sim, anchor, 15);
    moveRelativeToPlayer(sim, leaves, 12);
    moveRelativeToPlayer(sim, enters, 4);
    sim.time = 0.95;
    updateMir4PendingImpacts(sim.ctx);

    expect(anchor.hp).toBeLessThan(anchor.maxHp);
    expect(leaves.hp).toBe(leavesAfterFirst);
    expect(enters.hp).toBeLessThan(enters.maxHp);
    expect(
      (sim.player.mir4PendingImpacts ?? []).find((impact) => impact.nativeTotem)?.nativeTotem
        ?.origin.x,
    ).toBeCloseTo(sim.player.pos.x + 3, 6);
  });

  it('uses a tighter final radius and applies Chill plus the correct skill reaction identity', () => {
    const sim = makeSorcerer(23_013);
    const anchor = spawnTarget(sim, 3, 0, 'center');
    const outer = spawnTarget(sim, 7, 0, 'outer');
    sim.player.targetId = anchor.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2301, anchor.id)).toEqual({ ok: true });
    forcePendingContacts(sim);

    for (const time of [0.9, 0.95, 1]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
    }
    const centerBeforeFinal = anchor.hp;
    const outerBeforeFinal = outer.hp;
    sim.drainEvents();
    sim.time = 1.05;
    updateMir4PendingImpacts(sim.ctx);

    expect(anchor.hp).toBeLessThan(centerBeforeFinal);
    expect(outer.hp).toBe(outerBeforeFinal);
    expect(mir4SkillDamageReductionBonusBps(anchor)).toBe(-2_500);
    expect(mir4SkillDamageReductionBonusBps(outer)).toBe(-2_500);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        sourceId: sim.playerId,
        targetId: anchor.id,
        skillId: 2301,
        attackId: 230116,
        durationMs: 200,
        stance: 'hit-01',
      }),
    );
  });

  it('suppresses remaining field contacts after the caster dies', () => {
    const sim = makeSorcerer(23_014);
    const target = spawnTarget(sim, 3);
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2301, target.id)).toEqual({ ok: true });
    forcePendingContacts(sim);

    sim.time = 0.9;
    updateMir4PendingImpacts(sim.ctx);
    const hpAfterFirstContact = target.hp;
    sim.player.dead = true;
    sim.time = 2;
    updateMir4PendingImpacts(sim.ctx);

    expect(target.hp).toBe(hpAfterFirstContact);
  });
});
