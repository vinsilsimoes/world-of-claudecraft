// Campaign combat encounter materializer. It uses the runtime's native mob
// families/models and shared AI; only the authoritative MIR4 stats, names and
// quest-credit identities are authored here.

import { resolvePosition } from '../colliders';
import { mir4ArcQuest } from '../content/mir4/arc_campaign';
import { mir4ArcNormalXp } from '../content/mir4/arc_mobs';
import { mir4MobStats } from '../content/mir4/mobs';
import { MIR4_WORLD_ARC_BY_MAP } from '../content/mir4/world_arc';
import { createMob } from '../entity';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { MobTemplate } from '../types';
import { mir4ArcQuestDropForPlayer, mir4ArcStageAnchor } from './arc_quest_runtime';
import { mir4OrderedArcProgress, mir4QuestCurrentStage } from './arc_quests';
import { type Mir4ArcEncounterRun, releaseMir4RuntimeMobTemplate } from './arc_runtime_state';
import { MIR4_ARC_COMBAT_STAGE_KINDS, MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS } from './arc_stage_kinds';
import { mir4ArcTargetSlug } from './arc_target_identity';

const SPAWN_DISTANCE = 46;

export function stageMobSource(
  stage: ReturnType<typeof mir4QuestCurrentStage>,
  progress: number,
): string | null {
  if (!stage) return null;
  if (stage.guardian) return stage.guardian;
  if (stage.sources && stage.sources.length > 0)
    return stage.sources[progress % stage.sources.length]!;
  const target = Array.isArray(stage.target)
    ? stage.target[progress % stage.target.length]
    : stage.target;
  return typeof target === 'string' ? target : stage.kind;
}

export function encounterTemplate(
  questId: string,
  stageIndex: number,
  progress: number,
  source: string,
  boss = false,
): MobTemplate | null {
  const quest = mir4ArcQuest(questId);
  const map = quest ? MIR4_WORLD_ARC_BY_MAP.get(quest.mapId) : undefined;
  if (!quest || !map) return null;
  const id = `mir4_quest_${questId.toLowerCase()}_${stageIndex}_${progress}_${mir4ArcTargetSlug(source)}`;
  const lo = mir4MobStats(map.levelMin);
  const hi = mir4MobStats(map.levelMax);
  return {
    id,
    name: source.replace(/_/g, ' '),
    minLevel: map.levelMin,
    maxLevel: map.levelMax,
    family: source.includes('wolf') || source.includes('boar') ? 'beast' : 'humanoid',
    hpBase: lo.maxHp,
    hpPerLevel: Math.max(
      1,
      Math.round((hi.maxHp - lo.maxHp) / Math.max(1, map.levelMax - map.levelMin)),
    ),
    dmgBase: lo.attack,
    dmgPerLevel: Math.max(
      1,
      Math.round((hi.attack - lo.attack) / Math.max(1, map.levelMax - map.levelMin)),
    ),
    attackSpeed: 2,
    armorPerLevel: 0,
    moveSpeed: 3.5,
    aggroRadius: 9,
    mir4XpReward: mir4ArcNormalXp(map.sequence),
    loot: [{ copper: 2 + map.sequence, chance: 1 }],
    boss,
    mir4BossDamageReductionBps: boss ? 250 : 0,
    elite: source.includes(' ') || source.includes('guardian') || source.includes('matriarch'),
    scale: source.includes(' ') ? 1.25 : 1,
    color: 0x7a6c5d,
  };
}

export function updateMir4ArcEncounters(ctx: SimContext): void {
  const activeKeys = new Set<string>();
  for (const meta of ctx.players.values()) {
    const player = ctx.entities.get(meta.entityId);
    if (!player || player.dead) continue;
    for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
      const stage = mir4QuestCurrentStage(progress);
      const survivalThreat = stage?.kind === 'survive-zone' && Boolean(stage.guardian);
      if (!stage || (!MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind) && !survivalThreat)) continue;
      if (MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS.has(stage.kind)) continue;
      const key = `${meta.entityId}:${progress.questId}:${progress.stageIndex}`;
      activeKeys.add(key);
      const source = stageMobSource(stage, progress.stageProgress);
      const anchor = mir4ArcStageAnchor(
        progress.questId,
        stage,
        progress.stageProgress,
        ctx.worldContent.mir4ArcMapProjections,
      );
      if (!source || !anchor) continue;
      const dx = player.pos.x - anchor.x;
      const dz = player.pos.z - anchor.z;
      if (dx * dx + dz * dz > SPAWN_DISTANCE * SPAWN_DISTANCE) continue;
      const template = encounterTemplate(
        progress.questId,
        progress.stageIndex,
        progress.stageProgress,
        source,
        stage.kind === 'guardian-resolution',
      );
      if (!template) continue;
      const existing = ctx.mir4ArcEncounterRuns.get(key);
      const pendingDrop = mir4ArcQuestDropForPlayer(
        ctx,
        meta.entityId,
        progress.questId,
        progress.stageIndex,
      );
      if (pendingDrop) {
        if (existing) {
          const entity = ctx.entities.get(existing.entityId);
          if (entity) {
            const templateId = entity.templateId;
            ctx.dropEntity(entity.id);
            releaseMir4RuntimeMobTemplate(ctx, templateId);
          }
          ctx.mir4ArcEncounterRuns.delete(key);
        }
        continue;
      }
      if (existing) {
        const entity = ctx.entities.get(existing.entityId);
        if (entity && !entity.dead) continue;
        if (entity) {
          const templateId = entity.templateId;
          ctx.dropEntity(entity.id);
          releaseMir4RuntimeMobTemplate(ctx, templateId);
        }
        ctx.mir4ArcEncounterRuns.delete(key);
      }
      ctx.mir4RuntimeMobTemplates.set(template.id, template);
      const authoredSpawn = { x: anchor.x + 8, z: anchor.z };
      const safeSpawn = resolvePosition(
        ctx.cfg.seed,
        authoredSpawn.x,
        authoredSpawn.z,
        PLAYER_BODY_RADIUS,
      );
      const mob = createMob(
        ctx.nextId++,
        template,
        Math.max(template.minLevel, Math.min(template.maxLevel, player.level)),
        ctx.groundPos(safeSpawn.x, safeSpawn.z),
      );
      mob.spawnPos = { ...mob.pos };
      mob.runScoped = true;
      mob.summonedAdd = true;
      ctx.addEntity(mob);
      const run: Mir4ArcEncounterRun = {
        key,
        ownerPid: meta.entityId,
        questId: progress.questId,
        stageIndex: progress.stageIndex,
        entityId: mob.id,
      };
      ctx.mir4ArcEncounterRuns.set(key, run);
    }
  }
  for (const [key, run] of ctx.mir4ArcEncounterRuns) {
    if (activeKeys.has(key)) continue;
    const entity = ctx.entities.get(run.entityId);
    if (entity) {
      const templateId = entity.templateId;
      ctx.dropEntity(run.entityId);
      releaseMir4RuntimeMobTemplate(ctx, templateId);
    }
    ctx.mir4ArcEncounterRuns.delete(key);
  }
}
