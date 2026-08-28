import { describe, expect, it, vi } from 'vitest';
import {
  mir4WocComparisonRequested,
  offlineSimOptions,
  offlineStartupSimOptions,
  offlineStartupWorldOptions,
} from '../src/game/offline_sim_options';
import { BUILTIN_WORLD } from '../src/sim/data';
import type { WorldContent } from '../src/sim/types';

describe('offlineSimOptions (main.ts Sim-options extraction)', () => {
  it('resolves the game profile from the build env at the Sim boundary', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    const mir4 = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Aldric',
    });
    expect(mir4.gameProfile).toBe('mir4-gameplay-port');
    expect(mir4.world?.zones).not.toBe(BUILTIN_WORLD.zones);
    expect(mir4.world?.zones.map(({ pois: _pois, ...zone }) => zone)).toEqual(
      BUILTIN_WORLD.zones.map(({ pois: _pois, ...zone }) => zone),
    );
    expect(
      mir4.world?.zones
        .find((zone) => zone.id === 'willowfen')
        ?.pois.some((poi) => poi.label === 'Juncal das Três Chamas'),
    ).toBe(true);
    expect(mir4.world?.mir4ArcMapProjections).toHaveLength(20);
    vi.unstubAllEnvs();
    expect(offlineSimOptions({ playerClass: 'warrior', playerName: 'Aldric' }).gameProfile).toBe(
      'woc-classic',
    );
  });

  it('runs the ranked rift scheduler only on the generated world', () => {
    expect(offlineSimOptions({ playerClass: 'warrior', playerName: 'Aldric' }).riftPortals).toBe(
      true,
    );
    expect(
      offlineSimOptions({
        playerClass: 'warrior',
        playerName: 'Aldric',
        world: BUILTIN_WORLD,
      }).riftPortals,
    ).toBe(false);
  });

  it('can clone the local MIR4 world at an authored map hub for diagnostics', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    const regular = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Aldric',
      mir4WocMap: false,
    });
    const diagnostic = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Aldric',
      diagnosticsSpawnZoneId: 'mir4_m02-trilha-dos-juncos',
      mir4WocMap: false,
    });

    expect(diagnostic.world).not.toBe(regular.world);
    const m02Hub = diagnostic.world?.zones.find(
      (zone) => zone.id === 'mir4_m02-trilha-dos-juncos',
    )?.hub;
    expect(diagnostic.world?.playerStart).toEqual({
      x: m02Hub?.x,
      z: m02Hub?.z,
    });
    expect(regular.world?.playerStart).not.toEqual(diagnostic.world?.playerStart);
    vi.unstubAllEnvs();
  });

  it('can start a local diagnostic at an authored point of interest', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    const diagnostic = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Aldric',
      diagnosticsSpawnPoiId: 'm02-poi-juncal-tres-chamas',
      mir4WocMap: false,
    });
    const poi = diagnostic.world?.zones
      .flatMap((zone) => zone.pois)
      .find((candidate) => candidate.id === 'm02-poi-juncal-tres-chamas');

    expect(diagnostic.world?.playerStart).toEqual({ x: poi?.x, z: poi?.z });
    vi.unstubAllEnvs();
  });

  it('uses an authored safe vista when a dangerous M04 POI defines one', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    const diagnostic = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Aldric',
      diagnosticsSpawnPoiId: 'm04-poi-farol-raiz',
      mir4WocMap: false,
    });
    const poi = diagnostic.world?.zones
      .flatMap((zone) => zone.pois)
      .find((candidate) => candidate.id === 'm04-poi-farol-raiz');

    expect(poi?.diagnosticSpawn).toEqual({ x: 5860, z: 305 });
    expect(diagnostic.world?.playerStart).toEqual(poi?.diagnosticSpawn);
    expect(diagnostic.world?.playerStart).not.toEqual({ x: poi?.x, z: poi?.z });
    vi.unstubAllEnvs();
  });

  it('can opt local diagnostics into the original WoC map with MIR4 progression', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    const comparison = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Aldric',
      mir4WocMap: true,
    });

    expect(comparison.world?.zones[0]?.id).toBe('eastbrook_vale');
    expect(comparison.world?.mir4ArcMapProjections).toHaveLength(20);
    expect(
      Object.values(comparison.world?.npcs ?? {}).every((npc) => npc.id.startsWith('mir4_')),
    ).toBe(true);
    expect(comparison.lockoutNowMs?.()).toBeGreaterThan(1_000_000_000_000);
    vi.unstubAllEnvs();
  });

  it('uses the WoC transplant by default and retains a dev-only authored-map fallback', () => {
    const requested = (query: string, dev = true) =>
      mir4WocComparisonRequested(new URLSearchParams(query), dev, 'mir4-gameplay-port');

    expect(requested('')).toBe(true);
    expect(requested('diagnostics=1&mir4WocMap=1')).toBe(true);
    expect(requested('diagnostics=1&mir4AuthoredMap=1')).toBe(false);
    expect(requested('diagnostics=1&mir4AuthoredMap=1', false)).toBe(true);
    expect(
      mir4WocComparisonRequested(
        new URLSearchParams('diagnostics=1&mir4WocMap=1'),
        true,
        'woc-classic',
      ),
    ).toBe(false);
  });

  it('projects development diagnostic query parameters at the startup boundary', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    const params = new URLSearchParams(
      'diagnostics=1&diagnosticsMap=mir4_m03-bosque-do-vale&diagnosticsPoi=m03-poi-garganta-uivo',
    );
    expect(offlineStartupWorldOptions(params, true)).toEqual({
      diagnosticsSpawnZoneId: 'mir4_m03-bosque-do-vale',
      diagnosticsSpawnPoiId: 'm03-poi-garganta-uivo',
      mir4WocMap: true,
    });
    expect(offlineStartupWorldOptions(params, false)).toEqual({
      diagnosticsSpawnZoneId: null,
      diagnosticsSpawnPoiId: null,
      mir4WocMap: true,
    });
    expect(
      offlineStartupSimOptions({ playerClass: 'warrior', playerName: 'Aldric' }, params, true).world
        ?.zones[0]?.id,
    ).toBe('eastbrook_vale');
    vi.unstubAllEnvs();
  });

  it('does not replace an explicit editor world with the comparison world', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'mir4-gameplay-port');
    const explicitWorld = {
      zones: [],
      camps: [],
      npcs: {},
      groundObjects: [],
    } as unknown as WorldContent;

    const options = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Editor',
      world: explicitWorld,
      mir4WocMap: true,
    });

    expect(options.world).toBe(explicitWorld);
    vi.unstubAllEnvs();
  });

  it('lets an Aeldrune editor playtest pin the MIR4 profile independently of the dev server env', () => {
    vi.stubEnv('VITE_GAME_PROFILE', 'woc-classic');
    const explicitWorld = {
      zones: [],
      camps: [],
      npcs: {},
      groundObjects: [],
    } as unknown as WorldContent;

    const options = offlineSimOptions({
      playerClass: 'warrior',
      playerName: 'Editor',
      world: explicitWorld,
      gameProfile: 'mir4-gameplay-port',
    });

    expect(options.gameProfile).toBe('mir4-gameplay-port');
    expect(options.playerClass).toBe('warrior');
    expect(options.world).toBe(explicitWorld);
    vi.unstubAllEnvs();
  });
});
