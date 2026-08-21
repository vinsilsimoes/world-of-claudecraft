// Pure projection of MIR4 quest state into the data shape consumed by the
// existing quest tracker. It owns no DOM, localization or window behavior.

import type { Mir4AutoQuestState } from '../auto_quest/core';
import { MIR4_QUESTS } from '../content/mir4/quests';
import { mir4ArcQuest } from '../content/mir4/quests_arc';
import { mir4ArcObjectiveUsesInteract } from './arc_quest_runtime';
import { type Mir4ArcQuestProgress, mir4ArcStageGoal, mir4QuestCurrentStage } from './arc_quests';
import type { Mir4QuestProgress } from './quest';

export interface Mir4QuestTrackerEntry {
  id: string;
  complete: boolean;
  autoJourneyAvailable?: boolean;
  autoJourneyActive: boolean;
  autoJourneySuspended: boolean;
  objective: {
    kind: 'reach-giver' | 'inspect-clues' | 'return-giver' | 'campaign-stage';
    stageKind?: string;
    current: number;
    total: number;
  };
}

export function mir4QuestTrackerEntries(state: {
  mir4Quests?: Readonly<Record<string, Mir4QuestProgress>>;
  mir4ArcQuests?: Readonly<Record<string, Mir4ArcQuestProgress>>;
  mir4AutoQuest?: Mir4AutoQuestState;
}): Mir4QuestTrackerEntry[] {
  const arcEntries = Object.values(state.mir4ArcQuests ?? {})
    .filter((progress) => progress.state !== 'done')
    .map((progress): Mir4QuestTrackerEntry | null => {
      const quest = mir4ArcQuest(progress.questId);
      if (!quest) return null;
      const stage = mir4QuestCurrentStage(progress);
      const journeyAvailable =
        progress.state === 'ready' ||
        stage?.kind === 'talk' ||
        stage?.kind === 'deliver' ||
        stage?.kind === 'travel' ||
        stage?.kind === 'survive-zone' ||
        (!!stage && mir4ArcObjectiveUsesInteract(stage));
      return {
        id: progress.questId,
        complete: progress.state === 'ready',
        autoJourneyAvailable: journeyAvailable,
        autoJourneyActive: state.mir4AutoQuest?.questId === progress.questId,
        autoJourneySuspended:
          state.mir4AutoQuest?.questId === progress.questId && state.mir4AutoQuest.suspended,
        objective: {
          kind: 'campaign-stage',
          ...(stage ? { stageKind: stage.kind } : {}),
          current: progress.stageProgress,
          total: stage ? mir4ArcStageGoal(stage) : 1,
        },
      };
    })
    .filter((entry): entry is Mir4QuestTrackerEntry => entry !== null);
  if (arcEntries.length > 0) return arcEntries;
  const plannedArc = state.mir4AutoQuest ? mir4ArcQuest(state.mir4AutoQuest.questId) : null;
  if (plannedArc) {
    return [
      {
        id: plannedArc.questId,
        complete: false,
        autoJourneyAvailable: true,
        autoJourneyActive: true,
        autoJourneySuspended: state.mir4AutoQuest?.suspended === true,
        objective: {
          kind: 'reach-giver',
          current: 0,
          total: 1,
        },
      },
    ];
  }
  const quest = MIR4_QUESTS.mir4_m01_q01;
  const progress = state.mir4Quests?.[quest.id];
  const auto = state.mir4AutoQuest?.questId === quest.id ? state.mir4AutoQuest : undefined;
  if (progress?.state === 'done' || (!progress && !auto)) return [];

  let kind: Mir4QuestTrackerEntry['objective']['kind'] = 'reach-giver';
  let current = 0;
  let total = 1;
  if (progress?.state === 'active') {
    kind = 'inspect-clues';
    current = Math.min(progress.inspected.length, quest.sites.length);
    total = quest.sites.length;
  } else if (progress?.state === 'ready') {
    kind = 'return-giver';
  }

  return [
    {
      id: quest.id,
      complete: progress?.state === 'ready',
      autoJourneyAvailable: true,
      autoJourneyActive: auto !== undefined,
      autoJourneySuspended: auto?.suspended === true,
      objective: { kind, current, total },
    },
  ];
}
