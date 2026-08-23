import { describe, expect, it } from 'vitest';
import { PROP_ASSET_DEFS } from '../../src/render/props';
import { colliderInternalsForTest } from '../../src/sim/colliders';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_MAP_DRESSING_RECIPES } from '../../src/sim/content/mir4/arc_world_dressing';
import { M01_VILA_DO_VAU_BLUEPRINT } from '../../src/sim/content/mir4/m01_vila_do_vau_world';
import { M02_TRILHA_DOS_JUNCOS_BLUEPRINT } from '../../src/sim/content/mir4/m02_trilha_dos_juncos_world';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from '../../src/sim/content/mir4/m03_bosque_do_vale_world';
import { M04_RUINAS_DA_ENCOSTA_BLUEPRINT } from '../../src/sim/content/mir4/m04_ruinas_da_encosta_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  isInWaterBody,
  LAKE_BLEND_RADIUS_MULT,
  roadDistance,
  terrainHeight,
  waterLevel,
} from '../../src/sim/world';

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

describe('MIR4 target-native map dressing', () => {
  it('keeps scaffold themes separate from the four production-authored blueprints', () => {
    expect(MIR4_ARC_MAP_DRESSING_RECIPES.map((recipe) => recipe.mapId)).toEqual(
      MIR4_WORLD_ARC.slice(4).map((map) => map.mapId),
    );
    expect(new Set(MIR4_ARC_MAP_DRESSING_RECIPES.map((recipe) => recipe.themeId)).size).toBe(
      MIR4_WORLD_ARC.length - 4,
    );
    expect(M01_VILA_DO_VAU_BLUEPRINT.authoringStatus).toBe('production-authored');
    expect(M01_VILA_DO_VAU_BLUEPRINT.decorPlacements.length).toBeGreaterThanOrEqual(20);
    expect(M02_TRILHA_DOS_JUNCOS_BLUEPRINT.authoringStatus).toBe('production-authored');
    expect(M02_TRILHA_DOS_JUNCOS_BLUEPRINT.decorPlacements.length).toBeGreaterThanOrEqual(30);
    expect(M03_BOSQUE_DO_VALE_BLUEPRINT.authoringStatus).toBe('production-authored');
    expect(M03_BOSQUE_DO_VALE_BLUEPRINT.decorPlacements.length).toBeGreaterThanOrEqual(50);
    expect(M04_RUINAS_DA_ENCOSTA_BLUEPRINT.authoringStatus).toBe('production-authored');
    expect(M04_RUINAS_DA_ENCOSTA_BLUEPRINT.decorPlacements.length).toBeGreaterThanOrEqual(90);
    for (const prop of M02_TRILHA_DOS_JUNCOS_BLUEPRINT.decorPlacements) {
      expect(prop.key in PROP_ASSET_DEFS, `M02 native prop ${prop.key}`).toBe(true);
    }
    for (const recipe of MIR4_ARC_MAP_DRESSING_RECIPES) {
      expect(recipe.decorProps.length, recipe.mapId).toBeGreaterThanOrEqual(3);
      expect(recipe.terrainEdits?.length, recipe.mapId).toBeGreaterThanOrEqual(1);
      for (const prop of recipe.decorProps) {
        expect(prop.key in PROP_ASSET_DEFS, `${recipe.mapId} native prop ${prop.key}`).toBe(true);
      }
    }
  });

  it('keeps every landmark, lake and terrain signature inside its map and off gameplay lanes', () => {
    const world = buildMir4ArcWorld(20);
    const decorProps = world.props.decorProps ?? [];
    const terrainEdits = world.terrainEdits ?? [];

    for (const zone of world.zones) {
      const inside = (point: { x: number; z: number }) =>
        point.x >= (zone.xMin ?? -120) &&
        point.x < (zone.xMax ?? 120) &&
        point.z >= zone.zMin &&
        point.z < zone.zMax;
      const mapDecor = decorProps.filter(inside);
      const mapEdits = terrainEdits.filter(inside);
      const mapCamps = world.camps.filter((camp) => inside(camp.center));
      expect(mapDecor.length, `${zone.id} decor`).toBeGreaterThanOrEqual(3);
      expect(mapEdits.length, `${zone.id} terrain`).toBeGreaterThanOrEqual(1);

      for (const prop of mapDecor) {
        expect(prop.x, `${zone.id} ${prop.key} x`).toBeGreaterThan(zone.xMin ?? -120);
        expect(prop.x, `${zone.id} ${prop.key} x`).toBeLessThan(zone.xMax ?? 120);
        const hubDistance = Math.hypot(prop.x - zone.hub.x, prop.z - zone.hub.z);
        const isOpenPortalArch =
          prop.key === 'gardenArch' &&
          prop.r === undefined &&
          prop.hw === undefined &&
          prop.hd === undefined;
        const isAuthoredMap = [
          'mir4_m01-vila-do-vau',
          'mir4_m02-trilha-dos-juncos',
          'mir4_m03-bosque-do-vale',
          'mir4_m04-ruinas-da-encosta',
        ].includes(zone.id);
        if (!isOpenPortalArch && !isAuthoredMap) {
          expect(hubDistance, `${zone.id} ${prop.key} hub clearance`).toBeGreaterThan(
            zone.hub.radius + (prop.r ?? 0),
          );
        }
        for (const camp of isAuthoredMap ? [] : mapCamps) {
          if ((prop.r ?? 0) <= 0) continue;
          expect(
            Math.hypot(prop.x - camp.center.x, prop.z - camp.center.z),
            `${zone.id} ${prop.key} camp clearance`,
          ).toBeGreaterThan((prop.r ?? 0) + 2);
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
      }
    }
    for (const [x, z] of world.props.campfires) {
      expect(roadDistance(x, z), `campfire ${x},${z}`).toBeGreaterThan(4);
    }
  });

  it('gives Reed Trail a native landmark hierarchy instead of scaffold placeholders', () => {
    const recipe = M02_TRILHA_DOS_JUNCOS_BLUEPRINT;
    const reedVocabulary = new Set([
      'rowboat',
      'fenbridgeBoardwalk',
      'marshPlankBridge',
      'marshSluicePost',
      'marshShrineFragment',
      'marshCorpseCandle',
      'marshBellGallows',
      'marshReedCluster',
      'marshRootWall',
    ]);
    expect(recipe.decorPlacements.length).toBeGreaterThanOrEqual(30);
    expect(
      recipe.decorPlacements.filter((prop) => reedVocabulary.has(prop.key)).length,
    ).toBeGreaterThanOrEqual(20);
    expect(recipe.terrainEdits.length).toBeGreaterThanOrEqual(8);
    expect(recipe.dryCrossings).toHaveLength(2);
  });

  it('keeps Reed Trail landmarks physically legible, dry or deliberately floating, and off roads', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const zone = required(
      world.zones.find((candidate) => candidate.id === 'mir4_m02-trilha-dos-juncos'),
      'M02 zone',
    );
    const props = (world.props.decorProps ?? []).filter(
      (prop) =>
        prop.x >= (zone.xMin ?? Number.NEGATIVE_INFINITY) &&
        prop.x < (zone.xMax ?? Number.POSITIVE_INFINITY) &&
        prop.z >= zone.zMin &&
        prop.z < zone.zMax,
    );
    for (const prop of props) {
      const inLake = isInWaterBody(prop.x, prop.z);
      if (inLake) {
        expect(prop.float, `${prop.key} in water`).toBeDefined();
      } else {
        expect(terrainHeight(prop.x, prop.z, 181), `${prop.key} dry ground`).toBeGreaterThan(
          waterLevel(),
        );
      }
      if ((prop.r ?? 0) > 0) {
        expect(roadDistance(prop.x, prop.z), `${prop.key} road clearance`).toBeGreaterThan(
          (prop.r ?? 0) + 4,
        );
      }
    }
    for (const key of ['fenbridgeWardenGatehouse', 'marshShrineFragment', 'marshRootWall']) {
      const landmark = required(
        props.find((prop) => prop.key === key),
        key,
      );
      expect(
        (landmark.r ?? 0) > 0 || ((landmark.hw ?? 0) > 0 && (landmark.hd ?? 0) > 0),
        `${key} physical footprint`,
      ).toBe(true);
    }
    expect(props.filter((prop) => prop.key === 'marshPlankBridge')).toHaveLength(2);
    expect(props.filter((prop) => prop.key === 'marshRootWall').length).toBeGreaterThanOrEqual(4);

    const colliders = colliderInternalsForTest.staticWorldColliders(181);
    for (const prop of props.filter(
      (candidate) => (candidate.r ?? 0) > 0 || ((candidate.hw ?? 0) > 0 && (candidate.hd ?? 0) > 0),
    )) {
      const collider = colliders.find(
        (candidate) =>
          Math.abs(candidate.x - prop.x) < 0.01 && Math.abs(candidate.z - prop.z) < 0.01,
      );
      expect(collider, `${prop.key} runtime collider`).toBeDefined();
      if (prop.hw !== undefined && prop.hd !== undefined) {
        expect(collider, `${prop.key} oriented runtime collider`).toMatchObject({
          type: 'obb',
          hw: prop.hw,
          hd: prop.hd,
          rot: prop.rot ?? 0,
        });
      }
      if (prop.float !== undefined) {
        expect(collider?.cameraTopY, `${prop.key} floating collider top`).toBeGreaterThan(
          waterLevel(),
        );
      }
    }
  });

  it('projects harbor and underground motifs through the existing world vocabulary', () => {
    const world = buildMir4ArcWorld(20);
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
      ) + (recipe('m11-mangue-das-sanguessugas').docks?.length ?? 0),
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
