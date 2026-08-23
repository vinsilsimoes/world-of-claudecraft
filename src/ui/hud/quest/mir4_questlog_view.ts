// Pure MIR4 projection for the existing quest-log window. The painter keeps
// the shared window chrome; this core only translates authoritative profile
// state into the one live M01 quest row and its objective/reward data.

import { mir4ArcQuest } from '../../../sim/content/mir4/arc_campaign';
import { MIR4_QUESTS } from '../../../sim/content/mir4/quests';
import {
  mir4ArcStageGoal,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from '../../../sim/mir4/arc_quests';
import { mir4AutoJourneyCandidate } from '../../../sim/mir4/auto_journey_selection';
import { mir4CampaignMapAvailable } from '../../../sim/mir4/campaign_availability';
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
    stageIndex?: number;
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

function buildLegacyQuestLogView(
  state: Readonly<Mir4PlayerUiState> | null,
  actionQuestId: string | undefined,
  completedOverride?: number,
): Mir4QuestLogView {
  const quest = MIR4_QUESTS.mir4_m01_q01;
  const progress = state?.mir4Quests?.[quest.id];
  const journey = state?.mir4AutoQuest?.questId === quest.id ? state.mir4AutoQuest : undefined;
  const completed = completedOverride ?? (progress?.state === 'done' ? 1 : 0);
  if ((progress?.state === 'done' && !journey) || (!progress && !journey)) {
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
    summary: { active: 1, completed },
    item: {
      questId: quest.id,
      ready: progress?.state === 'ready' || progress?.state === 'done',
      objective: { kind, current, total },
      xpReward: quest.xpReward,
      copperReward: quest.copperReward,
      autoJourneyActive: journey !== undefined,
      autoJourneySuspended: journey?.suspended === true,
      autoJourneyAvailable: actionQuestId === quest.id,
    },
    empty: false,
  };
}

export function buildMir4QuestLogView(state: Readonly<Mir4PlayerUiState> | null): Mir4QuestLogView {
  const actionCandidate = mir4AutoJourneyCandidate(state ?? {});
  const arcProgress = mir4OrderedArcProgress(state?.mir4ArcQuests).filter((progress) => {
    const quest = mir4ArcQuest(progress.questId);
    return Boolean(quest && mir4CampaignMapAvailable(quest.mapId, state?.campaignMapIds));
  });
  if (actionCandidate?.active && actionCandidate.source === 'legacy') {
    const completed = arcProgress.filter((progress) => progress.state === 'done').length;
    return buildLegacyQuestLogView(state, actionCandidate.questId, completed);
  }
  if (arcProgress.length > 0) {
    const completed = arcProgress.filter((progress) => progress.state === 'done').length;
    const visible = arcProgress.filter(
      (progress) =>
        progress.state !== 'done' ||
        (actionCandidate?.active === true && actionCandidate.questId === progress.questId),
    );
    const currentMain = visible.find(
      (progress) => mir4ArcQuest(progress.questId)?.group === 'main',
    );
    const candidateProgress =
      actionCandidate?.source === 'arc'
        ? visible.find((progress) => progress.questId === actionCandidate.questId)
        : undefined;
    const plannedCandidateId =
      actionCandidate?.source === 'arc' &&
      state?.mir4ArcQuests?.[actionCandidate.questId] === undefined
        ? actionCandidate.questId
        : null;
    if (plannedCandidateId) {
      const quest = mir4ArcQuest(plannedCandidateId);
      if (!quest) return { summary: { active: 0, completed }, item: null, empty: true };
      return {
        summary: { active: 1, completed },
        item: {
          questId: plannedCandidateId,
          ready: false,
          objective: { kind: 'reach-giver', current: 0, total: 1 },
          xpReward: quest.xp ?? 0,
          copperReward: quest.copper ?? 0,
          autoJourneyActive: state?.mir4AutoQuest?.questId === plannedCandidateId,
          autoJourneySuspended:
            state?.mir4AutoQuest?.questId === plannedCandidateId &&
            state.mir4AutoQuest.suspended === true,
          autoJourneyAvailable: true,
        },
        empty: false,
      };
    }
    const current = candidateProgress ?? currentMain ?? visible[0];
    const quest = current ? mir4ArcQuest(current.questId) : null;
    if (!current || !quest) {
      return { summary: { active: 0, completed }, item: null, empty: true };
    }
    const stage = mir4QuestCurrentStage(current);
    return {
      summary: { active: 1, completed },
      item: {
        questId: current.questId,
        ready: current.state !== 'active',
        objective: {
          kind: 'campaign-stage',
          ...(stage ? { stageKind: stage.kind } : {}),
          stageIndex: current.stageIndex,
          current: current.stageProgress,
          total: stage ? mir4ArcStageGoal(stage) : 1,
        },
        xpReward: quest.xp ?? 0,
        copperReward: quest.copper ?? 0,
        autoJourneyActive: state?.mir4AutoQuest?.questId === current.questId,
        autoJourneySuspended:
          state?.mir4AutoQuest?.questId === current.questId &&
          state.mir4AutoQuest.suspended === true,
        autoJourneyAvailable: actionCandidate?.questId === current.questId,
      },
      empty: false,
    };
  }
  const plannedArcCandidate = actionCandidate?.source === 'arc' ? actionCandidate : null;
  const plannedArc = plannedArcCandidate ? mir4ArcQuest(plannedArcCandidate.questId) : null;
  if (plannedArc && plannedArcCandidate) {
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
        autoJourneyActive: plannedArcCandidate.active,
        autoJourneySuspended:
          plannedArcCandidate.active && state?.mir4AutoQuest?.suspended === true,
        autoJourneyAvailable: true,
      },
      empty: false,
    };
  }
  return buildLegacyQuestLogView(state, actionCandidate?.questId);
}
