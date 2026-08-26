import { afterAll, describe, expect, it } from 'vitest';
import { colliderInternalsForTest } from '../../src/sim/colliders';
import {
  MIR4_ARC_NORMAL_XP,
  mir4ArcMobTemplate,
  mir4ArcNormalXp,
} from '../../src/sim/content/mir4/arc_mobs';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_ARC_REGION_LAYOUTS } from '../../src/sim/content/mir4/arc_world_layout';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { PLAYER_MAX_CLIMB_SLOPE } from '../../src/sim/pathfind';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { groundHeight, terrainSteepnessAt } from '../../src/sim/world';

// Phase 5.4: the arc as the LIVE world - per-environment mob templates from
// the census, camps picking each map's own families, and the full 20-band
// build booting a real Sim.

afterAll(() => {
  setActiveWorldContent(null);
});

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

describe('arc mob templates', () => {
  it('resolves any census mob at its map band and sequence', () => {
    const wolf = mir4ArcMobTemplate('mir4_forest_wolf');
    expect(wolf?.minLevel).toBe(1);
    expect(wolf?.family).toBe('beast');
    const wraith = mir4ArcMobTemplate('mir4_candle_wraith');
    expect(wraith).toBeDefined();
    expect(wraith?.minLevel).toBe(41); // m05's band
    expect(wraith?.family).toBe('undead');
    const knight = mir4ArcMobTemplate('mir4_shadow_knight');
    expect(knight?.minLevel).toBe(181); // m19's band
    expect(mir4ArcMobTemplate('mir4_nonexistent')).toBeUndefined();
    const qualifiedWolf = mir4ArcMobTemplate('mir4_m01-vila-do-vau_forest_wolf');
    expect(qualifiedWolf).toMatchObject({
      id: 'mir4_m01-vila-do-vau_forest_wolf',
      minLevel: 1,
    });
    const laterWolf = mir4ArcMobTemplate(`mir4_${MIR4_WORLD_ARC[3]?.mapId}_forest_wolf`);
    expect(laterWolf?.minLevel).toBe(31);
    expect(laterWolf?.mir4XpReward).toBe(mir4ArcNormalXp(4));
    expect(mir4ArcMobTemplate('mir4_owlbear_cub')?.name).toBe('Filhote de Urso-Coruja');
  });
  it('preserves the original XP evidence and applies the live pacing curve', () => {
    expect(MIR4_ARC_NORMAL_XP).toEqual([
      34, 173, 687, 3_078, 12_958, 37_444, 132_290, 915_233, 1_948_427, 4_294_479, 5_436_523,
      14_330_260, 16_902_756, 63_755_887, 216_651_910, 478_539_849, 880_830_709, 2_469_385_815,
      8_257_622_570, 24_108_716_020,
    ]);
    expect(MIR4_ARC_NORMAL_XP.map((_, index) => mir4ArcNormalXp(index + 1))).toEqual([
      34, 173, 343, 1_026, 4_319, 7_488, 26_458, 183_046, 81_184, 178_936, 226_521, 597_094,
      469_521, 1_770_996, 6_018_108, 13_292_773, 14_680_511, 41_156_430, 137_627_042, 401_811_933,
    ]);
  });
});

describe('the full arc as a live Sim world', () => {
  it('boots with per-map camps of that map mobs', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 181,
      playerClass: 'warrior',
      playerName: 'Aldric',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    const first = required(MIR4_ARC_REGION_LAYOUTS[0], 'first region');
    const last = required(MIR4_ARC_REGION_LAYOUTS.at(-1), 'last region');
    expect(zoneAt(first.hub.x, first.hub.z)?.id).toBe('mir4_m01-vila-do-vau');
    expect(zoneAt(last.hub.x, last.hub.z)?.id).toBe('mir4_m20-bastilha-do-eclipse');
    // The m01 camps use the census wolves; a late map's camps use its own ids.
    const mobIds = new Set(
      [...sim.entities.values()].filter((e) => e.kind === 'mob').map((e) => e.templateId),
    );
    expect(mobIds.size).toBeGreaterThanOrEqual(2);
    for (const id of mobIds) {
      // Classic-world escort actors (the shared escort system) can appear in
      // the entity set; only assert the mir4-prefixed camp mobs.
      if (!id.startsWith('mir4_')) continue;
      expect(mir4ArcMobTemplate(id), `unknown arc mob ${id}`).toBeDefined();
    }
    // All 20 zones, campaign contacts and authored ambient residents are
    // present in this explicit development build.
    expect(world.zones).toHaveLength(20);
    expect(Object.keys(world.npcs)).toHaveLength(107);
    void MIR4_WORLD_ARC;
  });

  it('uses visible, unwalkably steep terrain for the map limit instead of an invisible wall', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 181,
      playerClass: 'warrior',
      playerName: 'Aldric',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const region = required(MIR4_ARC_REGION_LAYOUTS[1], 'M02 region');
    const sampleZ = region.hub.z + 36;
    const minX = Math.min(...world.zones.map((zone) => zone.xMin ?? -160));
    const maxX = Math.max(...world.zones.map((zone) => zone.xMax ?? 160));
    const minZ = Math.min(...world.zones.map((zone) => zone.zMin));
    const maxZ = Math.max(...world.zones.map((zone) => zone.zMax));
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;
    const boundaryColliders = colliderInternalsForTest
      .staticWorldColliders(sim.cfg.seed)
      .filter(
        (collider) =>
          collider.type === 'obb' &&
          ((Math.abs(collider.x - midX) < 0.05 &&
            (Math.abs(collider.z - minZ) < 0.05 || Math.abs(collider.z - maxZ) < 0.05)) ||
            (Math.abs(collider.z - midZ) < 0.05 &&
              (Math.abs(collider.x - minX) < 0.05 || Math.abs(collider.x - maxX) < 0.05))),
      );
    expect(boundaryColliders, 'an open-looking map edge must not be an invisible OBB').toEqual([]);

    let steepest = 0;
    for (let x = region.xMin - 4; x <= region.xMin + 18; x += 0.5) {
      steepest = Math.max(steepest, terrainSteepnessAt(x, sampleZ, sim.cfg.seed));
    }
    expect(steepest, 'the rendered ridge must own the blocking physics').toBeGreaterThan(
      PLAYER_MAX_CLIMB_SLOPE,
    );

    const player = sim.player;
    const meta = required(sim.players.get(player.id), 'player meta');
    player.pos.x = region.xMin + 24;
    player.pos.z = sampleZ;
    player.pos.y = groundHeight(player.pos.x, player.pos.z, sim.cfg.seed);
    player.facing = -Math.PI / 2;
    meta.moveInput.forward = true;
    for (let tick = 0; tick < 120; tick++) sim.tick();
    expect(player.pos.x, 'the player must stop on the visible ridge face').toBeGreaterThan(
      region.xMin + 2,
    );
  });
});
