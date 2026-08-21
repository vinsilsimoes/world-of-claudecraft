import { describe, expect, it } from 'vitest';
import { MIR4_MP_REGEN_COMBAT, MIR4_MP_REGEN_REST } from '../../src/sim/auto_battle/core';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// The source project's passive MP regeneration, running inside the mir4 tick
// phase: 0.25%/s of max pool in combat, 0.50%/s resting (the slice collapses
// the source's fractional carry into the float resource field).

function makeSim(seed = 41): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
  });
}

describe('mir4 MP regeneration', () => {
  it('pins the source rates', () => {
    expect(MIR4_MP_REGEN_COMBAT).toBe(0.0025);
    expect(MIR4_MP_REGEN_REST).toBe(0.005);
  });
  it('regenerates toward the pool cap after spending', () => {
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    const wolf = createMob(
      sim.nextId++,
      MIR4_MOBS.mir4_forest_wolf as never,
      1,
      sim.groundPos(p.pos.x + 2, p.pos.z),
    );
    sim.addEntity(wolf);
    sim.castMir4Skill(1102, sim.playerId, wolf.id);
    const afterCast = p.resource;
    expect(afterCast).toBe(600 - 36);
    for (let i = 0; i < 100; i++) sim.tick(); // 5s of ticking
    expect(p.resource).toBeGreaterThan(afterCast);
    expect(p.resource).toBeLessThanOrEqual(600);
  });
});
