import { afterEach, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld, mir4ArcBands } from '../../src/sim/content/mir4/arc_world';
import { PORTALS, setActiveWorldContent, zoneAt } from '../../src/sim/data';
import {
  MIR4_ARC_PORTALS,
  mir4ArcPortalsForWorld,
  mir4PortalRouteGoal,
} from '../../src/sim/mir4/travel';
import { Sim } from '../../src/sim/sim';

afterEach(() => setActiveWorldContent(null));

function makeWorld(): Sim {
  const world = buildMir4ArcWorld(20);
  setActiveWorldContent(world);
  const sim = new Sim({
    seed: 470,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
  const meta = sim.meta(sim.player.id);
  if (!meta) throw new Error('MIR4 test player metadata is required');
  meta.mir4ArcQuests = Object.fromEntries(
    Array.from({ length: 20 }, (_, index) => {
      const questId = `M${String(index + 1).padStart(2, '0')}-Q01`;
      return [questId, { questId, stageIndex: 0, stageProgress: 0, state: 'active' as const }];
    }),
  );
  return sim;
}

function placeAt(sim: Sim, x: number, z: number): void {
  const player = sim.player;
  player.pos = { ...player.pos, x, z };
  player.prevPos = { ...player.pos };
}

describe('MIR4 arc travel through the existing portal runtime', () => {
  it('keeps a forward portal sealed until a main quest sends the player to its map', () => {
    const world = buildMir4ArcWorld(2);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 469,
      playerClass: 'warrior',
      playerName: 'Locked Boundary Probe',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const portal = MIR4_ARC_PORTALS[0]!;
    placeAt(sim, portal.a.x, portal.a.z);
    sim.tick();
    expect(zoneAt(sim.player.pos.x, sim.player.pos.z).id).toBe('mir4_m01-vila-do-vau');

    const meta = sim.meta(sim.player.id)!;
    meta.mir4ArcQuests = {
      'M02-Q01': { questId: 'M02-Q01', stageIndex: 0, stageProgress: 0, state: 'active' },
    };
    sim.tick();
    expect(zoneAt(sim.player.pos.x, sim.player.pos.z).id).toBe('mir4_m02-trilha-dos-juncos');
  });
  it('builds the 19 reciprocal links from the source map order and 3D band geometry', () => {
    expect(MIR4_ARC_PORTALS).toHaveLength(19);
    expect(MIR4_ARC_PORTALS[0]?.id).toBe('mir4_m01-vila-do-vau_to_m02-trilha-dos-juncos');
    expect(MIR4_ARC_PORTALS.at(-1)?.id).toBe('mir4_m19-veu-da-noite_to_m20-bastilha-do-eclipse');
    expect(Object.isFrozen(MIR4_ARC_PORTALS)).toBe(true);
  });

  it('marks every reciprocal portal side with an existing WoC arch in the 3D world', () => {
    const world = buildMir4ArcWorld(20);
    const decor = world.props.decorProps ?? [];
    for (const portal of MIR4_ARC_PORTALS) {
      for (const side of [portal.a, portal.b]) {
        expect(
          decor.some(
            (prop) =>
              prop.key === 'gardenArch' &&
              Math.hypot(prop.x - side.x, prop.z - side.z) < 0.05 &&
              prop.r === undefined &&
              prop.hw === undefined &&
              prop.hd === undefined,
          ),
          portal.id,
        ).toBe(true);
      }
    }
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

  it('admits only links whose two authored maps exist in the production world', () => {
    const world = buildMir4ArcWorld(2);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 471,
      playerClass: 'warrior',
      playerName: 'Approved Boundary Probe',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const links = mir4ArcPortalsForWorld(world);
    expect(links.map((portal) => portal.id)).toEqual([
      'mir4_m01-vila-do-vau_to_m02-trilha-dos-juncos',
    ]);

    const unavailable = MIR4_ARC_PORTALS[1]!;
    placeAt(sim, unavailable.a.x, unavailable.a.z);
    const before = { ...sim.player.pos };
    sim.tick();

    expect({ x: sim.player.pos.x, z: sim.player.pos.z }).toEqual({ x: before.x, z: before.z });
    expect(zoneAt(sim.player.pos.x, sim.player.pos.z).id).toBe('mir4_m02-trilha-dos-juncos');
    expect(mir4PortalRouteGoal(sim.player.pos, mir4ArcBands()[2]!.hub, links)).toEqual({
      x: sim.player.pos.x,
      z: sim.player.pos.z,
    });
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

  it('routes cross-band automation through the correct reciprocal portal side', () => {
    const bands = mir4ArcBands();
    const forward = MIR4_ARC_PORTALS[2]!;
    expect(mir4PortalRouteGoal(bands[2]!.hub, bands[3]!.hub)).toEqual({
      x: forward.a.x,
      z: forward.a.z,
    });

    const backward = MIR4_ARC_PORTALS[2]!;
    expect(mir4PortalRouteGoal(bands[3]!.hub, bands[2]!.hub)).toEqual({
      x: backward.b.x,
      z: backward.b.z,
    });

    const local = bands[3]!.sites[2]!.pos;
    expect(mir4PortalRouteGoal(bands[3]!.hub, local)).toEqual(local);
  });

  it('does not execute classic Aeldrune portals in the MIR4 profile', () => {
    const sim = makeWorld();
    const classic = PORTALS[0];
    if (!classic) throw new Error('Classic world must expose its first portal');
    placeAt(sim, classic.a.x, classic.a.z);
    sim.tick();
    expect(sim.player.pos.x).not.toBeCloseTo(classic.b.landing.x, 5);
    expect(sim.player.pos.z).not.toBeCloseTo(classic.b.landing.z, 5);
  });
});
