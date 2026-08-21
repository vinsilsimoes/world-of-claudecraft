import { describe, expect, it } from 'vitest';
import { initialCharacterState } from '../../server/initial_character_state';
import { Sim } from '../../src/sim/sim';

describe('initial character state profile stamp', () => {
  it('keeps classic creation saves unmarked for backward compatibility', () => {
    const state = initialCharacterState('warrior', 'Classicnew', 2, 'woc-classic');
    expect(state.skin).toBe(2);
    expect(Object.hasOwn(state, 'gameProfile')).toBe(false);
  });

  it('stamps MIR4 creation saves before they can reach Postgres', () => {
    const state = initialCharacterState('warrior', 'Mirfournew', 3, 'mir4-gameplay-port');
    expect(state.skin).toBe(3);
    expect(state.gameProfile).toBe('mir4-gameplay-port');
  });

  it.each([
    ['warrior', 1],
    ['elementalist', 2],
    ['taoist', 3],
    ['arbalist', 4],
    ['lancer', 5],
  ] as const)('creates the native MIR4 identity for %s', (cls, classId) => {
    const state = initialCharacterState(cls, 'Mirfournew', 0, 'mir4-gameplay-port');
    expect(state.gameProfile).toBe('mir4-gameplay-port');
    expect(state.hp).toBeGreaterThan(100);
    expect(state.resource).toBeGreaterThan(0);

    const sim = new Sim({
      seed: 1,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      noPlayer: true,
    });
    const pid = sim.addPlayer(cls, 'Mirfournew', { state });
    expect(sim.entities.get(pid)?.mir4?.classId).toBe(classId);
  });
});
