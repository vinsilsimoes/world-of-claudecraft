import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_ARC_MOB_IDS } from '../../src/sim/content/mir4/arc_mob_ids';
import { mir4ArcMobTemplate, mir4ArcNormalXp } from '../../src/sim/content/mir4/arc_mobs';
import { buildMir4ArcWorld, MIR4_MAP_DEPTH } from '../../src/sim/content/mir4/arc_world';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

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
      const bare = id.slice(5);
      const known = MIR4_ARC_MOB_IDS.some((list) => list.includes(bare));
      expect(known, `unknown arc mob ${id}`).toBe(true);
    }
    // All 20 zones + 20 givers present.
    expect(world.zones).toHaveLength(20);
    expect(Object.keys(world.npcs)).toHaveLength(20);
    void MIR4_WORLD_ARC;
  });
});
