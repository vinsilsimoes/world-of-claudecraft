// Host integration for campaign evidence. NPC talks, player positions and mob
// deaths arrive only from authoritative Sim systems; no client command can
// directly advance a contract.

import { mir4ArcBands, mir4ArcNpcTemplateId } from '../content/mir4/arc_world';
import {
  MIR4_QUESTS_ARC,
  type Mir4ArcQuest,
  type Mir4ArcQuestStage,
  mir4ArcQuest,
} from '../content/mir4/quests_arc';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import {
  type Mir4ArcQuestProgress,
  mir4ApplyPlayerQuestEvidence,
  mir4NextMainQuest,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from './arc_quests';
import {
  grantMir4ArcAcceptGrants,
  grantMir4ArcLogicalItem,
  grantMir4ArcQuestRewards,
  spendMir4ArcLogicalItems,
} from './arc_rewards';
import {
  MIR4_ARC_ESCORT_STAGE_KINDS,
  MIR4_ARC_INTERACT_STAGE_KINDS,
  MIR4_ARC_POSITION_STAGE_KINDS,
} from './arc_stage_kinds';
import { markMir4WireDirty } from './wire_revision';

const TRAVEL_RADIUS = 14;
const OBJECTIVE_INTERACT_RADIUS = 6;
export function mir4ArcObjectiveUsesInteract(stage: Readonly<Mir4ArcQuestStage>): boolean {
  return (
    MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind) ||
    MIR4_ARC_INTERACT_STAGE_KINDS.has(stage.kind) ||
    (stage.kind === 'system-tutorial' &&
      typeof stage.lesson === 'string' &&
      /movimento|mapa|desbloqueio do sistema|entrada de dungeon|party finder|dungeon com|dungeon de cidade|dungeon técnica|mecânicas de raid|dungeon final|readiness final/.test(
        stage.lesson,
      ))
  );
}

function doneMain(meta: PlayerMeta): Set<string> {
  return new Set(
    mir4OrderedArcProgress(meta.mir4ArcQuests)
      .filter((progress) => progress.state === 'done')
      .map((progress) => progress.questId),
  );
}

function npcMatches(sourceNpcId: string, templateId: string): boolean {
  return mir4ArcNpcTemplateId(sourceNpcId) === templateId;
}

function playerInQuestMap(player: { pos: { z: number } }, quest: Mir4ArcQuest): boolean {
  const band = mir4ArcBands()[Number(quest.mapId.slice(1, 3)) - 1];
  return !!band && player.pos.z >= band.zMin && player.pos.z < band.zMax;
}

function acceptQuest(ctx: SimContext, meta: PlayerMeta, quest: Mir4ArcQuest): Mir4ArcQuestProgress {
  const selectionCount = quest.objectivePoolSelection ?? 0;
  const selectedStageIndexes =
    selectionCount > 0
      ? Array.from({ length: quest.stages.length }, (_, index) => index)
          .sort(
            (a, b) =>
              hashTarget(`${quest.questId}:${ctx.utcDay}:${meta.entityId}:${a}`) -
              hashTarget(`${quest.questId}:${ctx.utcDay}:${meta.entityId}:${b}`),
          )
          .slice(0, selectionCount)
      : undefined;
  const progress: Mir4ArcQuestProgress = {
    questId: quest.questId,
    stageIndex: 0,
    stageProgress: 0,
    state: quest.stages.length === 0 ? 'ready' : 'active',
    ...(selectedStageIndexes ? { selectedStageIndexes } : {}),
  };
  meta.mir4ArcQuests ??= {};
  meta.mir4ArcQuests[quest.questId] = progress;
  grantMir4ArcAcceptGrants(ctx, meta, quest);
  return progress;
}

function finishQuest(ctx: SimContext, meta: PlayerMeta, progress: Mir4ArcQuestProgress): void {
  const quest = mir4ArcQuest(progress.questId);
  if (!quest || progress.state !== 'ready') return;
  grantMir4ArcQuestRewards(ctx, meta, quest);
  progress.state = 'done';
  meta.counters.questsCompleted += 1;
  if (quest.group === 'repeatable' && ctx.utcDay) progress.completedDay = ctx.utcDay;
  markMir4WireDirty(meta);
}

/** Existing native noticeboard entry point for daily repeatable contracts. */
export function mir4HandleArcBoardInteract(ctx: SimContext, pid: number): string | null {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return null;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player) return null;
  const band = mir4ArcBands().find(
    (candidate) => player.pos.z >= candidate.zMin && player.pos.z < candidate.zMax,
  );
  if (!band) return null;
  const candidates = MIR4_QUESTS_ARC.filter(
    (quest) => quest.group === 'repeatable' && quest.mapId === band.mapId,
  );
  for (const quest of candidates) {
    const progress = meta.mir4ArcQuests?.[quest.questId];
    const stage = progress ? mir4QuestCurrentStage(progress) : null;
    if (progress && stage?.kind === 'deliver-local-materials') {
      const remaining = Math.max(1, (stage.goal ?? 1) - progress.stageProgress);
      const spent = spendMir4ArcLogicalItems(meta, remaining, (itemId) =>
        itemId.startsWith('material-'),
      );
      if (spent) {
        mir4ApplyPlayerQuestEvidence(meta, progress, {
          kind: 'stage',
          stageKind: stage.kind,
          amount: spent.reduce((sum, row) => sum + row.quantity, 0),
        });
        markMir4WireDirty(meta);
      }
      return quest.questId;
    }
    if (progress?.state === 'ready') {
      finishQuest(ctx, meta, progress);
      return quest.questId;
    }
    if (
      progress?.state === 'done' &&
      ctx.utcDay &&
      progress.completedDay &&
      progress.completedDay !== ctx.utcDay
    ) {
      delete meta.mir4ArcQuests?.[quest.questId];
    }
  }
  const available = candidates.find((quest) => !meta.mir4ArcQuests?.[quest.questId]);
  if (!available)
    return candidates.find((quest) => meta.mir4ArcQuests?.[quest.questId])?.questId ?? null;
  acceptQuest(ctx, meta, available);
  markMir4WireDirty(meta);
  return available.questId;
}

/** Consume a validated nearby NPC talk in the MIR4 profile. */
export function mir4HandleArcNpcTalk(ctx: SimContext, npcTemplateId: string, pid: number): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE || !npcTemplateId.startsWith('mir4_')) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player) return true;

  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const quest = mir4ArcQuest(progress.questId);
    if (!quest) continue;
    if (progress.state === 'ready' && npcMatches(quest.turnInNpcId, npcTemplateId)) {
      finishQuest(ctx, meta, progress);
      return true;
    }
    const stage = mir4QuestCurrentStage(progress);
    if (!stage || (stage.kind !== 'talk' && stage.kind !== 'deliver')) continue;
    const targets = Array.isArray(stage.target) ? stage.target : [stage.target];
    const sourceTarget = targets.find(
      (target): target is string => typeof target === 'string' && npcMatches(target, npcTemplateId),
    );
    if (!sourceTarget) continue;
    const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
      kind: 'talk',
      target: sourceTarget,
    });
    if (result !== 'blocked') markMir4WireDirty(meta);
    if (progress.state === 'ready' && npcMatches(quest.turnInNpcId, npcTemplateId)) {
      finishQuest(ctx, meta, progress);
    }
    return true;
  }

  const questId = mir4NextMainQuest(doneMain(meta));
  const quest = questId ? mir4ArcQuest(questId) : null;
  if (
    quest &&
    !meta.mir4ArcQuests?.[quest.questId] &&
    npcMatches(quest.giverNpcId, npcTemplateId) &&
    playerInQuestMap(player, quest) &&
    (!quest.levelRange || player.level >= quest.levelRange[0])
  ) {
    const progress = acceptQuest(ctx, meta, quest);
    const firstStage = mir4QuestCurrentStage(progress);
    if (firstStage?.kind === 'talk') {
      mir4ApplyPlayerQuestEvidence(meta, progress, { kind: 'talk', target: quest.giverNpcId });
    }
    markMir4WireDirty(meta);
    return true;
  }

  const optional = MIR4_QUESTS_ARC.find(
    (candidate) =>
      candidate.group !== 'main' &&
      candidate.giverNpcId.length > 0 &&
      !meta.mir4ArcQuests?.[candidate.questId] &&
      npcMatches(candidate.giverNpcId, npcTemplateId) &&
      playerInQuestMap(player, candidate) &&
      (!candidate.levelRange || player.level >= candidate.levelRange[0]),
  );
  if (optional) {
    const progress = acceptQuest(ctx, meta, optional);
    const firstStage = mir4QuestCurrentStage(progress);
    if (firstStage?.kind === 'talk') {
      mir4ApplyPlayerQuestEvidence(meta, progress, { kind: 'talk', target: optional.giverNpcId });
    }
    markMir4WireDirty(meta);
  }
  return true;
}

function hashTarget(target: string): number {
  let hash = 2166136261;
  for (let index = 0; index < target.length; index++) {
    hash ^= target.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Freshly-authored 3D anchor; source map geometry is never read or copied. */
export function mir4ArcStageAnchor(
  questId: string,
  stage: Readonly<Mir4ArcQuestStage>,
  objectiveIndex = 0,
): { x: number; z: number } | null {
  const quest = mir4ArcQuest(questId);
  const target = Array.isArray(stage.target)
    ? stage.target[Math.min(objectiveIndex, stage.target.length - 1)]
    : (stage.target ?? `${stage.kind}:${questId}`);
  const bandIndex = quest ? Number(quest.mapId.slice(1, 3)) - 1 : -1;
  const band = mir4ArcBands()[bandIndex];
  if (!quest || !band || typeof target !== 'string') return null;
  const hash = hashTarget(`${target}:${objectiveIndex}`);
  return {
    // Keep objectives on the runtime-authored road corridor so shared
    // movement/path collision can reach them without source map geometry.
    x: (((hash >>> 1) % 3) - 1) * 8,
    z: band.zMin + 88 + ((hash >>> 8) % 72),
  };
}

/** Shared Interact-key evidence at freshly-authored 3D objective anchors. */
export function mir4HandleArcObjectiveInteract(ctx: SimContext, pid: number): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead) return false;
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const stage = mir4QuestCurrentStage(progress);
    if (!stage || !mir4ArcObjectiveUsesInteract(stage)) continue;
    const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress);
    if (!anchor) continue;
    const dx = player.pos.x - anchor.x;
    const dz = player.pos.z - anchor.z;
    if (dx * dx + dz * dz > OBJECTIVE_INTERACT_RADIUS * OBJECTIVE_INTERACT_RADIUS) continue;
    const target = Array.isArray(stage.target)
      ? stage.target[Math.min(progress.stageProgress, stage.target.length - 1)]
      : stage.target;
    const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
      kind: 'stage',
      stageKind: stage.kind,
      ...(typeof target === 'string' ? { target } : {}),
    });
    if (result === 'blocked') return false;
    if (stage.kind === 'gather-resource-patches' && typeof target === 'string') {
      grantMir4ArcLogicalItem(meta, target, 1);
    }
    if (stage.kind === 'repair-public-anchor') {
      const quest = mir4ArcQuest(progress.questId);
      const salvage = quest?.stages.find((candidate) => candidate.kind === 'salvage-receipt');
      const salvageTarget = Array.isArray(salvage?.target) ? salvage?.target[0] : salvage?.target;
      if (typeof salvageTarget === 'string') grantMir4ArcLogicalItem(meta, salvageTarget, 1);
    }
    markMir4WireDirty(meta);
    return true;
  }
  return false;
}

/** Per-tick server position evidence for the current travel objective. */
export function updateMir4ArcQuestTravel(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const player = ctx.entities.get(meta.entityId);
    if (!player || player.dead) continue;
    for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
      const stage = mir4QuestCurrentStage(progress);
      if (!stage || !MIR4_ARC_POSITION_STAGE_KINDS.has(stage.kind)) continue;
      const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
      const anchor = mir4ArcStageAnchor(
        progress.questId,
        stage,
        stage.kind.startsWith('escort-') ? progress.stageProgress : 0,
      );
      if (!anchor || (stage.kind === 'travel' && typeof target !== 'string')) continue;
      const dx = player.pos.x - anchor.x;
      const dz = player.pos.z - anchor.z;
      if (dx * dx + dz * dz > TRAVEL_RADIUS * TRAVEL_RADIUS) {
        if (stage.kind === 'survive-zone') progress.lastEvidenceAt = undefined;
        continue;
      }
      if (stage.kind === 'survive-zone') {
        if (progress.lastEvidenceAt === undefined) {
          progress.lastEvidenceAt = ctx.time;
          continue;
        }
        if (ctx.time < progress.lastEvidenceAt + 1) continue;
        progress.lastEvidenceAt = ctx.time;
      }
      const result = mir4ApplyPlayerQuestEvidence(
        meta,
        progress,
        stage.kind === 'travel'
          ? { kind: 'travel', target }
          : {
              kind: 'stage',
              stageKind: stage.kind,
              ...(typeof target === 'string' ? { target } : {}),
            },
      );
      if (result !== 'blocked') markMir4WireDirty(meta);
    }
  }
}

/** Authoritative kill-credit fan-out; wrong templates fail closed in the reducer. */
export function mir4CreditArcQuestKills(
  ctx: SimContext,
  meta: PlayerMeta,
  templateId: string,
): void {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return;
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
      kind: 'kill',
      target: templateId,
    });
    if (result !== 'blocked') markMir4WireDirty(meta);
  }
}
