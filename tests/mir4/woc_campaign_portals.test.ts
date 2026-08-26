import { describe, expect, it } from 'vitest';
import { authoredRoadRoute } from '../../src/sim/auto_quest/route';
import { resolveMovement } from '../../src/sim/colliders';
import { BUILTIN_WORLD, setActiveWorldContent } from '../../src/sim/data';
import { mir4ArcPortalsForWorld, mir4PortalRouteGoal } from '../../src/sim/mir4/travel';
import {
  MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS,
  MIR4_WOC_TUTORIAL_PORTALS,
} from '../../src/sim/mir4/woc_campaign_portals';
import { buildMir4WocCampaignWorld } from '../../src/sim/mir4/woc_comparison_world';
import { findReachablePlayerPath } from '../../src/sim/pathfind';
import { terrainHeight, waterLevelAt, withWorldTerrainContent } from '../../src/sim/world';
import { WORLD_SEED } from '../../src/sim/world_seed';

function distanceToSegment(
  point: Readonly<{ x: number; z: number }>,
  a: Readonly<{ x: number; z: number }>,
  b: Readonly<{ x: number; z: number }>,
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (lengthSquared || 1)),
  );
  return Math.hypot(point.x - (a.x + t * dx), point.z - (a.z + t * dz));
}

describe('MIR4 tutorial portals on the WoC campaign map', () => {
  it('uses two reciprocal links on dry ground away from ordinary travel roads', () => {
    expect(MIR4_WOC_TUTORIAL_PORTALS.map((portal) => portal.id)).toEqual([
      'mir4_woc_tutorial_m02_waypoint',
      'mir4_woc_tutorial_m09_waypoint',
    ]);

    withWorldTerrainContent(BUILTIN_WORLD, () => {
      for (const portal of MIR4_WOC_TUTORIAL_PORTALS) {
        for (const side of [portal.a, portal.b]) {
          expect(terrainHeight(side.x, side.z, WORLD_SEED)).toBeGreaterThan(
            waterLevelAt(side.x, side.z, WORLD_SEED),
          );
          const roadDistance = Math.min(
            ...BUILTIN_WORLD.roads.flatMap((road) =>
              road
                .slice(0, -1)
                .map((point, index) => distanceToSegment(side, point, road[index + 1]!)),
            ),
          );
          expect(roadDistance).toBeGreaterThan(portal.radius + 10);
        }
      }
    });
  });

  it('keeps the M09 waypoint directly reachable from the final clue clearing', () => {
    const world = buildMir4WocCampaignWorld();
    const portal = MIR4_WOC_TUTORIAL_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_tutorial_m09_waypoint',
    );
    if (!portal) throw new Error('M09 tutorial waypoint is required');

    setActiveWorldContent(world);
    try {
      // This is the exact final-clue position from the clean Elementalist
      // campaign. The former waypoint at (-55, 330) was visually close but a
      // narrow prop collider held the character at this position forever.
      const from = { x: -18.357103784972423, z: 326.9597895430174 };
      const reached = resolveMovement(WORLD_SEED, from.x, from.z, portal.a.x, portal.a.z, 0.45);

      expect(Math.hypot(reached.x - portal.a.x, reached.z - portal.a.z)).toBeLessThanOrEqual(
        portal.radius,
      );
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('links the two physical road ends between the consecutive M06 and M07 chapters', () => {
    const portal = MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_m06_m07_veil_waypoint',
    );
    if (!portal) throw new Error('M06-M07 campaign transit portal is required');
    expect(portal).toMatchObject({
      id: 'mir4_woc_m06_m07_veil_waypoint',
      a: { x: 244, z: 1512, landing: { x: 250, z: 1512 } },
      b: { x: -360, z: 1568, landing: { x: -360, z: 1576 } },
      radius: 2,
    });

    withWorldTerrainContent(BUILTIN_WORLD, () => {
      for (const side of [portal!.a, portal!.b, portal!.a.landing, portal!.b.landing]) {
        expect(terrainHeight(side.x, side.z, WORLD_SEED)).toBeGreaterThan(
          waterLevelAt(side.x, side.z, WORLD_SEED),
        );
      }
    });

    const world = buildMir4WocCampaignWorld();
    const firstM07Site = { x: -360, z: 1636 };
    const route = authoredRoadRoute(portal.b.landing, firstM07Site, world.roads, world.zones);
    expect(route).not.toBeNull();
    expect(route?.at(-1)).toEqual(firstM07Site);
  });

  it('routes M02 into M03 without crossing the later M09 grind region', () => {
    const world = buildMir4WocCampaignWorld();
    const portal = MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_m02_m03_garden_waypoint',
    );
    if (!portal) throw new Error('M02-M03 campaign transit portal is required');

    expect(portal).toMatchObject({
      a: { x: -230, z: 434, landing: { x: -236, z: 434 } },
      b: { x: 374, z: 776, landing: { x: 368, z: 782 } },
      radius: 2,
    });

    const m02TurnIn = world.npcs['m02-trilha-dos-juncos-darian-passojunco']!.pos;
    const m03Giver = world.npcs['m03-bosque-do-vale-cacadora-lume']!.pos;
    const available = mir4ArcPortalsForWorld(world);

    expect(mir4PortalRouteGoal(m02TurnIn, m03Giver, available, undefined, world)).toEqual({
      x: portal.a.x,
      z: portal.a.z,
    });
    const earlierSideQuestGiver = world.npcs['m01-vila-do-vau-orin-sete-marcas']!.pos;
    const tutorialPortal = MIR4_WOC_TUTORIAL_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_tutorial_m02_waypoint',
    );
    if (!tutorialPortal) throw new Error('M02 tutorial portal is required');
    expect(
      mir4PortalRouteGoal(earlierSideQuestGiver, m03Giver, available, undefined, world),
    ).toEqual({
      x: tutorialPortal.b.x,
      z: tutorialPortal.b.z,
    });
    expect(
      mir4PortalRouteGoal(tutorialPortal.a.landing, m03Giver, available, undefined, world),
    ).toEqual({
      x: portal.a.x,
      z: portal.a.z,
    });
    expect(mir4PortalRouteGoal(portal.b.landing, m03Giver, available, undefined, world)).toEqual(
      m03Giver,
    );
    const m04Giver = world.npcs['m04-ruinas-da-encosta-capita-maela']!.pos;
    expect(mir4PortalRouteGoal(portal.b.landing, m04Giver, available, undefined, world)).toEqual(
      m04Giver,
    );

    setActiveWorldContent(world);
    try {
      const approach = findReachablePlayerPath(WORLD_SEED, m02TurnIn, portal.a, 192);
      expect(approach.length).toBeGreaterThan(0);
      let reached = { ...m02TurnIn };
      for (const waypoint of approach) {
        reached = resolveMovement(WORLD_SEED, reached.x, reached.z, waypoint.x, waypoint.z, 0.45);
      }
      expect(Math.hypot(reached.x - portal.a.x, reached.z - portal.a.z)).toBeLessThanOrEqual(
        portal.radius,
      );

      let position: { x: number; z: number } = { ...portal.b.landing };
      for (let step = 0; step < 200; step += 1) {
        const dx = m03Giver.x - position.x;
        const dz = m03Giver.z - position.z;
        const distance = Math.hypot(dx, dz);
        if (distance <= 3.5) break;
        const stride = Math.min(0.8, distance);
        position = resolveMovement(
          WORLD_SEED,
          position.x,
          position.z,
          position.x + (dx / distance) * stride,
          position.z + (dz / distance) * stride,
          0.45,
        );
      }
      expect(Math.hypot(position.x - m03Giver.x, position.z - m03Giver.z)).toBeLessThanOrEqual(3.5);
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('routes the completed M07 arc into Galecrest without crossing M09', () => {
    const world = buildMir4WocCampaignWorld();
    const portal = MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_m07_m08_gale_waypoint',
    );
    if (!portal) throw new Error('M07-M08 campaign transit portal is required');
    const m07TurnIn = world.npcs['m07-galerias-do-ossario-arquivista-nomes']!.pos;
    const m08Giver = world.npcs['m08-fortaleza-de-brumapedra-capitao-brum']!.pos;
    const available = mir4ArcPortalsForWorld(world);

    expect(portal).toMatchObject({
      a: { x: -400, z: 1630, landing: { x: -394, z: 1630 } },
      b: { x: 408, z: 338, landing: { x: 408, z: 346 } },
      radius: 2,
    });
    expect(mir4PortalRouteGoal(m07TurnIn, m08Giver, available, undefined, world)).toEqual({
      x: portal.a.x,
      z: portal.a.z,
    });
    expect(mir4PortalRouteGoal(portal.b.landing, m08Giver, available, undefined, world)).toEqual(
      m08Giver,
    );
    const m07Projection = world.mir4ArcMapProjections?.find(
      (projection) => projection.mapId === 'm07-galerias-do-ossario',
    );
    const m07Sites = m07Projection?.controlPoints?.slice(3).map((control) => control.target) ?? [];
    expect(m07Sites.length).toBe(6);
    for (const site of m07Sites) {
      expect(Math.hypot(site.x - portal.a.x, site.z - portal.a.z)).toBeGreaterThan(10);
    }

    setActiveWorldContent(world);
    try {
      const firstM08Objective = world.mir4ArcMapProjections?.find(
        (projection) => projection.mapId === 'm08-fortaleza-de-brumapedra',
      )?.controlPoints?.[3]?.target;
      if (!firstM08Objective) throw new Error('M08 first objective is required');
      const ingress = findReachablePlayerPath(WORLD_SEED, portal.b.landing, m08Giver, 128);
      const egress = findReachablePlayerPath(WORLD_SEED, m08Giver, firstM08Objective, 512);

      expect(ingress.length).toBeGreaterThan(0);
      expect(egress.length).toBeGreaterThan(0);
      const ingressRoute = [portal.b.landing, ...ingress];
      const egressRoute = [m08Giver, ...egress];
      expect(
        Math.min(
          ...ingressRoute
            .slice(0, -1)
            .map((point, index) => distanceToSegment(portal.b, point, ingressRoute[index + 1]!)),
        ),
      ).toBeGreaterThan(portal.radius + 4);
      expect(
        Math.min(
          ...egressRoute
            .slice(0, -1)
            .map((point, index) => distanceToSegment(portal.b, point, egressRoute[index + 1]!)),
        ),
      ).toBeGreaterThan(portal.radius + 10);
    } finally {
      setActiveWorldContent(null);
    }

    withWorldTerrainContent(BUILTIN_WORLD, () => {
      for (const side of [portal.a, portal.a.landing, portal.b, portal.b.landing]) {
        expect(terrainHeight(side.x, side.z, WORLD_SEED)).toBeGreaterThan(
          waterLevelAt(side.x, side.z, WORLD_SEED),
        );
      }
    });
  });

  it('routes the completed M12 arc into Amberfall without crossing later chapters', () => {
    const world = buildMir4WocCampaignWorld();
    const portal = MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_m12_m13_dune_waypoint',
    );
    if (!portal) throw new Error('M12-M13 campaign transit portal is required');
    const m12TurnIn = world.npcs['m12-porto-dos-juncos-almirante-sera']!.pos;
    const m13Giver = world.npcs['m13-dunas-de-vidro-guia-duna']!.pos;
    const available = mir4ArcPortalsForWorld(world);

    expect(portal).toMatchObject({
      a: { x: 330, z: 110, landing: { x: 324, z: 104 } },
      b: { x: -320, z: 2120, landing: { x: -326, z: 2114 } },
      radius: 2,
    });
    expect(mir4PortalRouteGoal(m12TurnIn, m13Giver, available, undefined, world)).toEqual({
      x: portal.a.x,
      z: portal.a.z,
    });
    expect(mir4PortalRouteGoal(portal.b.landing, m13Giver, available, undefined, world)).toEqual(
      m13Giver,
    );

    const sitesFor = (mapId: string) =>
      world.mir4ArcMapProjections
        ?.find((projection) => projection.mapId === mapId)
        ?.controlPoints?.slice(3)
        .map((control) => control.target) ?? [];
    for (const site of sitesFor('m12-porto-dos-juncos')) {
      expect(Math.hypot(site.x - portal.a.x, site.z - portal.a.z)).toBeGreaterThan(10);
    }
    for (const site of sitesFor('m13-dunas-de-vidro')) {
      expect(Math.hypot(site.x - portal.b.x, site.z - portal.b.z)).toBeGreaterThan(10);
    }

    setActiveWorldContent(world);
    try {
      expect(findReachablePlayerPath(WORLD_SEED, m12TurnIn, portal.a, 128).length).toBeGreaterThan(
        0,
      );
      expect(
        findReachablePlayerPath(WORLD_SEED, portal.b.landing, m13Giver, 128).length,
      ).toBeGreaterThan(0);
    } finally {
      setActiveWorldContent(null);
    }

    withWorldTerrainContent(BUILTIN_WORLD, () => {
      for (const side of [portal.a, portal.a.landing, portal.b, portal.b.landing]) {
        expect(terrainHeight(side.x, side.z, WORLD_SEED)).toBeGreaterThan(
          waterLevelAt(side.x, side.z, WORLD_SEED),
        );
      }
    });
  });

  it('routes the completed M13 arc to Akhet without farming later ecology', () => {
    const world = buildMir4WocCampaignWorld();
    const portal = MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_m13_m14_akhet_waypoint',
    );
    if (!portal) throw new Error('M13-M14 campaign transit portal is required');
    const m13TurnIn = world.npcs['m13-dunas-de-vidro-matriarca-safira']!.pos;
    const m14Giver = world.npcs['m14-necropole-de-akhet-guarda-lua']!.pos;
    const available = mir4ArcPortalsForWorld(world);

    expect(portal).toMatchObject({
      a: { x: -400, z: 2160, landing: { x: -400, z: 2152 } },
      b: { x: 260, z: 1600, landing: { x: 268, z: 1602 } },
      radius: 2,
    });
    expect(mir4PortalRouteGoal(m13TurnIn, m14Giver, available, undefined, world)).toEqual({
      x: portal.a.x,
      z: portal.a.z,
    });
    expect(
      mir4PortalRouteGoal(
        m13TurnIn,
        m14Giver,
        available,
        world.mir4ArcMapProjections,
        world,
        'm14-necropole-de-akhet',
      ),
    ).toEqual({ x: portal.a.x, z: portal.a.z });
    expect(mir4PortalRouteGoal(portal.b.landing, m14Giver, available, undefined, world)).toEqual(
      m14Giver,
    );

    const sitesFor = (mapId: string) =>
      world.mir4ArcMapProjections
        ?.find((projection) => projection.mapId === mapId)
        ?.controlPoints?.slice(3)
        .map((control) => control.target) ?? [];
    for (const site of sitesFor('m13-dunas-de-vidro')) {
      expect(Math.hypot(site.x - portal.a.x, site.z - portal.a.z)).toBeGreaterThan(10);
    }
    for (const site of sitesFor('m14-necropole-de-akhet')) {
      expect(Math.hypot(site.x - portal.b.x, site.z - portal.b.z)).toBeGreaterThan(10);
    }

    setActiveWorldContent(world);
    try {
      expect(findReachablePlayerPath(WORLD_SEED, m13TurnIn, portal.a, 128).length).toBeGreaterThan(
        0,
      );
      expect(
        findReachablePlayerPath(WORLD_SEED, portal.b.landing, m14Giver, 128).length,
      ).toBeGreaterThan(0);
    } finally {
      setActiveWorldContent(null);
    }

    withWorldTerrainContent(BUILTIN_WORLD, () => {
      for (const side of [portal.a, portal.a.landing, portal.b, portal.b.landing]) {
        expect(terrainHeight(side.x, side.z, WORLD_SEED)).toBeGreaterThan(
          waterLevelAt(side.x, side.z, WORLD_SEED),
        );
      }
    });
  });

  it('does not reuse an earlier chapter gate when M19 crosses shared WoC zones', () => {
    const world = buildMir4WocCampaignWorld();
    const m19Giver = world.npcs['m19-veu-da-noite-vigia-nox']!.pos;

    expect(
      mir4PortalRouteGoal(
        { x: -350, z: 1822 },
        m19Giver,
        mir4ArcPortalsForWorld(world),
        world.mir4ArcMapProjections,
        world,
        'm19-veu-da-noite',
      ),
    ).toEqual(m19Giver);
  });
});
