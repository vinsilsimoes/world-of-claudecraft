// Host integration for campaign evidence. NPC talks, player positions and mob
// deaths arrive only from authoritative Sim systems; no client command can
// directly advance a contract.

import {
  MIR4_QUESTS_ARC,
  type Mir4ArcQuest,
  type Mir4ArcQuestStage,
  mir4ArcQuest,
} from '../content/mir4/arc_campaign';
import { mir4ArcNpcTemplateId } from '../content/mir4/arc_world';
import {
  mir4ArcQuestSite,
  mir4ArcRegionAt,
  projectMir4ArcPoint,
} from '../content/mir4/arc_world_layout';
import { M02_TRILHA_DOS_JUNCOS_BLUEPRINT } from '../content/mir4/m02_trilha_dos_juncos_world';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from '../content/mir4/m03_bosque_do_vale_world';
import { M04_RUINAS_DA_ENCOSTA_BLUEPRINT } from '../content/mir4/m04_ruinas_da_encosta_world';
import { createGroundObject } from '../entity';
import { MIR4_GAME_PROFILE } from '../game_profile';
import { completeGatherCast } from '../professions/gathering';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import { dist2d, type Entity, type Mir4ArcMapProjection } from '../types';
import { spreadMir4ObjectiveAnchors } from './arc_objective_spread';
import {
  MIR4_ARC_OBJECTIVE_TEMPLATE_PREFIX,
  MIR4_ARC_QUEST_DROP_TEMPLATE_PREFIX,
  mir4ArcObjectiveDisplayName,
  mir4ArcObjectiveObjectItemId,
  mir4IsArcQuestDropEntity,
} from './arc_objectives';
import {
  type Mir4ArcQuestProgress,
  mir4ApplyPlayerQuestEvidence,
  mir4ArcStageGoal,
  mir4NextMainQuest,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from './arc_quests';
import {
  ensureMir4ArcEquipmentMilestones,
  ensureMir4ArcTutorialGrants,
  ensureMir4ArcXpLedger,
  grantMir4ArcAcceptGrants,
  grantMir4ArcLogicalItem,
  grantMir4ArcQuestRewards,
  spendMir4ArcLogicalItems,
} from './arc_rewards';
import { MIR4_ARC_INTERACT_STAGE_KINDS, MIR4_ARC_POSITION_STAGE_KINDS } from './arc_stage_kinds';
import { refreshMir4CodexDerivedStats } from './codex';
import { completeMir4EnergyCast } from './energy';
import {
  mir4QuestObjectiveCastNodeId,
  mir4QuestObjectiveCastSeconds,
  mir4QuestObjectiveEntityIdFromCast,
  startMir4FragileGatherCast,
} from './quest_objective_cast';
import { markMir4WireDirty } from './wire_revision';

export {
  MIR4_QUEST_INTERACTION_CAST_SECONDS,
  MIR4_QUEST_OBJECTIVE_CAST_SECONDS,
} from './quest_objective_cast';

export function completeMir4OrGatherCast(ctx: SimContext, player: Entity, meta: PlayerMeta): void {
  if (completeMir4EnergyCast(ctx, player)) return;
  if (!completeMir4ArcObjectiveCast(ctx, player)) completeGatherCast(ctx, player, meta);
}

const TRAVEL_RADIUS = 14;
/** One authoritative reach for manual Interact and Auto Journey objectives. */
export const MIR4_ARC_OBJECTIVE_INTERACT_RADIUS = 6;
const OBJECTIVE_TEMPLATE_PREFIX = MIR4_ARC_OBJECTIVE_TEMPLATE_PREFIX;
export function mir4ArcObjectiveUsesInteract(stage: Readonly<Mir4ArcQuestStage>): boolean {
  return MIR4_ARC_INTERACT_STAGE_KINDS.has(stage.kind);
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

function playerInQuestMap(
  ctx: SimContext,
  player: { pos: { x: number; z: number } },
  quest: Mir4ArcQuest,
): boolean {
  if (
    ctx.worldContent.mir4ArcMapProjections?.some((projection) => projection.mapId === quest.mapId)
  ) {
    return true;
  }
  return mir4ArcRegionAt(player.pos, ctx.worldContent.mir4ArcMapProjections)?.mapId === quest.mapId;
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
  refreshMir4CodexDerivedStats(ctx, meta.entityId);
  progress.state = 'done';
  meta.counters.questsCompleted += 1;
  if (quest.group === 'repeatable' && ctx.utcDay) progress.completedDay = ctx.utcDay;
  markMir4WireDirty(meta);
}

/** Existing native noticeboard entry point for daily repeatable contracts. */
export function mir4HandleArcBoardInteract(
  ctx: SimContext,
  pid: number,
  noticeboardEntityId?: number,
): string | null {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return null;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player) return null;
  const projectedMapId = noticeboardEntityId
    ? ctx.worldContent.mir4ArcMapProjections?.find((projection) =>
        ctx.worldContent.services?.noticeboards?.some(
          (board) => board.entityId === noticeboardEntityId && board.id.includes(projection.mapId),
        ),
      )?.mapId
    : undefined;
  const band = mir4ArcRegionAt(player.pos, ctx.worldContent.mir4ArcMapProjections);
  const mapId = projectedMapId ?? band?.mapId;
  if (!mapId) return null;
  const candidates = MIR4_QUESTS_ARC.filter(
    (quest) => quest.group === 'repeatable' && quest.mapId === mapId,
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

export type Mir4ArcNpcTalkAction = 'accept' | 'advance' | 'complete';

/** Resolve one already-authorized narrative action against its exact quest.
 * This deliberately does not fall through to another quest that happens to
 * share the same NPC. Range/entity checks remain at the interaction caller. */
export function mir4HandleArcNpcTalkForQuest(
  ctx: SimContext,
  npcTemplateId: string,
  pid: number,
  questId: string,
  action: Mir4ArcNpcTalkAction,
): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE || !npcTemplateId.startsWith('mir4_')) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  const quest = mir4ArcQuest(questId);
  if (!meta || !player || player.dead || !quest || !playerInQuestMap(ctx, player, quest)) {
    return false;
  }
  const progress = meta.mir4ArcQuests?.[quest.questId];

  if (action === 'complete') {
    if (!progress || progress.state !== 'ready' || !npcMatches(quest.turnInNpcId, npcTemplateId)) {
      return false;
    }
    finishQuest(ctx, meta, progress);
    return true;
  }

  if (action === 'advance') {
    if (!progress || progress.state !== 'active') return false;
    const stage = mir4QuestCurrentStage(progress);
    if (!stage || (stage.kind !== 'talk' && stage.kind !== 'deliver')) return false;
    const targets = Array.isArray(stage.target) ? stage.target : [stage.target];
    const sourceTarget = targets.find(
      (target): target is string => typeof target === 'string' && npcMatches(target, npcTemplateId),
    );
    if (!sourceTarget) return false;
    const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
      kind: 'talk',
      target: sourceTarget,
    });
    if (result === 'blocked') return false;
    markMir4WireDirty(meta);
    if (result === 'ready' && npcMatches(quest.turnInNpcId, npcTemplateId)) {
      finishQuest(ctx, meta, progress);
    }
    return true;
  }

  if (progress || !npcMatches(quest.giverNpcId, npcTemplateId)) return false;
  if (quest.group !== 'main' && quest.levelRange && player.level < quest.levelRange[0])
    return false;
  if (quest.group === 'main' && mir4NextMainQuest(doneMain(meta)) !== quest.questId) return false;
  const accepted = acceptQuest(ctx, meta, quest);
  const firstStage = mir4QuestCurrentStage(accepted);
  if (firstStage?.kind === 'talk') {
    mir4ApplyPlayerQuestEvidence(meta, accepted, {
      kind: 'talk',
      target: quest.giverNpcId,
    });
  }
  markMir4WireDirty(meta);
  return true;
}

/** Consume a validated nearby NPC talk in the MIR4 profile. */
export function mir4HandleArcNpcTalk(ctx: SimContext, npcTemplateId: string, pid: number): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE || !npcTemplateId.startsWith('mir4_')) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player) return true;
  // A normal Interact must not bypass Auto Mission's authoritative reading
  // gate. Only its timeout/skip resolver may consume the pending NPC action.
  if (meta.mir4NarrativeDialogue) return true;

  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const quest = mir4ArcQuest(progress.questId);
    if (!quest) continue;
    if (progress.state === 'ready' && npcMatches(quest.turnInNpcId, npcTemplateId)) {
      mir4HandleArcNpcTalkForQuest(ctx, npcTemplateId, pid, quest.questId, 'complete');
      return true;
    }
    const stage = mir4QuestCurrentStage(progress);
    if (!stage || (stage.kind !== 'talk' && stage.kind !== 'deliver')) continue;
    const targets = Array.isArray(stage.target) ? stage.target : [stage.target];
    const sourceTarget = targets.find(
      (target): target is string => typeof target === 'string' && npcMatches(target, npcTemplateId),
    );
    if (!sourceTarget) continue;
    mir4HandleArcNpcTalkForQuest(ctx, npcTemplateId, pid, quest.questId, 'advance');
    return true;
  }

  const questId = mir4NextMainQuest(doneMain(meta));
  const quest = questId ? mir4ArcQuest(questId) : null;
  if (
    quest &&
    !meta.mir4ArcQuests?.[quest.questId] &&
    npcMatches(quest.giverNpcId, npcTemplateId) &&
    playerInQuestMap(ctx, player, quest)
  ) {
    mir4HandleArcNpcTalkForQuest(ctx, npcTemplateId, pid, quest.questId, 'accept');
    return true;
  }

  const optional = MIR4_QUESTS_ARC.find(
    (candidate) =>
      candidate.group !== 'main' &&
      candidate.giverNpcId.length > 0 &&
      !meta.mir4ArcQuests?.[candidate.questId] &&
      npcMatches(candidate.giverNpcId, npcTemplateId) &&
      playerInQuestMap(ctx, player, candidate) &&
      (!candidate.levelRange || player.level >= candidate.levelRange[0]),
  );
  if (optional) {
    mir4HandleArcNpcTalkForQuest(ctx, npcTemplateId, pid, optional.questId, 'accept');
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

function objectiveTemplateId(
  pid: number,
  progress: Readonly<Mir4ArcQuestProgress>,
  stage: Readonly<Mir4ArcQuestStage>,
): string {
  return `${OBJECTIVE_TEMPLATE_PREFIX}${pid}_${progress.questId.toLowerCase()}_${progress.stageIndex}_${progress.stageProgress}_${stage.kind.replace(/-/g, '_')}`;
}

export { mir4IsArcObjectiveEntity } from './arc_objectives';

/** Materialize one server-owned, interactable 3D entity for every active
 * campaign interaction step. Stale entities are removed when progress moves,
 * the quest ends, or its owner disconnects. */
export function updateMir4ArcObjectiveEntities(ctx: SimContext): void {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return;
  const activeTemplateOwners = new Map<string, number>();
  for (const meta of ctx.players.values()) {
    const player = ctx.entities.get(meta.entityId);
    if (!player || player.dead) continue;
    for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
      const stage = mir4QuestCurrentStage(progress);
      if (!stage || !mir4ArcObjectiveUsesInteract(stage)) continue;
      const templateId = objectiveTemplateId(meta.entityId, progress, stage);
      activeTemplateOwners.set(templateId, meta.entityId);
      let exists = false;
      for (const entity of ctx.entities.values()) {
        if (
          entity.kind === 'object' &&
          entity.templateId === templateId &&
          entity.ownerId === meta.entityId &&
          entity.lootable
        ) {
          exists = true;
          break;
        }
      }
      if (exists) continue;
      const anchor = mir4ArcStageAnchor(
        progress.questId,
        stage,
        progress.stageProgress,
        ctx.worldContent.mir4ArcMapProjections,
      );
      if (!anchor) continue;
      const object = createGroundObject(
        ctx.nextId++,
        mir4ArcObjectiveObjectItemId(stage.kind),
        mir4ArcObjectiveDisplayName(stage.kind),
        ctx.groundPos(anchor.x, anchor.z),
      );
      object.templateId = templateId;
      object.ownerId = meta.entityId;
      ctx.addEntity(object);
    }
  }
  const retainedTemplates = new Set<string>();
  for (const entity of [...ctx.entities.values()]) {
    if (!entity.templateId.startsWith(OBJECTIVE_TEMPLATE_PREFIX)) continue;
    const ownerId = activeTemplateOwners.get(entity.templateId);
    const valid =
      ownerId !== undefined &&
      entity.ownerId === ownerId &&
      entity.lootable &&
      !retainedTemplates.has(entity.templateId);
    if (!valid) ctx.dropEntity(entity.id);
    else retainedTemplates.add(entity.templateId);
  }
}

function questDropTemplatePrefix(pid: number, progress: Readonly<Mir4ArcQuestProgress>): string {
  return `${MIR4_ARC_QUEST_DROP_TEMPLATE_PREFIX}${pid}_${progress.questId.toLowerCase()}_${progress.stageIndex}_${progress.stageProgress}_`;
}

export function mir4ArcQuestDropForPlayer(
  ctx: Pick<SimContext, 'entities'>,
  pid: number,
  questId: string,
  stageIndex: number,
): Entity | null {
  const prefix = `${MIR4_ARC_QUEST_DROP_TEMPLATE_PREFIX}${pid}_${questId.toLowerCase()}_${stageIndex}_`;
  for (const entity of ctx.entities.values()) {
    if (
      mir4IsArcQuestDropEntity(entity) &&
      entity.ownerId === pid &&
      entity.lootable &&
      entity.templateId.startsWith(prefix)
    ) {
      return entity;
    }
  }
  return null;
}

function handleMir4ArcQuestDropInteract(
  ctx: SimContext,
  pid: number,
  objectiveId?: number,
): boolean {
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead) return false;
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const stage = mir4QuestCurrentStage(progress);
    if (stage?.kind !== 'collect-quest-wallet') continue;
    const prefix = questDropTemplatePrefix(pid, progress);
    const drop = [...ctx.entities.values()].find(
      (entity) =>
        mir4IsArcQuestDropEntity(entity) &&
        (objectiveId === undefined || entity.id === objectiveId) &&
        entity.ownerId === pid &&
        entity.lootable &&
        entity.templateId.startsWith(prefix),
    );
    if (!drop) continue;
    const dx = player.pos.x - drop.pos.x;
    const dz = player.pos.z - drop.pos.z;
    if (
      dx * dx + dz * dz >
      MIR4_ARC_OBJECTIVE_INTERACT_RADIUS * MIR4_ARC_OBJECTIVE_INTERACT_RADIUS
    ) {
      if (objectiveId !== undefined) ctx.error(pid, 'Too far away.');
      return false;
    }
    const defeatedTemplateId = drop.templateId.slice(prefix.length);
    const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
      kind: 'kill',
      target: defeatedTemplateId,
    });
    if (result === 'blocked') return false;
    ctx.dropEntity(drop.id);
    markMir4WireDirty(meta);
    return true;
  }
  return false;
}

function mir4ArcStageRawAnchor(
  questId: string,
  stage: Readonly<Mir4ArcQuestStage>,
  objectiveIndex = 0,
  projections?: readonly Mir4ArcMapProjection[],
): { x: number; z: number } | null {
  const quest = mir4ArcQuest(questId);
  const target = Array.isArray(stage.target)
    ? stage.target[Math.min(objectiveIndex, stage.target.length - 1)]
    : (stage.target ?? `${stage.kind}:${questId}`);
  const site = quest ? mir4ArcQuestSite(quest.mapId, quest.order, quest.questId) : null;
  if (!quest || !site || typeof target !== 'string') return null;
  const stageIndex = quest.stages.indexOf(stage as Mir4ArcQuestStage);
  const worldAuthored = projections
    ?.find((projection) => projection.mapId === quest.mapId)
    ?.objectiveAnchors?.find((plan) => plan.questId === questId && plan.stageIndex === stageIndex);
  const worldPoint =
    worldAuthored?.points[Math.min(objectiveIndex, worldAuthored.points.length - 1)];
  if (worldPoint) return { x: worldPoint.x, z: worldPoint.z };
  if (quest.mapId === M02_TRILHA_DOS_JUNCOS_BLUEPRINT.mapId && stageIndex >= 0) {
    const authored = M02_TRILHA_DOS_JUNCOS_BLUEPRINT.objectiveAnchors.find(
      (plan) => plan.questId === questId && plan.stageIndex === stageIndex,
    );
    const point = authored?.points[Math.min(objectiveIndex, authored.points.length - 1)];
    if (point) return projectMir4ArcPoint(projections, quest.mapId, point);
  }
  if (quest.mapId === M03_BOSQUE_DO_VALE_BLUEPRINT.mapId && stageIndex >= 0) {
    const authored = M03_BOSQUE_DO_VALE_BLUEPRINT.objectiveAnchors.find(
      (plan) => plan.questId === questId && plan.stageIndex === stageIndex,
    );
    const point = authored?.points[Math.min(objectiveIndex, authored.points.length - 1)];
    if (point) return projectMir4ArcPoint(projections, quest.mapId, point);
  }
  if (quest.mapId === M04_RUINAS_DA_ENCOSTA_BLUEPRINT.mapId && stageIndex >= 0) {
    const authored = M04_RUINAS_DA_ENCOSTA_BLUEPRINT.objectiveAnchors.find(
      (plan) => plan.questId === questId && plan.stageIndex === stageIndex,
    );
    const point = authored?.points[Math.min(objectiveIndex, authored.points.length - 1)];
    if (point) return projectMir4ArcPoint(projections, quest.mapId, point);
  }
  const hash = hashTarget(`${target}:${objectiveIndex}`);
  if (stage.kind === 'travel') return projectMir4ArcPoint(projections, quest.mapId, site.pos);
  const angle = ((hash % 16) / 16) * Math.PI * 2;
  const radius = 7 + ((hash >>> 8) % 8);
  return projectMir4ArcPoint(projections, quest.mapId, {
    x: site.pos.x + Math.sin(angle) * radius,
    z: site.pos.z + Math.cos(angle) * radius,
  });
}

/** Freshly-authored 3D anchor; source map geometry is never read or copied. */
export function mir4ArcStageAnchor(
  questId: string,
  stage: Readonly<Mir4ArcQuestStage>,
  objectiveIndex = 0,
  projections?: readonly Mir4ArcMapProjection[],
): { x: number; z: number } | null {
  const raw = mir4ArcStageRawAnchor(questId, stage, objectiveIndex, projections);
  const quest = mir4ArcQuest(questId);
  const stageIndex = quest?.stages.indexOf(stage as Mir4ArcQuestStage) ?? -1;
  const goal = mir4ArcStageGoal(stage as Mir4ArcQuestStage);
  if (!raw || stageIndex < 0 || goal < 2 || !MIR4_ARC_INTERACT_STAGE_KINDS.has(stage.kind)) {
    return raw;
  }
  const key = `${questId}:${stageIndex}:${goal}`;
  const authored = Array.from({ length: goal }, (_, index) =>
    mir4ArcStageRawAnchor(questId, stage, index, projections),
  );
  if (authored.some((point) => point === null)) return raw;
  const anchors = spreadMir4ObjectiveAnchors(key, authored as readonly { x: number; z: number }[]);
  const anchor = anchors[Math.min(Math.max(0, objectiveIndex), anchors.length - 1)];
  return anchor ? { ...anchor } : raw;
}

/** Index used by both evidence and Auto Journey routing. Position objectives
 * stay at one authored zone while their timer/progress rises; multi-anchor
 * interaction objectives advance through their target list. */
export function mir4ArcStageObjectiveIndex(
  stage: Readonly<Mir4ArcQuestStage>,
  stageProgress: number,
): number {
  return MIR4_ARC_POSITION_STAGE_KINDS.has(stage.kind) ? 0 : stageProgress;
}

function completeMir4ArcObjectiveInteract(
  ctx: SimContext,
  pid: number,
  objectiveId?: number,
): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead) return false;
  const requested = objectiveId === undefined ? null : ctx.entities.get(objectiveId);
  if (
    (requested && mir4IsArcQuestDropEntity(requested)) ||
    (objectiveId === undefined &&
      [...ctx.entities.values()].some(
        (entity) => mir4IsArcQuestDropEntity(entity) && entity.ownerId === pid,
      ))
  ) {
    return handleMir4ArcQuestDropInteract(ctx, pid, objectiveId);
  }
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const stage = mir4QuestCurrentStage(progress);
    if (!stage || !mir4ArcObjectiveUsesInteract(stage)) {
      continue;
    }
    const templateId = objectiveTemplateId(pid, progress, stage);
    const objective = [...ctx.entities.values()].find(
      (entity) =>
        entity.kind === 'object' &&
        (objectiveId === undefined || entity.id === objectiveId) &&
        entity.templateId === templateId &&
        entity.ownerId === pid &&
        entity.lootable,
    );
    if (!objective) continue;
    const dx = player.pos.x - objective.pos.x;
    const dz = player.pos.z - objective.pos.z;
    if (
      dx * dx + dz * dz >
      MIR4_ARC_OBJECTIVE_INTERACT_RADIUS * MIR4_ARC_OBJECTIVE_INTERACT_RADIUS
    ) {
      if (objectiveId !== undefined) ctx.error(pid, 'Too far away.');
      continue;
    }
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
    ctx.dropEntity(objective.id);
    markMir4WireDirty(meta);
    return true;
  }
  return false;
}

/** Shared manual Interact-key evidence at freshly-authored 3D objective anchors. */
export function mir4HandleArcObjectiveInteract(
  ctx: SimContext,
  pid: number,
  objectiveId?: number,
): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead || player.castingAbility) return false;
  const candidates =
    objectiveId === undefined
      ? [...ctx.entities.values()]
      : [ctx.entities.get(objectiveId)].filter((entity): entity is Entity => entity !== undefined);
  const objective = candidates.find(
    (entity) =>
      entity.kind === 'object' &&
      entity.ownerId === pid &&
      entity.lootable &&
      (entity.templateId.startsWith(OBJECTIVE_TEMPLATE_PREFIX) ||
        mir4IsArcQuestDropEntity(entity)) &&
      dist2d(player.pos, entity.pos) <= MIR4_ARC_OBJECTIVE_INTERACT_RADIUS,
  );
  if (!objective) {
    if (objectiveId !== undefined) ctx.error(pid, 'Too far away.');
    return false;
  }
  let stageKind = mir4IsArcQuestDropEntity(objective) ? 'collect-quest-wallet' : '';
  if (!stageKind) {
    for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
      const stage = mir4QuestCurrentStage(progress);
      if (stage && objective.templateId === objectiveTemplateId(pid, progress, stage)) {
        stageKind = stage.kind;
        break;
      }
    }
  }
  const castSeconds = mir4QuestObjectiveCastSeconds(stageKind);
  startMir4FragileGatherCast(ctx, player, castSeconds, mir4QuestObjectiveCastNodeId(objective.id));
  return true;
}

/** Completion hook used by the existing gather-cast lane. Returns false only
 * when the completed cast belongs to a normal WoC profession node. */
export function completeMir4ArcObjectiveCast(ctx: SimContext, player: Entity): boolean {
  const objectiveId = mir4QuestObjectiveEntityIdFromCast(player.gatherCastNodeId);
  if (objectiveId === null) return false;
  player.gatherCastNodeId = '';
  player.gatherCastToolRarity = '';
  player.gatherCastEffectConfirmed = false;
  completeMir4ArcObjectiveInteract(ctx, player.id, objectiveId);
  return true;
}

/** Per-tick server position evidence for the current travel objective. */
export function updateMir4ArcQuestTravel(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const player = ctx.entities.get(meta.entityId);
    if (!player) continue;
    if (player.dead) {
      // Survive objectives measure one uninterrupted living hold. Retaining
      // elapsed seconds through death lets repeated corpse runs eventually
      // pass a strength check without ever surviving it.
      for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
        const stage = mir4QuestCurrentStage(progress);
        if (
          stage?.kind !== 'survive-zone' ||
          (progress.stageProgress === 0 && progress.lastEvidenceAt === undefined)
        ) {
          continue;
        }
        progress.stageProgress = 0;
        progress.lastEvidenceAt = undefined;
        markMir4WireDirty(meta);
      }
      continue;
    }
    const xpLedgerChanged = ensureMir4ArcXpLedger(ctx, meta);
    const tutorialGrantsChanged = ensureMir4ArcTutorialGrants(ctx, meta);
    const equipmentMilestonesChanged = ensureMir4ArcEquipmentMilestones(ctx, meta);
    if (xpLedgerChanged || tutorialGrantsChanged || equipmentMilestonesChanged) {
      markMir4WireDirty(meta);
    }
    if (equipmentMilestonesChanged) refreshMir4CodexDerivedStats(ctx, meta.entityId);
    for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
      const stage = mir4QuestCurrentStage(progress);
      if (!stage || !MIR4_ARC_POSITION_STAGE_KINDS.has(stage.kind)) continue;
      const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
      const anchor = mir4ArcStageAnchor(
        progress.questId,
        stage,
        mir4ArcStageObjectiveIndex(stage, progress.stageProgress),
        ctx.worldContent.mir4ArcMapProjections,
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
  defeated?: Pick<Entity, 'id' | 'pos'>,
): void {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return;
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const stage = mir4QuestCurrentStage(progress);
    if (stage?.kind === 'collect-quest-wallet') {
      const run = ctx.mir4ArcEncounterRuns.get(
        `${meta.entityId}:${progress.questId}:${progress.stageIndex}`,
      );
      if (!defeated || run?.entityId !== defeated.id) continue;
      const prefix = questDropTemplatePrefix(meta.entityId, progress);
      if (
        [...ctx.entities.values()].some(
          (entity) =>
            mir4IsArcQuestDropEntity(entity) &&
            entity.ownerId === meta.entityId &&
            entity.templateId.startsWith(prefix),
        )
      ) {
        continue;
      }
      const drop = createGroundObject(
        ctx.nextId++,
        'mir4_object_supply_crate',
        'Recovered Quest Item',
        ctx.groundPos(defeated.pos.x, defeated.pos.z),
      );
      drop.templateId = `${prefix}${templateId}`;
      drop.ownerId = meta.entityId;
      ctx.addEntity(drop);
      continue;
    }
    const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
      kind: 'kill',
      target: templateId,
    });
    if (result !== 'blocked') markMir4WireDirty(meta);
  }
}
