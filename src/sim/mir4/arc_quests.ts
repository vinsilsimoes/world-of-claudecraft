// Authoritative evidence reducer for the 230-contract MIR4 campaign. It never
// accepts a client command directly: server-owned systems submit evidence
// after validating talk proximity, map position, kills, receipts, timers or
// interactions. Unknown stage kinds fail closed and no stage auto-completes.

import { MIR4_ARC_MOB_IDS } from '../content/mir4/arc_mob_ids';
import { mir4ArcBands } from '../content/mir4/arc_world';
import {
  MIR4_QUESTS_ARC,
  MIR4_QUESTS_MAIN,
  type Mir4ArcQuestStage,
  mir4ArcQuest,
} from '../content/mir4/quests_arc';
import { MIR4_WORLD_ARC_BY_MAP } from '../content/mir4/world_arc';
import type { SimContext } from '../sim_context';
import { MIR4_ARC_COMBAT_STAGE_KINDS } from './arc_stage_kinds';

export interface Mir4ArcQuestProgress {
  questId: string;
  stageIndex: number;
  stageProgress: number;
  state: 'active' | 'ready' | 'done';
  /** Session-only cadence stamp for timed evidence; persistence drops it. */
  lastEvidenceAt?: number;
  /** Deterministic subset selected from a repeatable objective pool. */
  selectedStageIndexes?: number[];
  completedDay?: string;
}

export type Mir4ArcQuestEvidence =
  | { kind: 'talk'; target: string }
  | { kind: 'travel'; target: string }
  | { kind: 'kill'; target: string; amount?: number }
  | { kind: 'stage'; stageKind: string; target?: string; amount?: number };

export type Mir4ArcQuestEvidenceResult = 'advanced' | 'ready' | 'progress' | 'blocked';

const MIR4_ARC_QUEST_ORDER = new Map(
  MIR4_QUESTS_ARC.map((quest, index) => [quest.questId, index] as const),
);

/** Canonical campaign order, independent of JSON/object insertion order. */
export function mir4OrderedArcProgress(
  quests: Readonly<Record<string, Mir4ArcQuestProgress>> | undefined,
): Mir4ArcQuestProgress[] {
  return Object.values(quests ?? {}).sort((left, right) => {
    const leftIndex = MIR4_ARC_QUEST_ORDER.get(left.questId) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = MIR4_ARC_QUEST_ORDER.get(right.questId) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex || left.questId.localeCompare(right.questId);
  });
}

export function mir4NextMainQuest(done: ReadonlySet<string>): string | null {
  for (const quest of MIR4_QUESTS_MAIN) if (!done.has(quest.questId)) return quest.questId;
  return null;
}

export function mir4QuestZoneCenter(questId: string): { x: number; z: number } | null {
  const quest = mir4ArcQuest(questId);
  const map = quest ? MIR4_WORLD_ARC_BY_MAP.get(quest.mapId) : undefined;
  const band = map ? mir4ArcBands()[map.sequence - 1] : undefined;
  return band ? { ...band.hub } : null;
}

export function mir4QuestCurrentStage(
  progress: Readonly<Mir4ArcQuestProgress>,
): Mir4ArcQuestStage | null {
  if (progress.state !== 'active') return null;
  const quest = mir4ArcQuest(progress.questId);
  const authoredIndex = progress.selectedStageIndexes?.[progress.stageIndex] ?? progress.stageIndex;
  return quest?.stages[authoredIndex] ?? null;
}

export function mir4ArcStageGoal(stage: Mir4ArcQuestStage): number {
  return Math.max(
    1,
    Math.floor(stage.goal ?? stage.waves ?? stage.checkpoints ?? stage.seconds ?? 1),
  );
}

function targetMatches(stage: Mir4ArcQuestStage, target: string): boolean {
  if (Array.isArray(stage.target)) return stage.target.includes(target);
  return stage.target === undefined || stage.target === target;
}

function mobTargetMatches(stage: Mir4ArcQuestStage, templateId: string, questId: string): boolean {
  const candidates = [
    ...(Array.isArray(stage.target) ? stage.target : stage.target ? [stage.target] : []),
    ...(stage.sources ?? []),
    ...(stage.guardian ? [stage.guardian] : []),
  ];
  if (candidates.length === 0) {
    return templateId.startsWith(`mir4_quest_${questId.toLowerCase()}_`);
  }
  const normalizedTemplate = templateId.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return candidates.some((candidate) => {
    const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return (
      templateId === candidate ||
      templateId === `mir4_${candidate}` ||
      templateId.endsWith(`_${candidate}`) ||
      normalizedTemplate.endsWith(`_${normalizedCandidate}`)
    );
  });
}

function evidenceAmount(evidence: Mir4ArcQuestEvidence): number {
  if (evidence.kind === 'kill' || evidence.kind === 'stage') {
    return Math.max(1, Math.floor(evidence.amount ?? 1));
  }
  return 1;
}

function evidenceMatches(
  stage: Mir4ArcQuestStage,
  evidence: Mir4ArcQuestEvidence,
  questId: string,
): boolean {
  if (stage.kind === 'talk' || stage.kind === 'deliver') {
    return evidence.kind === 'talk' && targetMatches(stage, evidence.target);
  }
  if (stage.kind === 'travel') {
    return evidence.kind === 'travel' && targetMatches(stage, evidence.target);
  }
  if (MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) {
    return evidence.kind === 'kill' && mobTargetMatches(stage, evidence.target, questId);
  }
  return (
    evidence.kind === 'stage' &&
    evidence.stageKind === stage.kind &&
    targetMatches(stage, evidence.target ?? '')
  );
}

export function mir4ApplyQuestEvidence(
  progress: Mir4ArcQuestProgress,
  evidence: Mir4ArcQuestEvidence,
): Mir4ArcQuestEvidenceResult {
  const quest = mir4ArcQuest(progress.questId);
  const stage = progress.state === 'active' ? mir4QuestCurrentStage(progress) : null;
  if (
    !quest ||
    !stage ||
    progress.state !== 'active' ||
    !evidenceMatches(stage, evidence, progress.questId)
  ) {
    return 'blocked';
  }
  const goal = mir4ArcStageGoal(stage);
  progress.stageProgress = Math.min(goal, progress.stageProgress + evidenceAmount(evidence));
  if (progress.stageProgress < goal) return 'progress';
  progress.stageIndex += 1;
  progress.stageProgress = 0;
  progress.lastEvidenceAt = undefined;
  const stageCount = progress.selectedStageIndexes?.length ?? quest.stages.length;
  if (progress.stageIndex >= stageCount) {
    progress.state = 'ready';
    return 'ready';
  }
  return 'advanced';
}

/** Apply accepted evidence and mirror its real objective delta into the shared
 * reward counters used by offline, server, and headless hosts. */
export function mir4ApplyPlayerQuestEvidence(
  meta: { counters: { questProgress: number } },
  progress: Mir4ArcQuestProgress,
  evidence: Mir4ArcQuestEvidence,
): Mir4ArcQuestEvidenceResult {
  const stage = mir4QuestCurrentStage(progress);
  const before = progress.stageProgress;
  const goal = stage ? mir4ArcStageGoal(stage) : before;
  const result = mir4ApplyQuestEvidence(progress, evidence);
  if (result !== 'blocked') {
    meta.counters.questProgress += Math.max(
      0,
      Math.min(goal, before + evidenceAmount(evidence)) - before,
    );
  }
  return result;
}

export function mir4AdvanceQuestStage(
  _ctx: SimContext,
  _pid: number,
  progress: Mir4ArcQuestProgress,
  evidence?: Mir4ArcQuestEvidence,
): 'advanced' | 'ready' | 'progress' | 'blocked' {
  return evidence ? mir4ApplyQuestEvidence(progress, evidence) : 'blocked';
}

export function mir4CreditQuestKill(
  progress: Mir4ArcQuestProgress,
  templateId: string,
): 'advanced' | 'ready' | 'progress' | 'blocked' {
  return mir4ApplyQuestEvidence(progress, { kind: 'kill', target: templateId });
}

export function mir4QuestHuntTargets(questId: string): readonly string[] {
  const quest = mir4ArcQuest(questId);
  const map = quest ? MIR4_WORLD_ARC_BY_MAP.get(quest.mapId) : undefined;
  return map ? (MIR4_ARC_MOB_IDS[map.sequence - 1] ?? []) : [];
}
