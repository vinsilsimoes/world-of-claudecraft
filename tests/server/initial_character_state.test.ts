import { describe, expect, it } from 'vitest';
import { initialCharacterState } from '../../server/initial_character_state';

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
});
