import { describe, expect, it } from 'vitest';
import {
  normalizeMir4AutoPotionThreshold,
  resolveMir4AutoPotionThresholds,
} from '../../src/sim/auto_battle/potion_thresholds';
import { mir4WireRevision } from '../../src/sim/mir4/wire_revision';
import { Sim } from '../../src/sim/sim';
import { EMPTY_TEST_WORLD } from '../sim_shared';

describe('MIR4 automatic potion thresholds', () => {
  it('restores independent legacy defaults and snaps supported settings to five percent', () => {
    expect(resolveMir4AutoPotionThresholds()).toEqual({ health: 50, mana: 35 });
    expect(resolveMir4AutoPotionThresholds({ health: 63 })).toEqual({ health: 65, mana: 35 });
    expect(normalizeMir4AutoPotionThreshold(-20, 50)).toBe(10);
    expect(normalizeMir4AutoPotionThreshold(200, 35)).toBe(90);
    expect(normalizeMir4AutoPotionThreshold(Number.NaN, 35)).toBe(35);
  });

  it('stores settings without enabling Auto Battle and elides repeated revisions', () => {
    const sim = new Sim({
      seed: 9221,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      world: EMPTY_TEST_WORLD,
    });
    const meta = sim.players.get(sim.playerId)!;
    const before = mir4WireRevision(meta);

    sim.setMir4AutoPotionThreshold('health', 65);

    expect(meta.autoBattle).toBeUndefined();
    expect(meta.mir4AutoPotion).toEqual({ health: 65, mana: 35 });
    expect(mir4WireRevision(meta)).toBe(before + 1);

    sim.setMir4AutoPotionThreshold('health', 65);
    expect(mir4WireRevision(meta)).toBe(before + 1);
  });
});
