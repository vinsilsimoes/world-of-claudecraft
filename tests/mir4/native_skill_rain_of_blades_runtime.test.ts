import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Rain of Blades Runtime QA',
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
    id: `rain_of_blades_target_${suffix}`,
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

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 3104) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Rain of Blades integrated runtime', () => {
  it('schedules three logical hybrid contacts through six channel impacts', () => {
    const sim = makeTaoist(31_041);
    const target = spawnTarget(sim, 3, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3104, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 3104 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          impact.channel,
          Math.round((impact.dueAt - sim.time) * 1000),
          impact.nativeTotem?.totemId ?? null,
          impact.nativeContactKey ? 'hybrid' : null,
        ]),
    ).toEqual([
      [310402, 'physical', 1000, null, 'hybrid'],
      [310402, 'magic', 1000, null, 'hybrid'],
      [310411, 'physical', 480, 1010, 'hybrid'],
      [310411, 'magic', 480, 1010, 'hybrid'],
      [310412, 'physical', 680, 1010, 'hybrid'],
      [310412, 'magic', 680, 1010, 'hybrid'],
    ]);
  });

  it('applies each hybrid contact reaction once and retargets the phantom area', () => {
    const sim = makeTaoist(31_042);
    const anchor = spawnTarget(sim, 3, 0, 'anchor');
    const nearby = spawnTarget(sim, 5, 0, 'nearby');
    sim.player.targetId = anchor.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3104, anchor.id)).toEqual({ ok: true });
    forceContacts(sim);

    sim.time = 0.48;
    updateMir4PendingImpacts(sim.ctx);
    const reactions = sim
      .drainEvents()
      .filter(
        (event) =>
          event.type === 'mir4HitReaction' && event.skillId === 3104 && event.attackId === 310411,
      );
    expect(reactions).toHaveLength(2);
    expect(new Set(reactions.map((event) => (event.type === 'mir4HitReaction' ? event.targetId : 0)))).toEqual(
      new Set([anchor.id, nearby.id]),
    );
    expect(anchor.hp).toBeLessThan(anchor.maxHp);
    expect(nearby.hp).toBeLessThan(nearby.maxHp);
  });

  it('applies the direct hybrid contact rank effects once across both damage channels', () => {
    const sim = makeTaoist(31_043);
    const target = spawnTarget(sim, 3, 0, 'rank-effects');
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Taoist player metadata');
    meta.mir4SkillLevels = { ...meta.mir4SkillLevels, 3104: 10 };
    target.mir4Effects = {
      active: [
        {
          effectId: 'mir4_native_buff_10020',
          kind: 'physical-attack-reduction',
          remaining: 2,
          duration: 5,
          magnitude: 0.25,
          sourceId: sim.playerId,
          nativeStacks: 1,
        },
      ],
      controlImmuneUntil: 0,
    };
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3104, target.id)).toEqual({ ok: true });
    for (const impact of sim.player.mir4PendingImpacts ?? []) {
      if (impact.skillId !== 3104) continue;
      impact.forceHit = true;
      impact.forceCritical = true;
    }
    sim.time = 1;
    updateMir4PendingImpacts(sim.ctx);

    const effects = target.mir4Effects?.active ?? [];
    expect(effects.find((effect) => effect.effectId === 'mir4_native_buff_10020')).toMatchObject({
      remaining: 10,
      duration: 10,
      nativeStacks: 2,
    });
    for (const effectId of [
      'mir4_native_buff_30514_20',
      'mir4_native_buff_30514_22',
      'mir4_native_buff_30513_35',
    ]) {
      expect(effects.filter((effect) => effect.effectId === effectId)).toHaveLength(1);
    }
    for (const effectId of ['mir4_native_buff_30521_29', 'mir4_native_buff_30522']) {
      expect(effects.filter((effect) => effect.effectId === effectId).length).toBeLessThanOrEqual(1);
    }
  });
});
