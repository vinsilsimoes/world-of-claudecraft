// Short-dungeon/public-event presentation through native WoC combat entities.
// Three seal guards gate an elite boss at the campaign anchor. This preserves
// source quest semantics without importing rooms, models, VFX or audio.

import { mir4MobTemplateProgression } from '../content/mir4/mobs';
import { createMob } from '../entity';
import { enterScriptedDungeon, instanceAt, releaseScriptedDungeon } from '../instances/dungeons';
import type { InstanceSlot, PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import { addThreat } from '../threat';
import type { Entity, MobTemplate } from '../types';
import { encounterTemplate, stageMobSource } from './arc_encounters';
import { mir4ArcStageAnchor } from './arc_quest_runtime';
import { mir4OrderedArcProgress, mir4QuestCurrentStage } from './arc_quests';
import { type Mir4ArcDungeonRun, releaseMir4RuntimeMobTemplate } from './arc_runtime_state';
import { MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS } from './arc_stage_kinds';
import { reserveMir4DungeonAdmission } from './dungeon_tickets';
import { markMir4WireDirty } from './wire_revision';

const MATERIALIZE_RADIUS = 46;
const SEAL_GUARD_COUNT = 3;
const ROOM_ENCOUNTER_Z = 48;

export const MIR4_CAMPAIGN_ROOM_ID = 'campaign_trial_room';

function runs(ctx: SimContext): Map<string, Mir4ArcDungeonRun> {
  return ctx.mir4ArcDungeonRuns;
}

function applyDungeonTicketState(
  meta: PlayerMeta,
  next: ReturnType<typeof reserveMir4DungeonAdmission>['state'],
): void {
  const previous = meta.mir4DungeonTickets;
  if (
    previous?.ticketType === next?.ticketType &&
    previous?.count === next?.count &&
    previous?.resetAtMs === next?.resetAtMs
  ) {
    return;
  }
  meta.mir4DungeonTickets = next;
  markMir4WireDirty(meta);
}

/** Live authored target for Auto Journey inside a short campaign dungeon.
 * Guards gate the boss, so a living guard always wins; within that band the
 * nearest target avoids crossing back and forth across the room. */
export function mir4ArcDungeonTargetForPlayer(
  ctx: SimContext,
  pid: number,
  questId: string,
  stageIndex: number,
): Entity | null {
  const run = runs(ctx).get(`${pid}:${questId}:${stageIndex}`);
  const player = ctx.entities.get(pid);
  if (!run || !player || !run.inside) return null;
  let nearestGuard: Entity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const id of run.guardIds) {
    const guard = ctx.entities.get(id);
    if (!guard || guard.dead) continue;
    const distance = Math.hypot(guard.pos.x - player.pos.x, guard.pos.z - player.pos.z);
    if (distance >= nearestDistance) continue;
    nearestGuard = guard;
    nearestDistance = distance;
  }
  if (nearestGuard) return nearestGuard;
  if (run.bossId === null) return null;
  const boss = ctx.entities.get(run.bossId);
  return boss && !boss.dead ? boss : null;
}

function runInstance(ctx: SimContext, run: Mir4ArcDungeonRun): InstanceSlot | undefined {
  return ctx.instances.find(
    (candidate) =>
      candidate.dungeonId === MIR4_CAMPAIGN_ROOM_ID &&
      candidate.slot === run.instanceSlot &&
      candidate.partyKey === run.claimKey,
  );
}

function roomEncounterAnchor(ctx: SimContext, run: Mir4ArcDungeonRun): { x: number; z: number } {
  const inst = runInstance(ctx, run);
  if (!inst) return run.returnPos;
  const origin = ctx.instanceOriginOf(inst);
  return { x: origin.x, z: origin.z + ROOM_ENCOUNTER_Z };
}

function removeRunMobIds(inst: InstanceSlot | undefined, ids: ReadonlySet<number>): void {
  if (!inst) return;
  inst.mobIds = inst.mobIds.filter((id) => !ids.has(id));
}

function dropRun(ctx: SimContext, run: Mir4ArcDungeonRun): void {
  const inst = runInstance(ctx, run);
  const owner = ctx.entities.get(run.ownerPid);
  if (owner && inst && instanceAt(ctx, owner.pos) === inst) {
    ctx.leaveDungeon(owner.id);
  }
  const templateIds = new Set<string>();
  const entityIds = new Set<number>();
  for (const id of run.guardIds) {
    const guard = ctx.entities.get(id);
    if (!guard) continue;
    entityIds.add(id);
    templateIds.add(guard.templateId);
    ctx.dropEntity(id);
  }
  if (run.bossId !== null) {
    const boss = ctx.entities.get(run.bossId);
    if (boss) {
      entityIds.add(boss.id);
      templateIds.add(boss.templateId);
      ctx.dropEntity(boss.id);
    }
  }
  removeRunMobIds(inst, entityIds);
  for (const templateId of templateIds) releaseMir4RuntimeMobTemplate(ctx, templateId);
  releaseScriptedDungeon(ctx, MIR4_CAMPAIGN_ROOM_ID, run.claimKey);
}

function spawnGuards(
  ctx: SimContext,
  run: Mir4ArcDungeonRun,
  bossTemplate: MobTemplate,
  player: Entity,
  anchor: { x: number; z: number },
  inst: InstanceSlot,
): void {
  run.guardIds = [];
  for (let index = 0; index < SEAL_GUARD_COUNT; index++) {
    const template: MobTemplate = {
      ...bossTemplate,
      id: `mir4_dungeon_guard_${run.questId.toLowerCase()}_${run.stageIndex}_${run.ownerPid}_${index}`,
      name: `Seal Guardian ${index + 1}`,
      family: index === 1 ? 'beast' : 'humanoid',
      elite: false,
      boss: false,
      mir4BossDamageReductionBps: 0,
      scale: 1,
      mir4XpReward: 0,
      loot: [],
    };
    ctx.mir4RuntimeMobTemplates.set(template.id, template);
    const angle = (index / SEAL_GUARD_COUNT) * Math.PI * 2;
    const guard = createMob(
      ctx.nextId++,
      template,
      Math.max(template.minLevel, Math.min(template.maxLevel, player.level)),
      ctx.groundPos(anchor.x + Math.sin(angle) * 8, anchor.z + Math.cos(angle) * 8),
    );
    guard.runScoped = true;
    guard.summonedAdd = true;
    guard.aiState = 'chase';
    guard.aggroTargetId = player.id;
    guard.inCombat = true;
    guard.leashAnchor = { ...guard.pos };
    addThreat(guard, player.id, 1);
    ctx.addEntity(guard);
    inst.mobIds.push(guard.id);
    run.guardIds.push(guard.id);
  }
}

function spawnBoss(
  ctx: SimContext,
  run: Mir4ArcDungeonRun,
  template: MobTemplate,
  player: Entity,
  anchor: { x: number; z: number },
  inst: InstanceSlot,
): void {
  const bossProgression = mir4MobTemplateProgression(
    template.minLevel,
    template.maxLevel,
    'guardian',
    true,
  );
  const elite: MobTemplate = {
    ...template,
    ...bossProgression,
    mir4XpReward: (template.mir4XpReward ?? 0) * 20,
    boss: true,
    mir4BossDamageReductionBps: 500,
    elite: true,
    scale: Math.max(1.25, template.scale),
  };
  ctx.mir4RuntimeMobTemplates.set(elite.id, elite);
  const boss = createMob(
    ctx.nextId++,
    elite,
    Math.max(elite.minLevel, Math.min(elite.maxLevel, player.level)),
    ctx.groundPos(anchor.x, anchor.z),
  );
  boss.runScoped = true;
  boss.summonedAdd = true;
  ctx.addEntity(boss);
  inst.mobIds.push(boss.id);
  run.bossId = boss.id;
}

export function updateMir4ArcDungeonEncounters(ctx: SimContext): void {
  const activeKeys = new Set<string>();
  for (const meta of ctx.players.values()) {
    const player = ctx.entities.get(meta.entityId);
    if (!player) continue;
    for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
      const stage = mir4QuestCurrentStage(progress);
      if (!stage || !MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS.has(stage.kind)) continue;
      const key = `${meta.entityId}:${progress.questId}:${progress.stageIndex}`;
      activeKeys.add(key);
      const worldAnchor = mir4ArcStageAnchor(
        progress.questId,
        stage,
        progress.stageProgress,
        ctx.worldContent.mir4ArcMapProjections,
      );
      const source = stageMobSource(stage, progress.stageProgress);
      if (!worldAnchor || !source) continue;
      const bossTemplate = encounterTemplate(
        progress.questId,
        progress.stageIndex,
        progress.stageProgress,
        source,
      );
      if (!bossTemplate) continue;
      let run = runs(ctx).get(key);
      if (!run) {
        if (player.dead) continue;
        const dx = player.pos.x - worldAnchor.x;
        const dz = player.pos.z - worldAnchor.z;
        if (dx * dx + dz * dz > MATERIALIZE_RADIUS * MATERIALIZE_RADIUS) continue;
        const claimKey = `mir4-campaign:${key}`;
        const returnPos = { x: player.pos.x, z: player.pos.z };
        const admission = reserveMir4DungeonAdmission(
          progress.questId,
          meta.mir4DungeonTickets,
          ctx.lockoutNowMs(),
        );
        if (!admission.ok) {
          applyDungeonTicketState(meta, admission.state);
          if (meta.mir4AutoQuest?.questId === progress.questId && !meta.mir4AutoQuest.suspended) {
            meta.mir4AutoQuest.suspended = true;
            markMir4WireDirty(meta);
            ctx.error(meta.entityId, 'No MIR4 dungeon tickets remain. Daily reset: 05:00.');
          }
          continue;
        }
        const inst = enterScriptedDungeon(
          ctx,
          MIR4_CAMPAIGN_ROOM_ID,
          claimKey,
          player.id,
          returnPos,
        );
        if (!inst) continue;
        applyDungeonTicketState(meta, admission.state);
        run = {
          key,
          claimKey,
          ownerPid: meta.entityId,
          questId: progress.questId,
          stageIndex: progress.stageIndex,
          instanceSlot: inst.slot,
          returnPos,
          inside: true,
          reentryArmed: true,
          guardIds: [],
          bossId: null,
        };
        runs(ctx).set(key, run);
        spawnGuards(ctx, run, bossTemplate, player, roomEncounterAnchor(ctx, run), inst);
        continue;
      }
      const inst = runInstance(ctx, run);
      if (!inst) {
        dropRun(ctx, run);
        runs(ctx).delete(key);
        continue;
      }
      if (player.dead) continue;
      const inside = instanceAt(ctx, player.pos) === inst;
      if (!inside) {
        if (run.inside) {
          run.inside = false;
          run.reentryArmed = false;
          continue;
        }
        const dx = player.pos.x - worldAnchor.x;
        const dz = player.pos.z - worldAnchor.z;
        const outsideMaterializeRadius =
          dx * dx + dz * dz > MATERIALIZE_RADIUS * MATERIALIZE_RADIUS;
        if (outsideMaterializeRadius) {
          dropRun(ctx, run);
          runs(ctx).delete(key);
          continue;
        }
        if (!run.reentryArmed) continue;
        const entered = enterScriptedDungeon(
          ctx,
          MIR4_CAMPAIGN_ROOM_ID,
          run.claimKey,
          player.id,
          run.returnPos,
        );
        if (!entered) continue;
        run.inside = true;
      }
      const roomAnchor = roomEncounterAnchor(ctx, run);
      if (run.bossId !== null) {
        const boss = ctx.entities.get(run.bossId);
        if (boss && !boss.dead) continue;
        if (boss) {
          const templateId = boss.templateId;
          ctx.dropEntity(boss.id);
          removeRunMobIds(inst, new Set([boss.id]));
          releaseMir4RuntimeMobTemplate(ctx, templateId);
        }
        run.bossId = null;
      }
      if (
        run.guardIds.some((id) => {
          const guard = ctx.entities.get(id);
          return !!guard && !guard.dead;
        })
      )
        continue;
      const guardTemplateIds = new Set<string>();
      for (const id of run.guardIds) {
        const guard = ctx.entities.get(id);
        if (!guard) continue;
        guardTemplateIds.add(guard.templateId);
        ctx.dropEntity(id);
      }
      removeRunMobIds(inst, new Set(run.guardIds));
      for (const templateId of guardTemplateIds) releaseMir4RuntimeMobTemplate(ctx, templateId);
      run.guardIds = [];
      spawnBoss(ctx, run, bossTemplate, player, roomAnchor, inst);
    }
  }
  for (const [key, run] of runs(ctx)) {
    if (activeKeys.has(key)) continue;
    dropRun(ctx, run);
    runs(ctx).delete(key);
  }
}
