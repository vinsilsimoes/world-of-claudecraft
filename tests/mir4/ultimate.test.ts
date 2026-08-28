import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_CLASS_COMBAT_SPECS } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.2: the per-class basic/ultimate specs, the authored-offset impact
// clock, the ultimate gauge, and the auto battle's ultimate-first priority.

function makeSim(seed = 71): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function spawnWolf(sim: Sim, dx = 2, dz = 0): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + dx, p.pos.z + dz),
  );
  wolf.swingTimer = 999;
  sim.addEntity(wolf);
  return wolf;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the per-class combat specs (data)', () => {
  it('pins the five basic/ultimate/evade triples from the source', () => {
    expect(MIR4_CLASS_COMBAT_SPECS[1]!.basic).toEqual({
      channel: 'physical',
      coefficient: 6000,
      impactOffsetMs: [280],
      cadenceMs: 650,
      rangePx: 80,
      gaugeGainPerImpact: 12,
    });
    expect(MIR4_CLASS_COMBAT_SPECS[2]!.basic.channel).toBe('magic');
    expect(MIR4_CLASS_COMBAT_SPECS[2]!.basic.coefficient).toBe(5200);
    expect(MIR4_CLASS_COMBAT_SPECS[3]!.basic.coefficient).toBe(4600);
    expect(MIR4_CLASS_COMBAT_SPECS[4]!.basic.coefficient).toBe(4300);
    expect(MIR4_CLASS_COMBAT_SPECS[5]!.basic.coefficient).toBe(3900);
    expect(MIR4_CLASS_COMBAT_SPECS[1]!.ultimate).toEqual({
      channel: 'physical',
      perImpactCoefficient: 12000,
      impactOffsetMs: [520, 760, 1020],
      cooldownMs: 30000,
      rangePx: 96,
      requiredGauge: 100,
    });
    expect(MIR4_CLASS_COMBAT_SPECS[5]!.ultimate.impactOffsetMs).toEqual([320, 650]);
  });
});

describe('the impact clock and gauge (runtime)', () => {
  it('the basic impact lands at its authored 280ms offset, not instantly', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const wolf = spawnWolf(sim);
    const startedAt = sim.time;
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
    expect(wolf.hp).toBe(wolf.maxHp); // nothing yet: the impact is scheduled
    sim.time = startedAt + 0.279;
    updateMir4PendingImpacts(sim.ctx);
    expect(wolf.hp).toBe(wolf.maxHp);
    sim.time = startedAt + 0.28;
    updateMir4PendingImpacts(sim.ctx);
    expect(wolf.hp).toBe(wolf.maxHp - 75); // floor(125*6000/10000), starter weapon included
    expect(sim.entities.get(sim.playerId)!.mir4UltGauge).toBe(12);
  });
  it('starts and preserves a magic basic animation before its damage event', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = new Sim({
      seed: 711,
      playerClass: 'warrior',
      playerClassMir4: 'elementalist',
      playerName: 'Elyra',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world: MIR4_SLICE_WORLD,
    });
    const wolf = spawnWolf(sim);
    sim.drainEvents();

    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4AttackStart',
        sourceId: sim.playerId,
        targetId: wolf.id,
        action: 'basic',
        pose: 'cast',
        durationMs: 576,
      }),
    );
    const events = Array.from({ length: 20 }, () => sim.tick()).flat();
    const damage = events.find(
      (event) => event.type === 'damage' && event.sourceId === sim.playerId,
    );
    expect(damage).toMatchObject({ school: 'magic', attackAnimationStarted: true });
  });
  it('applies an effect-only skill immediately through its original VFX path', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = new Sim({
      seed: 712,
      playerClass: 'warrior',
      playerClassMir4: 'elementalist',
      playerName: 'Elyra',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world: MIR4_SLICE_WORLD,
    });
    sim.player.level = 40;
    sim.drainEvents();

    expect(sim.mir4CastSkill(2503)).toEqual({ ok: true });
    const castEvents = sim.drainEvents();
    expect(castEvents.some((event) => event.type === 'mir4AttackStart')).toBe(false);
    expect(castEvents).toContainEqual(
      expect.objectContaining({
        type: 'spellfx',
        sourceId: sim.playerId,
        targetId: sim.playerId,
      }),
    );
    expect(sim.player.mir4Shield?.remaining).toBe(10);
  });
  it('the gauge caps at 100', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(72);
    const p = sim.entities.get(sim.playerId)!;
    // One durable, harmless target isolates gauge accumulation from the live
    // monster-pressure curve and remains inside the authored basic range.
    const base = MIR4_MOBS.mir4_forest_wolf;
    const targetTemplate = {
      ...base,
      id: 'test_ultimate_gauge_target',
      hpBase: 5_000,
      hpPerLevel: 0,
      dmgBase: 1,
      dmgPerLevel: 0,
      moveSpeed: 0,
    };
    sim.mir4RuntimeMobTemplates.set(targetTemplate.id, targetTemplate);
    const wolf = createMob(
      sim.nextId++,
      targetTemplate as never,
      1,
      sim.groundPos(p.pos.x + 2.5, p.pos.z),
    );
    wolf.swingTimer = 999;
    sim.addEntity(wolf);
    for (let i = 0; i < 12; i++) {
      const r = sim.mir4BasicAttack(wolf.id);
      void r;
      for (let t = 0; t < 14; t++) sim.tick();
    }
    expect(p.mir4UltGauge).toBe(100);
  });
  it('the ultimate spends the gauge atomically and lands 150 x 3 = 450', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(73);
    const p = sim.entities.get(sim.playerId)!;
    // A fat test wolf so the 450 total never clamps at the kill.
    const base = MIR4_MOBS.mir4_forest_wolf;
    const big = { ...base, id: 'test_big_wolf', hpBase: 600, hpPerLevel: 0 };
    sim.mir4RuntimeMobTemplates.set(big.id, big);
    const p0 = sim.entities.get(sim.playerId)!;
    const wolf = createMob(sim.nextId++, big as never, 1, sim.groundPos(p0.pos.x + 2, p0.pos.z));
    wolf.swingTimer = 999;
    sim.addEntity(wolf);
    p.mir4UltGauge = 100;
    expect(sim.mir4UltimateCast(wolf.id)).toEqual({ ok: false, reason: 'not-unlocked' });
    expect(p.mir4UltGauge).toBe(100);
    p.level = 50;
    p.mir4UltGauge = 99;
    expect(sim.mir4UltimateCast(wolf.id)).toEqual({ ok: false, reason: 'no-mp' }); // gauge gate
    p.mir4UltGauge = 100;
    sim.drainEvents();
    expect(sim.mir4UltimateCast(wolf.id)).toEqual({ ok: true });
    expect(p.mir4UltGauge).toBe(0);
    expect(p.cooldowns.has('mir4_ult')).toBe(true);
    expect(wolf.hp).toBe(wolf.maxHp); // scheduled, not instant
    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4AttackStart',
      sourceId: p.id,
      targetId: wolf.id,
      action: 'ultimate',
      pose: 'weapon',
      durationMs: 1_275,
    });
    const startedAt = sim.time;
    for (const [time, expectedDamage] of [
      [0.519, 0],
      [0.52, 150],
      [0.759, 150],
      [0.76, 300],
      [1.019, 300],
      [1.02, 450],
    ] as const) {
      sim.time = startedAt + time;
      updateMir4PendingImpacts(sim.ctx);
      expect(wolf.maxHp - wolf.hp).toBe(expectedDamage);
    }
  });
});
