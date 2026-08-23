import { describe, expect, it } from 'vitest';
import { PROP_ASSET_DEFS } from '../../src/render/props';
import { streetlampPlacements } from '../../src/sim/colliders';
import { MIR4_AUTHORED_MAP_IDS } from '../../src/sim/content/mir4/authored_maps';
import { M01_VILA_DO_VAU_BLUEPRINT } from '../../src/sim/content/mir4/m01_vila_do_vau_world';
import { setActiveWorldContent } from '../../src/sim/data';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { worldForGameProfile } from '../../src/sim/game_profile_world';
import { Sim } from '../../src/sim/sim';

function distanceToSegment(
  point: Readonly<{ x: number; z: number }>,
  start: Readonly<{ x: number; z: number }>,
  end: Readonly<{ x: number; z: number }>,
): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq <= 0) return Math.hypot(point.x - start.x, point.z - start.z);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq),
  );
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

function roadClearance(point: Readonly<{ x: number; z: number }>): number {
  let closest = Number.POSITIVE_INFINITY;
  for (const road of M01_VILA_DO_VAU_BLUEPRINT.roads) {
    for (let index = 0; index + 1 < road.length; index += 1) {
      const start = road[index];
      const end = road[index + 1];
      if (!start || !end) continue;
      closest = Math.min(closest, distanceToSegment(point, start, end));
    }
  }
  return closest;
}

describe('Vila do Vau authored world blueprint', () => {
  it('remains the first frozen approved map after M04 admission', () => {
    expect(MIR4_AUTHORED_MAP_IDS[0]).toBe('m01-vila-do-vau');
    expect(
      worldForGameProfile(MIR4_GAME_PROFILE, { mir4WocMap: false })?.zones.map((zone) => zone.id),
    ).toEqual([
      'mir4_m01-vila-do-vau',
      'mir4_m02-trilha-dos-juncos',
      'mir4_m03-bosque-do-vale',
      'mir4_m04-ruinas-da-encosta',
    ]);
  });

  it('sizes the valley from its content instead of the six-site scaffold', () => {
    const { bounds, missionSites, pointsOfInterest } = M01_VILA_DO_VAU_BLUEPRINT;
    expect(bounds.xMax - bounds.xMin).toBeGreaterThanOrEqual(360);
    expect(bounds.zMax - bounds.zMin).toBeGreaterThanOrEqual(340);
    expect(missionSites).toHaveLength(6);
    expect(pointsOfInterest.length).toBeGreaterThanOrEqual(6);
    expect(pointsOfInterest.length).toBeLessThanOrEqual(10);
    expect(new Set(pointsOfInterest.map((poi) => poi.id)).size).toBe(pointsOfInterest.length);
    expect(
      pointsOfInterest.filter((poi) => poi.purpose === 'exploration').length,
    ).toBeGreaterThanOrEqual(3);
    for (const site of missionSites) {
      const boundaryClearance = Math.min(
        site.pos.x - bounds.xMin,
        bounds.xMax - site.pos.x,
        site.pos.z - bounds.zMin,
        bounds.zMax - site.pos.z,
      );
      expect(boundaryClearance, site.id).toBeGreaterThanOrEqual(80);
    }
  });

  it('gives every main mission a named space connected to the authored road network', () => {
    const { missionSites, roads } = M01_VILA_DO_VAU_BLUEPRINT;
    expect(missionSites.map((site) => site.questId)).toEqual([
      'M01-Q01',
      'M01-Q02',
      'M01-Q03',
      'M01-Q04',
      'M01-Q05',
      'M01-Q06',
    ]);
    expect(new Set(missionSites.map((site) => site.label)).size).toBe(missionSites.length);
    expect(roads.length).toBeGreaterThanOrEqual(6);
    for (const site of missionSites) {
      expect(
        roads.some((road) =>
          road.some((point) => point.x === site.pos.x && point.z === site.pos.z),
        ),
        site.questId,
      ).toBe(true);
    }
  });

  it('matches each combat space to the creature and gameplay named by its quest', () => {
    expect(
      M01_VILA_DO_VAU_BLUEPRINT.camps.map((camp) => ({
        questId: camp.questId,
        mobId: camp.mobId,
      })),
    ).toEqual([
      { questId: 'M01-Q01', mobId: 'forest_wolf' },
      { questId: 'M01-Q02', mobId: 'rabid_boar' },
      { questId: 'M01-Q03', mobId: 'bandit_cutthroat' },
      { questId: 'M01-Q04', mobId: 'moss_skeleton' },
      { questId: 'M01-Q05', mobId: 'briar_guard' },
      { questId: 'M01-Q06', mobId: 'dire_wolf' },
    ]);
  });

  it('keeps architecture consistent with the ecology and history of each point of interest', () => {
    const poiById = new Map(
      M01_VILA_DO_VAU_BLUEPRINT.pointsOfInterest.map((poi) => [poi.id, poi] as const),
    );
    for (const placement of M01_VILA_DO_VAU_BLUEPRINT.decorPlacements) {
      const poi = poiById.get(placement.poiId);
      expect(poi, placement.poiId).toBeDefined();
      if (poi?.occupants === 'wildlife') {
        expect(placement.origin, `${poi.label}:${placement.key}`).not.toBe('human');
      }
    }
    const settlement = poiById.get('m01-poi-vila-do-vau');
    expect(settlement).toBeDefined();
    if (!settlement) throw new Error('M01 settlement POI is required');
    expect(settlement.architecture).toBe('human-settlement');
    expect(M01_VILA_DO_VAU_BLUEPRINT.buildings.length).toBeGreaterThanOrEqual(5);
    for (const building of M01_VILA_DO_VAU_BLUEPRINT.buildings) {
      expect(
        Math.hypot(building.x - settlement.pos.x, building.z - settlement.pos.z),
      ).toBeLessThanOrEqual(settlement.radius);
    }
  });

  it('keeps solid landmark footprints outside every traversable road', () => {
    for (const placement of M01_VILA_DO_VAU_BLUEPRINT.decorPlacements) {
      expect(placement.key in PROP_ASSET_DEFS, placement.key).toBe(true);
      if ((placement.r ?? 0) <= 0) continue;
      expect(roadClearance(placement), placement.key).toBeGreaterThan((placement.r ?? 0) + 4);
    }
  });

  it('keeps every road on visible land or through the authored ford opening', () => {
    const { lakes, roads } = M01_VILA_DO_VAU_BLUEPRINT;
    for (const road of roads) {
      for (let index = 0; index + 1 < road.length; index += 1) {
        const start = road[index];
        const end = road[index + 1];
        if (!start || !end) continue;
        const length = Math.hypot(end.x - start.x, end.z - start.z);
        const samples = Math.max(1, Math.ceil(length / 2));
        for (let sample = 0; sample <= samples; sample += 1) {
          const t = sample / samples;
          const point = {
            x: start.x + (end.x - start.x) * t,
            z: start.z + (end.z - start.z) * t,
          };
          for (const lake of lakes) {
            expect(
              Math.hypot(point.x - lake.x, point.z - lake.z),
              `${point.x.toFixed(1)},${point.z.toFixed(1)}`,
            ).toBeGreaterThan(lake.radius + 4);
          }
        }
      }
    }
  });

  it('grounds the Seven Marks bridge between two banks instead of on open grass', () => {
    const bridge = M01_VILA_DO_VAU_BLUEPRINT.decorPlacements.find(
      (placement) =>
        placement.poiId === 'm01-poi-ponte-sete-marcas' && placement.key === 'hexBridge',
    );
    expect(bridge).toMatchObject({ origin: 'human', scale: 3 });
    if (!bridge) throw new Error('M01 bridge placement is required');

    const nearbyWater = M01_VILA_DO_VAU_BLUEPRINT.lakes.filter(
      (lake) => Math.hypot(lake.x - bridge.x, lake.z - bridge.z) <= lake.radius + 12,
    );
    expect(nearbyWater).toHaveLength(2);
  });

  it('lights only the human settlement roads, never the wildlife or ruin routes', () => {
    const world = worldForGameProfile(MIR4_GAME_PROFILE, { mir4WocMap: false });
    if (!world) throw new Error('MIR4 world is required');
    expect((world.litRoads ?? []).slice(0, M01_VILA_DO_VAU_BLUEPRINT.litRoads.length)).toEqual(
      M01_VILA_DO_VAU_BLUEPRINT.litRoads,
    );
    setActiveWorldContent(world);
    try {
      const lamps = streetlampPlacements(171);
      const { bounds } = M01_VILA_DO_VAU_BLUEPRINT;
      const m01Lamps = lamps.filter(
        (lamp) =>
          lamp.x >= bounds.xMin &&
          lamp.x <= bounds.xMax &&
          lamp.z >= bounds.zMin &&
          lamp.z <= bounds.zMax,
      );
      expect(m01Lamps.length).toBeGreaterThanOrEqual(2);
      expect(m01Lamps.every((lamp) => lamp.z < 38)).toBe(true);
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('makes each encounter level match its quest progression band', () => {
    const world = worldForGameProfile(MIR4_GAME_PROFILE, { mir4WocMap: false });
    if (!world) throw new Error('MIR4 world is required');
    for (const planned of M01_VILA_DO_VAU_BLUEPRINT.camps) {
      const camp = world.camps.find((candidate) => candidate.mobId.endsWith(planned.mobId));
      expect(camp, planned.questId).toMatchObject({
        minLevel: planned.levelRange[0],
        maxLevel: planned.levelRange[1],
      });
    }

    setActiveWorldContent(world);
    try {
      const sim = new Sim({
        seed: 171,
        playerClass: 'warrior',
        gameProfile: MIR4_GAME_PROFILE,
        world,
      });
      for (const planned of M01_VILA_DO_VAU_BLUEPRINT.camps) {
        const levels = [...sim.entities.values()]
          .filter(
            (entity) =>
              entity.templateId === `mir4_${M01_VILA_DO_VAU_BLUEPRINT.mapId}_${planned.mobId}`,
          )
          .map((entity) => entity.level);
        expect(levels.length, planned.questId).toBe(planned.count);
        expect(
          levels.every((level) => level >= planned.levelRange[0] && level <= planned.levelRange[1]),
          planned.questId,
        ).toBe(true);
      }
    } finally {
      setActiveWorldContent(null);
    }
  });
});
