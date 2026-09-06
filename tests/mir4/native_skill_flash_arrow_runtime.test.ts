import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_070): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Flash Arrow Runtime QA',
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

function spawnTarget(sim: Sim, suffix: string, x: number, z: number) {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `flash_arrow_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4PhysicalDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4107 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Flash Arrow integrated runtime', () => {
  it('approaches to the 11.5-yard trace stop and schedules Focus, direct hit and six pulses', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'approach', sim.player.pos.x, sim.player.pos.z + 18);
    sim.player.targetId = target.id;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_4107', sim.playerId, target.id)).toEqual(
      {
        ok: true,
        queued: true,
      },
    );
    let ticks = 0;
    while (!sim.player.cooldowns.has('4107') && ticks++ < 240) sim.tick();

    expect(ticks).toBeLessThan(240);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4107)
        .map((impact) => [
          impact.effectOnly ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
        ])
        .sort((left, right) => Number(left[1]) - Number(right[1])),
    ).toEqual([
      ['arbalist-focus', 450],
      [410711, 750],
      [410702, 790],
      [410712, 1150],
      [410713, 1550],
      [410714, 1950],
      [410715, 2350],
      [410716, 2750],
    ]);
  });

  it('resolves the direct damage once and keeps the final pulse debuff active', () => {
    const sim = makeArbalist(41_072);
    const target = spawnTarget(sim, 'effects', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;
    sim.players.get(sim.playerId)!.mir4SkillLevels = { 4107: 10 };

    expect(castMir4Skill(sim.ctx, sim.playerId, 4107, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const focusEvents = Array.from({ length: 10 }, () => sim.tick()).flat();
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1 });
    const events = [...focusEvents, ...Array.from({ length: 47 }, () => sim.tick()).flat()];
    expect(
      events.filter(
        (event) =>
          event.type === 'damage' &&
          event.targetId === target.id &&
          event.ability === 'Seta do Clarão',
      ),
    ).toHaveLength(1);
    expect(mir4NativeStatusBonus(target, 28)).toBe(-340);
    expect(mir4NativeStatusBonus(target, 30)).toBe(-400);
    expect(mir4NativeStatusBonus(target, 31)).toBe(-25);
    expect(mir4NativeStatusBonus(target, 53)).toBe(-250);
  });
});
