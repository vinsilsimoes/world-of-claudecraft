import { describe, expect, it, vi } from 'vitest';
import { advanceMir4AutoQuestRoute, authoredRoadRoute } from '../../src/sim/auto_quest/route';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_REGION_LAYOUTS } from '../../src/sim/content/mir4/arc_world_layout';
import { setActiveWorldContent } from '../../src/sim/data';
import { buildMir4WocCampaignWorld } from '../../src/sim/mir4/woc_comparison_world';

describe('mir4 auto-quest route follower', () => {
  it('uses the authored Reed Trail graph instead of cutting straight across the map', () => {
    const world = buildMir4ArcWorld(2);
    const region = MIR4_ARC_REGION_LAYOUTS[1]!;
    const outskirts = region.sites.find((site) => site.id === 'three-flames-reeds')!.pos;
    const stronghold = region.sites.find((site) => site.id === 'guardian-root')!.pos;
    const route = authoredRoadRoute(outskirts, stronghold, world.roads);

    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(2);
    expect(route!.at(-1)).toEqual(stronghold);
    expect(
      route!.some(
        (point) =>
          Math.hypot(
            point.x - (outskirts.x + stronghold.x) / 2,
            point.z - (outskirts.z + stronghold.z) / 2,
          ) > 12,
      ),
    ).toBe(true);
  });

  it('uses the caller world roads instead of the process-global active world', () => {
    const localRoads = [
      [
        { x: 0, z: 0 },
        { x: 0, z: 20 },
        { x: 20, z: 20 },
        { x: 20, z: 0 },
      ],
    ];
    const findRoute = vi.fn((_seed, _from, to) => [to]);

    const result = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 0 },
      { x: 20, z: 0 },
      undefined,
      0,
      findRoute,
      true,
      localRoads,
    );

    expect(result.route.waypoints).toEqual([
      { x: 0, z: 20 },
      { x: 20, z: 20 },
      { x: 20, z: 0 },
    ]);
  });

  it('follows the physical WoC road exits between Eastbrook and Willowfen', () => {
    const world = buildMir4WocCampaignWorld();
    const route = authoredRoadRoute(
      { x: -138.0656, z: 156.448 },
      { x: -354, z: 364 },
      world.roads,
      world.zones,
    );

    expect(route).not.toBeNull();
    expect(route).toContainEqual({ x: 0, z: 80 });
    expect(route).toContainEqual({ x: -80, z: 420 });
    expect(route).toContainEqual({ x: -184, z: 440 });
    expect(route!.at(-1)).toEqual({ x: -354, z: 364 });
  });

  it('crosses the named Ferrywalk instead of stalling before the Farshore', () => {
    const world = buildMir4WocCampaignWorld();
    const route = authoredRoadRoute(
      { x: -274, z: 1142 },
      { x: 305, z: 66 },
      world.roads,
      world.zones,
    );

    expect(route).not.toBeNull();
    expect(route).toContainEqual({ x: 65, z: -65 });
    expect(route).toContainEqual({ x: 150, z: -46 });
    expect(route!.at(-1)).toEqual({ x: 305, z: 66 });
  });

  it('follows the Goldmelt passage from Frostveil into Amberfall', () => {
    const world = buildMir4WocCampaignWorld();
    const route = authoredRoadRoute(
      { x: 161.00865076546035, z: 1729.3526073375567 },
      { x: -428, z: 1996 },
      world.roads,
      world.zones,
    );

    expect(route).not.toBeNull();
    expect(route).toContainEqual({ x: 130, z: 1760 });
    expect(route).toContainEqual({ x: -176, z: 1888 });
    expect(route).toContainEqual({ x: -261, z: 1900 });
    expect(route).toContainEqual({ x: -340, z: 1832 });
    expect(route).toContainEqual({ x: -350, z: 1822 });
    const crossingStart = route!.findIndex((point) => point.x === -176 && point.z === 1888);
    const crossingEnd = route!.findIndex((point) => point.x === -350 && point.z === 1822);
    expect(crossingStart).toBeGreaterThanOrEqual(0);
    expect(crossingEnd).toBeGreaterThan(crossingStart);
    expect(
      route!
        .slice(crossingStart + 1, crossingEnd + 1)
        .every(
          (point, index) =>
            Math.hypot(
              point.x - route![crossingStart + index]!.x,
              point.z - route![crossingStart + index]!.z,
            ) <= 125,
        ),
    ).toBe(true);
    expect(route!.at(-1)).toEqual({ x: -428, z: 1996 });
  });

  it('follows the physical Goldmelt shelf during Auto Journey', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      const current = {
        x: -179.6529216903983,
        z: 1886.6144090139862,
      };
      const result = advanceMir4AutoQuestRoute(
        73_041,
        current,
        { x: -364.66, z: 1421.54 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
        true,
      );

      expect(result.waypoint).toEqual({ x: -176, z: 1888 });
      expect(result.route.waypoints).toContainEqual({ x: -261, z: 1900 });
      expect(result.route.waypoints).toContainEqual({ x: -340, z: 1832 });
      expect(result.route.waypoints).toContainEqual({ x: -350, z: 1822 });
      expect(result.route.waypoints.at(-1)).toEqual({
        x: -364.66,
        z: 1421.54,
      });
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('follows cached path waypoints instead of recomputing a straight line every tick', () => {
    const findRoute = vi.fn(() => [
      { x: 0, z: 5 },
      { x: 10, z: 5 },
      { x: 10, z: 0 },
    ]);
    const first = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      undefined,
      0,
      findRoute,
    );
    expect(first.waypoint).toEqual({ x: 0, z: 5 });

    const second = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 5 },
      { x: 10, z: 0 },
      first.route,
      0,
      findRoute,
    );
    expect(second.waypoint).toEqual({ x: 10, z: 5 });
    expect(findRoute).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the path when the quest destination changes', () => {
    const findRoute = vi.fn((_seed, _from, to) => [to]);
    const first = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      undefined,
      0,
      findRoute,
    );
    const second = advanceMir4AutoQuestRoute(
      1,
      { x: 1, z: 0 },
      { x: 0, z: 10 },
      first.route,
      0,
      findRoute,
    );

    expect(second.waypoint).toEqual({ x: 0, z: 10 });
    expect(findRoute).toHaveBeenCalledTimes(2);
  });

  it('keeps a stable physical route while a followed escort moves within the repath radius', () => {
    const findRoute = vi.fn((_seed, _from, to) => [
      { x: 0, z: 5 },
      { x: to.x, z: to.z },
    ]);
    const first = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 0 },
      { x: 20, z: 0 },
      undefined,
      0,
      findRoute,
      false,
      [],
      [],
      true,
      12,
    );
    const second = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 1 },
      { x: 21, z: 0 },
      first.route,
      0,
      findRoute,
      false,
      [],
      [],
      true,
      12,
    );

    expect(second.waypoint).toEqual({ x: 0, z: 5 });
    expect(second.route.goalX).toBe(20);
    expect(findRoute).toHaveBeenCalledTimes(1);
  });

  it('rebuilds after exactly 20 ticks without movement', () => {
    const findRoute = vi.fn((_seed, _from, to) => [to]);
    let result = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      undefined,
      0,
      findRoute,
    );
    for (let tick = 1; tick <= 19; tick += 1) {
      result = advanceMir4AutoQuestRoute(
        1,
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        result.route,
        0,
        findRoute,
      );
    }
    expect(findRoute).toHaveBeenCalledTimes(1);
    result = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      result.route,
      0,
      findRoute,
    );
    expect(findRoute).toHaveBeenCalledTimes(2);
  });

  it('abandons a blocked waypoint when collision jitter makes no forward progress', () => {
    const findRoute = vi.fn(() => [
      { x: 0, z: 2 },
      { x: 0, z: 4 },
      { x: 10, z: 0 },
    ]);
    let result = advanceMir4AutoQuestRoute(
      1,
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      undefined,
      0,
      findRoute,
    );

    for (let tick = 0; tick < 20; tick += 1) {
      result = advanceMir4AutoQuestRoute(
        1,
        { x: tick % 2 === 0 ? 0.2 : -0.2, z: 0 },
        { x: 10, z: 0 },
        result.route,
        0,
        findRoute,
      );
    }

    expect(result.waypoint).toEqual({ x: 0, z: 4 });
    expect(findRoute).toHaveBeenCalledTimes(1);
  });

  it('escapes a static prop overlap instead of rebuilding a straight blocked segment forever', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      // This is the physical edge of Evergarden's well where a real campaign
      // run became wedged after talking to the M03 giver.
      const current = { x: 322.74, z: 812.500975735349 };
      const result = advanceMir4AutoQuestRoute(
        73_041,
        current,
        { x: 294, z: 887 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
      );

      expect(result.waypoint.x).toBeGreaterThan(current.x);
      expect(Math.hypot(result.waypoint.x - current.x, result.waypoint.z - current.z)).toBeLessThan(
        8,
      );
      expect(result.route.waypoints.at(-1)).toEqual({ x: 294, z: 887 });
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('keeps a distant road snap so the route exits around the Evergarden maze wall', () => {
    const world = buildMir4WocCampaignWorld();
    const route = authoredRoadRoute(
      { x: 400.10804386198595, z: 1019.1 },
      { x: 360, z: 936 },
      world.roads,
      world.zones,
    );

    // The north side of the maze cannot walk directly south. The east-walk
    // vertex is the physical egress before the road bends toward the goal.
    expect(route?.slice(0, 3)).toEqual([
      { x: 458, z: 1020 },
      { x: 454, z: 920 },
      { x: 420, z: 878 },
    ]);
  });

  it('selects the reachable maze exit when the nearest road vertex is behind a wall', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      const current = { x: 400.10804386198595, z: 1019.1 };
      const result = advanceMir4AutoQuestRoute(
        73_041,
        current,
        { x: 360, z: 936 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
      );

      expect(result.waypoint.z).toBeGreaterThan(current.z);
      expect(result.route.waypoints).toContainEqual({ x: 387, z: 1098 });
      expect(result.route.waypoints.at(-1)).toEqual({ x: 360, z: 936 });
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('does not walk back into the M06-M07 portal when the giver is beside its road end', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      const result = advanceMir4AutoQuestRoute(
        73_041,
        { x: -246, z: 1546 },
        { x: -278, z: 1548 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
      );

      expect(result.route.waypoints).not.toContainEqual({ x: -240, z: 1546 });
      expect(result.route.waypoints).not.toContainEqual({ x: -280, z: 1550 });
      expect(result.route.waypoints.at(-1)).toEqual({ x: -278, z: 1548 });
      expect(result.waypoint.x).toBeLessThan(-246);
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('escapes the legacy Snowline shelf through the physically downhill side', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      const current = { x: 120.6740482872012, z: 1840.7709951609545 };
      const result = advanceMir4AutoQuestRoute(
        73_041,
        current,
        { x: -29.789422802186177, z: 1557.2447865001257 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
      );

      expect(
        Math.hypot(result.waypoint.x - current.x, result.waypoint.z - current.z),
      ).toBeGreaterThan(1);
      expect(result.route.waypoints).toContainEqual({ x: 108, z: 1836 });
      expect(result.route.waypoints).toContainEqual({ x: 90, z: 1830 });
      expect(result.route.waypoints).toContainEqual({ x: -20, z: 1570 });
      expect(result.route.waypoints.at(-1)?.z).toBeLessThan(current.z);
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('routes a character stranded in Glacier Tarn through the authored escape ramp', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      const result = advanceMir4AutoQuestRoute(
        73_041,
        { x: 49.17520631493862, z: 1631.3322520199822 },
        { x: -29.789422802186177, z: 1557.2447865001257 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
      );

      expect(result.route.waypoints).toContainEqual({ x: 45, z: 1640.5 });
      expect(result.route.waypoints).toContainEqual({ x: 34, z: 1640 });
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('leads a shallow Tarn wader to the ramp foot before climbing the south lip', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      const result = advanceMir4AutoQuestRoute(
        73_041,
        { x: 46.2, z: 1635.2 },
        { x: -27, z: 1557 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
      );

      expect(result.route.waypoints.slice(0, 2)).toEqual([
        { x: 45, z: 1640.5 },
        { x: 34, z: 1640 },
      ]);
      expect(result.route.waypoints).toContainEqual({ x: 42, z: 1626 });
      expect(result.route.waypoints.at(-1)).toEqual({ x: -27, z: 1557 });
    } finally {
      setActiveWorldContent(null);
    }
  });

  it('keeps the Tarn escape on the winding west rim instead of the steep finger', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    try {
      const result = advanceMir4AutoQuestRoute(
        73_041,
        { x: 32.92946023948858, z: 1642.7609647330373 },
        { x: 33.3374754980036, z: 1742.5400139410804 },
        undefined,
        0,
        undefined,
        true,
        world.roads,
        world.zones,
      );

      // Rejoin the now-physical fork at 32,1641.6, then continue around the
      // west rim rather than cutting east across the steep finger.
      expect(result.route.waypoints[0]).toEqual({ x: 32, z: 1641.6 });
      expect(result.route.waypoints).toContainEqual({ x: 24, z: 1648 });
      expect(result.route.waypoints).toContainEqual({ x: 24, z: 1652 });
      expect(result.route.waypoints).toContainEqual({ x: 28, z: 1662 });
      expect(result.route.waypoints).not.toContainEqual({ x: 45, z: 1640.5 });
    } finally {
      setActiveWorldContent(null);
    }
  });
});
