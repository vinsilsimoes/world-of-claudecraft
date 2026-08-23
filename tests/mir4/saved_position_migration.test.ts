import { describe, expect, it } from 'vitest';
import {
  mir4SavedPositionIsStale,
  recoverMir4CorpsePosition,
} from '../../src/sim/mir4/saved_position_migration';
import type { WorldContent, ZoneDef } from '../../src/sim/types';

const zones = [
  {
    id: 'mir4_m01-vila-do-vau',
    xMin: 4000,
    xMax: 4400,
    zMin: -200,
    zMax: 300,
  } as ZoneDef,
];
const world = { zones, playerStart: { x: 4100, z: 20 } } as Pick<
  WorldContent,
  'zones' | 'playerStart'
>;
const wocWorld = {
  zones: [{ id: 'eastbrook_vale', xMin: -180, xMax: 180, zMin: 0, zMax: 540 } as ZoneDef],
  playerStart: { x: 0, z: 100 },
} as Pick<WorldContent, 'zones' | 'playerStart'>;

describe('MIR4 saved position migration', () => {
  it('recovers a legacy overworld coordinate at the authored campaign entrance', () => {
    const legacy = { x: 0, z: 0 };
    expect(mir4SavedPositionIsStale('mir4-gameplay-port', world, legacy)).toBe(true);
    expect(recoverMir4CorpsePosition('mir4-gameplay-port', world, legacy)).toEqual(
      world.playerStart,
    );
  });

  it('preserves positions inside the authored world and every classic world position', () => {
    const authored = { x: 4200, z: 0 };
    const classic = { x: 0, z: 0 };
    expect(mir4SavedPositionIsStale('mir4-gameplay-port', world, authored)).toBe(false);
    expect(recoverMir4CorpsePosition('mir4-gameplay-port', world, authored)).toBe(authored);
    expect(mir4SavedPositionIsStale('woc-classic', world, classic)).toBe(false);
    expect(recoverMir4CorpsePosition('woc-classic', world, classic)).toBe(classic);
  });

  it('recovers positions from the retired authored continent into the WoC campaign world', () => {
    const authored = { x: 4200, z: 0 };
    expect(mir4SavedPositionIsStale('mir4-gameplay-port', wocWorld, authored)).toBe(true);
    expect(recoverMir4CorpsePosition('mir4-gameplay-port', wocWorld, authored)).toEqual(
      wocWorld.playerStart,
    );
    expect(mir4SavedPositionIsStale('mir4-gameplay-port', wocWorld, { x: 0, z: 100 })).toBe(false);
  });

  it('keeps an absent corpse absent', () => {
    expect(recoverMir4CorpsePosition('mir4-gameplay-port', world, null)).toBeNull();
  });
});
