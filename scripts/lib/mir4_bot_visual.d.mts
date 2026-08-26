import type { Mir4PlaytestRosterEntry } from './mir4_bot_playtest.mjs';

export interface Mir4VisualWindowPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function mir4VisualWindowLayout(
  count: number,
  screenWidth?: number,
  screenHeight?: number,
): Mir4VisualWindowPlacement[];
export function mir4VisualBotSnapshot(
  world?: Record<string, unknown>,
): Record<string, unknown> | null;
export function mir4VisualBotEntities(world?: Record<string, unknown>): Record<string, unknown>[];
export function mir4VisualRecordingOptions(
  path: string,
  ffmpegPath: string,
  fps?: number,
): {
  path: string;
  format: 'webm';
  fps: number;
  ffmpegPath: string;
  overwrite: true;
};
export function dismissMir4VisualObstructions(documentLike?: Record<string, unknown>): number;
export function mir4VisualCharacterEntryState(
  characterName: string,
  documentLike?: Record<string, unknown>,
  game?: Record<string, unknown> | null,
): 'world' | 'select' | false;
export function mir4VisualOnlineEntryState(
  characterName: string,
  excludedStates?: readonly string[],
  documentLike?: Record<string, unknown>,
  game?: Record<string, unknown> | null,
): 'world' | 'select' | 'realm' | 'login' | false;
export function resumeMir4VisualCharacter(
  characterName: string,
  documentLike?: Record<string, unknown>,
): boolean;
export function applyMir4VisualAction(
  action: Record<string, unknown>,
  game?: Record<string, unknown>,
): Promise<void>;
export function planMir4VisualPolicy(input: {
  self: Record<string, unknown>;
  entities: ReadonlyMap<number, Record<string, unknown>>;
  rosterEntry: Mir4PlaytestRosterEntry;
  tutorialSeeking: boolean;
  recoveryLevel?: number | null;
}): { tutorialSeeking: boolean; actions: Record<string, unknown>[] };
export function updateMir4VisualRecovery(
  recoveryLevel: number | null,
  observedDeaths: number,
  deathCount: number,
  level: number,
): {
  recoveryLevel: number | null;
  observedDeaths: number;
  started: boolean;
  completed: boolean;
};
export function visualBotCaption(
  rosterEntry: Mir4PlaytestRosterEntry,
  characterName: string,
): string;
