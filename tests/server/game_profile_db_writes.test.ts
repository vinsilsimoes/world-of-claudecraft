import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterState } from '../../src/sim/sim';

const previousGameProfile = process.env.GAME_PROFILE;
const dbMock = vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgres://test/test';
  process.env.GAME_PROFILE = 'mir4-gameplay-port';
  const query = vi.fn(async () => ({ rows: [], rowCount: 1 }));
  const connect = vi.fn(async () => ({
    query,
    release: vi.fn(),
  }));
  return { query, connect };
});

vi.mock('pg', () => ({
  Pool: function Pool() {
    return {
      query: dbMock.query,
      connect: dbMock.connect,
      on: vi.fn(),
    };
  },
}));

import { createCharacterCapped, saveCharacterState } from '../../server/db';

const CLASSIC_STATE = {
  level: 1,
  questLog: [],
  questsDone: [],
  inventory: [],
} as unknown as CharacterState;

const MIR4_STATE = {
  ...CLASSIC_STATE,
  gameProfile: 'mir4-gameplay-port',
} as CharacterState;

describe('game profile guards on character database writes', () => {
  beforeEach(() => {
    dbMock.query.mockClear();
    dbMock.connect.mockClear();
  });

  afterAll(() => {
    if (previousGameProfile === undefined) delete process.env.GAME_PROFILE;
    else process.env.GAME_PROFILE = previousGameProfile;
  });

  it('rejects classic or absent state before a MIR4 character create reaches SQL', async () => {
    await expect(createCharacterCapped(1, 'Classic', 'warrior', 10, CLASSIC_STATE)).rejects.toThrow(
      'character creation state belongs to game profile woc-classic',
    );
    await expect(createCharacterCapped(1, 'Empty', 'warrior', 10, null)).rejects.toThrow(
      'character creation state belongs to game profile woc-classic',
    );
    expect(dbMock.connect).not.toHaveBeenCalled();
  });

  it('rejects a classic-only class before a MIR4 character create reaches SQL', async () => {
    await expect(createCharacterCapped(1, 'Paladin', 'paladin', 10, MIR4_STATE)).rejects.toThrow(
      "character creation class 'paladin' is not valid for game profile mir4-gameplay-port",
    );
    expect(dbMock.connect).not.toHaveBeenCalled();
  });

  it('rejects a classic save before checking out a database client', async () => {
    await expect(saveCharacterState(7, 1, CLASSIC_STATE)).rejects.toThrow(
      'character save belongs to game profile woc-classic',
    );
    expect(dbMock.connect).not.toHaveBeenCalled();
    expect(dbMock.query).not.toHaveBeenCalled();
  });

  it('admits a matching MIR4 save into the existing lease-fenced write path', async () => {
    await expect(saveCharacterState(7, 1, MIR4_STATE)).resolves.toBe(true);
    expect(dbMock.connect).toHaveBeenCalledTimes(1);
    const calls = dbMock.query.mock.calls as unknown as [unknown, unknown?][];
    const update = calls.find((call) => String(call[0]).includes('UPDATE characters'));
    expect(update?.[1]).toEqual([7, 1, JSON.stringify(MIR4_STATE)]);
  });
});
