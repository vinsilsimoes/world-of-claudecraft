import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD, MIR4_VILA_DO_VAU_ZONE_ID } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// The Phase 2 slice world: Vila do Vau as a declarative WorldContent. The
// active-content global is set per test and restored after the file so the
// classic suites never see the mir4 world.

function makeWorldSim(seed = 2024): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function wolvesOf(sim: Sim, dead = false) {
  return [...sim.entities.values()].filter(
    (e) => e.kind === 'mob' && e.templateId === 'mir4_forest_wolf' && e.dead === dead,
  );
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the mir4 slice world (Vila do Vau)', () => {
  it('spawns the player at the hub, both camp packs, and the hub NPC', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeWorldSim();
    const p = sim.entities.get(sim.playerId)!;
    expect(p.pos.z).toBeLessThan(-4); // the southern hub, not world center
    expect(wolvesOf(sim).length).toBe(9); // 5 + 4 from the two camps
    const npcs = [...sim.entities.values()].filter(
      (e) => e.kind === 'npc' && e.templateId === 'mir4_tarek_duas_pontes',
    );
    expect(npcs).toHaveLength(1);
    expect(zoneAt(14, 6)?.id).toBe(MIR4_VILA_DO_VAU_ZONE_ID);
    expect(zoneAt(0, -12)?.id).toBe(MIR4_VILA_DO_VAU_ZONE_ID);
  });

  it('auto battle hunts the camp wolves with no manual spawn', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeWorldSim(7);
    sim.setMir4AutoBattleMode('battle');
    let guard = 0;
    while (wolvesOf(sim, true).length === 0 && guard++ < 2000) sim.tick();
    expect(wolvesOf(sim, true).length).toBeGreaterThanOrEqual(1);
    expect(sim.players.get(sim.playerId)?.xp).toBeGreaterThanOrEqual(22);
  });

  it('does not leak into classic sims once the active content is restored', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    makeWorldSim(1);
    setActiveWorldContent(null);
    const classic = new Sim({ seed: 11, playerClass: 'warrior', playerName: 'Classic' });
    expect(
      [...classic.entities.values()].filter((e) => e.templateId === 'mir4_forest_wolf'),
    ).toHaveLength(0);
  });
});
