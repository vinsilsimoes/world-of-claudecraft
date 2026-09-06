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
    playerName: 'Moonlight Wave Runtime QA',
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

function spawnTarget(sim: Sim, x: number, z: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `moonlight_wave_target_${suffix}`,
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

function forceMoonlightWaveContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 3506) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Moonlight Wave integrated runtime', () => {
  it('schedules one direct strike and four Totem-owned contacts at the selected position', () => {
    const sim = makeTaoist(35_061);
    const target = spawnTarget(sim, 3, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3506, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 3506 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
          impact.nativeTotem?.totemId ?? null,
          impact.nativeTotem ? [impact.nativeTotem.origin.x, impact.nativeTotem.origin.z] : null,
        ]),
    ).toEqual([
      [350602, 732, null, null],
      [350611, 620, 1012, [target.pos.x, target.pos.z]],
      [350611, 700, 1012, [target.pos.x, target.pos.z]],
      [350612, 780, 1012, [target.pos.x, target.pos.z]],
      [350612, 800, 1012, [target.pos.x, target.pos.z]],
    ]);
  });

  it('hits no more than eight enemies per field contact and applies no invented slow', () => {
    const sim = makeTaoist(35_062);
    const targets = Array.from({ length: 10 }, (_, index) =>
      spawnTarget(sim, 3 + (index % 2) * 0.2, (index - 5) * 0.15, String(index)),
    );
    sim.player.targetId = targets[0].id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3506, targets[0].id)).toEqual({ ok: true });
    forceMoonlightWaveContacts(sim);

    sim.time = 0.62;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets.filter((target) => target.hp < target.maxHp)).toHaveLength(8);
    expect(
      targets.some((target) => target.mir4Effects?.active.some((effect) => effect.kind === 'slow')),
    ).toBe(false);
  });

  it('resolves all five contacts and consumes mana only once', () => {
    const sim = makeTaoist(35_063);
    const target = spawnTarget(sim, 3, 0, 'five_contacts');
    sim.player.targetId = target.id;
    const resourceBefore = sim.player.resource;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3506, target.id)).toEqual({ ok: true });
    const resourceAfterCast = sim.player.resource;
    expect(resourceAfterCast).toBeLessThan(resourceBefore);
    forceMoonlightWaveContacts(sim);

    for (const time of [0.62, 0.7, 0.732, 0.78, 0.8]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
    }

    expect(target.hp).toBeLessThan(target.maxHp);
    expect(sim.player.resource).toBe(resourceAfterCast);
    expect(sim.player.cooldowns.has('3506')).toBe(true);
    expect(sim.player.mir4PendingImpacts?.filter((impact) => impact.skillId === 3506)).toEqual([]);
  });
});
