// One host-neutral Auto Journey decision shared by the simulation and every
// MIR4 quest surface. The command is global, so exactly one quest may expose
// Start or Stop at a time.

import { type Mir4ArcQuestStage, mir4ArcQuest } from '../content/mir4/arc_campaign';
import { MIR4_QUESTS } from '../content/mir4/quests';
import {
  type Mir4ArcQuestProgress,
  mir4NextMainQuest,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from './arc_quests';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_ESCORT_STAGE_KINDS,
  MIR4_ARC_INTERACT_STAGE_KINDS,
  MIR4_ARC_POSITION_STAGE_KINDS,
  MIR4_ARC_TALK_STAGE_KINDS,
} from './arc_stage_kinds';
import { mir4CampaignMapAvailable } from './campaign_availability';
import type { Mir4QuestProgress } from './quest';

export type Mir4AutoJourneyPhase = 'to-giver' | 'to-site' | 'return' | 'done';

export interface Mir4AutoJourneyStateLike {
  questId: string;
  phase: Mir4AutoJourneyPhase;
  siteIndex: number;
  suspended: boolean;
}

export interface Mir4AutoJourneySelectionState {
  playerLevel?: number;
  fullCampaignAvailable?: boolean;
  campaignMapIds?: readonly string[];
  mir4Quests?: Readonly<Record<string, Mir4QuestProgress>>;
  mir4ArcQuests?: Readonly<Record<string, Mir4ArcQuestProgress>>;
  mir4AutoQuest?: Mir4AutoJourneyStateLike;
}

export interface Mir4AutoJourneyCandidate {
  questId: string;
  phase: Exclude<Mir4AutoJourneyPhase, 'done'>;
  siteIndex: number;
  source: 'arc' | 'legacy';
  active: boolean;
}

export interface Mir4AutoJourneySelectionOptions {
  /** Compatibility capability for complete 20-map hosts. */
  fullCampaignAvailable?: boolean;
  /** Exact progressively approved map set owned by the host world. */
  campaignMapIds?: readonly string[];
}

/** Stage families for which the current runtime owns every required action.
 * Crafting and material receipts intentionally remain manual. */
export function mir4AutoJourneyStageSupported(stage: Pick<Mir4ArcQuestStage, 'kind'>): boolean {
  return (
    MIR4_ARC_TALK_STAGE_KINDS.has(stage.kind) ||
    MIR4_ARC_POSITION_STAGE_KINDS.has(stage.kind) ||
    MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind) ||
    MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind) ||
    MIR4_ARC_INTERACT_STAGE_KINDS.has(stage.kind) ||
    stage.kind === 'system-tutorial'
  );
}

export function mir4AutoJourneyProgressSupported(progress: Mir4ArcQuestProgress): boolean {
  const quest = mir4ArcQuest(progress.questId);
  if (!quest || progress.state === 'done') return false;
  if (quest.group === 'main' || progress.state === 'ready') return true;
  const stage = mir4QuestCurrentStage(progress);
  return stage !== null && mir4AutoJourneyStageSupported(stage);
}

export function mir4AutoJourneyQuestLevelEligible(
  questId: string,
  playerLevel: number | undefined,
): boolean {
  const quest = mir4ArcQuest(questId);
  // Main quests are never hidden behind an XP grind. Their authored level is
  // a difficulty recommendation; combat remains the real readiness check.
  if (quest?.group === 'main') return true;
  if (playerLevel === undefined) return true;
  const minimumLevel = quest?.levelRange?.[0];
  return minimumLevel === undefined || playerLevel >= minimumLevel;
}

function arcCandidate(progress: Mir4ArcQuestProgress): Mir4AutoJourneyCandidate {
  return {
    questId: progress.questId,
    phase: progress.state === 'ready' ? 'return' : 'to-site',
    siteIndex: progress.stageIndex,
    source: 'arc',
    active: false,
  };
}

function activeCandidate(state: Mir4AutoJourneySelectionState): Mir4AutoJourneyCandidate | null {
  const active = state.mir4AutoQuest;
  if (!active || active.phase === 'done') return null;
  const source = mir4ArcQuest(active.questId)
    ? 'arc'
    : active.questId in MIR4_QUESTS
      ? 'legacy'
      : null;
  if (!source) return null;
  return {
    questId: active.questId,
    phase: active.phase,
    siteIndex: active.siteIndex,
    source,
    active: true,
  };
}

function inferredFullCampaignAvailable(
  state: Mir4AutoJourneySelectionState,
  orderedArc: readonly Mir4ArcQuestProgress[],
): boolean {
  return (
    orderedArc.length > 0 ||
    (state.mir4AutoQuest !== undefined && mir4ArcQuest(state.mir4AutoQuest.questId) !== null)
  );
}

/** Selects the exact quest affected by the global Auto Journey command.
 * A running journey wins so every surface exposes Stop on the real owner. */
export function mir4AutoJourneyCandidate(
  state: Mir4AutoJourneySelectionState,
  options: Mir4AutoJourneySelectionOptions = {},
): Mir4AutoJourneyCandidate | null {
  const campaignMapIds = options.campaignMapIds ?? state.campaignMapIds;
  const questIsAvailable = (questId: string): boolean => {
    const quest = mir4ArcQuest(questId);
    return !quest || mir4CampaignMapAvailable(quest.mapId, campaignMapIds);
  };
  const active = activeCandidate(state);
  if (active && questIsAvailable(active.questId)) return active;

  const orderedArc = mir4OrderedArcProgress(state.mir4ArcQuests);
  const activeMain = orderedArc.find(
    (progress) =>
      progress.state !== 'done' &&
      mir4ArcQuest(progress.questId)?.group === 'main' &&
      questIsAvailable(progress.questId),
  );
  if (activeMain) return arcCandidate(activeMain);

  const fullCampaignAvailable =
    options.fullCampaignAvailable ??
    state.fullCampaignAvailable ??
    inferredFullCampaignAvailable(state, orderedArc);
  const campaignAvailable =
    campaignMapIds !== undefined ? campaignMapIds.length > 0 : fullCampaignAvailable;
  if (campaignAvailable) {
    const doneMain = new Set(
      orderedArc
        .filter(
          (progress) =>
            progress.state === 'done' && mir4ArcQuest(progress.questId)?.group === 'main',
        )
        .map((progress) => progress.questId),
    );
    const nextMainId = mir4NextMainQuest(doneMain);
    if (
      nextMainId &&
      questIsAvailable(nextMainId) &&
      mir4AutoJourneyQuestLevelEligible(nextMainId, state.playerLevel)
    ) {
      return {
        questId: nextMainId,
        phase: 'to-giver',
        siteIndex: 0,
        source: 'arc',
        active: false,
      };
    }
  }

  const side = orderedArc.find(
    (progress) =>
      mir4ArcQuest(progress.questId)?.group !== 'main' &&
      questIsAvailable(progress.questId) &&
      mir4AutoJourneyProgressSupported(progress),
  );
  if (side) return arcCandidate(side);

  if (campaignAvailable) return null;

  const legacyQuest = MIR4_QUESTS.mir4_m01_q01;
  const legacyProgress = state.mir4Quests?.[legacyQuest.id];
  if (legacyProgress?.state === 'done') return null;
  return {
    questId: legacyQuest.id,
    phase: legacyProgress ? 'to-site' : 'to-giver',
    siteIndex: legacyProgress?.inspected.length ?? 0,
    source: 'legacy',
    active: false,
  };
}

/** Resolve the exact quest row explicitly selected by the player. Quest
 * acceptance remains authoritative; this only selects the journey cursor. */
export function mir4AutoJourneyCandidateForQuest(
  state: Mir4AutoJourneySelectionState,
  questId: string,
  options: Mir4AutoJourneySelectionOptions = {},
): Mir4AutoJourneyCandidate | null {
  const campaignMapIds = options.campaignMapIds ?? state.campaignMapIds;
  const active = activeCandidate(state);
  const requestedArcQuest = mir4ArcQuest(questId);
  if (
    active?.questId === questId &&
    (!requestedArcQuest || mir4CampaignMapAvailable(requestedArcQuest.mapId, campaignMapIds))
  )
    return active;

  const arcQuest = requestedArcQuest;
  if (arcQuest) {
    if (!mir4CampaignMapAvailable(arcQuest.mapId, campaignMapIds)) return null;
    const progress = state.mir4ArcQuests?.[questId];
    if (progress) {
      if (
        !mir4AutoJourneyProgressSupported(progress) ||
        !mir4AutoJourneyQuestLevelEligible(questId, state.playerLevel)
      ) {
        return null;
      }
      return arcCandidate(progress);
    }
    if (!mir4AutoJourneyQuestLevelEligible(questId, state.playerLevel)) return null;
    if (arcQuest.group === 'main') {
      const doneMain = new Set(
        mir4OrderedArcProgress(state.mir4ArcQuests)
          .filter(
            (entry) => entry.state === 'done' && mir4ArcQuest(entry.questId)?.group === 'main',
          )
          .map((entry) => entry.questId),
      );
      if (mir4NextMainQuest(doneMain) !== questId) return null;
    }
    return { questId, phase: 'to-giver', siteIndex: 0, source: 'arc', active: false };
  }

  const legacy = MIR4_QUESTS[questId];
  if (!legacy) return null;
  const progress = state.mir4Quests?.[questId];
  if (progress?.state === 'done') return null;
  return {
    questId,
    phase: progress?.state === 'ready' ? 'return' : progress ? 'to-site' : 'to-giver',
    siteIndex: progress?.inspected.length ?? 0,
    source: 'legacy',
    active: false,
  };
}
