import { describe, expect, it } from 'vitest';
import { corpseInteractionAvailability } from '../src/sim/corpse_interaction';
import { corpseInteractionPresent } from '../src/sim/corpse_presence';
import { MOBS } from '../src/sim/data';
import { createMob } from '../src/sim/entity';
import { MIR4_GAME_PROFILE } from '../src/sim/game_profile';
import { Sim } from '../src/sim/sim';

describe('corpse interaction presence', () => {
  it('accepts classic loot or the MIR4 body marker only on a dead mob', () => {
    expect(
      corpseInteractionPresent({
        kind: 'mob',
        dead: true,
        lootable: true,
        mir4CorpseVisible: false,
      }),
    ).toBe(true);
    expect(
      corpseInteractionPresent({
        kind: 'mob',
        dead: true,
        lootable: false,
        mir4CorpseVisible: true,
      }),
    ).toBe(true);
    expect(
      corpseInteractionPresent({
        kind: 'mob',
        dead: true,
        lootable: true,
        mir4CorpseVisible: true,
      }),
    ).toBe(true);
    expect(
      corpseInteractionPresent({
        kind: 'player',
        dead: true,
        lootable: true,
        mir4CorpseVisible: true,
      }),
    ).toBe(false);
    expect(
      corpseInteractionPresent({
        kind: 'mob',
        dead: true,
        lootable: false,
        mir4CorpseVisible: false,
      }),
    ).toBe(false);
    expect(
      corpseInteractionPresent({
        kind: 'mob',
        dead: false,
        lootable: true,
        mir4CorpseVisible: true,
      }),
    ).toBe(false);
  });

  it('does not invent loot rights from a marker-only tapped body with no payload', () => {
    const sim = new Sim({
      seed: 505,
      playerClass: 'warrior',
      noPlayer: true,
      gameProfile: MIR4_GAME_PROFILE,
    });
    const pid = sim.addPlayer('warrior', 'Collector');
    const mob = createMob(sim.nextId++, MOBS.forest_wolf, 1, { x: 0, y: 0, z: 0 });
    mob.dead = true;
    mob.lootable = false;
    mob.mir4CorpseVisible = true;
    mob.loot = null;
    mob.tappedById = pid;
    mob.harvestClaimedBy = pid;
    sim.addEntity(mob);

    expect(corpseInteractionAvailability(sim.ctx, mob, pid, true)).toEqual({
      harvestable: false,
      hasLootRights: false,
      canInteract: false,
    });
  });
});
