import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeImpactType2Targets } from '../../src/sim/mir4/native_impact_type2_targets';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Flame Strike Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.spellPower = 10_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, x: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `flame_strike_target_${suffix}`,
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
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function moveTarget(sim: Sim, target: Entity, x: number): void {
  target.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z);
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  sim.rebucket(target);
}

function forceFlameStrikeHits(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 2201) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Sorcerer 2201 Flame Strike runtime', () => {
  it('seals its targetless three-contact actor-area plan', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2201);
    expect(plan).toMatchObject({
      skillId: 2201,
      cooldownMs: 20_000,
      skillCostType: 2,
      skillCost: 1_400,
      attackAnimationMs: 1_767,
      endCutAnimationMs: 1_400,
    });
    expect(
      plan?.rows.flatMap((row) =>
        row.contacts.map((contact) => [
          row.attackId,
          contact.offsetMs,
          contact.damage.coefficient,
          contact.damage.componentImpactCount,
          row.geometry.nativeDistanceMax,
          row.geometry.nativeHeight,
        ]),
      ),
    ).toEqual([
      [220102, 446, 8_000, 1, 750, 400],
      [220103, 746, 15_000, 2, 750, 400],
      [220103, 1_076, 15_000, 2, 750, 400],
    ]);
    const setup = makeSorcerer(22_010);
    expect(mir4NativeImpactType2Targets(setup.ctx, setup.player, 2201, 220101)).toBeNull();
  });

  it('commits without a selected enemy and schedules exactly 80% + 75% + 75% Spell ATK', () => {
    const sim = makeSorcerer(22_011);

    expect(castMir4Skill(sim.ctx, sim.playerId, 2201)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? []).map((impact) => [
        impact.targetId,
        impact.attackId,
        Math.round((impact.dueAt - sim.time) * 1_000),
        impact.rawDamage,
      ]),
    ).toEqual([
      [sim.playerId, 220102, 446, 8_000],
      [sim.playerId, 220103, 746, 7_500],
      [sim.playerId, 220103, 1_076, 7_500],
    ]);
    expect(sim.player.cooldowns.has('2201')).toBe(true);
    expect(
      sim.drainEvents().find(
        (event): event is Extract<SimEvent, { type: 'mir4SkillPresentation' }> =>
          event.type === 'mir4SkillPresentation' && event.skillId === 2201,
      ),
    ).toMatchObject({ profile: 'sorcerer-flame-strike', targetId: sim.playerId });
  });

  it('rebuilds up to eight nearby targets at each impact without moving them', () => {
    const sim = makeSorcerer(22_012);
    const targets = Array.from({ length: 9 }, (_, index) =>
      spawnTarget(sim, 2 + index * 0.2, String(index)),
    );
    const outside = spawnTarget(sim, 8.1, 'outside');
    const positionsBefore = targets.map((target) => ({ ...target.pos }));

    expect(mir4NativeImpactType2Targets(sim.ctx, sim.player, 2201, 220102)).toEqual(
      targets.slice(0, 8),
    );
    expect(castMir4Skill(sim.ctx, sim.playerId, 2201)).toEqual({ ok: true });
    forceFlameStrikeHits(sim);

    sim.time = 0.446;
    updateMir4PendingImpacts(sim.ctx);
    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(
      targets.slice(0, 8).every((target) =>
        target.mir4Effects?.active.some(
          (effect) => effect.effectId === 'mir4_native_buff_30010',
        ),
      ),
    ).toBe(true);
    expect(targets[8].hp).toBe(targets[8].maxHp);
    expect(outside.hp).toBe(outside.maxHp);

    const firstHp = targets[0].hp;
    const ninthHp = targets[8].hp;
    moveTarget(sim, targets[0], 12);
    sim.time = 0.746;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets[0].hp).toBe(firstHp);
    expect(targets[8].hp).toBeLessThan(ninthHp);
    expect(targets.slice(1, 9).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(outside.hp).toBe(outside.maxHp);
    for (let index = 1; index < targets.length; index += 1) {
      expect(targets[index].pos).toEqual(positionsBefore[index]);
    }
    expect(
      targets.slice(1, 9).every((target) =>
        target.mir4Effects?.active.some((effect) => effect.kind === 'hit-react'),
      ),
    ).toBe(true);
  });
});
