import { browserGameProfile } from '../game_profile_runtime';
import { MIR4_AUTHORED_MAP_IDS } from '../sim/content/mir4/authored_maps';
import { type GameProfile, MIR4_GAME_PROFILE } from '../sim/game_profile';
import { activateWorldForGameProfile } from '../sim/game_profile_world';
import { mir4ShellClassFor } from '../sim/mir4/stats';
import {
  type Mir4ClassKey,
  PLAYER_INTEREST_DROP_RADIUS,
  type PlayerClass,
  type SimConfig,
  type WorldContent,
} from '../sim/types';
import { WORLD_SEED } from '../sim/world_seed';

// Offline names reach innerHTML-backed player-name surfaces. Keep the server's
// character-name grammar at this client-only boundary too.
export function sanitizeOfflineName(raw: string): string {
  const stripped = raw
    .replace(/[^A-Za-z' -]/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .slice(0, 16);
  return /^[A-Za-z][A-Za-z' -]{1,15}$/.test(stripped) ? stripped : 'Adventurer';
}

/** The transplanted WoC world is the MIR4 profile default. Development QA can
 * still open the retired authored-map runtime explicitly while migration
 * comparisons remain useful. */
export function mir4WocComparisonRequested(
  params: URLSearchParams,
  dev: boolean,
  profile: GameProfile = browserGameProfile(),
): boolean {
  if (profile !== MIR4_GAME_PROFILE) return false;
  return !(dev && params.get('diagnostics') === '1' && params.get('mir4AuthoredMap') === '1');
}

export function offlineStartupWorldOptions(params: URLSearchParams, dev: boolean) {
  const diagnostics = dev && params.get('diagnostics') === '1';
  return {
    diagnosticsSpawnZoneId: diagnostics ? params.get('diagnosticsMap') : null,
    diagnosticsSpawnPoiId: diagnostics ? params.get('diagnosticsPoi') : null,
    mir4WocMap: mir4WocComparisonRequested(params, dev),
  };
}

export function offlineStartupSimOptions(
  opts: Parameters<typeof offlineSimOptions>[0],
  params: URLSearchParams,
  dev: boolean,
): SimConfig {
  return offlineSimOptions({ ...opts, ...offlineStartupWorldOptions(params, dev) });
}

// The offline browser world's Sim options, extracted from main.ts's startOffline
// so the bootstrap stays thin (main.ts is a firewall, not a home). The client is
// the host boundary that resolves the build-time game profile for the Sim.
// A mir4 roster key (D1 in the port plan) arrives as playerClassMir4 while
// playerClass carries the warrior shell every classic derivation reads.
export function offlineSimOptions(opts: {
  playerClass: PlayerClass | Mir4ClassKey;
  playerName: string;
  world?: WorldContent;
  seedOverride?: number;
  diagnosticsSpawnZoneId?: string | null;
  diagnosticsSpawnPoiId?: string | null;
  mir4WocMap?: boolean;
}): SimConfig {
  const profile = browserGameProfile();
  const shell = mir4ShellClassFor(opts.playerClass, profile);
  const baseWorld = activateWorldForGameProfile(profile, {
    explicitWorld: opts.world,
    mir4MapCount: arcMapBudget(),
    mir4WocMap: opts.world === undefined ? opts.mir4WocMap : false,
    terrainSeed: opts.seedOverride ?? WORLD_SEED,
  });
  const diagnosticsZone = baseWorld?.zones?.find((zone) => zone.id === opts.diagnosticsSpawnZoneId);
  const diagnosticsPoi = baseWorld?.zones
    ?.flatMap((zone) => zone.pois)
    .find((poi) => poi.id === opts.diagnosticsSpawnPoiId);
  const diagnosticsSpawn =
    diagnosticsPoi?.diagnosticSpawn ?? diagnosticsPoi ?? diagnosticsZone?.hub;
  let resolvedWorld = baseWorld;
  if (baseWorld && diagnosticsSpawn) {
    resolvedWorld = {
      ...baseWorld,
      playerStart: { x: diagnosticsSpawn.x, z: diagnosticsSpawn.z },
    };
  }
  return {
    seed: opts.seedOverride ?? WORLD_SEED,
    playerClass: shell,
    playerClassMir4: shell === opts.playerClass ? undefined : (opts.playerClass as Mir4ClassKey),
    gameProfile: profile,
    playerName: opts.playerName,
    devCommands: import.meta.env.DEV,
    // The offline world runs the ranked rift portal scheduler like the live
    // server (custom editor play-test maps keep it off: their zones differ).
    riftPortals: opts.world === undefined,
    valeCupShowcase: true, // idle Sowfield auto-runs a bot exhibition to watch/bet on
    // Match the live server's proven-safe idle-AI interest throttle. Ordinary
    // entity rigs are gone by 96 yd and mob aggro caps at 20 yd, so this removes
    // full-world wilderness AI from the browser's 20 Hz tick without changing
    // anything visible or interactable.
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    // Offline persistence follows the same civil-time dungeon reset as the
    // authoritative server. Tests and headless sims keep their injected clock.
    lockoutNowMs: () => Date.now(),
    // The MIR4 browser exposes only production-authored maps by default. An
    // explicit world (the editor play-test) always wins; classic stays on the
    // generated builtin. VITE_MIR4_ARC_MAPS may opt development QA into later
    // campaign scaffolding without presenting it as finished content.
    world: resolvedWorld,
  };
}

function arcMapBudget(): number {
  const raw = import.meta.env.VITE_MIR4_ARC_MAPS;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20
    ? parsed
    : MIR4_AUTHORED_MAP_IDS.length;
}
