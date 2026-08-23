import { describe, expect, it } from 'vitest';
import { mergeEntitySnapshot, mergeSelfSnapshot } from '../scripts/lib/mp_snapshot_merge.mjs';

describe('multiplayer integration snapshot reconstruction', () => {
  it('retains the authoritative MIR4 profile payload across delta snapshots', () => {
    const first = mergeSelfSnapshot(null, {
      id: 7,
      hp: 100,
      mir4: { classId: 2, autoBattle: { mode: 'battle' } },
    });

    expect(mergeSelfSnapshot(first, { id: 7, hp: 95 })).toEqual({
      id: 7,
      hp: 95,
      mir4: { classId: 2, autoBattle: { mode: 'battle' } },
    });
  });

  it('retains delta-guarded progression scalars until the server changes them', () => {
    const first = mergeSelfSnapshot(null, { id: 7, hp: 100, xp: 1432, copper: 200 });

    expect(mergeSelfSnapshot(first, { id: 7, hp: 95 })).toMatchObject({
      hp: 95,
      xp: 1432,
      copper: 200,
    });
  });

  it('retains unchanged entity identity through lite and keep records', () => {
    const initial = mergeEntitySnapshot(new Map(), {
      ents: [{ id: 8, k: 'player', tid: 'warrior', nm: 'Elyra', lv: 1, x: 1, z: 2 }],
    });
    const lite = mergeEntitySnapshot(initial, { ents: [{ id: 8, x: 2, z: 3 }] });
    const kept = mergeEntitySnapshot(lite, { ents: [], keep: [8] });

    expect(lite.get(8)).toMatchObject({
      id: 8,
      k: 'player',
      tid: 'warrior',
      nm: 'Elyra',
      lv: 1,
      x: 2,
      z: 3,
    });
    expect(kept.get(8)).toEqual(lite.get(8));
  });
});
