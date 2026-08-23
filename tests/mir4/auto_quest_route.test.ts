import { describe, expect, it, vi } from 'vitest';
import { advanceMir4AutoQuestRoute, authoredRoadRoute } from '../../src/sim/auto_quest/route';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_REGION_LAYOUTS } from '../../src/sim/content/mir4/arc_world_layout';
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
});
