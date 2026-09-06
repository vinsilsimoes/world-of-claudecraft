import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import {
  applyMir4NativePeriodicDamage,
  mir4NativePeriodicDamagePlan,
  updateMir4NativePeriodicDamage,
} from '../../src/sim/mir4/native_periodic_damage';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeFixture(): { sim: Sim; target: Entity } {
  const sim = new Sim({
    seed: 14_011,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Dragon Breath Tester',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  sim.player.attackPower = 1_000;
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'dragon_breath_target',
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
    sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return { sim, target };
}

describe('MIR4 native periodic damage', () => {
  it('compiles Dragon Breath from BUFF 14011 into its two native type-2 entries', () => {
    expect(mir4NativePeriodicDamagePlan(14_011, 1, 1_000)).toEqual({
      buffId: 14_011,
      durationMs: 5_000,
      intervalMs: 1_000,
      entries: [
        { buffIndex: 2_002, channel: 'physical', rawDamage: 100 },
        { buffIndex: 2_001, channel: 'physical', rawDamage: 10 },
      ],
    });
    expect(mir4NativePeriodicDamagePlan(14_011, 15, 1_000)?.entries).toEqual([
      { buffIndex: 2_002, channel: 'physical', rawDamage: 100 },
      { buffIndex: 2_001, channel: 'physical', rawDamage: 360 },
    ]);
  });

  it('reuses the native periodic clock for Immolate Fire Flare using Spell ATK', () => {
    expect(mir4NativePeriodicDamagePlan(20_012, 1, 1_000)).toEqual({
      buffId: 20_012,
      durationMs: 5_000,
      intervalMs: 1_000,
      entries: [{ buffIndex: 2_004, channel: 'magic', rawDamage: 600 }],
    });
    expect(mir4NativePeriodicDamagePlan(20_012, 10, 1_000)?.entries).toEqual([
      { buffIndex: 2_004, channel: 'magic', rawDamage: 1_680 },
    ]);
  });

  it('compiles Nirvana Kick Bleed from BUFF 50519 at its passive milestone levels', () => {
    expect(mir4NativePeriodicDamagePlan(50_519, 3, 1_000)).toEqual({
      buffId: 50_519,
      durationMs: 2_000,
      intervalMs: 1_000,
      entries: [{ buffIndex: 2_002, channel: 'physical', rawDamage: 300 }],
    });
    expect(mir4NativePeriodicDamagePlan(50_519, 7, 1_000)?.entries).toEqual([
      { buffIndex: 2_002, channel: 'physical', rawDamage: 500 },
    ]);
    expect(mir4NativePeriodicDamagePlan(50_519, 13, 1_000)?.entries).toEqual([
      { buffIndex: 2_002, channel: 'physical', rawDamage: 800 },
    ]);
  });

  it('fails closed for a buff without a fully reviewed native type-2 contract', () => {
    expect(mir4NativePeriodicDamagePlan(99_999, 1, 1_000)).toBeNull();
  });

  it('ticks on the target-owned global one-second clock and keeps native entry order', () => {
    const { sim, target } = makeFixture();
    sim.time = 0.25;
    updateMir4NativePeriodicDamage(sim.ctx);
    sim.time = 0.6;
    expect(
      applyMir4NativePeriodicDamage(sim.ctx, sim.player, target, {
        buffId: 14_011,
        skillId: 1_403,
        attackId: 140_304,
        skillLevel: 1,
        sourcePhysicalAttack: 1_000,
      }),
    ).toBe(true);

    sim.time = 1.25;
    updateMir4NativePeriodicDamage(sim.ctx);
    expect(sim.player.mir4PendingImpacts).toBeUndefined();

    sim.time = 1.251;
    updateMir4NativePeriodicDamage(sim.ctx);
    expect(
      sim.player.mir4PendingImpacts?.map((impact) => ({
        rawDamage: impact.rawDamage,
        channel: impact.channel,
        periodic: impact.periodic,
        forceHit: impact.forceHit,
        forceCritical: impact.forceCritical,
      })),
    ).toEqual([
      {
        rawDamage: 100,
        channel: 'physical',
        periodic: true,
        forceHit: true,
        forceCritical: false,
      },
      {
        rawDamage: 10,
        channel: 'physical',
        periodic: true,
        forceHit: true,
        forceCritical: false,
      },
    ]);
  });

  it('removes an expired buff before the coincident periodic pulse', () => {
    const { sim, target } = makeFixture();
    sim.time = 0;
    updateMir4NativePeriodicDamage(sim.ctx);
    expect(
      applyMir4NativePeriodicDamage(sim.ctx, sim.player, target, {
        buffId: 14_011,
        skillId: 1_403,
        attackId: 140_304,
        skillLevel: 1,
        sourcePhysicalAttack: 1_000,
      }),
    ).toBe(true);

    sim.time = 5.001;
    updateMir4NativePeriodicDamage(sim.ctx);

    expect(target.mir4NativePeriodicDamage).toBeUndefined();
    expect(sim.player.mir4PendingImpacts).toBeUndefined();
  });
});
