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

import { mir4ArcNpcTemplateId } from '../content/mir4/arc_world';
import { MIR4_QUESTS } from '../content/mir4/quests';
import { mir4ArcQuest } from '../content/mir4/quests_arc';
import { mir4ArcEscorteeForPlayer, tryStartMir4ArcEscort } from '../mir4/arc_escorts';
import {
  mir4ArcObjectiveUsesInteract,
  mir4ArcStageAnchor,
  mir4HandleArcObjectiveInteract,
} from '../mir4/arc_quest_runtime';
import {
  type Mir4ArcQuestProgress,
  mir4NextMainQuest,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from '../mir4/arc_quests';
import { MIR4_ARC_ESCORT_STAGE_KINDS } from '../mir4/arc_stage_kinds';
import { mir4TalkOrInspect } from '../mir4/quest';
import { markMir4WireDirty } from '../mir4/wire_revision';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { dist2d, INTERACT_RANGE, RUN_SPEED } from '../types';

export type Mir4AutoQuestPhase = 'to-giver' | 'to-site' | 'return' | 'done';

export interface Mir4AutoQuestState {
  questId: string;
  phase: Mir4AutoQuestPhase;
  siteIndex: number;
  suspended: boolean;
}

function giverEntity(ctx: SimContext, npcId: string, origin?: Entity): Entity | null {
  let nearest: Entity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const e of ctx.entities.values()) {
    if (e.kind !== 'npc' || e.templateId !== npcId) continue;
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

function hasFullArcHost(ctx: SimContext): boolean {
  for (const entity of ctx.entities.values()) {
    if (entity.kind === 'npc' && entity.templateId === 'mir4_maela_do_vau') return true;
  }
  return false;
}

export function setMir4AutoQuest(ctx: SimContext, pid: number, on: boolean): void {
  const meta = ctx.players.get(pid);
  if (!meta) return;
  if (!on) {
    if (!meta.mir4AutoQuest) return;
    meta.mir4AutoQuest = undefined;
    markMir4WireDirty(meta);
    return;
  }
  const arc = mir4OrderedArcProgress(meta.mir4ArcQuests).find(
    (progress) => progress.state !== 'done',
  );
  if (arc) {
    meta.mir4AutoQuest = {
      questId: arc.questId,
      phase: arc.state === 'ready' ? 'return' : 'to-site',
      siteIndex: arc.stageIndex,
      suspended: false,
    };
    markMir4WireDirty(meta);
    return;
  }
  const nextArcId = mir4NextMainQuest(
    new Set(
      mir4OrderedArcProgress(meta.mir4ArcQuests)
        .filter((progress) => progress.state === 'done')
        .map((progress) => progress.questId),
    ),
  );
  const nextArc = nextArcId ? mir4ArcQuest(nextArcId) : null;
  const player = ctx.entities.get(pid);
  if (
    nextArc &&
    hasFullArcHost(ctx) &&
    giverEntity(ctx, mir4ArcNpcTemplateId(nextArc.giverNpcId), player) !== null
  ) {
    meta.mir4AutoQuest = {
      questId: nextArc.questId,
      phase: 'to-giver',
      siteIndex: 0,
      suspended: false,
    };
    markMir4WireDirty(meta);
    return;
  }
  const quest = MIR4_QUESTS.mir4_m01_q01;
  const prog = meta.mir4Quests?.[quest.id];
  if (prog?.state === 'done') return; // nothing to journey for
  // Already mid-quest: resume from the first uninspected site.
  const firstUninspected = prog?.inspected.length ?? 0;
  meta.mir4AutoQuest = {
    questId: quest.id,
    phase: 'to-giver',
    siteIndex: firstUninspected,
    suspended: false,
  };
  if (prog) meta.mir4AutoQuest.phase = 'to-site';
  markMir4WireDirty(meta);
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
    const p = ctx.entities.get(meta.entityId);
    if (!p || p.dead) continue;

    const inp = meta.moveInput;
    if (
      inp.forward ||
      inp.back ||
      inp.strafeLeft ||
      inp.strafeRight ||
      inp.turnLeft ||
      inp.turnRight
    ) {
      if (!st.suspended) {
        st.suspended = true;
        markMir4WireDirty(meta);
      }
      continue;
    }
    if (st.suspended) {
      st.suspended = false; // resume from wherever the player now stands
      markMir4WireDirty(meta);
    }

    const arcProgress = meta.mir4ArcQuests?.[st.questId];
    const arcQuest = mir4ArcQuest(st.questId);
    if (arcQuest) {
      if (!arcProgress) {
        const giver = giverEntity(ctx, mir4ArcNpcTemplateId(arcQuest.giverNpcId), p);
        if (!giver) continue;
        if (near(p, giver.pos.x, giver.pos.z, INTERACT_RANGE + 2)) ctx.talkToNpc(giver.id, p.id);
        else ctx.moveToward(p, giver.pos, RUN_SPEED);
        continue;
      }
      if (arcProgress.state === 'done') {
        meta.mir4AutoQuest = undefined;
        markMir4WireDirty(meta);
        continue;
      }
      if (arcProgress.state === 'ready') {
        const turnIn = giverEntity(ctx, mir4ArcNpcTemplateId(arcQuest.turnInNpcId), p);
        if (!turnIn) continue;
        if (near(p, turnIn.pos.x, turnIn.pos.z, INTERACT_RANGE + 2)) ctx.talkToNpc(turnIn.id, p.id);
        else ctx.moveToward(p, turnIn.pos, RUN_SPEED);
        continue;
      }
      const stage = mir4QuestCurrentStage(arcProgress);
      if (!stage) continue;
      if (stage.kind === 'talk' || stage.kind === 'deliver') {
        const sourceTarget = Array.isArray(stage.target) ? stage.target[0] : stage.target;
        if (typeof sourceTarget !== 'string') continue;
        const npc = giverEntity(ctx, mir4ArcNpcTemplateId(sourceTarget), p);
        if (!npc) continue;
        if (near(p, npc.pos.x, npc.pos.z, INTERACT_RANGE + 2)) ctx.talkToNpc(npc.id, p.id);
        else ctx.moveToward(p, npc.pos, RUN_SPEED);
        continue;
      }
      if (MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind)) {
        const escortee = mir4ArcEscorteeForPlayer(ctx, p.id);
        if (escortee) {
          if (near(p, escortee.pos.x, escortee.pos.z, INTERACT_RANGE + 2)) {
            tryStartMir4ArcEscort(ctx, p);
          } else {
            ctx.moveToward(p, escortee.pos, RUN_SPEED);
          }
          continue;
        }
      }
      const anchor = mir4ArcStageAnchor(arcProgress.questId, stage, arcProgress.stageProgress);
      if (!anchor) continue;
      if (near(p, anchor.x, anchor.z, stage.kind === 'travel' ? 12 : 5)) {
        if (mir4ArcObjectiveUsesInteract(stage)) mir4HandleArcObjectiveInteract(ctx, p.id);
      } else ctx.moveToward(p, { x: anchor.x, y: p.pos.y, z: anchor.z }, RUN_SPEED);
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
        } else if (prog?.state === 'active' || prog?.state === 'ready') {
          st.phase = 'to-site';
          markMir4WireDirty(meta);
        }
      } else {
        ctx.moveToward(p, giver.pos, RUN_SPEED);
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
        ctx.moveToward(p, { x: site.x, y: p.pos.y, z: site.z }, RUN_SPEED);
      } else {
        st.phase = 'return';
        markMir4WireDirty(meta);
      }
    }
  }
}
