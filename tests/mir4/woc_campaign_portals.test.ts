import { describe, expect, it } from 'vitest';
import { BUILTIN_WORLD } from '../../src/sim/data';
import { MIR4_WOC_TUTORIAL_PORTALS } from '../../src/sim/mir4/woc_campaign_portals';
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
});
