import { browserGameProfile } from '../game_profile_runtime';
import {
  PLAYER_INTEREST_DROP_RADIUS,
  type PlayerClass,
  type SimConfig,
  type WorldContent,
} from '../sim/types';
import { WORLD_SEED } from '../sim/world_seed';

// The offline browser world's Sim options, extracted from main.ts's startOffline
// so the bootstrap stays thin (main.ts is a firewall, not a home). The client is
// the host boundary that resolves the build-time game profile for the Sim.
export function offlineSimOptions(opts: {
  playerClass: PlayerClass;
  playerName: string;
  world?: WorldContent;
  seedOverride?: number;
}): SimConfig {
  return {
    seed: opts.seedOverride ?? WORLD_SEED,
    playerClass: opts.playerClass,
    gameProfile: browserGameProfile(),
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
    world: opts.world,
  };
}
