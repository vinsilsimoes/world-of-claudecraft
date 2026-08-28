import { WORLD_SEED } from '../sim/world_seed';
// Editor -> game play-test handoff. Stashes a WorldContent (built from the current
// CustomMap via custom_map.customMapToWorldContent) in sessionStorage and navigates
// to the game page, which boots OFFLINE into that world (see game/editor_playtest.ts
// + main.ts). Offline-only: playtest never talks to the server.

import { EDITOR_PLAYTEST_KEY } from '../game/editor_playtest';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import { emptyZoneProps, type WorldContent } from '../sim/types';

// The shipped world seed: using it makes the play-test heightfield match
// what the editor previews for the built-in terrain.
export const DEFAULT_PLAYTEST_SEED = WORLD_SEED;

export interface PlaytestOptions {
  seed: number;
  playerClass: string;
  playerName: string;
}

// Stash the world and navigate to the game. Returns false if storage is blocked
// (the caller can surface that); navigation still happens so the user is not stuck.
export function launchPlaytest(world: WorldContent, opts: PlaytestOptions): boolean {
  const payload = JSON.stringify({
    // Static scene props come from the canonical Aeldrune world on the receiving
    // side. Keeping even the generic fallback prop inventory here wastes most of
    // sessionStorage and can make the handoff fail on an asset-rich checkout.
    content: { ...world, props: emptyZoneProps() },
    seed: opts.seed,
    playerClass: opts.playerClass,
    playerName: opts.playerName,
    gameProfile: MIR4_GAME_PROFILE,
  });
  let stored = false;
  try {
    sessionStorage.setItem(EDITOR_PLAYTEST_KEY, payload);
    stored = true;
  } catch {
    stored = false;
  }
  if (stored) window.location.href = '/index.html?editorPlaytest=aeldrune';
  return stored;
}
