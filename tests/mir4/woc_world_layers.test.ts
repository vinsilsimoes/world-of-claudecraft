import { describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { BUILTIN_WORLD } from '../../src/sim/data';
import {
  composeAeldruneWorld,
  WORLD_GAMEPLAY_LAYER_KEYS,
  WORLD_GEOMETRY_LAYER_KEYS,
} from '../../src/sim/mir4/woc_world_layers';

describe('WoC geometry and Aeldrune gameplay composition', () => {
  it('copies only geometry from WoC and keeps every gameplay authority in Aeldrune', () => {
    const gameplay = buildMir4ArcWorld(1);
    const starterZone = BUILTIN_WORLD.zones[0];
    if (!starterZone) throw new Error('The WoC geometry fixture requires a starter zone');
    const poisonedWoC = {
      ...BUILTIN_WORLD,
      zones: [{ ...starterZone, id: 'upstream-gameplay-zone' }],
      camps: [{ mobId: 'upstream-gameplay-mob', center: { x: 0, z: 0 }, radius: 1, count: 99 }],
      npcs: {},
      groundObjects: [],
      playerStart: { x: 999, z: 999 },
      services: undefined,
      travelPortals: [],
    };

    const world = composeAeldruneWorld({ geometry: poisonedWoC, gameplay });

    expect(world.roads).toBe(poisonedWoC.roads);
    expect(world.props).toBe(poisonedWoC.props);
    expect(world.terrainEdits).toBe(poisonedWoC.terrainEdits);
    expect(world.blockers).toBe(poisonedWoC.blockers);
    expect(world.zones).toBe(gameplay.zones);
    expect(world.camps).toBe(gameplay.camps);
    expect(world.npcs).toBe(gameplay.npcs);
    expect(world.groundObjects).toBe(gameplay.groundObjects);
    expect(world.playerStart).toBe(gameplay.playerStart);
    expect(world.services).toBe(gameplay.services);
    expect(world.travelPortals).toBe(gameplay.travelPortals);
    expect(world.camps.some((camp) => camp.mobId === 'upstream-gameplay-mob')).toBe(false);
  });

  it('classifies every WorldContent field into exactly one authority layer', () => {
    const geometry = new Set<string>(WORLD_GEOMETRY_LAYER_KEYS);
    const gameplay = new Set<string>(WORLD_GAMEPLAY_LAYER_KEYS);

    expect([...geometry].filter((key) => gameplay.has(key))).toEqual([]);
    expect([...geometry, ...gameplay].sort()).toEqual([
      'biomePaint',
      'blockers',
      'camps',
      'dryCrossings',
      'groundObjects',
      'litRoads',
      'mir4ArcMapProjections',
      'npcs',
      'placements',
      'playerStart',
      'presentationModel',
      'props',
      'roads',
      'services',
      'terrainEdits',
      'terrainModel',
      'travelPortals',
      'waterLevel',
      'zones',
    ]);
  });

  it('allows reviewed visual overrides without opening a gameplay override path', () => {
    const gameplay = buildMir4ArcWorld(1);
    const props = {
      ...BUILTIN_WORLD.props,
      decorProps: [...(BUILTIN_WORLD.props.decorProps ?? [])],
    };
    const world = composeAeldruneWorld({
      geometry: BUILTIN_WORLD,
      gameplay,
      geometryOverrides: { props, presentationModel: 'builtin' },
    });

    expect(world.props).toBe(props);
    expect(world.presentationModel).toBe('builtin');
    expect(world.camps).toBe(gameplay.camps);
    expect(world.npcs).toBe(gameplay.npcs);
  });
});
