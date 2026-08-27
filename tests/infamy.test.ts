import { describe, expect, it } from 'vitest';
import {
  adjustFame,
  DEFAULT_FAME,
  normalizeInfamyState,
  OPEN_WORLD_PVP_DEFENSE_RIGHTS_MAX,
  PK_CLEAR_FAME,
  PK_ENTER_FAME,
  pkStat,
  rememberOpenWorldPvpDefenseRight,
} from '../src/sim/pvp/infamy';

describe('Aeldrune fame and PK state', () => {
  it('starts honorable, enters PK at 500 fame, and keeps the mark until 1500', () => {
    expect(normalizeInfamyState(undefined, undefined)).toEqual({
      fame: DEFAULT_FAME,
      pkMarked: false,
    });
    const marked = adjustFame({ fame: PK_ENTER_FAME + 100, pkMarked: false }, -100);
    expect(marked).toEqual({ fame: PK_ENTER_FAME, pkMarked: true });
    expect(adjustFame(marked, 999).pkMarked).toBe(true);
    expect(adjustFame(marked, PK_CLEAR_FAME - PK_ENTER_FAME).pkMarked).toBe(false);
  });

  it('clamps fame and halves positive combat stats while PK-marked', () => {
    expect(adjustFame({ fame: DEFAULT_FAME, pkMarked: false }, 50).fame).toBe(DEFAULT_FAME);
    expect(adjustFame({ fame: 10, pkMarked: true }, -100).fame).toBe(0);
    expect(pkStat(101, true)).toBe(50);
    expect(pkStat(101, false)).toBe(101);
  });

  it('bounds and deterministically evicts transient self-defense rights', () => {
    const rights = new Map<number, number>();
    for (let id = 1; id <= OPEN_WORLD_PVP_DEFENSE_RIGHTS_MAX; id++) {
      rights.set(id, id <= 2 ? 5 : 100 + id);
    }

    const updated = rememberOpenWorldPvpDefenseRight(rights, 999, 500, 5);

    expect(updated).toBe(rights);
    expect(updated).toHaveLength(OPEN_WORLD_PVP_DEFENSE_RIGHTS_MAX);
    expect(updated.has(1)).toBe(false);
    expect(updated.has(2)).toBe(true);
    expect(updated.get(999)).toBe(500);
  });
});
