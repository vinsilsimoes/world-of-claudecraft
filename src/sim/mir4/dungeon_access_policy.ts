// Source-backed separation between native WoC dungeons and limited MIR4
// instances. This module is pure policy data; instance hosts consume it rather
// than inferring ticket rules from door models or quest copy.

export type DungeonAdmissionKind = 'woc-open' | 'mir4-ticketed' | 'unknown';

export interface Mir4TicketedDungeonDef {
  dungeonId: number;
  stageId: number;
  minLevel: number;
  startLevel: number;
  requiredCombatPower: number;
  recommendedCombatPower: number;
  recommendedPlayers: number;
  durationSeconds: number;
}

export const MIR4_DUNGEON_TICKET_POLICY = Object.freeze({
  ticketType: 3,
  ticketCost: 1,
  defaultMax: 2,
  resetHour: 5,
  resetMinute: 0,
  ticketItemId: 601201603,
});

export const MIR4_TICKETED_DUNGEON_CATALOG: readonly Mir4TicketedDungeonDef[] = Object.freeze([
  {
    dungeonId: 101,
    stageId: 200501400,
    minLevel: 20,
    startLevel: 20,
    requiredCombatPower: 11_000,
    recommendedCombatPower: 13_200,
    recommendedPlayers: 5,
    durationSeconds: 3_600,
  },
  {
    dungeonId: 102,
    stageId: 200400201,
    minLevel: 20,
    startLevel: 30,
    requiredCombatPower: 20_000,
    recommendedCombatPower: 24_600,
    recommendedPlayers: 5,
    durationSeconds: 3_600,
  },
  {
    dungeonId: 103,
    stageId: 200501020,
    minLevel: 20,
    startLevel: 40,
    requiredCombatPower: 29_000,
    recommendedCombatPower: 36_100,
    recommendedPlayers: 5,
    durationSeconds: 3_600,
  },
  {
    dungeonId: 104,
    stageId: 200400501,
    minLevel: 20,
    startLevel: 50,
    requiredCombatPower: 39_000,
    recommendedCombatPower: 48_600,
    recommendedPlayers: 5,
    durationSeconds: 3_600,
  },
  {
    dungeonId: 105,
    stageId: 200400401,
    minLevel: 20,
    startLevel: 60,
    requiredCombatPower: 46_000,
    recommendedCombatPower: 57_000,
    recommendedPlayers: 5,
    durationSeconds: 3_600,
  },
  {
    dungeonId: 106,
    stageId: 200400301,
    minLevel: 20,
    startLevel: 70,
    requiredCombatPower: 52_000,
    recommendedCombatPower: 64_800,
    recommendedPlayers: 5,
    durationSeconds: 3_600,
  },
]);

const ticketedIds = new Set(MIR4_TICKETED_DUNGEON_CATALOG.map((dungeon) => dungeon.dungeonId));
export const WOC_OPEN_DUNGEON_IDS = Object.freeze([
  'hollow_crypt',
  'sunken_bastion',
  'gravewyrm_sanctum',
  'drowned_temple',
  'nythraxis_crypt',
  'nythraxis_boss_arena',
  'wildheart_basin',
  'the_last_keep',
  'dawnhold_castle',
] as const);
const wocOpenIds = new Set<string>(WOC_OPEN_DUNGEON_IDS);
const campaignDungeonByQuest = new Map<string, number>([
  ['M04-Q05', 101],
  ['M08-Q05', 102],
  ['M12-Q05', 103],
  ['M16-Q04', 104],
  ['M20-Q05', 105],
]);

export function dungeonAdmissionKind(dungeonId: string | number): DungeonAdmissionKind {
  if (typeof dungeonId === 'string' && wocOpenIds.has(dungeonId)) return 'woc-open';
  return typeof dungeonId === 'number' && ticketedIds.has(dungeonId) ? 'mir4-ticketed' : 'unknown';
}

export function mir4StoryDungeonIdForQuest(questId: string): number | null {
  return campaignDungeonByQuest.get(questId) ?? null;
}

/** Source dungeon family used by a scripted MIR4 quest. Story bindings win;
 * repeatables use the catalog tier matching their chapter. */
export function mir4DungeonIdForQuest(questId: string): number | null {
  const story = mir4StoryDungeonIdForQuest(questId);
  if (story !== null) return story;
  const chapter = /^M(\d{2})-/.exec(questId)?.[1];
  if (!chapter) return null;
  const numericChapter = Number(chapter);
  if (!Number.isInteger(numericChapter) || numericChapter < 1 || numericChapter > 20) return null;
  if (numericChapter >= 19) return 106;
  return 101 + Math.min(4, Math.floor((numericChapter - 1) / 4));
}
