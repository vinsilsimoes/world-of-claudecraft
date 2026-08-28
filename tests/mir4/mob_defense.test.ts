import { describe, expect, it } from 'vitest';
import { mir4MobBuildDefenses } from '../../src/sim/content/mir4/mobs';

describe('MIR4 monster build opposition', () => {
  it('pins the saturating level curve and baseline precision opposition', () => {
    expect(mir4MobBuildDefenses(1)).toEqual({
      physicalDefense: 2,
      magicDefense: 2,
      dodge: 6,
      avoidCritical: 4,
    });
    expect(mir4MobBuildDefenses(10)).toEqual({
      physicalDefense: 25,
      magicDefense: 25,
      dodge: 9,
      avoidCritical: 8,
    });
    expect(mir4MobBuildDefenses(200)).toEqual({
      physicalDefense: 120,
      magicDefense: 120,
      dodge: 85,
      avoidCritical: 74,
    });
  });

  it('gives families channel trade-offs instead of strictly better defenses', () => {
    const beast = mir4MobBuildDefenses(50, 'beast');
    const elemental = mir4MobBuildDefenses(50, 'elemental');

    expect(beast.physicalDefense).toBe(82);
    expect(beast.magicDefense).toBe(67);
    expect(elemental.physicalDefense).toBe(60);
    expect(elemental.magicDefense).toBe(93);
    expect(beast.dodge).toBeGreaterThan(elemental.dodge);
  });

  it('pins every family profile at level 50', () => {
    expect(
      Object.fromEntries(
        [
          'beast',
          'humanoid',
          'mudfin',
          'spider',
          'burrower',
          'undead',
          'troll',
          'ogre',
          'elemental',
          'dragonkin',
          'demon',
          'reptile',
        ].map((family) => [family, mir4MobBuildDefenses(50, family as never)]),
      ),
    ).toEqual({
      beast: { physicalDefense: 82, magicDefense: 67, dodge: 33, avoidCritical: 22 },
      humanoid: { physicalDefense: 75, magicDefense: 75, dodge: 25, avoidCritical: 22 },
      mudfin: { physicalDefense: 75, magicDefense: 75, dodge: 23, avoidCritical: 22 },
      spider: { physicalDefense: 67, magicDefense: 78, dodge: 35, avoidCritical: 22 },
      burrower: { physicalDefense: 82, magicDefense: 67, dodge: 20, avoidCritical: 22 },
      undead: { physicalDefense: 67, magicDefense: 82, dodge: 20, avoidCritical: 22 },
      troll: { physicalDefense: 90, magicDefense: 63, dodge: 17, avoidCritical: 22 },
      ogre: { physicalDefense: 93, magicDefense: 60, dodge: 15, avoidCritical: 22 },
      elemental: { physicalDefense: 60, magicDefense: 93, dodge: 23, avoidCritical: 22 },
      dragonkin: { physicalDefense: 86, magicDefense: 78, dodge: 20, avoidCritical: 22 },
      demon: { physicalDefense: 67, magicDefense: 90, dodge: 25, avoidCritical: 22 },
      reptile: { physicalDefense: 82, magicDefense: 67, dodge: 30, avoidCritical: 22 },
    });
  });

  it('converts classic armor, scales rank, and preserves explicit zero overrides', () => {
    expect(mir4MobBuildDefenses(50, 'humanoid', 'normal', 4_650)).toEqual({
      physicalDefense: 100,
      magicDefense: 75,
      dodge: 25,
      avoidCritical: 22,
    });
    expect(mir4MobBuildDefenses(50, 'humanoid', 'veteran')).toEqual({
      physicalDefense: 86,
      magicDefense: 86,
      dodge: 23,
      avoidCritical: 22,
    });
    expect(mir4MobBuildDefenses(200, 'humanoid', 'guardian').physicalDefense).toBe(168);
    expect(
      mir4MobBuildDefenses(200, 'beast', 'guardian', 0, {
        physicalDefense: 0,
        magicDefense: 0,
        dodge: 0,
        avoidCritical: 0,
      }),
    ).toEqual({ physicalDefense: 0, magicDefense: 0, dodge: 0, avoidCritical: 0 });
  });

  it('applies partial overrides and fails closed for invalid runtime data', () => {
    expect(mir4MobBuildDefenses(50, 'humanoid', 'normal', 0, { magicDefense: 0 })).toEqual({
      physicalDefense: 75,
      magicDefense: 0,
      dodge: 25,
      avoidCritical: 22,
    });
    expect(
      mir4MobBuildDefenses(
        Number.NaN,
        'unknown' as never,
        'unknown' as never,
        Number.POSITIVE_INFINITY,
      ),
    ).toEqual({ physicalDefense: 2, magicDefense: 2, dodge: 6, avoidCritical: 4 });
    expect(
      mir4MobBuildDefenses(50, 'humanoid', 'normal', 0, {
        physicalDefense: Number.NaN,
        magicDefense: Number.POSITIVE_INFINITY,
        dodge: -1,
        avoidCritical: 1e20,
      }),
    ).toEqual({ physicalDefense: 0, magicDefense: 0, dodge: 0, avoidCritical: 1_000_000_000 });
  });
});
