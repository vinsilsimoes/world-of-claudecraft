import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { advanceMir4Experience } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// The Phase 2 slice quest: the REAL M01-Q01 (Primeiros Rastros, Tarek
// Duas-Pontes, inspect x3, 1432 XP + 200 copper) driven end to end through
// the interaction verb.

function makeSim(seed = 5): Sim {
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

describe('M01-Q01 Primeiros Rastros', () => {
  it('accepts at Tarek, inspects the three clue sites, turns in for the exact rewards', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;

    // The player spawns in the hub next to Tarek: talk accepts.
    expect(sim.mir4TalkOrInspect()).toBe('Primeiros Rastros accepted.');
    expect(meta.mir4Quests?.mir4_m01_q01?.state).toBe('active');

    // Inspect the three sites (ford, east clearing, west clearing).
    teleport(sim, 0, -6);
    expect(sim.mir4TalkOrInspect()).toBe('Primeiros Rastros: clue 1 of 3.');
    teleport(sim, 14, 6);
    expect(sim.mir4TalkOrInspect()).toBe('Primeiros Rastros: clue 2 of 3.');
    teleport(sim, -18, 2);
    expect(sim.mir4TalkOrInspect()).toBe(
      'Primeiros Rastros: all clues found. Return to the giver.',
    );
    expect(meta.mir4Quests?.mir4_m01_q01?.state).toBe('ready');

    // Far from the giver the verb does nothing turn-in shaped.
    expect(sim.mir4TalkOrInspect()).toBe('Nothing to do here.');

    // Back at Tarek: the turn-in pays the exact source rewards.
    teleport(sim, 1.5, -10.5);
    expect(sim.mir4TalkOrInspect()).toBe('Primeiros Rastros complete.');
    expect(meta.mir4Quests?.mir4_m01_q01?.state).toBe('done');

    // The level bar comes from the ported table itself, never a hand-summed
    // constant; 1432 XP lands at once (no kills happened in this test).
    const p = sim.entities.get(sim.playerId)!;
    const expected = advanceMir4Experience(1, 0, 1432);
    expect(p.level).toBe(expected.level);
    expect(meta.xp).toBe(expected.xp);
    expect(meta.copper).toBe(200);
    expect(sim.mir4TalkOrInspect()).toBe('You have already finished this task.');
  });
});
