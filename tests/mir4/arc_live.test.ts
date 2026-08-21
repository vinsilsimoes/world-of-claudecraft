import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_ARC_MOB_IDS } from '../../src/sim/content/mir4/arc_mob_ids';
import { mir4ArcMobTemplate, mir4ArcNormalXp } from '../../src/sim/content/mir4/arc_mobs';
import { buildMir4ArcWorld, MIR4_MAP_DEPTH } from '../../src/sim/content/mir4/arc_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { groundHeight } from '../../src/sim/world';

// Phase 5.4: the arc as the LIVE world - per-environment mob templates from
// the census, camps picking each map's own families, and the full 20-band
// build booting a real Sim.

afterAll(() => {
  setActiveWorldContent(null);
});

describe('arc mob templates', () => {
  it('resolves any census mob at its map band and sequence', () => {
    const wolf = mir4ArcMobTemplate('mir4_forest_wolf');
    expect(wolf?.minLevel).toBe(1);
    expect(wolf?.family).toBe('beast');
    const wraith = mir4ArcMobTemplate('mir4_candle_wraith');
    expect(wraith).toBeDefined();
    expect(wraith!.minLevel).toBe(41); // m05's band
    expect(wraith!.family).toBe('undead');
    const knight = mir4ArcMobTemplate('mir4_shadow_knight');
    expect(knight!.minLevel).toBe(181); // m19's band
    expect(mir4ArcMobTemplate('mir4_nonexistent')).toBeUndefined();
    const qualifiedWolf = mir4ArcMobTemplate('mir4_m01-vila-do-vau_forest_wolf');
    expect(qualifiedWolf).toMatchObject({ id: 'mir4_m01-vila-do-vau_forest_wolf', minLevel: 1 });
    const laterWolf = mir4ArcMobTemplate(`mir4_${MIR4_WORLD_ARC[3]?.mapId}_forest_wolf`);
    expect(laterWolf?.minLevel).toBe(31);
    expect(laterWolf?.mir4XpReward).toBe(mir4ArcNormalXp(4));
  });
  it('XP scales with the map sequence (34 at m01)', () => {
    expect(mir4ArcNormalXp(1)).toBe(34);
    expect(mir4ArcNormalXp(20)).toBeGreaterThan(mir4ArcNormalXp(19));
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
    expect(zoneAt(0, 40)?.id).toBe('mir4_m01-vila-do-vau');
    expect(zoneAt(0, 19 * MIR4_MAP_DEPTH + 100)?.id).toBe('mir4_m20-bastilha-do-eclipse');
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
    // All 20 zones + every map-local campaign giver placement present.
    expect(world.zones).toHaveLength(20);
    expect(Object.keys(world.npcs)).toHaveLength(80);
    void MIR4_WORLD_ARC;
  });

  it('keeps a player body inside every outer edge of the injected world', () => {
    const world = buildMir4ArcWorld(20);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 181,
      playerClass: 'warrior',
      playerName: 'Aldric',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const player = sim.player;
    const meta = sim.players.get(player.id)!;
    const north = world.zones.at(-1)!.zMax;
    player.pos.x = 0;
    player.pos.z = north - 1;
    player.pos.y = groundHeight(player.pos.x, player.pos.z, sim.cfg.seed);
    player.facing = 0;
    meta.moveInput.forward = true;
    for (let tick = 0; tick < 40; tick++) sim.tick();
    expect(player.pos.z).toBeLessThanOrEqual(north - 0.5);

    const east = Math.max(...world.zones.map((zone) => zone.xMax ?? 160));
    player.pos.x = east - 1;
    player.pos.z = world.zones[0]!.hub.z;
    player.pos.y = groundHeight(player.pos.x, player.pos.z, sim.cfg.seed);
    player.facing = Math.PI / 2;
    for (let tick = 0; tick < 80; tick++) sim.tick();
    expect(player.pos.x).toBeLessThanOrEqual(east - 0.5);
  });
});
