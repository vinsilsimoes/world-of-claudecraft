// Quest copy for the MIR4 campaign inside the existing WoC quest surfaces.
// Stable ids remain authoritative on the wire. Until the production translation
// pass, the canonical Portuguese campaign copy is shown directly so every local
// playtest exercises the real title, objective and contact instead of placeholders.

import { mir4ArcNpcIdentity, mir4ArcQuest } from '../sim/content/mir4/arc_campaign';
import { type TranslationKey, t } from './i18n';

export interface Mir4QuestObjectiveTextInput {
  questId: string;
  kind: 'reach-giver' | 'inspect-clues' | 'return-giver' | 'campaign-stage';
  stageKind?: string;
  stageIndex?: number;
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
  if (FIRST_TRACES_IDS.has(questId)) return t('hudChrome.questTracker.mir4.firstTraces');
  return mir4ArcQuest(questId)?.title ?? t('hudChrome.mir4.campaign.questTitle', { id: questId });
}

export function mir4QuestNarrative(questId: string): string {
  if (FIRST_TRACES_IDS.has(questId)) return t('hudChrome.mir4.questLog.narrative');
  const quest = mir4ArcQuest(questId);
  return quest?.purpose ?? t('hudChrome.mir4.campaign.narrative', { id: questId });
}

export function mir4QuestTurnInName(questId?: string): string {
  if (questId && FIRST_TRACES_IDS.has(questId)) return t('hudChrome.mir4.questLog.giverName');
  const turnInNpcId = questId ? mir4ArcQuest(questId)?.turnInNpcId : undefined;
  return (
    (turnInNpcId ? mir4ArcNpcIdentity(turnInNpcId)?.name : null) ??
    t('hudChrome.mir4.campaign.contact')
  );
}

function mir4ReturnToNamedContact(questId: string): string {
  return t('questUi.log.returnTo', {
    name: mir4QuestTurnInName(questId),
  });
}

export function mir4QuestObjectiveLabel(input: Mir4QuestObjectiveTextInput): string {
  if (input.kind === 'inspect-clues') return t('hudChrome.questTracker.mir4.inspectClues');
  if (input.kind === 'return-giver')
    return FIRST_TRACES_IDS.has(input.questId)
      ? t('hudChrome.questTracker.mir4.returnToTarek')
      : mir4ReturnToNamedContact(input.questId);
  if (input.kind === 'reach-giver') {
    if (FIRST_TRACES_IDS.has(input.questId)) return t('hudChrome.questTracker.mir4.reachTarek');
    const giverId = mir4ArcQuest(input.questId)?.giverNpcId;
    const giverName = giverId ? mir4ArcNpcIdentity(giverId)?.name : null;
    return giverName
      ? `${t('hudChrome.mir4.campaign.objective.travel')}: ${giverName}`
      : t('hudChrome.mir4.campaign.objective.travel');
  }
  if (input.ready) return mir4ReturnToNamedContact(input.questId);
  const stage = mir4ArcQuest(input.questId)?.stages[input.stageIndex ?? -1];
  if (stage?.text) return stage.text;
  return t(
    CAMPAIGN_STAGE_KEYS[input.stageKind ?? ''] ?? 'hudChrome.mir4.campaign.objective.complete',
  );
}

export function mir4NoticeboardMessage(contractQuestId?: string): string {
  return contractQuestId
    ? t('hudChrome.noticeboard.contract', {
        title: mir4QuestTitle(contractQuestId),
      })
    : t('hudChrome.noticeboard.empty');
}
