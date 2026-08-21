// Pure MIR4 projection for the existing quest-log window. The painter keeps
// the shared window chrome; this core only translates authoritative profile
// state into the one live M01 quest row and its objective/reward data.

import { MIR4_QUESTS } from '../../../sim/content/mir4/quests';
import { mir4ArcQuest } from '../../../sim/content/mir4/quests_arc';
import { mir4ArcObjectiveUsesInteract } from '../../../sim/mir4/arc_quest_runtime';
import { mir4ArcStageGoal, mir4QuestCurrentStage } from '../../../sim/mir4/arc_quests';
import type { Mir4PlayerUiState } from '../../../sim/mir4/ui_state';

export type Mir4QuestLogObjectiveKind =
  | 'reach-giver'
  | 'inspect-clues'
  | 'return-giver'
  | 'campaign-stage';

export interface Mir4QuestLogItem {
  questId: string;
  ready: boolean;
  objective: {
    kind: Mir4QuestLogObjectiveKind;
    stageKind?: string;
    current: number;
    total: number;
  };
  xpReward: number;
  copperReward: number;
  autoJourneyActive: boolean;
  autoJourneySuspended: boolean;
  autoJourneyAvailable: boolean;
}

export interface Mir4QuestLogView {
  summary: { active: number; completed: number };
  item: Mir4QuestLogItem | null;
  empty: boolean;
}

export function buildMir4QuestLogView(state: Readonly<Mir4PlayerUiState> | null): Mir4QuestLogView {
  const arcProgress = Object.values(state?.mir4ArcQuests ?? {});
  if (arcProgress.length > 0) {
    const completed = arcProgress.filter((progress) => progress.state === 'done').length;
    const current = arcProgress.find((progress) => progress.state !== 'done');
    const quest = current ? mir4ArcQuest(current.questId) : null;
    if (!current || !quest) {
      return { summary: { active: 0, completed }, item: null, empty: true };
    }
    const stage = mir4QuestCurrentStage(current);
    return {
      summary: { active: 1, completed },
      item: {
        questId: current.questId,
        ready: current.state === 'ready',
        objective: {
          kind: 'campaign-stage',
          ...(stage ? { stageKind: stage.kind } : {}),
          current: current.stageProgress,
          total: stage ? mir4ArcStageGoal(stage) : 1,
        },
        xpReward: quest.xp ?? 0,
        copperReward: quest.copper ?? 0,
        autoJourneyActive: false,
        autoJourneySuspended: false,
        autoJourneyAvailable:
          current.state === 'ready' ||
          stage?.kind === 'talk' ||
          stage?.kind === 'deliver' ||
          stage?.kind === 'travel' ||
          stage?.kind === 'survive-zone' ||
          (!!stage && mir4ArcObjectiveUsesInteract(stage)),
      },
      empty: false,
    };
  }
  const plannedArc = state?.mir4AutoQuest ? mir4ArcQuest(state.mir4AutoQuest.questId) : null;
  if (plannedArc) {
    return {
      summary: { active: 1, completed: 0 },
      item: {
        questId: plannedArc.questId,
        ready: false,
        objective: {
          kind: 'reach-giver',
          current: 0,
          total: 1,
        },
        xpReward: plannedArc.xp ?? 0,
        copperReward: plannedArc.copper ?? 0,
        autoJourneyActive: true,
        autoJourneySuspended: state?.mir4AutoQuest?.suspended === true,
        autoJourneyAvailable: true,
      },
      empty: false,
    };
  }
  const quest = MIR4_QUESTS.mir4_m01_q01;
  const progress = state?.mir4Quests?.[quest.id];
  const journey = state?.mir4AutoQuest?.questId === quest.id ? state.mir4AutoQuest : undefined;
  const completed = progress?.state === 'done' ? 1 : 0;
  if (completed || (!progress && !journey)) {
    return { summary: { active: 0, completed }, item: null, empty: true };
  }

  let kind: Mir4QuestLogObjectiveKind = 'reach-giver';
  let current = 0;
  let total = 1;
  if (progress?.state === 'active') {
    kind = 'inspect-clues';
    current = Math.min(progress.inspected.length, quest.sites.length);
    total = quest.sites.length;
  } else if (progress?.state === 'ready') {
    kind = 'return-giver';
  }

  return {
    summary: { active: 1, completed: 0 },
    item: {
      questId: quest.id,
      ready: progress?.state === 'ready',
      objective: { kind, current, total },
      xpReward: quest.xpReward,
      copperReward: quest.copperReward,
      autoJourneyActive: journey !== undefined,
      autoJourneySuspended: journey?.suspended === true,
      autoJourneyAvailable: true,
    },
    empty: false,
  };
}
