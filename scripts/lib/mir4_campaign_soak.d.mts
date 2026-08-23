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

export function shouldStartMir4PowerGrind(input: {
  tick: number;
  lastProgressTick: number;
  stallTicks: number;
  policyTicks: number;
  playerLevel: number;
  recommendedLevel: number;
}): boolean;

export function isMir4PowerGrindXpProgress(
  previousXp: number,
  nextXp: number,
  grindingUntilLevel: number | null,
): boolean;

export function mir4SoakStageAllowsPowerGrind(stageKind: string | null | undefined): boolean;

export function selectMir4StrengtheningQuest(input: {
  sideQuests: readonly {
    questId: string;
    mapId: string;
    levelRange: readonly [number, number] | null;
  }[];
  progresses: Readonly<Record<string, { state?: string } | undefined>>;
  currentMainMapId: string;
  playerLevel: number;
}): string | null;

export function shouldResumeMir4MainQuest(input: {
  strengtheningQuestId: string | null;
  autoQuestId: string | null | undefined;
  mainQuestId: string | null;
  resumedMainQuestId: string | null;
}): boolean;
