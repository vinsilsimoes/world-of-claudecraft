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
export function mir4VisualBotSnapshot(world: Record<string, any>): Record<string, unknown> | null;
export function mir4VisualBotEntities(world: Record<string, any>): Record<string, unknown>[];
export function visualBotCaption(
  rosterEntry: Mir4PlaytestRosterEntry,
  characterName: string,
): string;
