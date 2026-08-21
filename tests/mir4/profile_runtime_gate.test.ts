import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim/sim';

function makeMir4Sim(): Sim {
  return new Sim({
    seed: 707,
    playerClass: 'warrior',
    playerClassMir4: 'elementalist',
    playerName: 'Elyra',
    gameProfile: 'mir4-gameplay-port',
    valeCupShowcase: true,
  });
}

describe('MIR4 runtime profile gates', () => {
  it('does not start the classic Vale Cup showcase after its idle timer', () => {
    const sim = makeMir4Sim();

    // The gate is evaluated in the ordinary tick phase. Jump the deterministic
    // sim clock past the showcase deadline instead of burning 1,220 unrelated
    // world ticks; the latter made this profile pin exceed the shared-suite
    // timeout under normal CI contention.
    sim.time = 61;
    expect(() => sim.tick()).not.toThrow();
    expect(sim.vcup.match).toBeNull();
    expect(sim.vcup.botPids).toEqual([]);
  });

  it('rejects a crafted classic Vale Cup practice request', () => {
    const sim = makeMir4Sim();

    expect(() => sim.vcupPracticeStart(1)).not.toThrow();
    expect(sim.vcup.practices).toEqual([]);
    expect(sim.vcup.botPids).toEqual([]);
  });
});
