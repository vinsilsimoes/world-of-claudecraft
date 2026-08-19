import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// The Phase 2 auto battle tail: the sim acquires, pursues, rotates, kills,
// and walks home with zero client input, reusing the mir4 cast gates.

function makeSim(seed = 3131): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
  });
}

function spawnWolf(sim: Sim, offset: number): Entity {
  const p = sim.entities.get(sim.playerId);
  if (!p) throw new Error('player missing');
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + offset, p.pos.z),
  );
  sim.addEntity(wolf);
  return wolf;
}

describe('mir4 auto battle', () => {
  it('hunts a wolf down from outside melee range and pays the kill XP', () => {
    const sim = makeSim();
    const wolf = spawnWolf(sim, 8); // outside the 4yd band: pursuit is exercised
    sim.setMir4AutoBattleMode('battle');
    let guard = 0;
    while (!wolf.dead && guard++ < 1200) sim.tick();
    expect(wolf.dead).toBe(true);
    expect(sim.players.get(sim.playerId)?.xp).toBe(22);
    const p = sim.entities.get(sim.playerId)!;
    expect(p.targetId).toBe(wolf.id);
  });
  it('is deterministic: same seed, same hunt, same end state', () => {
    const run = () => {
      const sim = makeSim(77);
      const wolf = spawnWolf(sim, 8);
      sim.setMir4AutoBattleMode('battle');
      let guard = 0;
      while (!wolf.dead && guard++ < 1200) sim.tick();
      const p = sim.entities.get(sim.playerId)!;
      return [wolf.dead, guard, p.hp, p.resource, p.pos.x.toFixed(3), p.pos.z.toFixed(3)];
    };
    expect(run()).toEqual(run());
  });
  it('stands guard at the anchor when no prey is in range', () => {
    const sim = makeSim(88);
    sim.setMir4AutoBattleMode('battle');
    for (let i = 0; i < 40; i++) sim.tick();
    const meta = sim.players.get(sim.playerId)!;
    const p = sim.entities.get(sim.playerId)!;
    expect(meta.autoBattle?.mode).toBe('battle');
    expect(p.targetId).toBeNull();
    expect(meta.moveInput.forward).toBe(false); // already home: not walking
    // No assertion on hp here: the surrounding classic-world mobs (the mir4
    // zone is Phase 2 part 2) may harass a stationary player.
  });
  it('turns off cleanly and stops acting', () => {
    const sim = makeSim(99);
    const wolf = spawnWolf(sim, 3);
    sim.setMir4AutoBattleMode('battle');
    sim.setMir4AutoBattleMode('off');
    const resourceBefore = sim.entities.get(sim.playerId)!.resource;
    for (let i = 0; i < 60; i++) sim.tick();
    expect(wolf.dead).toBe(false);
    expect(sim.entities.get(sim.playerId)!.resource).toBe(resourceBefore);
    expect(sim.players.get(sim.playerId)?.autoBattle?.mode).toBe('off');
  });
});
