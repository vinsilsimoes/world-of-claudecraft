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

import { MIR4_QUESTS } from '../content/mir4/quests';
import { mir4TalkOrInspect } from '../mir4/quest';
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

function giverEntity(ctx: SimContext, npcId: string): Entity | null {
  for (const e of ctx.entities.values()) {
    if (e.kind === 'npc' && e.templateId === npcId) return e;
  }
  return null;
}

function near(p: Entity, x: number, z: number, yards: number): boolean {
  return dist2d(p.pos, { x, y: p.pos.y, z } as Entity['pos']) <= yards;
}

export function setMir4AutoQuest(ctx: SimContext, pid: number, on: boolean): void {
  const meta = ctx.players.get(pid);
  if (!meta) return;
  if (!on) {
    meta.mir4AutoQuest = undefined;
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
}

/** English status line for the HUD tracker (client-localized with the facet). */
export function mir4AutoQuestStatus(meta: {
  mir4AutoQuest?: Mir4AutoQuestState;
  mir4Quests?: Record<string, { inspected: number[]; state: string }>;
}): string {
  const st = meta.mir4AutoQuest;
  if (!st) return 'Auto quest off';
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
      st.suspended = true;
      continue;
    }
    if (st.suspended) {
      st.suspended = false; // resume from wherever the player now stands
    }

    const quest = MIR4_QUESTS[st.questId];
    const giver = giverEntity(ctx, quest.giverNpcId);

    if (st.phase === 'to-giver' || st.phase === 'return') {
      if (!giver) continue;
      if (near(p, giver.pos.x, giver.pos.z, INTERACT_RANGE + 2)) {
        mir4TalkOrInspect(ctx, p.id); // accept (to-giver) or turn in (return)
        const prog = meta.mir4Quests?.[st.questId];
        if (prog?.state === 'done') {
          st.phase = 'done';
          meta.mir4AutoQuest = undefined;
        } else if (prog?.state === 'active' || prog?.state === 'ready') {
          st.phase = 'to-site';
        }
      } else {
        ctx.moveToward(p, giver.pos, RUN_SPEED);
      }
      continue;
    }

    if (st.phase === 'to-site') {
      const prog = meta.mir4Quests?.[st.questId];
      if (!prog || prog.state !== 'active') {
        st.phase = 'return'; // ready or gone: head back
        continue;
      }
      const site = quest.sites[st.siteIndex];
      if (site && near(p, site.x, site.z, 5)) {
        mir4TalkOrInspect(ctx, p.id);
        st.siteIndex += 1;
        // Re-read widened: the verb above may have flipped the quest to
        // 'ready', which the earlier narrowing cannot see.
        const state: string = meta.mir4Quests?.[st.questId]?.state ?? '';
        if (st.siteIndex >= quest.sites.length || state === 'ready') {
          st.phase = 'return';
        }
      } else if (site) {
        ctx.moveToward(p, { x: site.x, y: p.pos.y, z: site.z }, RUN_SPEED);
      } else {
        st.phase = 'return';
      }
    }
  }
}
