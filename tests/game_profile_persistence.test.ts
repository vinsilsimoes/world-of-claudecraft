import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_PROFILE,
  gameProfileForCharacterState,
  gameProfileStateMatches,
  MIR4_GAME_PROFILE,
} from '../src/game_profile';
import { type CharacterState, Sim } from '../src/sim/sim';

function savedState(profile = DEFAULT_GAME_PROFILE): CharacterState {
  const sim = new Sim({
    seed: 42001,
    playerClass: 'warrior',
    gameProfile: profile,
  });
  const state = sim.serializeCharacter(sim.playerId);
  if (!state) throw new Error('test character did not serialize');
  return state;
}

describe('game profile character persistence', () => {
  it('keeps classic saves byte-compatible while resolving an absent marker as classic', () => {
    const state = savedState();
    expect(Object.hasOwn(state, 'gameProfile')).toBe(false);
    expect(gameProfileForCharacterState(state)).toBe(DEFAULT_GAME_PROFILE);
    expect(gameProfileStateMatches(DEFAULT_GAME_PROFILE, state)).toBe(true);
    expect(gameProfileStateMatches(MIR4_GAME_PROFILE, state)).toBe(false);
  });

  it('stamps MIR4 saves and round-trips them only through a MIR4 Sim', () => {
    const state = savedState(MIR4_GAME_PROFILE);
    expect(state.gameProfile).toBe(MIR4_GAME_PROFILE);
    expect(gameProfileForCharacterState(state)).toBe(MIR4_GAME_PROFILE);

    const mir4 = new Sim({
      seed: 42002,
      playerClass: 'warrior',
      gameProfile: MIR4_GAME_PROFILE,
      noPlayer: true,
    });
    expect(() =>
      mir4.addPlayer('warrior', 'Ported', {
        state: JSON.parse(JSON.stringify(state)) as CharacterState,
      }),
    ).not.toThrow();
  });

  it('rejects cross-profile and unknown persisted markers before loading gameplay state', () => {
    const classic = savedState();
    const mir4 = savedState(MIR4_GAME_PROFILE);
    const classicHost = new Sim({
      seed: 42003,
      playerClass: 'warrior',
      noPlayer: true,
    });
    const mir4Host = new Sim({
      seed: 42004,
      playerClass: 'warrior',
      gameProfile: MIR4_GAME_PROFILE,
      noPlayer: true,
    });

    expect(() => classicHost.addPlayer('warrior', 'WrongMir4', { state: mir4 })).toThrow(
      /game profile/,
    );
    expect(() => mir4Host.addPlayer('warrior', 'WrongClassic', { state: classic })).toThrow(
      /game profile/,
    );

    const unknown = {
      ...classic,
      gameProfile: 'future-profile',
    } as unknown as CharacterState;
    expect(gameProfileForCharacterState(unknown)).toBeNull();
    expect(() => classicHost.addPlayer('warrior', 'Unknown', { state: unknown })).toThrow(
      /game profile/,
    );
  });
});
