// DOM-free projection of the authored MIR4 campaign onto the existing WoC
// quest dialog. The sim remains authoritative: this view only decides which
// conversation is relevant and which existing interaction verb the button
// should request.

import {
  MIR4_ARC_NPC_IDENTITIES,
  MIR4_QUESTS_ARC,
  type Mir4ArcQuest,
  mir4ArcNpcTemplateId,
  mir4ArcQuest,
} from '../../../sim/content/mir4/arc_campaign';
import {
  mir4ArcStageGoal,
  mir4NextMainQuest,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from '../../../sim/mir4/arc_quests';
import { mir4NarrativeDialogueLines } from '../../../sim/mir4/narrative_dialogue';
import type { Mir4PlayerUiState } from '../../../sim/mir4/ui_state';

export type Mir4DialogueAction = 'accept' | 'advance' | 'complete' | 'none';

export interface Mir4DialogueLineView {
  speaker: string;
  text: string;
}

export interface Mir4NpcDialogueView {
  npcName: string;
  questId: string | null;
  questTitle: string | null;
  action: Mir4DialogueAction;
  lines: readonly Mir4DialogueLineView[];
  objectiveText: string | null;
  progress: { current: number; total: number } | null;
  autoNarrative: boolean;
  readingSeconds: number | null;
}

const NPC_BY_TEMPLATE = new Map(
  MIR4_ARC_NPC_IDENTITIES.map((npc) => [mir4ArcNpcTemplateId(npc.id), npc] as const),
);

/** Campaign identity membership is exact. Ambient MIR4/WoC NPCs must keep
 * using the normal gossip window even though their templates share mir4_. */
export function isMir4CampaignNpcTemplateId(templateId: string): boolean {
  return NPC_BY_TEMPLATE.has(templateId);
}

function questUsesNpc(quest: Readonly<Mir4ArcQuest>, npcId: string): boolean {
  return quest.giverNpcId === npcId || quest.turnInNpcId === npcId;
}

function stageUsesNpc(stage: ReturnType<typeof mir4QuestCurrentStage>, npcId: string): boolean {
  if (!stage || (stage.kind !== 'talk' && stage.kind !== 'deliver')) return false;
  const targets = Array.isArray(stage.target) ? stage.target : [stage.target];
  return targets.includes(npcId);
}

function projectQuest(
  npcName: string,
  quest: Readonly<Mir4ArcQuest>,
  action: Mir4DialogueAction,
  state: Readonly<Mir4PlayerUiState>,
  autoNarrative = false,
): Mir4NpcDialogueView {
  const progress = state.mir4ArcQuests?.[quest.questId];
  const stage = progress ? mir4QuestCurrentStage(progress) : null;
  const beat = action === 'complete' ? 'complete' : action === 'accept' ? 'accept' : 'reveal';
  const fallback =
    action === 'complete'
      ? (quest.purpose ?? quest.title)
      : (stage?.text ?? quest.purpose ?? quest.title);
  return {
    npcName,
    questId: quest.questId,
    questTitle: quest.title,
    action,
    lines: mir4NarrativeDialogueLines(quest, beat, fallback, npcName),
    objectiveText: stage?.text ?? quest.purpose,
    progress:
      progress && stage
        ? {
            current: Math.min(progress.stageProgress, mir4ArcStageGoal(stage)),
            total: mir4ArcStageGoal(stage),
          }
        : null,
    autoNarrative,
    readingSeconds: autoNarrative ? (state.mir4NarrativeDialogue?.durationSeconds ?? null) : null,
  };
}

export function buildMir4NpcDialogueView(
  npcTemplateId: string,
  state: Readonly<Mir4PlayerUiState> | null,
): Mir4NpcDialogueView | null {
  const npc = NPC_BY_TEMPLATE.get(npcTemplateId);
  if (!npc || !state) return null;
  const narrative = state.mir4NarrativeDialogue;
  if (narrative?.npcTemplateId === npcTemplateId) {
    const quest = mir4ArcQuest(narrative.questId);
    if (quest) return projectQuest(npc.name, quest, narrative.action, state, true);
  }
  const progresses = mir4OrderedArcProgress(state.mir4ArcQuests);

  for (const progress of progresses) {
    const quest = mir4ArcQuest(progress.questId);
    if (!quest) continue;
    if (progress.state === 'ready' && quest.turnInNpcId === npc.id) {
      return projectQuest(npc.name, quest, 'complete', state);
    }
    if (progress.state === 'active' && stageUsesNpc(mir4QuestCurrentStage(progress), npc.id)) {
      return projectQuest(npc.name, quest, 'advance', state);
    }
  }

  const doneMain = new Set(
    progresses.filter((progress) => progress.state === 'done').map((progress) => progress.questId),
  );
  const nextMainId = mir4NextMainQuest(doneMain);
  const nextMain = nextMainId ? mir4ArcQuest(nextMainId) : null;
  if (nextMain && !state.mir4ArcQuests?.[nextMain.questId] && nextMain.giverNpcId === npc.id) {
    return projectQuest(npc.name, nextMain, 'accept', state);
  }

  const optional = MIR4_QUESTS_ARC.find(
    (quest) =>
      quest.group !== 'main' &&
      quest.giverNpcId === npc.id &&
      !state.mir4ArcQuests?.[quest.questId] &&
      (!quest.levelRange || (state.playerLevel ?? 1) >= quest.levelRange[0]),
  );
  if (optional) return projectQuest(npc.name, optional, 'accept', state);

  const related = progresses.find((progress) => {
    const quest = mir4ArcQuest(progress.questId);
    return !!quest && progress.state !== 'done' && questUsesNpc(quest, npc.id);
  });
  if (related) {
    const quest = mir4ArcQuest(related.questId)!;
    return projectQuest(npc.name, quest, 'none', state);
  }

  return {
    npcName: npc.name,
    questId: null,
    questTitle: null,
    action: 'none',
    lines: [],
    objectiveText: null,
    progress: null,
    autoNarrative: false,
    readingSeconds: null,
  };
}
