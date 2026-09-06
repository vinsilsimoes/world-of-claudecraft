import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(): Sim {
  const sim = new Sim({
    seed: 31_010,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Sunbeam Sword Runtime QA',
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

function spawnTarget(sim: Sim): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'sunbeam_sword_target',
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
    sim.groundPos(
      sim.player.pos.x + Math.sin(sim.player.facing) * 3,
      sim.player.pos.z + Math.cos(sim.player.facing) * 3,
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
    if (impact.skillId !== 3101) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Sunbeam Sword integrated runtime', () => {
  it('schedules the exact four-row, seven-contact native sequence', () => {
    const sim = makeTaoist();
    const target = spawnTarget(sim);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3101, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 3101 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          impact.sourceImpactIndex,
          Math.round((impact.dueAt - sim.time) * 1000),
        ]),
    ).toEqual([
      [310101, 0, 380],
      [310102, 0, 550],
      [310102, 1, 750],
      [310103, 0, 950],
      [310103, 1, 1150],
      [310104, 0, 1350],
      [310104, 1, 1550],
    ]);
  });

  it('lands seven contacts and applies Quell before the Bash follow-up', () => {
    const sim = makeTaoist();
    const target = spawnTarget(sim);
    target.ccImmune = true;
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3101, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events: SimEvent[] = [];

    for (const time of [0.38, 0.55, 0.75, 0.95, 1.15, 1.35, 1.55]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
      events.push(...sim.drainEvents());
    }

    expect(
      events.filter(
        (event) =>
          event.type === 'damage' &&
          event.targetId === target.id &&
          event.ability === 'Espada de Raio Solar',
      ),
    ).toHaveLength(7);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_30010',
        kind: 'spell-attack-reduction',
      }),
    );
    expect(sim.player.mir4PendingImpacts?.filter((impact) => impact.skillId === 3101)).toEqual([]);
  });
});
