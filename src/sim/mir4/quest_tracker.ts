// Pure projection of MIR4 quest state into the data shape consumed by the
// existing quest tracker. It owns no DOM, localization or window behavior.

import type { Mir4AutoQuestState } from '../auto_quest/core';
import { mir4ArcQuest } from '../content/mir4/arc_campaign';
import { MIR4_QUESTS } from '../content/mir4/quests';
import {
  type Mir4ArcQuestProgress,
  mir4ArcStageGoal,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from './arc_quests';
import { mir4AutoJourneyCandidate } from './auto_journey_selection';
import { mir4CampaignMapAvailable } from './campaign_availability';
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
    stageIndex?: number;
    current: number;
    total: number;
  };
}

interface Mir4QuestTrackerState {
  playerLevel?: number;
  fullCampaignAvailable?: boolean;
  campaignMapIds?: readonly string[];
  mir4Quests?: Readonly<Record<string, Mir4QuestProgress>>;
  mir4ArcQuests?: Readonly<Record<string, Mir4ArcQuestProgress>>;
  mir4AutoQuest?: Mir4AutoQuestState;
}

function legacyTrackerEntry(
  state: Mir4QuestTrackerState,
  actionQuestId: string | undefined,
): Mir4QuestTrackerEntry | null {
  const quest = MIR4_QUESTS.mir4_m01_q01;
  const progress = state.mir4Quests?.[quest.id];
  const auto = state.mir4AutoQuest?.questId === quest.id ? state.mir4AutoQuest : undefined;
  if ((progress?.state === 'done' && !auto) || (!progress && !auto)) return null;

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
  return {
    id: quest.id,
    complete: progress?.state === 'ready' || progress?.state === 'done',
    autoJourneyAvailable: actionQuestId === quest.id,
    autoJourneyActive: auto !== undefined,
    autoJourneySuspended: auto?.suspended === true,
    objective: { kind, current, total },
  };
}

export function mir4QuestTrackerEntries(state: Mir4QuestTrackerState): Mir4QuestTrackerEntry[] {
  const orderedArc = mir4OrderedArcProgress(state.mir4ArcQuests);
  const actionCandidate = mir4AutoJourneyCandidate(state);
  const startCandidate = mir4AutoJourneyCandidate({
    playerLevel: state.playerLevel,
    fullCampaignAvailable: state.fullCampaignAvailable,
    campaignMapIds: state.campaignMapIds,
    mir4Quests: state.mir4Quests,
    mir4ArcQuests: state.mir4ArcQuests,
  });
  const plannedMainId =
    !(actionCandidate?.active && actionCandidate.source === 'legacy') &&
    startCandidate?.source === 'arc' &&
    mir4ArcQuest(startCandidate.questId)?.group === 'main' &&
    state.mir4ArcQuests?.[startCandidate.questId] === undefined
      ? startCandidate.questId
      : null;
  const arcEntries = orderedArc
    .filter(
      (progress) =>
        mir4CampaignMapAvailable(
          mir4ArcQuest(progress.questId)?.mapId ?? '',
          state.campaignMapIds,
        ) &&
        (progress.state !== 'done' ||
          (actionCandidate?.active === true && actionCandidate.questId === progress.questId)),
    )
    .map((progress): Mir4QuestTrackerEntry | null => {
      const quest = mir4ArcQuest(progress.questId);
      if (!quest) return null;
      const stage = mir4QuestCurrentStage(progress);
      return {
        id: progress.questId,
        complete: progress.state !== 'active',
        autoJourneyAvailable: actionCandidate?.questId === progress.questId,
        autoJourneyActive: state.mir4AutoQuest?.questId === progress.questId,
        autoJourneySuspended:
          state.mir4AutoQuest?.questId === progress.questId && state.mir4AutoQuest.suspended,
        objective: {
          kind: 'campaign-stage',
          ...(stage ? { stageKind: stage.kind } : {}),
          stageIndex: progress.stageIndex,
          current: progress.stageProgress,
          total: stage ? mir4ArcStageGoal(stage) : 1,
        },
      };
    })
    .filter((entry): entry is Mir4QuestTrackerEntry => entry !== null);
  const plannedEntry: Mir4QuestTrackerEntry[] = plannedMainId
    ? [
        {
          id: plannedMainId,
          complete: false,
          autoJourneyAvailable: actionCandidate?.questId === plannedMainId,
          autoJourneyActive: state.mir4AutoQuest?.questId === plannedMainId,
          autoJourneySuspended:
            state.mir4AutoQuest?.questId === plannedMainId && state.mir4AutoQuest.suspended,
          objective: { kind: 'reach-giver', current: 0, total: 1 },
        },
      ]
    : [];
  const legacyEntry = legacyTrackerEntry(state, actionCandidate?.questId);
  if (arcEntries.length > 0 || plannedEntry.length > 0) {
    const mainEntries = arcEntries.filter((entry) => mir4ArcQuest(entry.id)?.group === 'main');
    const otherEntries = arcEntries.filter((entry) => mir4ArcQuest(entry.id)?.group !== 'main');
    return [
      ...mainEntries,
      ...plannedEntry,
      ...otherEntries,
      ...(legacyEntry?.autoJourneyActive ? [legacyEntry] : []),
    ];
  }
  return legacyEntry ? [legacyEntry] : [];
}
