import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Dark Vortex Runtime QA',
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
    id: `dark_vortex_target_${suffix}`,
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

describe('MIR4 Dark Vortex integrated runtime', () => {
  it('schedules the direct contact and five durable-area contacts from the owner snapshot', () => {
    const sim = makeSorcerer(25_011);
    const target = spawnTarget(sim, 3);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 2501, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 2501 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
          impact.nativeTotem?.totemId ?? null,
          impact.nativeTotem
            ? [impact.nativeTotem.origin.x, impact.nativeTotem.origin.z]
            : null,
        ]),
    ).toEqual([
      [250102, 720, null, null],
      [250111, 1100, 1009, [target.pos.x, target.pos.z]],
      [250112, 1300, 1009, [target.pos.x, target.pos.z]],
      [250113, 1500, 1009, [target.pos.x, target.pos.z]],
      [250114, 1700, 1009, [target.pos.x, target.pos.z]],
      [250115, 1800, 1009, [target.pos.x, target.pos.z]],
    ]);
  });

  it('rebuilds the host-order target list at every contact around the fixed cast origin', () => {
    const sim = makeSorcerer(25_012);
    const anchor = spawnTarget(sim, 3, 0, 'anchor');
    const leaves = spawnTarget(sim, 4, 0, 'leaves');
    const enters = spawnTarget(sim, 9, 0, 'enters');
    sim.player.targetId = anchor.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2501, anchor.id)).toEqual({ ok: true });

    sim.time = 1.1;
    updateMir4PendingImpacts(sim.ctx);
    const leavesAfterFirst = leaves.hp;
    const entersBeforeJoining = enters.hp;
    expect(leavesAfterFirst).toBeLessThan(leaves.maxHp);
    expect(entersBeforeJoining).toBe(enters.maxHp);

    moveRelativeToPlayer(sim, leaves, 10);
    moveRelativeToPlayer(sim, enters, 4);
    sim.time = 1.3;
    updateMir4PendingImpacts(sim.ctx);

    expect(leaves.hp).toBe(leavesAfterFirst);
    expect(enters.hp).toBeLessThan(entersBeforeJoining);
  });

  it('keeps the vortex fixed when its original target moves', () => {
    const sim = makeSorcerer(25_013);
    const anchor = spawnTarget(sim, 3, 0, 'moving-anchor');
    const originalArea = spawnTarget(sim, 3.5, 0, 'original-area');
    sim.player.targetId = anchor.id;
    const castOrigin = { ...anchor.pos };
    expect(castMir4Skill(sim.ctx, sim.playerId, 2501, anchor.id)).toEqual({ ok: true });

    sim.time = 0.72;
    updateMir4PendingImpacts(sim.ctx);
    const anchorAfterDirectContact = anchor.hp;
    moveRelativeToPlayer(sim, anchor, 12);
    sim.time = 1.1;
    updateMir4PendingImpacts(sim.ctx);

    expect(originalArea.hp).toBeLessThan(originalArea.maxHp);
    expect(anchor.hp).toBe(anchorAfterDirectContact);
    expect(
      (sim.player.mir4PendingImpacts ?? []).find((impact) => impact.nativeTotem)?.nativeTotem
        ?.origin,
    ).toEqual({ x: castOrigin.x, y: castOrigin.y, z: castOrigin.z });
  });

  it('suppresses remaining attacks after the owner dies without moving the fixed origin', () => {
    const sim = makeSorcerer(25_014);
    const target = spawnTarget(sim, 3);
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2501, target.id)).toEqual({ ok: true });

    sim.time = 1.1;
    updateMir4PendingImpacts(sim.ctx);
    const hpAfterFirstTotemContact = target.hp;
    sim.player.dead = true;
    sim.time = 2;
    updateMir4PendingImpacts(sim.ctx);

    expect(target.hp).toBe(hpAfterFirstTotemContact);
  });

  it('applies signed radial pulses and the final native knockdown only after damage lands', () => {
    const sim = makeSorcerer(25_015);
    const target = spawnTarget(sim, 3);
    sim.player.targetId = target.id;
    const origin = { ...target.pos };
    expect(castMir4Skill(sim.ctx, sim.playerId, 2501, target.id)).toEqual({ ok: true });

    sim.time = 1.1;
    updateMir4PendingImpacts(sim.ctx);
    const afterPush = dist2d(origin, target.pos);
    expect(afterPush).toBeCloseTo(0.2, 6);

    sim.time = 1.3;
    updateMir4PendingImpacts(sim.ctx);
    expect(dist2d(origin, target.pos)).toBeCloseTo(0, 6);

    sim.time = 1.5;
    updateMir4PendingImpacts(sim.ctx);
    sim.time = 1.7;
    updateMir4PendingImpacts(sim.ctx);
    sim.time = 1.8;
    updateMir4PendingImpacts(sim.ctx);

    expect(
      target.mir4Effects?.active.some(
        (effect) => effect.effectId === 'mir4_250115_totem_knockdown' && effect.kind === 'knockdown',
      ),
    ).toBe(true);
    expect(dist2d(origin, target.pos)).toBeGreaterThan(2.9);
  });
});
