import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Moonlight Orb Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 player metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3301: skillLevel };
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, x: number, z: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `moonlight_orb_target_${suffix}`,
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

function forceMoonlightOrbContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 3301) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Moonlight Orb integrated runtime', () => {
  it('schedules one direct strike and eight Totem-owned contacts at the selected position', () => {
    const sim = makeTaoist(33_011);
    const target = spawnTarget(sim, 3, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3301, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 3301 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
          impact.nativeTotem?.totemId ?? null,
          impact.nativeTotem ? [impact.nativeTotem.origin.x, impact.nativeTotem.origin.z] : null,
        ]),
    ).toEqual([
      [330102, 900, null, null],
      [330111, 867, 1004, [target.pos.x, target.pos.z]],
      [330111, 1467, 1004, [target.pos.x, target.pos.z]],
      [330112, 1817, 1004, [target.pos.x, target.pos.z]],
      [330112, 2117, 1004, [target.pos.x, target.pos.z]],
      [330113, 2467, 1004, [target.pos.x, target.pos.z]],
      [330113, 2767, 1004, [target.pos.x, target.pos.z]],
      [330114, 3117, 1004, [target.pos.x, target.pos.z]],
      [330114, 3417, 1004, [target.pos.x, target.pos.z]],
    ]);
  });

  it('pulls inward on knock-back contacts and caps each field contact at six enemies', () => {
    const sim = makeTaoist(33_012);
    const targets = Array.from({ length: 8 }, (_, index) =>
      spawnTarget(sim, 3 + index * 0.35, (index - 4) * 0.1, String(index)),
    );
    sim.player.targetId = targets[0].id;
    const pulled = targets[1];
    const anchorX = targets[0].pos.x;
    const beforeDistance = Math.abs(pulled.pos.x - anchorX);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3301, targets[0].id)).toEqual({ ok: true });
    forceMoonlightOrbContacts(sim);
    sim.time = 0.867;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets.filter((target) => target.hp < target.maxHp)).toHaveLength(6);
    expect(Math.abs(pulled.pos.x - anchorX)).toBeLessThan(beforeDistance);
    expect(
      targets.some((target) => target.mir4Effects?.active.some((effect) => effect.kind === 'root')),
    ).toBe(false);
  });

  it('resolves all nine contacts while consuming mana only once', () => {
    const sim = makeTaoist(33_013);
    const target = spawnTarget(sim, 3, 0, 'nine_contacts');
    sim.player.targetId = target.id;
    const resourceBefore = sim.player.resource;
    expect(castMir4Skill(sim.ctx, sim.playerId, 3301, target.id)).toEqual({ ok: true });
    const resourceAfterCast = sim.player.resource;
    expect(resourceAfterCast).toBeLessThan(resourceBefore);
    forceMoonlightOrbContacts(sim);

    for (const time of [0.867, 0.9, 1.467, 1.817, 2.117, 2.467, 2.767, 3.117, 3.417]) {
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
    }

    expect(target.hp).toBeLessThan(target.maxHp);
    expect(sim.player.resource).toBe(resourceAfterCast);
    expect(sim.player.cooldowns.has('3301')).toBe(true);
    expect(sim.player.mir4PendingImpacts?.filter((impact) => impact.skillId === 3301)).toEqual([]);
  });

  it('applies the direct contact rank effects through the integrated combat path', () => {
    const sim = makeTaoist(33_014, 10);
    const target = spawnTarget(sim, 3, 0, 'rank_effects');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3301, target.id)).toEqual({ ok: true });
    forceMoonlightOrbContacts(sim);
    sim.time = 0.9;
    updateMir4PendingImpacts(sim.ctx);

    expect(target.mir4Effects?.active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ effectId: 'mir4_native_buff_30010', duration: 15 }),
        expect.objectContaining({ effectId: 'mir4_native_buff_10020', duration: 10 }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30502_45',
          nativeStatusId: 45,
          magnitude: -20,
        }),
        expect.objectContaining({
          effectId: 'mir4_native_buff_30503_31',
          nativeStatusId: 31,
          magnitude: -300,
        }),
      ]),
    );
  });
});
