import { describe, expect, it, vi } from 'vitest';
import { offlineSimOptions } from '../src/game/offline_sim_options';
import type { WorldContent } from '../src/sim/types';

describe('offlineSimOptions (main.ts Sim-options extraction)', () => {
  it('resolves the game profile from the build env at the Sim boundary', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    expect(offlineSimOptions({ playerClass: 'warrior', playerName: 'Aldric' }).gameProfile).toBe(
      'mir4-gameplay-port',
    );
    vi.unstubAllEnvs();
    expect(offlineSimOptions({ playerClass: 'warrior', playerName: 'Aldric' }).gameProfile).toBe(
      'woc-classic',
    );
  });

  it('runs the ranked rift scheduler only on the generated world', () => {
    expect(offlineSimOptions({ playerClass: 'warrior', playerName: 'Aldric' }).riftPortals).toBe(
      true,
    );
    expect(
      offlineSimOptions({
        playerClass: 'warrior',
        playerName: 'Aldric',
        world: {} as WorldContent,
      }).riftPortals,
    ).toBe(false);
  });
});
