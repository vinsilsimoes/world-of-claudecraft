// Game-side reader for an editor play-test handoff. The map editor (its own
// entry at /editor) serializes a custom world into sessionStorage and navigates
// to the game page; this reads it back so the OFFLINE boot can run that world.
// Playtest never touches the server or the authoritative world: it only shapes
// the local offline Sim, so it ships enabled (same-origin sessionStorage is the
// player's own data, and offline progress is per-session anyway).
//
// Deliberately depends ONLY on sim types (WorldContent), never on src/editor, so
// the editor's code never enters the shipped game bundle. Defensive: any
// malformed blob yields null and the normal start screen runs instead.

import { type GameProfile, MIR4_GAME_PROFILE } from '../sim/game_profile';
import { buildMir4WocCampaignWorld } from '../sim/mir4/woc_comparison_world';
import type { PlayerClass, WorldContent } from '../sim/types';
import { WORLD_SEED } from '../sim/world_seed';

export const EDITOR_PLAYTEST_KEY = 'woc_editor_playtest';

export interface EditorPlaytestRequest {
  content: WorldContent;
  seed: number;
  playerClass: PlayerClass;
  playerName: string;
  gameProfile: GameProfile;
}

const VALID_CLASSES: ReadonlySet<string> = new Set([
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'mage',
  'warlock',
  'druid',
  'shaman',
]);

// Shape-check the content enough that the Sim ctor and terrain function won't trip
// on it. Full validation lives in the editor; this is the safety net at the door.
function looksLikeWorldContent(c: unknown): c is WorldContent {
  if (!c || typeof c !== 'object') return false;
  const w = c as Record<string, unknown>;
  const zones = w.zones;
  if (!Array.isArray(zones) || zones.length === 0) return false;
  for (const z of zones) {
    const zone = z as Record<string, unknown>;
    if (typeof zone.zMin !== 'number' || typeof zone.zMax !== 'number') return false;
    if (!zone.hub || typeof (zone.hub as Record<string, unknown>).x !== 'number') return false;
    if (!Array.isArray(zone.lakes) || !Array.isArray(zone.pois)) return false;
  }
  return (
    Array.isArray(w.camps) &&
    Array.isArray(w.groundObjects) &&
    Array.isArray(w.roads) &&
    !!w.props &&
    !!w.playerStart &&
    typeof (w.playerStart as Record<string, unknown>).x === 'number'
  );
}

/**
 * Rebuild the canonical Aeldrune world in the game bundle, then apply only the
 * editor-owned layer. Static towns, walls, portals, services and presentation
 * metadata never cross sessionStorage and therefore cannot be omitted or drift
 * into the generic WoC custom-world runtime.
 */
export function composeAeldruneEditorPlaytestWorld(
  patch: WorldContent,
  seed: number,
): WorldContent {
  const base = buildMir4WocCampaignWorld(undefined, seed);
  return {
    ...base,
    zones: patch.zones,
    camps: patch.camps,
    npcs: patch.npcs,
    groundObjects: patch.groundObjects,
    roads: patch.roads,
    playerStart: patch.playerStart,
    terrainEdits: [...(base.terrainEdits ?? []), ...(patch.terrainEdits ?? [])],
    placements: [...(base.placements ?? []), ...(patch.placements ?? [])],
    blockers: [...(base.blockers ?? []), ...(patch.blockers ?? [])],
    biomePaint: patch.biomePaint ?? base.biomePaint,
    waterLevel: patch.waterLevel ?? base.waterLevel,
    mir4ArcMapProjections: patch.mir4ArcMapProjections ?? base.mir4ArcMapProjections,
  };
}

// Read AND consume a pending play-test request (removed so a later refresh shows
// the normal menu). Returns null with no request or on bad data.
export function takeEditorPlaytestRequest(): EditorPlaytestRequest | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(EDITOR_PLAYTEST_KEY);
    if (raw) sessionStorage.removeItem(EDITOR_PLAYTEST_KEY);
  } catch {
    return null; // storage blocked
  }
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (!obj || typeof obj !== 'object') return null;
    if (!looksLikeWorldContent(obj.content)) return null;
    const seed = typeof obj.seed === 'number' && Number.isFinite(obj.seed) ? obj.seed : WORLD_SEED;
    const pc =
      typeof obj.playerClass === 'string' && VALID_CLASSES.has(obj.playerClass)
        ? (obj.playerClass as PlayerClass)
        : 'warrior';
    const name =
      typeof obj.playerName === 'string' && obj.playerName.trim()
        ? obj.playerName.slice(0, 24)
        : 'Mapmaker';
    if (obj.gameProfile !== MIR4_GAME_PROFILE) return null;
    return {
      content: composeAeldruneEditorPlaytestWorld(obj.content as WorldContent, seed),
      seed,
      playerClass: pc,
      playerName: name,
      gameProfile: MIR4_GAME_PROFILE,
    };
  } catch {
    return null;
  }
}
