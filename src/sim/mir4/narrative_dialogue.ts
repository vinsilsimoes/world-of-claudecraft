// Authoritative narrative gate for MIR4 Auto Mission. Reaching an NPC opens a
// session-only conversation and pauses the journey until its authored text has
// had enough time to be read or the player explicitly skips it. No outcome is
// granted by the client: timeout and skip both re-enter the normal NPC-talk
// authority after validating the live NPC and range again.

import {
  MIR4_ARC_NPC_IDENTITIES,
  type Mir4ArcQuest,
  mir4ArcNpcIdentity,
  mir4ArcQuest,
} from '../content/mir4/arc_campaign';
import type { SimContext } from '../sim_context';
import { dist2d, type Entity, INTERACT_RANGE } from '../types';
import { mir4HandleArcNpcTalkForQuest } from './arc_quest_runtime';
import { mir4QuestCurrentStage } from './arc_quests';
import { markMir4WireDirty } from './wire_revision';

export type Mir4NarrativeDialogueAction = 'accept' | 'advance' | 'complete';
export type Mir4NarrativeDialogueBeat = 'accept' | 'reveal' | 'complete';

export interface Mir4NarrativeDialogueLine {
  speaker: string;
  text: string;
}

export interface Mir4NarrativeDialogueState {
  id: string;
  questId: string;
  npcEntityId: number;
  npcTemplateId: string;
  action: Mir4NarrativeDialogueAction;
  beat: Mir4NarrativeDialogueBeat;
  startedAt: number;
  durationSeconds: number;
  completesAt: number;
}

export const MIR4_DIALOGUE_MIN_SECONDS = 6;
export const MIR4_DIALOGUE_MAX_SECONDS = 18;
const MIR4_DIALOGUE_WORDS_PER_SECOND = 3;
const MIR4_DIALOGUE_REACTION_SECONDS = 2;

export function mir4DialogueReadingSeconds(lines: readonly Mir4NarrativeDialogueLine[]): number {
  const words = lines.reduce(
    (sum, line) => sum + line.text.trim().split(/\s+/u).filter(Boolean).length,
    0,
  );
  return Math.max(
    MIR4_DIALOGUE_MIN_SECONDS,
    Math.min(
      MIR4_DIALOGUE_MAX_SECONDS,
      Math.ceil(MIR4_DIALOGUE_REACTION_SECONDS + words / MIR4_DIALOGUE_WORDS_PER_SECOND),
    ),
  );
}

function normalizedSpeakerName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

const CANONICAL_SPEAKER_BY_NAME = new Map(
  MIR4_ARC_NPC_IDENTITIES.map((npc) => [normalizedSpeakerName(npc.name), npc.name] as const),
);

function authoredStringDialogueLine(
  line: string,
  fallbackSpeaker: string,
): Mir4NarrativeDialogueLine {
  const separator = line.indexOf(':');
  if (separator <= 0) return { speaker: fallbackSpeaker, text: line };
  const authoredSpeaker = line.slice(0, separator).trim();
  const text = line.slice(separator + 1).trim();
  if (!authoredSpeaker || !text) return { speaker: fallbackSpeaker, text: line };
  return {
    speaker:
      CANONICAL_SPEAKER_BY_NAME.get(normalizedSpeakerName(authoredSpeaker)) ?? authoredSpeaker,
    text,
  };
}

export function mir4NarrativeDialogueLines(
  quest: Readonly<Mir4ArcQuest>,
  beat: Mir4NarrativeDialogueBeat,
  fallback: string,
  fallbackSpeaker: string,
): readonly Mir4NarrativeDialogueLine[] {
  const lines = quest.dialogue.flatMap((line): Mir4NarrativeDialogueLine[] => {
    if (typeof line === 'string') {
      return beat === 'accept' ? [authoredStringDialogueLine(line, fallbackSpeaker)] : [];
    }
    return line.beat === beat ? [{ speaker: line.speaker, text: line.text }] : [];
  });
  return lines.length > 0 ? lines : [{ speaker: fallbackSpeaker, text: fallback }];
}

function dialogueBeat(action: Mir4NarrativeDialogueAction): Mir4NarrativeDialogueBeat {
  return action === 'complete' ? 'complete' : action === 'accept' ? 'accept' : 'reveal';
}

function dialogueFallback(
  quest: Readonly<Mir4ArcQuest>,
  action: Mir4NarrativeDialogueAction,
  stageText?: string,
): string {
  if (action === 'complete') return quest.purpose ?? quest.title;
  return stageText ?? quest.purpose ?? quest.title;
}

export function beginMir4NarrativeDialogue(
  ctx: SimContext,
  pid: number,
  npc: Entity,
  quest: Readonly<Mir4ArcQuest>,
  action: Mir4NarrativeDialogueAction,
): boolean {
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead || npc.kind !== 'npc') return false;
  if (dist2d(player.pos, npc.pos) > INTERACT_RANGE + 2) return false;
  if (meta.mir4NarrativeDialogue) return true;
  const progress = meta.mir4ArcQuests?.[quest.questId];
  const stage = progress ? mir4QuestCurrentStage(progress) : null;
  const beat = dialogueBeat(action);
  const sourceNpcId =
    action === 'complete'
      ? quest.turnInNpcId
      : action === 'accept'
        ? quest.giverNpcId
        : Array.isArray(stage?.target)
          ? stage?.target.find((target): target is string => typeof target === 'string')
          : typeof stage?.target === 'string'
            ? stage.target
            : quest.giverNpcId;
  const speaker = mir4ArcNpcIdentity(sourceNpcId ?? quest.giverNpcId)?.name ?? npc.name;
  const lines = mir4NarrativeDialogueLines(
    quest,
    beat,
    dialogueFallback(quest, action, stage?.text),
    speaker,
  );
  const durationSeconds = mir4DialogueReadingSeconds(lines);
  const stageIndex = progress?.stageIndex ?? -1;
  meta.mir4NarrativeDialogue = {
    id: `${quest.questId}:${action}:${stageIndex}:${npc.id}`,
    questId: quest.questId,
    npcEntityId: npc.id,
    npcTemplateId: npc.templateId,
    action,
    beat,
    startedAt: ctx.time,
    durationSeconds,
    completesAt: ctx.time + durationSeconds,
  };
  markMir4WireDirty(meta);
  return true;
}

function resolveMir4NarrativeDialogue(ctx: SimContext, pid: number, expectedId: string): boolean {
  const meta = ctx.players.get(pid);
  const state = meta?.mir4NarrativeDialogue;
  const player = ctx.entities.get(pid);
  if (!meta || !state || state.id !== expectedId || !player || player.dead) return false;
  const npc = ctx.entities.get(state.npcEntityId);
  const quest = mir4ArcQuest(state.questId);
  meta.mir4NarrativeDialogue = undefined;
  markMir4WireDirty(meta);
  if (
    !npc ||
    npc.kind !== 'npc' ||
    npc.templateId !== state.npcTemplateId ||
    !quest ||
    dist2d(player.pos, npc.pos) > INTERACT_RANGE + 2
  ) {
    return false;
  }
  return mir4HandleArcNpcTalkForQuest(ctx, npc.templateId, pid, state.questId, state.action);
}

export function skipMir4NarrativeDialogue(
  ctx: SimContext,
  pid: number,
  dialogueId: string,
): boolean {
  return resolveMir4NarrativeDialogue(ctx, pid, dialogueId);
}

export function updateMir4NarrativeDialogue(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const state = meta.mir4NarrativeDialogue;
    if (!state) continue;
    const player = ctx.entities.get(meta.entityId);
    if (!player || player.dead) {
      meta.mir4NarrativeDialogue = undefined;
      markMir4WireDirty(meta);
      continue;
    }
    if (ctx.time >= state.completesAt) {
      resolveMir4NarrativeDialogue(ctx, meta.entityId, state.id);
    }
  }
}

export function sanitizeMir4NarrativeDialogue(
  value: unknown,
): Mir4NarrativeDialogueState | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== 'string' ||
    raw.id.length === 0 ||
    raw.id.length > 160 ||
    typeof raw.questId !== 'string' ||
    !mir4ArcQuest(raw.questId) ||
    !Number.isSafeInteger(raw.npcEntityId) ||
    Number(raw.npcEntityId) <= 0 ||
    typeof raw.npcTemplateId !== 'string' ||
    !raw.npcTemplateId.startsWith('mir4_') ||
    (raw.action !== 'accept' && raw.action !== 'advance' && raw.action !== 'complete') ||
    (raw.beat !== 'accept' && raw.beat !== 'reveal' && raw.beat !== 'complete') ||
    typeof raw.startedAt !== 'number' ||
    !Number.isFinite(raw.startedAt) ||
    typeof raw.durationSeconds !== 'number' ||
    !Number.isFinite(raw.durationSeconds) ||
    raw.durationSeconds < MIR4_DIALOGUE_MIN_SECONDS ||
    raw.durationSeconds > MIR4_DIALOGUE_MAX_SECONDS ||
    typeof raw.completesAt !== 'number' ||
    !Number.isFinite(raw.completesAt) ||
    raw.completesAt < raw.startedAt
  ) {
    return undefined;
  }
  return {
    id: raw.id,
    questId: raw.questId,
    npcEntityId: Number(raw.npcEntityId),
    npcTemplateId: raw.npcTemplateId,
    action: raw.action,
    beat: raw.beat,
    startedAt: raw.startedAt,
    durationSeconds: raw.durationSeconds,
    completesAt: raw.completesAt,
  };
}
