import { browserGameProfile } from '../game_profile_runtime';
import { buildMir4ArcWorld } from '../sim/content/mir4/arc_world';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import { mir4ShellClassFor } from '../sim/mir4/stats';
import {
  type Mir4ClassKey,
  PLAYER_INTEREST_DROP_RADIUS,
  type PlayerClass,
  type SimConfig,
  type WorldContent,
} from '../sim/types';
import { WORLD_SEED } from '../sim/world_seed';

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
}): SimConfig {
  const profile = browserGameProfile();
  const shell = mir4ShellClassFor(opts.playerClass, profile);
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
    // The mir4 profile's offline world: the full 20-map arc (Phase 5.4). An
    // explicit world (the editor play-test) always wins; classic stays on the
    // generated builtin. Set MIR4_ARC_MAPS=1 for the m01-only slice.
    world:
      opts.world ?? (profile === MIR4_GAME_PROFILE ? buildMir4ArcWorld(arcMapBudget()) : undefined),
  };
}

function arcMapBudget(): number {
  const raw = import.meta.env.VITE_MIR4_ARC_MAPS;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : 20;
}
