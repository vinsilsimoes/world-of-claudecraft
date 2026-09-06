// The mir4 auto-quest journey (Phase 2 slice): the source project's
// quest-journey model (js/quest-journey.js) re-hosted inside the sim — walk
// to the giver, accept, walk to each objective site, act, return, turn in.
// Locomotion uses the shared moveToward entry (immune to client input
// clobbering); manual movement input suspends the journey exactly like the
// auto battle, resuming (from where the player stands) when the hands leave
// the keys. The kill/collect objective kinds arrive with the Phase 5 quest
// port; this slice drives the inspect objective through the shared
// mir4TalkOrInspect verb, so every admission rule still applies.
//
// The HUD polls mir4AutoQuestStatus() per frame instead of the sim emitting
// player-facing strings (that emit surface ships registered with the
// sim_i18n matcher together with the Phase 2 facet).

import { mir4AutomationActionBlocked, mir4AutomationRunSpeed } from '../auto_battle/admission';
import { setMir4AutoBattleMode } from '../auto_battle/core';
import { mir4ArcQuest } from '../content/mir4/arc_campaign';
import { mir4ArcBands, mir4ArcNpcTemplateId } from '../content/mir4/arc_world';
import { MIR4_QUESTS } from '../content/mir4/quests';
import { mir4ArcDungeonTargetForPlayer } from '../mir4/arc_dungeons';
import {
  mir4ArcEscorteeForPlayer,
  mir4ArcEscortTargetForPlayer,
  tryStartMir4ArcEscort,
} from '../mir4/arc_escorts';
import {
  MIR4_ARC_OBJECTIVE_INTERACT_RADIUS,
  mir4ArcObjectiveUsesInteract,
  mir4ArcQuestDropForPlayer,
  mir4ArcStageAnchor,
  mir4ArcStageObjectiveIndex,
  mir4HandleArcBoardInteract,
  mir4HandleArcObjectiveInteract,
} from '../mir4/arc_quest_runtime';
import { type Mir4ArcQuestProgress, mir4QuestCurrentStage } from '../mir4/arc_quests';
import { MIR4_ARC_COMBAT_STAGE_KINDS, MIR4_ARC_ESCORT_STAGE_KINDS } from '../mir4/arc_stage_kinds';
import {
  mir4AutoJourneyCandidate,
  mir4AutoJourneyCandidateForQuest,
} from '../mir4/auto_journey_selection';
import {
  mir4CampaignMapAvailable,
  mir4CampaignMapIdsForWorld,
  mir4WorldHasFullCampaign,
} from '../mir4/campaign_availability';
import { mir4ManualMovementActive } from '../mir4/manual_input';
import { beginMir4NarrativeDialogue } from '../mir4/narrative_dialogue';
import { mir4TalkOrInspect } from '../mir4/quest';
import { mir4SkillActivationOwnsMotion } from '../mir4/skill_activation';
import { startMir4TargetCombat, stopMir4TargetCombat } from '../mir4/target_combat';
import { mir4ArcPortalsForWorld, mir4PortalRouteGoal } from '../mir4/travel';
import { markMir4WireDirty } from '../mir4/wire_revision';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import {
  dist2d,
  EASTBROOK_NOTICEBOARD_INTERACTION_RADIUS,
  EASTBROOK_NOTICEBOARD_TEMPLATE_ID,
  INTERACT_RANGE,
} from '../types';
import { advanceMir4AutoQuestRoute, type Mir4AutoQuestRouteState } from './route';

export type Mir4AutoQuestPhase = 'to-giver' | 'to-site' | 'return' | 'done';

const AUTO_QUEST_ESCORT_START_RANGE = INTERACT_RANGE - 0.5;
// An escortee advances every tick. Replanning the complete WoC road route for
// every few inches of motion can snap the next waypoint behind the player and
// make Journey oscillate while the convoy walks away. Keep following the
// current physical route until the NPC has moved a meaningful distance or the
// cached leg is consumed.
const AUTO_QUEST_MOVING_ESCORT_REPATH_YARDS = 12;
const AUTO_QUEST_ARC_BANDS = mir4ArcBands();

export interface Mir4AutoQuestState {
  questId: string;
  phase: Mir4AutoQuestPhase;
  siteIndex: number;
  suspended: boolean;
  /** Session-only path cursor. Persistence and snapshot sanitizers deliberately
   * project only the four authoritative fields above. */
  route?: Mir4AutoQuestRouteState;
  /** Legacy save marker from builds where Journey could enable Auto Battle.
   * New journeys never set it; the first live tick uses it only to turn that
   * old implicit battle mode off safely. */
  battleOwned?: boolean;
  /** True when the player selected this exact quest instead of the default
   * campaign-first candidate. */
  manualSelection?: boolean;
}

function giverEntity(
  ctx: SimContext,
  npcId: string,
  origin?: Entity,
  arcMapId?: string,
): Entity | null {
  const arcBand = arcMapId
    ? AUTO_QUEST_ARC_BANDS.find((band) => band.mapId === arcMapId)
    : undefined;
  let nearest: Entity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const e of ctx.entities.values()) {
    if (e.kind !== 'npc' || e.templateId !== npcId) continue;
    // Campaign NPC template ids repeat across map bands. Evidence is accepted
    // only in the quest's authored map, so selecting the globally nearest copy
    // can strand a journey beside an identically named NPC in another map.
    if (arcMapId) {
      if (ctx.worldContent.mir4ArcMapProjections?.length) {
        // Campaign NPC template ids are unique in the transplanted world. A
        // physical WoC zone may host more than one chapter, so coordinate-band
        // filtering would reject the later chapter's legitimate NPC.
      } else if (
        !arcBand ||
        e.pos.x < arcBand.xMin ||
        e.pos.x >= arcBand.xMax ||
        e.pos.z < arcBand.zMin ||
        e.pos.z >= arcBand.zMax
      ) {
        continue;
      }
    }
    const distance = origin ? dist2d(origin.pos, e.pos) : 0;
    if (distance < nearestDistance) {
      nearest = e;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function near(p: Entity, x: number, z: number, yards: number): boolean {
  return dist2d(p.pos, { x, y: p.pos.y, z } as Entity['pos']) <= yards;
}

function arcNoticeboardEntity(ctx: SimContext, arcMapId: string): Entity | null {
  const band = AUTO_QUEST_ARC_BANDS.find((candidate) => candidate.mapId === arcMapId);
  if (!band && !ctx.worldContent.mir4ArcMapProjections?.length) return null;
  const projectedBoardEntityId = ctx.worldContent.mir4ArcMapProjections?.length
    ? ctx.worldContent.services?.noticeboards?.find((board) => board.id.includes(arcMapId))
        ?.entityId
    : undefined;
  let board: Entity | null = null;
  for (const entity of ctx.entities.values()) {
    if (
      entity.kind !== 'object' ||
      entity.templateId !== EASTBROOK_NOTICEBOARD_TEMPLATE_ID ||
      (ctx.worldContent.mir4ArcMapProjections?.length
        ? entity.id !== projectedBoardEntityId
        : !band ||
          entity.pos.x < band.xMin ||
          entity.pos.x >= band.xMax ||
          entity.pos.z < band.zMin ||
          entity.pos.z >= band.zMax)
    ) {
      continue;
    }
    if (!board || entity.id < board.id) board = entity;
  }
  return board;
}

function driveAutoQuestToArcBoard(
  ctx: SimContext,
  player: Entity,
  state: Mir4AutoQuestState,
  arcMapId: string,
): void {
  const board = arcNoticeboardEntity(ctx, arcMapId);
  if (!board) return;
  if (near(player, board.pos.x, board.pos.z, EASTBROOK_NOTICEBOARD_INTERACTION_RADIUS)) {
    mir4HandleArcBoardInteract(ctx, player.id, board.id);
  } else {
    moveAutoQuestToward(ctx, player, state, board.pos);
  }
}

export function mir4FullCampaignAvailable(ctx: SimContext): boolean {
  return mir4WorldHasFullCampaign(ctx.worldContent);
}

function selectMir4AutoQuestCandidate(ctx: SimContext, pid: number, questId?: string) {
  const meta = ctx.players.get(pid);
  if (!meta) return null;
  const state = {
    playerLevel: ctx.entities.get(pid)?.level,
    mir4Quests: meta.mir4Quests,
    mir4ArcQuests: meta.mir4ArcQuests,
  };
  const options = {
    fullCampaignAvailable: mir4FullCampaignAvailable(ctx),
    campaignMapIds: mir4CampaignMapIdsForWorld(ctx.worldContent),
  };
  return questId
    ? mir4AutoJourneyCandidateForQuest(state, questId, options)
    : mir4AutoJourneyCandidate(state, options);
}

export function setMir4AutoQuest(
  ctx: SimContext,
  pid: number,
  on: boolean,
  questId?: string,
): void {
  const meta = ctx.players.get(pid);
  if (!meta) return;
  if (!on) {
    const ownsFocusedCombat = meta.mir4TargetCombat?.owner === 'journey';
    if (!meta.mir4AutoQuest && !meta.mir4NarrativeDialogue && !ownsFocusedCombat) return;
    if (meta.mir4AutoQuest?.battleOwned)
      setMir4AutoBattleMode(ctx, pid, 'off', undefined, 'journey');
    stopMir4TargetCombat(ctx, pid, 'journey');
    meta.mir4AutoQuest = undefined;
    meta.mir4NarrativeDialogue = undefined;
    markMir4WireDirty(meta);
    return;
  }
  // Enabling the same journey is idempotent. Selecting a different quest row
  // transfers ownership without leaving journey-owned combat behind.
  if (meta.mir4AutoQuest) {
    if (!questId || meta.mir4AutoQuest.questId === questId) return;
    if (meta.mir4AutoQuest.battleOwned) {
      setMir4AutoBattleMode(ctx, pid, 'off', undefined, 'journey');
    }
    stopMir4TargetCombat(ctx, pid, 'journey');
    meta.mir4AutoQuest = undefined;
    meta.mir4NarrativeDialogue = undefined;
    markMir4WireDirty(meta);
  }
  const candidate = selectMir4AutoQuestCandidate(ctx, pid, questId);
  if (!candidate) return;
  meta.mir4AutoQuest = {
    questId: candidate.questId,
    phase: candidate.phase,
    siteIndex: candidate.siteIndex,
    suspended: false,
    ...(questId ? { manualSelection: true } : {}),
  };
  markMir4WireDirty(meta);
}

function moveAutoQuestToward(
  ctx: SimContext,
  p: Entity,
  st: Mir4AutoQuestState,
  destination: { x: number; y: number; z: number },
  repathGoalDistance?: number,
  preferAuthoredRoads = true,
): void {
  const runSpeed = mir4AutomationRunSpeed(ctx, p);
  // A root must pause this exact route cursor. Advancing the stall detector
  // while movement is forbidden can skip authored waypoints or trigger a
  // spurious repath before the player is allowed to move again.
  if (runSpeed <= 0) return;
  const routeGoal = mir4PortalRouteGoal(
    p.pos,
    destination,
    mir4ArcPortalsForWorld(ctx.worldContent),
    ctx.worldContent.mir4ArcMapProjections,
    ctx.worldContent,
    mir4ArcQuest(st.questId)?.mapId,
  );
  const next = advanceMir4AutoQuestRoute(
    ctx.cfg.seed,
    p.pos,
    routeGoal,
    st.route,
    ctx.riftCollisionToken,
    undefined,
    preferAuthoredRoads,
    ctx.worldContent.roads,
    ctx.worldContent.zones,
    true,
    repathGoalDistance,
  );
  st.route = next.route;
  ctx.moveToward(p, { x: next.waypoint.x, y: p.pos.y, z: next.waypoint.z }, runSpeed);
}

function releaseLegacyAutoQuestBattle(ctx: SimContext, p: Entity, st: Mir4AutoQuestState): void {
  if (!st.battleOwned) return;
  setMir4AutoBattleMode(ctx, p.id, 'off', undefined, 'journey');
  st.battleOwned = undefined;
}

function arcEncounterTarget(
  ctx: SimContext,
  p: Entity,
  progress: Mir4ArcQuestProgress,
): Entity | null {
  const run = ctx.mir4ArcEncounterRuns.get(`${p.id}:${progress.questId}:${progress.stageIndex}`);
  if (run) {
    const target = ctx.entities.get(run.entityId);
    if (target && !target.dead) return target;
  }
  return mir4ArcDungeonTargetForPlayer(ctx, p.id, progress.questId, progress.stageIndex);
}

/** English status line for the HUD tracker (client-localized with the facet). */
export function mir4AutoQuestStatus(meta: {
  mir4AutoQuest?: Mir4AutoQuestState;
  mir4Quests?: Record<string, { inspected: number[]; state: string }>;
  mir4ArcQuests?: Record<string, Mir4ArcQuestProgress>;
}): string {
  const st = meta.mir4AutoQuest;
  if (!st) return 'Auto quest off';
  const arcProgress = meta.mir4ArcQuests?.[st.questId];
  const arcQuest = mir4ArcQuest(st.questId);
  if (arcQuest) {
    if (st.suspended) return `${arcQuest.title}: paused (manual control)`;
    if (!arcProgress) return `${arcQuest.title}: walking to ${arcQuest.giverNpcId}`;
    if (arcProgress.state === 'ready')
      return `${arcQuest.title}: returning to ${arcQuest.turnInNpcId}`;
    const stage = mir4QuestCurrentStage(arcProgress);
    return `${arcQuest.title}: ${stage?.text ?? stage?.kind ?? 'complete'}`;
  }
  const quest = MIR4_QUESTS[st.questId];
  const inspected = meta.mir4Quests?.[st.questId]?.inspected.length ?? 0;
  if (st.suspended) return `${quest.name}: paused (manual control)`;
  switch (st.phase) {
    case 'to-giver':
      return `${quest.name}: walking to ${quest.giverNpcId === 'mir4_tarek_duas_pontes' ? 'Tarek' : 'the giver'}`;
    case 'to-site':
      return `${quest.name}: inspecting clue ${Math.min(inspected + 1, quest.sites.length)} of ${quest.sites.length}`;
    case 'return':
      return `${quest.name}: returning to Tarek`;
    default:
      return `${quest.name}: complete`;
  }
}

/** The per-tick phase: one step of the journey per automated player. */
export function updateMir4AutoQuest(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const st = meta.mir4AutoQuest;
    if (!st || st.phase === 'done') continue;
    if (mir4SkillActivationOwnsMotion(meta, ctx.tickCount)) continue;
    const p = ctx.entities.get(meta.entityId);
    if (!p || p.dead) continue;

    // Auto Mission never enables the separate Auto Battle tool. Explicit
    // combat objectives may arm focused combat against their one authored
    // target; ordinary collection hazards still require player intervention.
    // This also heals sessions restored from the older ownership model before
    // navigation or interaction can resume. A player-owned Auto Battle choice
    // remains independent and is never switched off here.
    releaseLegacyAutoQuestBattle(ctx, p, st);

    // Narrative is a first-class journey phase. While it is visible, Auto
    // Mission owns neither movement nor combat and waits for the authoritative
    // reading timeout (or the player's explicit skip command).
    if (meta.mir4NarrativeDialogue) {
      continue;
    }

    // A deliberate ordinary Attack temporarily owns selection and movement.
    // Journey resumes after that exact target dies or the player cancels it.
    if (p.autoAttack && meta.mir4TargetCombat) continue;

    const arcQuest = mir4ArcQuest(st.questId);
    if (
      arcQuest &&
      !mir4CampaignMapAvailable(arcQuest.mapId, mir4CampaignMapIdsForWorld(ctx.worldContent))
    ) {
      meta.mir4AutoQuest = undefined;
      markMir4WireDirty(meta);
      continue;
    }

    if (mir4ManualMovementActive(meta.moveInput)) {
      if (!st.suspended) {
        st.suspended = true;
        st.route = undefined;
        markMir4WireDirty(meta);
      }
      continue;
    }
    if (st.suspended) {
      st.suspended = false; // resume from wherever the player now stands
      st.route = undefined;
      markMir4WireDirty(meta);
    }
    if (mir4AutomationActionBlocked(ctx, p)) continue;

    const arcProgress = meta.mir4ArcQuests?.[st.questId];
    if (arcQuest?.group === 'main' && !arcProgress) {
      // A persisted journey is only a cursor, not campaign authority. Re-run
      // selection without that active cursor so a future main cannot strand
      // the player beside an NPC whose talk is correctly rejected by the
      // authoritative next-main rule. Authored main-quest levels are
      // recommendations and never replace combat as the readiness check.
      const replacement = selectMir4AutoQuestCandidate(ctx, p.id);
      if (!replacement || replacement.questId !== st.questId) {
        meta.mir4AutoQuest = undefined;
        markMir4WireDirty(meta);
        setMir4AutoQuest(ctx, p.id, true);
        continue;
      }
    }
    if (arcQuest && arcQuest.group !== 'main' && !st.manualSelection) {
      const replacement = selectMir4AutoQuestCandidate(ctx, p.id);
      if (replacement && replacement.questId !== st.questId) {
        // Old saves can resume with a repeatable contract selected from before
        // campaign-first routing existed. Heal that session state in place so
        // the player does not have to toggle Auto Journey off and on manually.
        meta.mir4AutoQuest = undefined;
        markMir4WireDirty(meta);
        setMir4AutoQuest(ctx, p.id, true);
        continue;
      }
    }
    if (arcQuest) {
      if (!arcProgress) {
        if (arcQuest.group === 'repeatable' && arcQuest.giverNpcId.length === 0) {
          driveAutoQuestToArcBoard(ctx, p, st, arcQuest.mapId);
          continue;
        }
        const giver = giverEntity(
          ctx,
          mir4ArcNpcTemplateId(arcQuest.giverNpcId),
          p,
          arcQuest.mapId,
        );
        if (!giver) continue;
        if (near(p, giver.pos.x, giver.pos.z, INTERACT_RANGE + 2))
          beginMir4NarrativeDialogue(ctx, p.id, giver, arcQuest, 'accept');
        else moveAutoQuestToward(ctx, p, st, giver.pos);
        continue;
      }
      if (arcProgress.state === 'done') {
        meta.mir4AutoQuest = undefined;
        markMir4WireDirty(meta);
        continue;
      }
      if (arcProgress.state === 'ready') {
        if (arcQuest.group === 'repeatable' && arcQuest.turnInNpcId.length === 0) {
          driveAutoQuestToArcBoard(ctx, p, st, arcQuest.mapId);
          continue;
        }
        const turnIn = giverEntity(
          ctx,
          mir4ArcNpcTemplateId(arcQuest.turnInNpcId),
          p,
          arcQuest.mapId,
        );
        if (!turnIn) continue;
        if (near(p, turnIn.pos.x, turnIn.pos.z, INTERACT_RANGE + 2))
          beginMir4NarrativeDialogue(ctx, p.id, turnIn, arcQuest, 'complete');
        else moveAutoQuestToward(ctx, p, st, turnIn.pos);
        continue;
      }
      const stage = mir4QuestCurrentStage(arcProgress);
      if (!stage) continue;
      // System lessons are deliberate player checkpoints. Auto Journey keeps
      // ownership but neither walks to a synthetic anchor nor completes the
      // lesson; opening the highlighted window or performing the taught verb
      // supplies the authoritative receipt and the journey resumes next tick.
      if (stage.kind === 'system-tutorial') continue;
      if (MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) {
        const questDrop = mir4ArcQuestDropForPlayer(
          ctx,
          p.id,
          arcProgress.questId,
          arcProgress.stageIndex,
        );
        if (questDrop) {
          if (near(p, questDrop.pos.x, questDrop.pos.z, INTERACT_RANGE)) {
            mir4HandleArcObjectiveInteract(ctx, p.id, questDrop.id);
          } else {
            moveAutoQuestToward(ctx, p, st, questDrop.pos);
          }
          continue;
        }
        const target = arcEncounterTarget(ctx, p, arcProgress);
        if (target) {
          // This stage explicitly requires combat, so Journey may arm the
          // ordinary one-target Attack contract once it reaches the authored
          // enemy. That contract never acquires a replacement and leaves the
          // separate Auto Battle tool untouched.
          p.targetId = target.id;
          if (!near(p, target.pos.x, target.pos.z, 4) || !ctx.hasLineOfSight(p, target)) {
            moveAutoQuestToward(ctx, p, st, target.pos);
          } else {
            startMir4TargetCombat(ctx, p.id, 'journey');
          }
          continue;
        }
      }
      if (stage.kind === 'talk' || stage.kind === 'deliver') {
        const sourceTarget = Array.isArray(stage.target) ? stage.target[0] : stage.target;
        if (typeof sourceTarget !== 'string') continue;
        const npc = giverEntity(ctx, mir4ArcNpcTemplateId(sourceTarget), p, arcQuest.mapId);
        if (!npc) continue;
        if (near(p, npc.pos.x, npc.pos.z, INTERACT_RANGE + 2))
          beginMir4NarrativeDialogue(ctx, p.id, npc, arcQuest, 'advance');
        else moveAutoQuestToward(ctx, p, st, npc.pos);
        continue;
      }
      if (MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind)) {
        const ambusher = mir4ArcEscortTargetForPlayer(
          ctx,
          p.id,
          arcProgress.questId,
          arcProgress.stageIndex,
        );
        if (ambusher) {
          // Escort threats use the same rule: Journey approaches and targets,
          // then waits for manual combat rather than clearing the ambush.
          p.targetId = ambusher.id;
          if (!near(p, ambusher.pos.x, ambusher.pos.z, 4) || !ctx.hasLineOfSight(p, ambusher)) {
            moveAutoQuestToward(ctx, p, st, ambusher.pos);
          }
          continue;
        }
        const escortee = mir4ArcEscorteeForPlayer(
          ctx,
          p.id,
          arcProgress.questId,
          arcProgress.stageIndex,
        );
        if (escortee) {
          if (near(p, escortee.pos.x, escortee.pos.z, AUTO_QUEST_ESCORT_START_RANGE)) {
            tryStartMir4ArcEscort(ctx, p, arcProgress.questId, arcProgress.stageIndex);
          } else {
            moveAutoQuestToward(
              ctx,
              p,
              st,
              escortee.pos,
              AUTO_QUEST_MOVING_ESCORT_REPATH_YARDS,
              false,
            );
          }
        } else {
          // The escort system materializes its native NPC only after the
          // player approaches checkpoint zero. Route to that authored anchor
          // first so Journey never waits for an entity whose own spawn gate is
          // waiting for Journey.
          const materializationAnchor = mir4ArcStageAnchor(
            arcProgress.questId,
            stage,
            0,
            ctx.worldContent.mir4ArcMapProjections,
          );
          if (materializationAnchor) {
            moveAutoQuestToward(ctx, p, st, {
              x: materializationAnchor.x,
              y: p.pos.y,
              z: materializationAnchor.z,
            });
          }
        }
        // The escort system materializes its native NPC in a separate tick
        // phase. Never fall through and submit generic objective evidence
        // while the escortee is absent or still outside safe start range.
        continue;
      }
      const anchor = mir4ArcStageAnchor(
        arcProgress.questId,
        stage,
        mir4ArcStageObjectiveIndex(stage, arcProgress.stageProgress),
        ctx.worldContent.mir4ArcMapProjections,
      );
      if (!anchor) continue;
      if (
        near(
          p,
          anchor.x,
          anchor.z,
          stage.kind === 'travel' ? 12 : MIR4_ARC_OBJECTIVE_INTERACT_RADIUS,
        )
      ) {
        if (mir4ArcObjectiveUsesInteract(stage)) mir4HandleArcObjectiveInteract(ctx, p.id);
      } else moveAutoQuestToward(ctx, p, st, { x: anchor.x, y: p.pos.y, z: anchor.z });
      continue;
    }

    const quest = MIR4_QUESTS[st.questId];
    const giver = giverEntity(ctx, quest.giverNpcId, p);

    if (st.phase === 'to-giver' || st.phase === 'return') {
      if (!giver) continue;
      if (near(p, giver.pos.x, giver.pos.z, INTERACT_RANGE + 2)) {
        mir4TalkOrInspect(ctx, p.id); // accept (to-giver) or turn in (return)
        const prog = meta.mir4Quests?.[st.questId];
        if (prog?.state === 'done') {
          st.phase = 'done';
          meta.mir4AutoQuest = undefined;
          markMir4WireDirty(meta);
          setMir4AutoQuest(ctx, p.id, true);
        } else if (prog?.state === 'active' || prog?.state === 'ready') {
          st.phase = 'to-site';
          markMir4WireDirty(meta);
        }
      } else {
        moveAutoQuestToward(ctx, p, st, giver.pos);
      }
      continue;
    }

    if (st.phase === 'to-site') {
      const prog = meta.mir4Quests?.[st.questId];
      if (prog?.state !== 'active') {
        st.phase = 'return'; // ready or gone: head back
        markMir4WireDirty(meta);
        continue;
      }
      const site = quest.sites[st.siteIndex];
      if (site && near(p, site.x, site.z, 5)) {
        mir4TalkOrInspect(ctx, p.id);
        st.siteIndex += 1;
        markMir4WireDirty(meta);
        // Re-read widened: the verb above may have flipped the quest to
        // 'ready', which the earlier narrowing cannot see.
        const state: string = meta.mir4Quests?.[st.questId]?.state ?? '';
        if (st.siteIndex >= quest.sites.length || state === 'ready') {
          st.phase = 'return';
          markMir4WireDirty(meta);
        }
      } else if (site) {
        moveAutoQuestToward(ctx, p, st, { x: site.x, y: p.pos.y, z: site.z });
      } else {
        st.phase = 'return';
        markMir4WireDirty(meta);
      }
    }
  }
}
