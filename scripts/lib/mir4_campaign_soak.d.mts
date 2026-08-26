export interface Mir4SoakProgress {
  completed: number;
  activeQuestId: string | null;
  stageIndex: number;
  stageProgress: number;
}

export function isForwardMir4SoakProgress(
  previous: Mir4SoakProgress,
  next: Mir4SoakProgress,
  questOrder: readonly string[],
): boolean;

export function isMir4SameQuestStageProgress(
  previous: Mir4SoakProgress,
  next: Mir4SoakProgress,
): boolean;

export function shouldStartMir4PowerGrind(input: {
  tick: number;
  lastProgressTick: number;
  stallTicks: number;
  policyTicks: number;
  playerLevel: number;
  recommendedLevel: number;
  traveling?: boolean;
}): boolean;

export function isMir4MainJourneyTraveling(input: {
  mainQuestId: string | null;
  autoQuestId: string | null | undefined;
  routeWaypointCount: number;
}): boolean;

export function shouldRunMir4SurvivalIntervention(input: {
  stageKind: string | null | undefined;
  grindingUntilLevel: number | null;
  routeWaypointDistance: number | null | undefined;
  clearanceYards?: number;
}): boolean;

export function shouldEscalateMir4TravelThreatToPowerGrind(input: {
  tick: number;
  startedTick: number | null;
  playerLevel: number;
  recommendedLevel: number;
  attemptTicks?: number;
}): boolean;

export function shouldResumeMir4JourneyAfterTravelThreatKill(input: {
  interventionQuestId: string | null;
  previousKills: number;
  currentKills: number;
}): boolean;

export function isMir4PowerGrindXpProgress(
  previousXp: number,
  nextXp: number,
  grindingUntilLevel: number | null,
): boolean;

export function nextMir4PowerGrindTarget(playerLevel: number, recommendedLevel: number): number;

export function restoredMir4PowerGrindTarget(input: {
  playerLevel: number;
  sideQuests: readonly { questId: string }[];
  progresses: Readonly<Record<string, { state?: string } | undefined>>;
}): number | null;

export interface Mir4NativeGatherCandidate {
  id: string;
  type: 'herb' | 'ore' | string;
  x: number;
  z: number;
  ready: boolean;
}

export function selectMir4NativeGatherTarget(input: {
  nodes: readonly Mir4NativeGatherCandidate[];
  position: Readonly<{ x: number; z: number }>;
  preferredType: 'herb' | 'ore';
  excludedNodeIds?: readonly string[];
  maxDistanceYards?: number;
}): Mir4NativeGatherCandidate | null;

export function shouldSkipStalledMir4NativeGatherRoute(
  stalledTicks: number,
  thresholdTicks?: number,
): boolean;

export function mir4SoakStageAllowsPowerGrind(stageKind: string | null | undefined): boolean;

export function shouldEndMir4PowerGrindForMainStage(input: {
  grindingUntilLevel: number | null;
  activeQuestId: string | null;
  mainQuestId: string | null;
  mainStageKind: string | null | undefined;
}): boolean;

export function selectMir4StrengtheningQuest(input: {
  sideQuests: readonly {
    questId: string;
    mapId: string;
    levelRange: readonly [number, number] | null;
  }[];
  progresses: Readonly<Record<string, { state?: string } | undefined>>;
  currentMainMapId: string;
  playerLevel: number;
  includeCurrentMap?: boolean;
  preferPreviousMap?: boolean;
  excludedQuestIds?: readonly string[];
}): string | null;

export function shouldSkipStalledMir4StrengtheningQuest(input: {
  tick: number;
  selectedAtTick: number | null;
  lastProgressTick: number;
  attemptTicks?: number;
}): boolean;

export function shouldResumeMir4MainQuest(input: {
  strengtheningQuestId: string | null;
  autoQuestId: string | null | undefined;
  mainQuestId: string | null;
  resumedMainQuestId: string | null;
  grindStalled?: boolean;
}): boolean;

export function shouldKeepMir4MainQuestGrindRoute(input: {
  resumedMainQuestId: string | null;
  autoQuestId: string | null | undefined;
  mainQuestId: string | null;
  hasVisibleGrindTarget: boolean;
}): boolean;
