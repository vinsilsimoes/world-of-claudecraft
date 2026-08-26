import { describe, expect, it } from 'vitest';
import {
  MIR4_ALBUM_STAT_KEYS,
  mir4AlbumAwardForIndex,
  mir4AlbumBonuses,
} from '../../src/sim/mir4/collection_album';

describe('MIR4 collection album bonuses', () => {
  const catalog = Array.from({ length: MIR4_ALBUM_STAT_KEYS.length }, (_, index) => ({
    id: `entry-${index}`,
    grade: 3,
  }));

  it('grants one deterministic real combat stat for every unique entry', () => {
    expect(catalog.map((_, index) => mir4AlbumAwardForIndex(index, 3))).toEqual([
      { stat: 'maxHp', amount: 75 },
      { stat: 'maxMana', amount: 30 },
      { stat: 'physicalAttack', amount: 6 },
      { stat: 'magicAttack', amount: 6 },
      { stat: 'physicalDefense', amount: 6 },
      { stat: 'magicDefense', amount: 6 },
      { stat: 'accuracy', amount: 3 },
      { stat: 'dodge', amount: 3 },
      { stat: 'critical', amount: 3 },
      { stat: 'avoidCritical', amount: 3 },
      { stat: 'criticalOutcome', amount: 3 },
      { stat: 'penetrationBps', amount: 30 },
      { stat: 'bossDamageBps', amount: 30 },
      { stat: 'skillDamageBps', amount: 30 },
    ]);
  });

  it('pins grade scaling and clamps invalid grades to the supported range', () => {
    expect(mir4AlbumAwardForIndex(0, 1)).toEqual({ stat: 'maxHp', amount: 25 });
    expect(mir4AlbumAwardForIndex(1, 6)).toEqual({ stat: 'maxMana', amount: 60 });
    expect(mir4AlbumAwardForIndex(2, 6)).toEqual({ stat: 'physicalAttack', amount: 12 });
    expect(mir4AlbumAwardForIndex(11, 6)).toEqual({ stat: 'penetrationBps', amount: 60 });
    expect(mir4AlbumAwardForIndex(0, 99)).toEqual({ stat: 'maxHp', amount: 150 });
    expect(mir4AlbumAwardForIndex(0, -1)).toEqual({ stat: 'maxHp', amount: 25 });
  });

  it('does not count duplicate discovery ids and reaches every supported stat at completion', () => {
    const once = mir4AlbumBonuses(catalog, ['entry-0']);
    expect(mir4AlbumBonuses(catalog, ['entry-0', 'entry-0'])).toEqual(once);

    const complete = mir4AlbumBonuses(
      catalog,
      catalog.map((entry) => entry.id),
    );
    expect(Object.values(complete).every((value) => value > 0)).toBe(true);
  });

  it('continues the stat schedule across later catalog cycles', () => {
    const extendedCatalog = Array.from({ length: 28 }, (_, index) => ({
      id: `extended-${index}`,
      grade: 1,
    }));

    expect(
      mir4AlbumBonuses(
        extendedCatalog,
        extendedCatalog.map((entry) => entry.id),
      ),
    ).toEqual({
      maxHp: 50,
      maxMana: 20,
      physicalAttack: 4,
      magicAttack: 4,
      physicalDefense: 4,
      magicDefense: 4,
      accuracy: 2,
      dodge: 2,
      critical: 2,
      avoidCritical: 2,
      criticalOutcome: 2,
      penetrationBps: 20,
      bossDamageBps: 20,
      skillDamageBps: 20,
    });
  });
});
