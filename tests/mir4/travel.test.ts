import { afterEach, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { PORTALS, setActiveWorldContent, zoneAt } from '../../src/sim/data';
import { MIR4_ARC_PORTALS } from '../../src/sim/mir4/travel';
import { Sim } from '../../src/sim/sim';

afterEach(() => setActiveWorldContent(null));

function makeWorld(): Sim {
  const world = buildMir4ArcWorld();
  setActiveWorldContent(world);
  return new Sim({
    seed: 470,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
}

function placeAt(sim: Sim, x: number, z: number): void {
  const player = sim.player;
  player.pos = { ...player.pos, x, z };
  player.prevPos = { ...player.pos };
}

describe('MIR4 arc travel through the existing portal runtime', () => {
  it('builds the 19 reciprocal links from the source map order and 3D band geometry', () => {
    expect(MIR4_ARC_PORTALS).toHaveLength(19);
    expect(MIR4_ARC_PORTALS[0]?.id).toBe('mir4_m01-vila-do-vau_to_m02-trilha-dos-juncos');
    expect(MIR4_ARC_PORTALS.at(-1)?.id).toBe('mir4_m19-veu-da-noite_to_m20-bastilha-do-eclipse');
    expect(Object.isFrozen(MIR4_ARC_PORTALS)).toBe(true);
  });

  it('travels forward, does not bounce, and returns through the reciprocal entrance', () => {
    const sim = makeWorld();
    const portal = MIR4_ARC_PORTALS[0];
    if (!portal) throw new Error('MIR4 arc must expose its first reciprocal portal');
    placeAt(sim, portal.a.x, portal.a.z);
    sim.tick();
    expect(zoneAt(sim.player.pos.x, sim.player.pos.z).id).toBe('mir4_m02-trilha-dos-juncos');
    expect(sim.player.pos.z).toBeCloseTo(portal.b.landing.z, 5);

    const landed = { ...sim.player.pos };
    sim.tick();
    expect(sim.player.pos).toEqual(landed);

    placeAt(sim, portal.b.x, portal.b.z);
    sim.tick();
    expect(zoneAt(sim.player.pos.x, sim.player.pos.z).id).toBe('mir4_m01-vila-do-vau');
    expect(sim.player.pos.z).toBeCloseTo(portal.a.landing.z, 5);
  });

  it('crosses the complete 19-link route from m01 through m20 in the live Sim tick', () => {
    const sim = makeWorld();
    const visited = new Set<string>();
    visited.add(zoneAt(sim.player.pos.x, sim.player.pos.z).id);

    for (const portal of MIR4_ARC_PORTALS) {
      placeAt(sim, portal.a.x, portal.a.z);
      sim.tick();
      visited.add(zoneAt(sim.player.pos.x, sim.player.pos.z).id);
      expect(sim.player.pos.z).toBeCloseTo(portal.b.landing.z, 5);
    }

    expect([...visited]).toHaveLength(20);
    expect([...visited][0]).toBe('mir4_m01-vila-do-vau');
    expect([...visited].at(-1)).toBe('mir4_m20-bastilha-do-eclipse');
  });

  it('does not execute classic World of ClaudeCraft portals in the MIR4 profile', () => {
    const sim = makeWorld();
    const classic = PORTALS[0];
    if (!classic) throw new Error('Classic world must expose its first portal');
    placeAt(sim, classic.a.x, classic.a.z);
    sim.tick();
    expect(sim.player.pos.x).not.toBeCloseTo(classic.b.landing.x, 5);
    expect(sim.player.pos.z).not.toBeCloseTo(classic.b.landing.z, 5);
  });
});
