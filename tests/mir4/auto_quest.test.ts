import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { advanceMir4Experience } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// The auto-quest journey: one click, and the sim walks the whole M01-Q01
// loop by itself (giver -> accept -> sites -> inspect -> giver -> turn in),
// pausing for manual input like the auto battle.

function makeSim(seed = 21): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function teleport(sim: Sim, x: number, z: number): void {
  const p = sim.entities.get(sim.playerId) as Entity;
  const grounded = sim.groundPos(x, z);
  p.pos.x = grounded.x;
  p.pos.y = grounded.y;
  p.pos.z = grounded.z;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the mir4 auto-quest journey', () => {
  it('runs the whole Primeiros Rastros loop unattended', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    // Start from the far side of the hunting grounds so every leg walks.
    teleport(sim, -30, 18);
    sim.setMir4AutoQuest(true);
    expect(meta.mir4AutoQuest?.phase).toBe('to-giver');

    let guard = 0;
    while (meta.mir4AutoQuest && guard++ < 4000) sim.tick();

    expect(guard).toBeLessThan(4000); // it finished, it did not stall
    expect(meta.mir4Quests?.mir4_m01_q01?.state).toBe('done');
    expect(meta.copper).toBe(200);
    const expected = advanceMir4Experience(1, 0, 1432);
    expect(sim.entities.get(sim.playerId)!.level).toBe(expected.level);
  });

  it('suspends on manual input and resumes, like the auto battle', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(22);
    const meta = sim.players.get(sim.playerId)!;
    teleport(sim, -30, 18);
    sim.setMir4AutoQuest(true);
    meta.moveInput.forward = true;
    sim.tick();
    expect(meta.mir4AutoQuest?.suspended).toBe(true);
    const xWhileHeld = sim.entities.get(sim.playerId)!.pos.x;
    sim.tick();
    expect(sim.entities.get(sim.playerId)!.pos.x).toBe(xWhileHeld); // frozen
    meta.moveInput.forward = false;
    sim.tick();
    expect(meta.mir4AutoQuest?.suspended).toBe(false);
  });

  it('the status line tracks the journey for the HUD poll', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(23);
    expect(sim.mir4QuestStatusText()).toBe('Auto quest off');
    sim.setMir4AutoQuest(true);
    expect(sim.mir4QuestStatusText()).toContain('walking to Tarek');
  });
});
