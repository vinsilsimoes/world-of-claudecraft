import { afterEach, describe, expect, it } from 'vitest';
import { PROP_ASSET_DEFS } from '../../src/render/props';
import { mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_AUTHORED_MAP_IDS } from '../../src/sim/content/mir4/authored_maps';
import { M02_TRILHA_DOS_JUNCOS_BLUEPRINT } from '../../src/sim/content/mir4/m02_trilha_dos_juncos_world';
import { BUILTIN_WORLD, setActiveWorldContent } from '../../src/sim/data';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { worldForGameProfile } from '../../src/sim/game_profile_world';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { Sim } from '../../src/sim/sim';

function insideBounds(point: Readonly<{ x: number; z: number }>): boolean {
  const { bounds } = M02_TRILHA_DOS_JUNCOS_BLUEPRINT;
  return (
    point.x >= bounds.xMin &&
    point.x <= bounds.xMax &&
    point.z >= bounds.zMin &&
    point.z <= bounds.zMax
  );
}

describe('Trilha dos Juncos authored world blueprint', () => {
  afterEach(() => setActiveWorldContent(BUILTIN_WORLD));

  it('keeps M02 admitted after the next map passes its own production gate', () => {
    expect(MIR4_AUTHORED_MAP_IDS).toEqual([
      'm01-vila-do-vau',
      'm02-trilha-dos-juncos',
      'm03-bosque-do-vale',
      'm04-ruinas-da-encosta',
    ]);
    expect(
      worldForGameProfile(MIR4_GAME_PROFILE, { mir4WocMap: false })?.zones.map((zone) => zone.id),
    ).toEqual([
      'mir4_m01-vila-do-vau',
      'mir4_m02-trilha-dos-juncos',
      'mir4_m03-bosque-do-vale',
      'mir4_m04-ruinas-da-encosta',
    ]);
  });

  it('uses a broad wetland circuit with ten authored points of interest', () => {
    const { bounds, missionSites, pointsOfInterest } = M02_TRILHA_DOS_JUNCOS_BLUEPRINT;
    expect(bounds.xMax - bounds.xMin).toBe(640);
    expect(bounds.zMax - bounds.zMin).toBe(440);
    expect(missionSites).toHaveLength(6);
    expect(pointsOfInterest).toHaveLength(10);
    expect(new Set(pointsOfInterest.map((poi) => poi.id)).size).toBe(10);
    expect(new Set(pointsOfInterest.map((poi) => poi.label)).size).toBe(10);
    expect(
      pointsOfInterest.filter((poi) => poi.purpose === 'exploration').length,
    ).toBeGreaterThanOrEqual(3);
    expect(pointsOfInterest.every((poi) => insideBounds(poi.pos))).toBe(true);
  });

  it('gives every main quest a named location and exact combat band', () => {
    expect(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.missionSites.map((site) => ({
        questId: site.questId,
        label: site.label,
        levelRange: site.levelRange,
      })),
    ).toEqual([
      { questId: 'M02-Q01', label: 'Juncal das Três Chamas', levelRange: [11, 12] },
      { questId: 'M02-Q02', label: 'Passagem dos Batedores', levelRange: [13, 14] },
      { questId: 'M02-Q03', label: 'Ilhas das Quatro Vozes', levelRange: [15, 15] },
      { questId: 'M02-Q04', label: 'Entreposto Afundado', levelRange: [16, 17] },
      { questId: 'M02-Q05', label: 'Três Abrigos da Maré', levelRange: [18, 19] },
      { questId: 'M02-Q06', label: 'Raiz do Guardião', levelRange: [20, 20] },
    ]);
    expect(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.camps.map((camp) => ({
        questId: camp.questId,
        levelRange: camp.levelRange,
      })),
    ).toEqual(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.missionSites.map((site) => ({
        questId: site.questId,
        levelRange: site.levelRange,
      })),
    );
  });

  it('keeps architecture compatible with ecology and local history', () => {
    const poiById = new Map(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.pointsOfInterest.map((poi) => [poi.id, poi] as const),
    );
    for (const placement of M02_TRILHA_DOS_JUNCOS_BLUEPRINT.decorPlacements) {
      const poi = poiById.get(placement.poiId);
      expect(poi, placement.poiId).toBeDefined();
      expect(placement.key in PROP_ASSET_DEFS, placement.key).toBe(true);
      if (poi?.occupants === 'wildlife' || poi?.occupants === 'spirits') {
        expect(placement.origin, `${poi.label}:${placement.key}`).not.toBe('settlement');
      }
    }
    expect(poiById.get('m02-poi-posto-duas-pontes')).toMatchObject({
      occupants: 'villagers',
      architecture: 'raised-marsh-settlement',
    });
    expect(poiById.get('m02-poi-entreposto-afundado')).toMatchObject({
      occupants: 'wildlife',
      architecture: 'natural-wetland',
    });
    expect(poiById.get('m02-poi-raiz-guardiao')).toMatchObject({
      occupants: 'guardians',
      architecture: 'root-sanctuary',
    });
  });

  it('builds the two bridge identity from actual marsh crossings and water banks', () => {
    const bridges = M02_TRILHA_DOS_JUNCOS_BLUEPRINT.decorPlacements.filter(
      (placement) => placement.key === 'marshPlankBridge',
    );
    expect(bridges).toHaveLength(2);
    expect(M02_TRILHA_DOS_JUNCOS_BLUEPRINT.dryCrossings).toHaveLength(2);
    for (const bridge of bridges) {
      expect(
        M02_TRILHA_DOS_JUNCOS_BLUEPRINT.dryCrossings.some(
          (crossing) => Math.hypot(crossing.x - bridge.x, crossing.z - bridge.z) <= 3,
        ),
        bridge.poiId,
      ).toBe(true);
      expect(
        M02_TRILHA_DOS_JUNCOS_BLUEPRINT.lakes.filter(
          (lake) => Math.hypot(lake.x - bridge.x, lake.z - bridge.z) <= lake.radius + 15,
        ).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps every mission site on a deliberate route while preserving optional loops', () => {
    const { missionSites, roads } = M02_TRILHA_DOS_JUNCOS_BLUEPRINT;
    expect(roads).toHaveLength(9);
    for (const road of roads) {
      expect(road.length).toBeGreaterThanOrEqual(2);
      expect(road.every(insideBounds)).toBe(true);
    }
    for (const site of missionSites) {
      expect(
        roads.some((road) =>
          road.some((point) => point.x === site.pos.x && point.z === site.pos.z),
        ),
        site.questId,
      ).toBe(true);
    }
    expect(
      roads.filter(
        (road) =>
          road.some(
            (point) => point.x === missionSites[1]?.pos.x && point.z === missionSites[1]?.pos.z,
          ) &&
          road.some(
            (point) => point.x === missionSites[4]?.pos.x && point.z === missionSites[4]?.pos.z,
          ),
      ),
    ).toHaveLength(0);
  });

  it('places all campaign and ambient NPCs inside the defended post', () => {
    const { hub, hubRadius, npcPlacements } = M02_TRILHA_DOS_JUNCOS_BLUEPRINT;
    expect(npcPlacements).toHaveLength(9);
    expect(new Set(npcPlacements.map((npc) => npc.id)).size).toBe(9);
    expect(new Set(npcPlacements.map((npc) => npc.name)).size).toBe(9);
    expect(npcPlacements.filter((npc) => npc.campaign)).toHaveLength(4);
    for (const npc of npcPlacements) {
      expect(Math.hypot(npc.pos.x - hub.x, npc.pos.z - hub.z), npc.name).toBeLessThanOrEqual(
        hubRadius,
      );
      for (const decor of M02_TRILHA_DOS_JUNCOS_BLUEPRINT.decorPlacements) {
        if (decor.hw !== undefined && decor.hd !== undefined) {
          const dx = npc.pos.x - decor.x;
          const dz = npc.pos.z - decor.z;
          const cos = Math.cos(-(decor.rot ?? 0));
          const sin = Math.sin(-(decor.rot ?? 0));
          const localX = dx * cos - dz * sin;
          const localZ = dx * sin + dz * cos;
          expect(
            Math.abs(localX) > decor.hw + 0.8 || Math.abs(localZ) > decor.hd + 0.8,
            `${npc.name} inside ${decor.key}`,
          ).toBe(true);
        } else if (decor.r) {
          expect(
            Math.hypot(npc.pos.x - decor.x, npc.pos.z - decor.z),
            `${npc.name} inside ${decor.key}`,
          ).toBeGreaterThan(decor.r + 0.8);
        }
      }
    }
  });

  it('projects every M02 POI, NPC and hostile camp into the runtime world exactly once', () => {
    const world = buildMir4ArcWorld(2);
    const zone = world.zones.find((candidate) => candidate.id === 'mir4_m02-trilha-dos-juncos');
    expect(zone?.pois).toEqual(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.pointsOfInterest.map((poi) => ({
        id: poi.id,
        x: poi.pos.x,
        z: poi.pos.z,
        label: poi.label,
      })),
    );
    for (const npc of M02_TRILHA_DOS_JUNCOS_BLUEPRINT.npcPlacements) {
      expect(world.npcs[npc.id]?.pos, npc.id).toEqual(npc.pos);
    }
    const camps = world.camps.filter((camp) => insideBounds(camp.center));
    expect(camps).toEqual(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.camps.map((camp) => ({
        mobId: `mir4_m02-trilha-dos-juncos_${camp.mobId}`,
        center: camp.center,
        radius: camp.radius,
        count: camp.count,
        minLevel: camp.levelRange[0],
        maxLevel: camp.levelRange[1],
        offStream: true,
      })),
    );
  });

  it('spawns every authored M02 camp at its exact population and combat band', () => {
    const world = buildMir4ArcWorld(2);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 20_202,
      playerClass: 'warrior',
      playerName: 'M02PopulationAudit',
      gameProfile: MIR4_GAME_PROFILE,
      world,
    });
    for (const camp of M02_TRILHA_DOS_JUNCOS_BLUEPRINT.camps) {
      const templateId = `mir4_m02-trilha-dos-juncos_${camp.mobId}`;
      const mobs = [...sim.entities.values()].filter(
        (entity) => entity.kind === 'mob' && entity.templateId === templateId,
      );
      expect(mobs, templateId).toHaveLength(camp.count);
      expect(
        mobs.every((mob) => mob.level >= camp.levelRange[0] && mob.level <= camp.levelRange[1]),
        templateId,
      ).toBe(true);
    }
  });

  it('lets Auto Journey operate the solid guardian roots from their reachable edge', () => {
    const world = { ...buildMir4ArcWorld(2), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 20_261,
      playerClass: 'warrior',
      playerName: 'RootWardJourney',
      gameProfile: MIR4_GAME_PROFILE,
      world,
    });
    sim.setPlayerLevel(20);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M02-Q06': {
        questId: 'M02-Q06',
        stageIndex: 2,
        stageProgress: 0,
        state: 'active',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M02-Q06',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
      manualSelection: true,
    };
    sim.player.pos = sim.groundPos(3320, 212);

    let ticks = 0;
    while (
      meta.mir4ArcQuests['M02-Q06']?.stageIndex === 2 &&
      meta.mir4ArcQuests['M02-Q06']?.stageProgress === 0 &&
      ticks++ < 700
    ) {
      sim.tick();
    }

    expect(ticks).toBeLessThan(700);
    expect(meta.mir4ArcQuests['M02-Q06']).not.toMatchObject({
      stageIndex: 2,
      stageProgress: 0,
    });
  });

  it('binds M02 interactions to the visible landmarks that explain each objective', () => {
    expect(
      M02_TRILHA_DOS_JUNCOS_BLUEPRINT.objectiveAnchors.map(
        (plan) => `${plan.questId}:${plan.stageIndex}:${plan.points.length}`,
      ),
    ).toEqual([
      'M02-Q01:2:3',
      'M02-Q01:4:3',
      'M02-Q02:2:3',
      'M02-Q03:2:3',
      'M02-Q03:4:1',
      'M02-Q04:2:3',
      'M02-Q05:2:3',
      'M02-Q06:2:3',
      'M02-Q06:3:1',
      'M02-Q06:4:1',
    ]);
    for (const plan of M02_TRILHA_DOS_JUNCOS_BLUEPRINT.objectiveAnchors) {
      const quest = mir4ArcQuest(plan.questId)!;
      const stage = quest.stages[plan.stageIndex]!;
      for (let index = 0; index < plan.points.length; index++) {
        expect(mir4ArcStageAnchor(plan.questId, stage, index)).toEqual(plan.points[index]);
      }
    }
  });

  it('uses only native WoC asset paths for the new wetland vocabulary', () => {
    expect(PROP_ASSET_DEFS.fenbridgeWardenGatehouse?.url).toBe(
      '/models/props/fenbridge_warden_gatehouse.glb',
    );
    expect(PROP_ASSET_DEFS.fenbridgeCrookedReedInn?.url).toBe(
      '/models/props/fenbridge_crooked_reed_inn.glb',
    );
    expect(PROP_ASSET_DEFS.marshPlankBridge?.url).toBe('/models/props/marsh_plank_bridge.glb');
    expect(PROP_ASSET_DEFS.marshRootWall?.url).toBe('/models/props/marsh_root_wall.glb');
    expect(PROP_ASSET_DEFS.marshShrineFragment?.url).toBe(
      '/models/props/marsh_shrine_fragment.glb',
    );
  });
});
