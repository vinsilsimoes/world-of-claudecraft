import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_CLASS_COMBAT_SPECS } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
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
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
    expect(wolf.hp).toBe(wolf.maxHp); // nothing yet: the impact is scheduled
    for (let i = 0; i < 6; i++) sim.tick(); // 0.30s >= 0.28s
    expect(wolf.hp).toBe(wolf.maxHp - 75); // floor(125*6000/10000), starter weapon included
    expect(sim.entities.get(sim.playerId)!.mir4UltGauge).toBe(12);
  });
  it('the gauge caps at 100', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(72);
    const p = sim.entities.get(sim.playerId)!;
    // Twelve close wolves (all inside the 4yd band) so every basic connects;
    // the world's camp wolves are far away and must not be picked.
    const mine: Entity[] = [];
    for (let i = 0; i < 12; i++) mine.push(spawnWolf(sim, 2 + (i % 2), (i - 6) * 0.4));
    for (let i = 0; i < 12; i++) {
      const wolf = mine[i]!;
      // Re-pin beside the player (east, off the ford's river): passive wolves
      // idle-wander out of the band, and a water pin gets nudged to the shore.
      const pinned = sim.groundPos(
        sim.entities.get(sim.playerId)!.pos.x + 2.5,
        sim.entities.get(sim.playerId)!.pos.z + ((i % 3) - 1) * 0.5,
      );
      wolf.pos.x = pinned.x;
      wolf.pos.y = pinned.y;
      wolf.pos.z = pinned.z;
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
    const p0 = sim.entities.get(sim.playerId)!;
    const wolf = createMob(sim.nextId++, big as never, 1, sim.groundPos(p0.pos.x + 2, p0.pos.z));
    sim.addEntity(wolf);
    p.mir4UltGauge = 99;
    expect(sim.mir4UltimateCast(wolf.id)).toEqual({ ok: false, reason: 'no-mp' }); // gauge gate
    p.mir4UltGauge = 100;
    expect(sim.mir4UltimateCast(wolf.id)).toEqual({ ok: true });
    expect(p.mir4UltGauge).toBe(0);
    expect(p.cooldowns.has('mir4_ult')).toBe(true);
    expect(wolf.hp).toBe(wolf.maxHp); // scheduled, not instant
    for (let i = 0; i < 21; i++) sim.tick(); // past the last 1020ms offset
    expect(wolf.maxHp - wolf.hp).toBe(450); // floor(125*12000/10000) x 3
  });
});
