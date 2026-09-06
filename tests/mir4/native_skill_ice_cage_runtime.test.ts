import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4EvadeDisabled, mir4MovementMultiplierFromShared, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { applyMir4NativeDarknessStack } from '../../src/sim/mir4/native_darkness';
import {
  applyMir4NativeIceCageDirectContact,
  mir4NativeIceCageDarknessDamageBasisPoints,
  mir4NativeIceCagePolicy,
} from '../../src/sim/mir4/native_skill_ice_cage';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { SimEvent } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_050): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Ice Cage Runtime QA',
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

function spawnTarget(sim: Sim, suffix: string, distance: number) {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `ice_cage_${suffix}`,
    hpBase: 10_000_000,
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
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z + distance),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4105 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  return Array.from({ length: count }, () => sim.tick()).flat();
}

describe('MIR4 Ice Cage integrated runtime', () => {
  it('pins the exact rank 1, 5, 8, and 10 policy milestones', () => {
    expect(mir4NativeIceCagePolicy(1)).toMatchObject({
      chill: { durationMs: 5_000, maxStacks: 3, nativeMagnitudePerStack: -25 },
      monsterMoveSpeed: { nativeMagnitude: -50, durationMs: 10_000 },
      monsterFreeze: null,
      frostbite: null,
      severeCold: null,
      evadeDisabled: null,
      darknessDamageBasisPointsByStacks: null,
    });
    expect(mir4NativeIceCagePolicy(5)).toMatchObject({
      chill: { durationMs: 8_000 },
      monsterMoveSpeed: { nativeMagnitude: -50 },
      monsterFreeze: { chanceBasisPoints: 5_000, durationMs: 3_000 },
      frostbite: { chancesByChillStacks: [1_000, 2_000, 3_000], durationMs: 5_000 },
    });
    expect(mir4NativeIceCagePolicy(8)).toMatchObject({
      chill: { durationMs: 10_000 },
      monsterMoveSpeed: { nativeMagnitude: -100 },
      monsterFreeze: { chanceBasisPoints: 10_000, durationMs: 3_000 },
      frostbite: { chancesByChillStacks: [4_000, 5_000, 6_000], durationMs: 5_000 },
      severeCold: { chancesByChillStacks: [2_000, 2_500, 3_000], durationMs: 3_000 },
      evadeDisabled: { chanceBasisPoints: 2_000, durationMs: 10_000 },
      darknessDamageBasisPointsByStacks: [10_000, 13_500, 14_000],
    });
    expect(mir4NativeIceCagePolicy(10)).toMatchObject({
      monsterMoveSpeed: { nativeMagnitude: -150 },
      monsterFreeze: { chanceBasisPoints: 10_000, durationMs: 5_000 },
      frostbite: { chancesByChillStacks: [6_000, 7_000, 8_000], durationMs: 8_000 },
      severeCold: { chancesByChillStacks: [5_000, 5_500, 6_000], durationMs: 5_000 },
      evadeDisabled: { chanceBasisPoints: 5_000, durationMs: 10_000 },
      darknessDamageBasisPointsByStacks: [10_000, 16_000, 17_000],
    });
  });

  it('admits the direct row and seven-contact Totem without a legacy fallback', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(4105);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 4105,
      attackAnimationMs: 1000,
      endCutAnimationMs: 900,
      requiresTarget: true,
      range: { nativeContactDistanceMax: 1200, blockingCheck: true },
      totem: { totemId: 1404 },
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([410501, 410502]);
    expect(authority?.plan?.rows[1]?.contacts).toEqual([
      expect.objectContaining({
        offsetMs: 900,
        damage: expect.objectContaining({ coefficient: 4000, levelUpCoefficient: 100 }),
      }),
    ]);
    expect(authority?.plan?.totem?.contacts).toHaveLength(7);
  });

  it('approaches to the native trace stop and schedules Focus, one direct hit, and seven cage contacts', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'approach', 18);
    sim.player.targetId = target.id;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_4105', sim.playerId, target.id)).toEqual({
      ok: true,
      queued: true,
    });
    let ticks = 0;
    while (!sim.player.cooldowns.has('4105') && ticks++ < 240) sim.tick();

    expect(ticks).toBeLessThan(240);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4105)
        .map((impact) => [
          impact.effectOnly ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
        ])
        .sort((left, right) => Number(left[1]) - Number(right[1])),
    ).toEqual([
      ['arbalist-focus', 560],
      [410511, 660],
      [410511, 860],
      [410502, 900],
      [410512, 960],
      [410512, 1160],
      [410513, 1260],
      [410513, 1460],
      [410514, 1560],
    ]);
  });

  it('resolves exactly eight damage contacts while the setup grants one Focus stack', () => {
    const sim = makeArbalist(41_051);
    const target = spawnTarget(sim, 'contacts', 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4105, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events = tickMany(sim, 40);

    expect(
      events.filter(
        (event) =>
          event.type === 'damage' && event.targetId === target.id,
      ),
    ).toHaveLength(8);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1 });
    expect(mir4NativeStatusBonus(target, 45)).toBe(-25);
    expect(mir4NativeStatusBonus(target, 76)).toBe(-50);
  });

  it('applies rank-10 Chill, monster movement loss, Frostbite, Freeze, and Evade Disabled only on 410502', () => {
    const sim = makeArbalist(41_052);
    const target = spawnTarget(sim, 'rank10', 4);
    target.moveSpeed = 7;
    (sim.ctx.rng as { next: () => number }).next = () => 0;

    expect(applyMir4NativeIceCageDirectContact(sim.ctx, sim.player, target, 410511, 10)).toMatchObject({
      applied: false,
    });
    expect(applyMir4NativeIceCageDirectContact(sim.ctx, sim.player, target, 410502, 10)).toMatchObject({
      applied: true,
      chillStacks: 1,
      monsterMoveSpeedReduced: true,
      frostbitten: true,
      frozen: true,
      evadeDisabled: true,
    });
    expect(mir4NativeStatusBonus(target, 45)).toBe(-25);
    expect(mir4NativeStatusBonus(target, 76)).toBe(-250);
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'freeze')).toBe(true);
    target.mir4Effects!.active = target.mir4Effects!.active.filter((effect) => effect.kind !== 'freeze');
    expect(mir4MovementMultiplierFromShared(target, 1)).toBeCloseTo(1 - 2.5 / target.moveSpeed, 6);
    expect(mir4EvadeDisabled(target)).toBe(true);
  });

  it('uses the shared Darkness stacks for the exact rank-8 and rank-10 damage multipliers', () => {
    const sim = makeArbalist(41_053);
    const target = spawnTarget(sim, 'darkness', 4);
    expect(mir4NativeIceCageDarknessDamageBasisPoints(4105, target, 8)).toBe(10_000);
    applyMir4NativeDarknessStack(sim.ctx, sim.player, target, 10_000, 'Darkness');
    expect(mir4NativeIceCageDarknessDamageBasisPoints(4105, target, 8)).toBe(10_000);
    applyMir4NativeDarknessStack(sim.ctx, sim.player, target, 10_000, 'Darkness');
    expect(mir4NativeIceCageDarknessDamageBasisPoints(4105, target, 8)).toBe(13_500);
    expect(mir4NativeIceCageDarknessDamageBasisPoints(4105, target, 10)).toBe(16_000);
    applyMir4NativeDarknessStack(sim.ctx, sim.player, target, 10_000, 'Darkness');
    expect(mir4NativeIceCageDarknessDamageBasisPoints(4105, target, 8)).toBe(14_000);
    expect(mir4NativeIceCageDarknessDamageBasisPoints(4105, target, 10)).toBe(17_000);
    expect(mir4NativeIceCageDarknessDamageBasisPoints(4107, target, 10)).toBe(10_000);
  });
});
