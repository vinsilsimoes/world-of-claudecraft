import { describe, expect, it } from 'vitest';
import { MIR4_MOUNTS_CATALOG, mir4MountById } from '../../src/sim/content/mir4/mounts_catalog';
import { MIR4_SPIRITS_CATALOG, mir4SpiritById } from '../../src/sim/content/mir4/spirits_catalog';
import { mir4MountRuntimeStats } from '../../src/sim/mir4/mounts';

// Phase 5.3: the mount (85) and spirit (30) catalogs, generated verbatim.

describe('the mounts catalog', () => {
  it('keeps the sealed source catalog separate from live MIR4 balance', () => {
    expect(MIR4_MOUNTS_CATALOG).toHaveLength(85);
    expect(new Set(MIR4_MOUNTS_CATALOG.map((m) => m.id)).size).toBe(85);
    const meadow = mir4MountById('meadow-courser');
    expect(meadow).toMatchObject({
      id: 'meadow-courser',
      name: 'Corcel da Campina',
      grade: 1,
      gradeKey: 'common',
    });
    expect(meadow?.stats).toEqual({ moveSpeedBps: 400, physicalDefense: 4, magicDefense: 4 });
    if (!meadow) throw new Error('missing meadow-courser');
    expect(mir4MountRuntimeStats(meadow)).toEqual({
      moveSpeedBps: 1_000,
      basicAttackSpeedBps: 500,
      physicalDefense: 4,
      magicDefense: 4,
    });
    // Every grade 1..6 is present.
    const grades = new Set(MIR4_MOUNTS_CATALOG.map((m) => m.grade));
    expect([...grades].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('the spirits catalog', () => {
  it('carries all 30 spirits with the sealed stats shape', () => {
    expect(MIR4_SPIRITS_CATALOG).toHaveLength(30);
    const first = MIR4_SPIRITS_CATALOG[0]!;
    expect(first.id).toBe('spirit-common-01');
    expect(first.name).toBe('Faisca da Campina');
    expect(first.stats.physicalAttack).toBe(2);
    expect(mir4SpiritById('nope')).toBeNull();
  });
});
