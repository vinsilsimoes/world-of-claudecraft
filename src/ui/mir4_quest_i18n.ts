// Stable-id localization for the MIR4 campaign inside the existing WoC quest
// surfaces. The simulation and wire carry only quest ids and stage kinds. Raw
// source-authored prose never crosses into a rendered tracker, log, banner, or
// crafting row.

import { type TranslationKey, t } from './i18n';

export interface Mir4QuestObjectiveTextInput {
  questId: string;
  kind: 'reach-giver' | 'inspect-clues' | 'return-giver' | 'campaign-stage';
  stageKind?: string;
  ready: boolean;
}

const FIRST_TRACES_IDS = new Set(['mir4_m01_q01', 'M01-Q01']);

const CAMPAIGN_STAGE_KEYS: Readonly<Record<string, TranslationKey>> = {
  'accept-board-order': 'hudChrome.mir4.campaign.objective.interact',
  'activate-sequence': 'hudChrome.mir4.campaign.objective.interact',
  'certify-network': 'hudChrome.mir4.campaign.objective.interact',
  'collect-quest-wallet': 'hudChrome.mir4.campaign.objective.gather',
  'craft-receipt': 'hudChrome.mir4.campaign.objective.craft',
  'defend-anchor': 'hudChrome.mir4.campaign.objective.defend',
  'defend-random-landmark': 'hudChrome.mir4.campaign.objective.defend',
  deliver: 'hudChrome.mir4.campaign.objective.deliver',
  'deliver-local-materials': 'hudChrome.mir4.campaign.objective.deliver',
  'discover-shortcut': 'hudChrome.mir4.campaign.objective.inspect',
  'discover-waypoint': 'hudChrome.mir4.campaign.objective.travel',
  'escort-entity': 'hudChrome.mir4.campaign.objective.escort',
  'escort-supply-run': 'hudChrome.mir4.campaign.objective.escortSupplies',
  'explore-landmarks': 'hudChrome.mir4.campaign.objective.inspect',
  'gather-resource-patches': 'hudChrome.mir4.campaign.objective.gather',
  'guardian-resolution': 'hudChrome.mir4.campaign.objective.combat',
  'inspect-and-resolve-elite': 'hudChrome.mir4.campaign.objective.combat',
  'inspect-clues': 'hudChrome.mir4.campaign.objective.inspect',
  'inspect-service-stations': 'hudChrome.mir4.campaign.objective.inspect',
  'interrupt-ritual': 'hudChrome.mir4.campaign.objective.combat',
  'lore-resolution': 'hudChrome.mir4.campaign.objective.interact',
  'optional-elite-resolution': 'hudChrome.mir4.campaign.objective.combat',
  'prepare-civilians': 'hudChrome.mir4.campaign.objective.interact',
  'reconstruct-evidence': 'hudChrome.mir4.campaign.objective.inspect',
  'refine-receipt': 'hudChrome.mir4.campaign.objective.craft',
  'repair-public-anchor': 'hudChrome.mir4.campaign.objective.interact',
  'salvage-receipt': 'hudChrome.mir4.campaign.objective.craft',
  'selective-hunt': 'hudChrome.mir4.campaign.objective.combat',
  'short-dungeon-clear': 'hudChrome.mir4.campaign.objective.dungeon',
  'short-dungeon-or-public-event-contribution': 'hudChrome.mir4.campaign.objective.dungeon',
  'survive-zone': 'hudChrome.mir4.campaign.objective.defend',
  'system-tutorial': 'hudChrome.mir4.campaign.objective.tutorial',
  talk: 'hudChrome.mir4.campaign.objective.talk',
  'track-signs': 'hudChrome.mir4.campaign.objective.inspect',
  travel: 'hudChrome.mir4.campaign.objective.travel',
};

export function mir4QuestTitle(questId: string): string {
  return FIRST_TRACES_IDS.has(questId)
    ? t('hudChrome.questTracker.mir4.firstTraces')
    : t('hudChrome.mir4.campaign.questTitle', { id: questId });
}

export function mir4QuestNarrative(questId: string): string {
  return FIRST_TRACES_IDS.has(questId)
    ? t('hudChrome.mir4.questLog.narrative')
    : t('hudChrome.mir4.campaign.narrative', { id: questId });
}

export function mir4QuestTurnInName(questId?: string): string {
  return questId && FIRST_TRACES_IDS.has(questId)
    ? t('hudChrome.mir4.questLog.giverName')
    : t('hudChrome.mir4.campaign.contact');
}

export function mir4QuestObjectiveLabel(input: Mir4QuestObjectiveTextInput): string {
  if (input.kind === 'inspect-clues') return t('hudChrome.questTracker.mir4.inspectClues');
  if (input.kind === 'return-giver') return t('hudChrome.questTracker.mir4.returnToTarek');
  if (input.kind === 'reach-giver') return t('hudChrome.questTracker.mir4.reachTarek');
  if (input.ready) return t('hudChrome.mir4.campaign.objective.returnToContact');
  return t(
    CAMPAIGN_STAGE_KEYS[input.stageKind ?? ''] ?? 'hudChrome.mir4.campaign.objective.complete',
  );
}

export function mir4NoticeboardMessage(contractQuestId?: string): string {
  return contractQuestId
    ? t('hudChrome.noticeboard.contract', { title: mir4QuestTitle(contractQuestId) })
    : t('hudChrome.noticeboard.empty');
}
