import { describe, expect, it } from 'vitest';
import { PROP_ASSET_DEFS } from '../../src/render/props';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_MAP_DRESSING_RECIPES } from '../../src/sim/content/mir4/arc_world_dressing';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { LAKE_BLEND_RADIUS_MULT } from '../../src/sim/world';

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

describe('MIR4 target-native map dressing', () => {
  it('authors one distinct WoC-native visual theme for every campaign map', () => {
    expect(MIR4_ARC_MAP_DRESSING_RECIPES.map((recipe) => recipe.mapId)).toEqual(
      MIR4_WORLD_ARC.map((map) => map.mapId),
    );
    expect(new Set(MIR4_ARC_MAP_DRESSING_RECIPES.map((recipe) => recipe.themeId)).size).toBe(
      MIR4_WORLD_ARC.length,
    );
    for (const recipe of MIR4_ARC_MAP_DRESSING_RECIPES) {
      expect(recipe.decorProps.length, recipe.mapId).toBeGreaterThanOrEqual(3);
      expect(recipe.terrainEdits?.length, recipe.mapId).toBeGreaterThanOrEqual(1);
      for (const prop of recipe.decorProps) {
        expect(prop.key in PROP_ASSET_DEFS, `${recipe.mapId} native prop ${prop.key}`).toBe(true);
      }
    }
  });

  it('keeps every landmark, lake and terrain signature inside its map and off gameplay lanes', () => {
    const world = buildMir4ArcWorld();
    const decorProps = world.props.decorProps ?? [];
    const terrainEdits = world.terrainEdits ?? [];

    for (const zone of world.zones) {
      const mapDecor = decorProps.filter((prop) => prop.z >= zone.zMin && prop.z < zone.zMax);
      const mapEdits = terrainEdits.filter((edit) => edit.z >= zone.zMin && edit.z < zone.zMax);
      const mapCamps = world.camps.filter(
        (camp) => camp.center.z >= zone.zMin && camp.center.z < zone.zMax,
      );
      expect(mapDecor.length, `${zone.id} decor`).toBeGreaterThanOrEqual(3);
      expect(mapEdits.length, `${zone.id} terrain`).toBeGreaterThanOrEqual(1);

      for (const prop of mapDecor) {
        expect(prop.x, `${zone.id} ${prop.key} x`).toBeGreaterThan(zone.xMin ?? -120);
        expect(prop.x, `${zone.id} ${prop.key} x`).toBeLessThan(zone.xMax ?? 120);
        expect(Math.abs(prop.x), `${zone.id} ${prop.key} road clearance`).toBeGreaterThanOrEqual(
          34,
        );
        expect(
          Math.hypot(prop.x - zone.hub.x, prop.z - zone.hub.z),
          `${zone.id} ${prop.key} hub clearance`,
        ).toBeGreaterThan(zone.hub.radius + (prop.r ?? 0));
        for (const camp of mapCamps) {
          expect(
            Math.hypot(prop.x - camp.center.x, prop.z - camp.center.z),
            `${zone.id} ${prop.key} camp clearance`,
          ).toBeGreaterThan(camp.radius + (prop.r ?? 0));
        }
      }

      for (const lake of zone.lakes) {
        const footprint = lake.radius * LAKE_BLEND_RADIUS_MULT;
        expect(lake.x - footprint, `${zone.id} lake west`).toBeGreaterThanOrEqual(
          zone.xMin ?? -120,
        );
        expect(lake.x + footprint, `${zone.id} lake east`).toBeLessThanOrEqual(zone.xMax ?? 120);
        expect(lake.z - footprint, `${zone.id} lake south`).toBeGreaterThanOrEqual(zone.zMin);
        expect(lake.z + footprint, `${zone.id} lake north`).toBeLessThanOrEqual(zone.zMax);
        expect(Math.abs(lake.x) - footprint, `${zone.id} lake road clearance`).toBeGreaterThan(30);
      }
    }
  });

  it('projects harbor and underground motifs through the existing world vocabulary', () => {
    const world = buildMir4ArcWorld();
    const harbor = required(
      world.zones.find((zone) => zone.id === 'mir4_m12-porto-dos-juncos'),
      'M12 harbor zone',
    );
    const ossuary = required(
      world.zones.find((zone) => zone.id === 'mir4_m07-galerias-do-ossario'),
      'M07 ossuary zone',
    );
    expect(harbor.lakes).toHaveLength(1);
    expect(world.props.docks.some((dock) => dock.z >= harbor.zMin && dock.z < harbor.zMax)).toBe(
      true,
    );
    expect(
      (world.props.decorProps ?? []).some(
        (prop) => prop.z >= harbor.zMin && prop.z < harbor.zMax && prop.key === 'hexShipBlue',
      ),
    ).toBe(true);
    expect(world.props.mines.some((mine) => mine.z >= ossuary.zMin && mine.z < ossuary.zMax)).toBe(
      true,
    );
  });

  it('gives the adjacent marsh and desert maps a dominant, distinct silhouette vocabulary', () => {
    const recipe = (mapId: string) =>
      required(
        MIR4_ARC_MAP_DRESSING_RECIPES.find((candidate) => candidate.mapId === mapId),
        `${mapId} dressing`,
      );
    const countKeys = (mapId: string, keys: ReadonlySet<string>) =>
      recipe(mapId).decorProps.filter((prop) => keys.has(prop.key)).length;

    expect(
      countKeys(
        'm09-pantano-das-lanternas',
        new Set(['mushroomGiantPurple', 'mushroomGlowCluster', 'flowerGlow']),
      ),
    ).toBeGreaterThanOrEqual(5);
    expect(
      countKeys(
        'm10-charcos-do-rei-bog',
        new Set(['pixieMushroomHouse', 'mushroomGiantPurple', 'mushroomRed', 'mushroomTan']),
      ),
    ).toBeGreaterThanOrEqual(4);
    expect(
      countKeys(
        'm11-mangue-das-sanguessugas',
        new Set(['hexBoat', 'hexBoatrack', 'hexAnchor', 'rowboat']),
      ) + recipe('m11-mangue-das-sanguessugas').docks!.length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      countKeys(
        'm13-dunas-de-vidro',
        new Set(['starHeartCrystal', 'crystalAmethystCluster', 'crystalMoundCave', 'kcasRocks']),
      ),
    ).toBeGreaterThanOrEqual(6);
    expect(
      countKeys(
        'm14-necropole-de-akhet',
        new Set([
          'kcasShrine',
          'kkPillar',
          'graveRound',
          'graveCross',
          'graveBevel',
          'graveDecor',
          'kcasWallBroken',
        ]),
      ),
    ).toBeGreaterThanOrEqual(7);
  });
});
