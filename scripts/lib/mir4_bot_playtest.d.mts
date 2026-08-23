export interface Mir4PlaytestRosterEntry {
  readonly classKey: 'warrior' | 'elementalist' | 'taoist' | 'arbalist' | 'lancer';
  readonly classId: 1 | 2 | 3 | 4 | 5;
  readonly namePrefix: string;
  readonly initialSkillIds: readonly number[];
}

export interface Mir4BotTracker {
  identity: { classKey: string; classId: number; characterName: string };
  startedAt: number;
  firstSnapshotAt: number | null;
  lastSnapshotAt: number | null;
  lastProgressAt: number;
  snapshots: number;
  baseline: Record<string, number> | null;
  latest: Record<string, unknown> | null;
  progress: Record<string, number>;
  timeline: Record<string, unknown>[];
  eventCounts: Record<string, number>;
  errors: string[];
  questFingerprints: Map<string, string>;
  equipmentEnhancements: Map<string, number>;
  deathActive: boolean;
  playerId: number | null;
}

export const MIR4_PLAYTEST_ROSTER: readonly Mir4PlaytestRosterEntry[];
export function selectMir4PlaytestRoster(selector?: string): readonly Mir4PlaytestRosterEntry[];
export const MIR4_BOT_UI_TUTORIAL_QUEST_IDS: readonly string[];
export function planMir4PvpChallenge(
  challenger: Record<string, unknown> | null | undefined,
  defender: Record<string, unknown> | null | undefined,
): { ready: boolean; facing: number; move: Record<string, number> };
export function mir4BotHasDuelRequest(
  events: readonly Record<string, unknown>[] | null | undefined,
  challengerPid: number | null | undefined,
): boolean;
export function mir4BotAccountIdentity(
  namespace: string,
  rosterEntry: Mir4PlaytestRosterEntry,
): { username: string; characterName: string };
export function createMir4BotTracker(
  rosterEntry: Mir4PlaytestRosterEntry,
  characterName: string,
  startedAt: number,
): Mir4BotTracker;
export function recordMir4BotSnapshot(
  tracker: Mir4BotTracker,
  self: Record<string, unknown>,
  atMs: number,
): Mir4BotTracker;
export function recordMir4BotEvents(
  tracker: Mir4BotTracker,
  events: readonly Record<string, unknown>[],
  atMs: number,
): Mir4BotTracker;
export function planMir4ProgressionActions(
  self: Record<string, unknown>,
  rosterEntry?: Mir4PlaytestRosterEntry,
): Record<string, unknown>[];
export function planMir4TutorialEngagement(
  self: Record<string, unknown>,
  entities: ReadonlyMap<number, Record<string, unknown>>,
  rosterEntry: Mir4PlaytestRosterEntry,
): Record<string, unknown>[];
export const MIR4_BOT_PORTAL_TUTORIAL_TARGETS: Readonly<
  Record<string, Readonly<{ x: number; z: number }>>
>;
export function planMir4GrindingEngagement(
  self: Record<string, unknown>,
  entities: ReadonlyMap<number, Record<string, unknown>>,
  acquireRadiusYards?: number,
): Record<string, unknown>[];
export function planMir4ThreatIntervention(
  self: Record<string, unknown>,
  entities: ReadonlyMap<number, Record<string, unknown>>,
  rosterEntry: Mir4PlaytestRosterEntry,
  dangerRadiusYards?: number,
): Record<string, unknown>[];
export interface Mir4PlaytestReport {
  schemaVersion: number;
  profile: string;
  namespace: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  summary: {
    bots: number;
    classesRepresented: number;
    pvpCompleted: boolean;
    medianProgressionScore: number;
    findings: number;
  };
  pvp: Record<string, unknown> | null;
  bots: Record<string, unknown>[];
  findings: Record<string, unknown>[];
  runtime?: Record<string, unknown>;
}
export function buildMir4PlaytestReport(input: {
  namespace: string;
  trackers: readonly Mir4BotTracker[];
  startedAt: number;
  endedAt: number;
  stallThresholdMs: number;
  pvp?: Record<string, unknown> | null;
}): Mir4PlaytestReport;
