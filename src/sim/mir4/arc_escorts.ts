// Authoritative MIR4 campaign escorts projected onto the existing WoC entity,
// movement, threat and snapshot runtime. The logical quest stage owns progress;
// every visible escortee/ambusher is a native 3D runtime mob shell.

import { mir4MobStats } from '../content/mir4/mobs';
import { createMob } from '../entity';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import { addThreat } from '../threat';
import { dist2d, type Entity, INTERACT_RANGE, type MobTemplate } from '../types';
import { mir4ArcStageAnchor } from './arc_quest_runtime';
import {
  mir4ApplyPlayerQuestEvidence,
  mir4ArcStageGoal,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from './arc_quests';
import { type Mir4ArcEscortRun, releaseMir4RuntimeMobTemplate } from './arc_runtime_state';
import { MIR4_ARC_ESCORT_STAGE_KINDS } from './arc_stage_kinds';
import { markMir4WireDirty } from './wire_revision';

const MATERIALIZE_RADIUS = 52;
const CREDIT_RADIUS = 18;
const ARRIVE_RADIUS = 2.5;
const RESPAWN_SECONDS = 5;
const RUN_TIMEOUT_SECONDS = 300;

function runs(ctx: SimContext): Map<string, Mir4ArcEscortRun> {
  return ctx.mir4ArcEscortRuns;
}

function runKey(pid: number, questId: string, stageIndex: number): string {
  return `${pid}:${questId}:${stageIndex}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function escortTemplate(run: Mir4ArcEscortRun, level: number, name: string): MobTemplate {
  const stats = mir4MobStats(level);
  return {
    id: `mir4_escort_${run.questId.toLowerCase()}_${run.stageIndex}_${run.pid}_${level}`,
    name,
    minLevel: level,
    maxLevel: level,
    family: 'humanoid',
    hpBase: stats.maxHp * 3,
    hpPerLevel: 0,
    dmgBase: 1,
    dmgPerLevel: 0,
    attackSpeed: 2,
    armorPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    loot: [],
    scale: 1,
    color: 0xb7a68a,
  };
}

function ambushTemplate(run: Mir4ArcEscortRun, checkpoint: number, level: number): MobTemplate {
  const stats = mir4MobStats(level);
  return {
    id: `mir4_escort_ambush_${run.questId.toLowerCase()}_${run.stageIndex}_${checkpoint}_${run.pid}_${level}`,
    name: 'Road Ambusher',
    minLevel: level,
    maxLevel: level,
    family: checkpoint % 2 === 0 ? 'humanoid' : 'beast',
    hpBase: stats.maxHp,
    hpPerLevel: 0,
    dmgBase: stats.attack,
    dmgPerLevel: 0,
    attackSpeed: 2,
    armorPerLevel: 0,
    moveSpeed: 3.5,
    aggroRadius: 9,
    loot: [],
    scale: 1,
    color: 0x765f4b,
  };
}

function currentRunProgress(ctx: SimContext, run: Mir4ArcEscortRun): PlayerMeta | null {
  const meta = ctx.players.get(run.pid);
  const progress = meta?.mir4ArcQuests?.[run.questId];
  const stage = progress ? mir4QuestCurrentStage(progress) : null;
  if (
    !meta ||
    !progress ||
    progress.stageIndex !== run.stageIndex ||
    !stage ||
    !MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind)
  )
    return null;
  return meta;
}

function dropRunEntities(ctx: SimContext, run: Mir4ArcEscortRun): void {
  const templateIds = new Set<string>();
  if (run.npcId !== null) {
    const npc = ctx.entities.get(run.npcId);
    if (npc) {
      templateIds.add(npc.templateId);
      ctx.dropEntity(run.npcId);
    }
  }
  for (const id of run.ambushIds) {
    const ambusher = ctx.entities.get(id);
    if (!ambusher) continue;
    templateIds.add(ambusher.templateId);
    ctx.dropEntity(id);
  }
  for (const templateId of templateIds) releaseMir4RuntimeMobTemplate(ctx, templateId);
  run.npcId = null;
  run.ambushIds = [];
}

function resetRun(ctx: SimContext, run: Mir4ArcEscortRun, meta: PlayerMeta): void {
  dropRunEntities(ctx, run);
  const progress = meta.mir4ArcQuests?.[run.questId];
  if (progress) {
    progress.stageProgress = 0;
    progress.lastEvidenceAt = undefined;
  }
  run.checkpoint = 0;
  run.waitingCheckpoint = false;
  run.started = false;
  run.respawnAt = ctx.time + RESPAWN_SECONDS;
  markMir4WireDirty(meta);
}

function spawnEscortee(ctx: SimContext, run: Mir4ArcEscortRun, meta: PlayerMeta): void {
  const progress = meta.mir4ArcQuests?.[run.questId];
  const stage = progress ? mir4QuestCurrentStage(progress) : null;
  const player = ctx.entities.get(run.pid);
  const anchor = stage ? mir4ArcStageAnchor(run.questId, stage, 0) : null;
  if (!stage || !player || !anchor) return;
  const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
  const template = escortTemplate(
    run,
    player.level,
    typeof target === 'string' ? target.replace(/-/g, ' ') : 'Caravan Escort',
  );
  ctx.mir4RuntimeMobTemplates.set(template.id, template);
  const npc = createMob(
    ctx.nextId++,
    template,
    player.level,
    ctx.groundPos(anchor.x - 8, anchor.z - 8),
  );
  npc.hostile = false;
  npc.questIds = [run.questId];
  npc.runScoped = true;
  ctx.addEntity(npc);
  run.npcId = npc.id;
  run.respawnAt = 0;
}

function spawnAmbush(ctx: SimContext, run: Mir4ArcEscortRun, npc: Entity, kind: string): void {
  const count = kind === 'escort-supply-run' ? 1 : 2;
  const template = ambushTemplate(run, run.checkpoint, npc.level);
  ctx.mir4RuntimeMobTemplates.set(template.id, template);
  run.ambushIds = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const mob = createMob(
      ctx.nextId++,
      template,
      npc.level,
      ctx.groundPos(npc.pos.x + Math.sin(angle) * 6, npc.pos.z + Math.cos(angle) * 6),
    );
    mob.runScoped = true;
    mob.summonedAdd = true;
    mob.aiState = 'chase';
    mob.aggroTargetId = npc.id;
    mob.inCombat = true;
    mob.leashAnchor = { ...mob.pos };
    addThreat(mob, npc.id, 1);
    ctx.addEntity(mob);
    run.ambushIds.push(mob.id);
  }
}

function liveAmbush(ctx: SimContext, run: Mir4ArcEscortRun): boolean {
  return run.ambushIds.some((id) => {
    const entity = ctx.entities.get(id);
    return !!entity && !entity.dead;
  });
}

export function isActiveMir4ArcEscortee(ctx: SimContext, entity: Entity): boolean {
  for (const run of runs(ctx).values()) {
    if (run.started && run.npcId === entity.id) return true;
  }
  return false;
}

/** Native entity followed by the existing auto-journey locomotion. */
export function mir4ArcEscorteeForPlayer(ctx: SimContext, pid: number): Entity | null {
  for (const run of runs(ctx).values()) {
    if (run.pid !== pid || run.npcId === null) continue;
    const entity = ctx.entities.get(run.npcId);
    if (entity && !entity.dead) return entity;
  }
  return null;
}

/** Existing Interact-key entry point: starts the nearest player-owned escort. */
export function tryStartMir4ArcEscort(ctx: SimContext, player: Entity): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  let best: Mir4ArcEscortRun | null = null;
  let bestDistance = INTERACT_RANGE;
  for (const run of runs(ctx).values()) {
    if (run.pid !== player.id || run.started || run.npcId === null) continue;
    const npc = ctx.entities.get(run.npcId);
    if (!npc || npc.dead) continue;
    const distance = dist2d(player.pos, npc.pos);
    if (distance >= bestDistance) continue;
    best = run;
    bestDistance = distance;
  }
  if (!best) return false;
  best.started = true;
  best.startedAt = ctx.time;
  return true;
}

/** Per-tick materialization and native walk/ambush driver. */
export function updateMir4ArcEscorts(ctx: SimContext): void {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return;
  const activeKeys = new Set<string>();
  for (const meta of ctx.players.values()) {
    const player = ctx.entities.get(meta.entityId);
    if (!player || player.dead) continue;
    for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
      const stage = mir4QuestCurrentStage(progress);
      if (!stage || !MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind)) continue;
      const key = runKey(meta.entityId, progress.questId, progress.stageIndex);
      activeKeys.add(key);
      let run = runs(ctx).get(key);
      const anchor = mir4ArcStageAnchor(progress.questId, stage, 0);
      if (!anchor) continue;
      if (!run) {
        run = {
          key,
          pid: meta.entityId,
          questId: progress.questId,
          stageIndex: progress.stageIndex,
          npcId: null,
          checkpoint: progress.stageProgress,
          waitingCheckpoint: false,
          ambushIds: [],
          startedAt: 0,
          started: false,
          respawnAt: 0,
        };
        runs(ctx).set(key, run);
      }
      if (run.npcId === null) {
        if (
          ctx.time < run.respawnAt ||
          Math.hypot(player.pos.x - anchor.x, player.pos.z - anchor.z) > MATERIALIZE_RADIUS
        )
          continue;
        spawnEscortee(ctx, run, meta);
      }
      const npc = run.npcId === null ? null : ctx.entities.get(run.npcId);
      if (!npc) continue;
      if (npc.dead || (run.started && ctx.time - run.startedAt > RUN_TIMEOUT_SECONDS)) {
        resetRun(ctx, run, meta);
        continue;
      }
      if (!run.started || liveAmbush(ctx, run)) continue;
      if (run.waitingCheckpoint) {
        if (dist2d(player.pos, npc.pos) > CREDIT_RADIUS) continue;
        const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
        const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
          kind: 'stage',
          stageKind: stage.kind,
          ...(typeof target === 'string' ? { target } : {}),
        });
        if (result !== 'blocked') markMir4WireDirty(meta);
        run.checkpoint++;
        run.waitingCheckpoint = false;
        run.ambushIds = [];
        if (result === 'advanced' || result === 'ready') {
          dropRunEntities(ctx, run);
          continue;
        }
      }
      const goal = mir4ArcStageGoal(stage);
      const waypoint = mir4ArcStageAnchor(
        progress.questId,
        stage,
        Math.min(run.checkpoint, goal - 1),
      );
      if (!waypoint) continue;
      if (Math.hypot(npc.pos.x - waypoint.x, npc.pos.z - waypoint.z) <= ARRIVE_RADIUS) {
        spawnAmbush(ctx, run, npc, stage.kind);
        run.waitingCheckpoint = true;
        continue;
      }
      ctx.moveToward(npc, ctx.groundPos(waypoint.x, waypoint.z), 4.5);
    }
  }
  for (const [key, run] of runs(ctx)) {
    if (activeKeys.has(key) && currentRunProgress(ctx, run)) continue;
    dropRunEntities(ctx, run);
    runs(ctx).delete(key);
  }
}
