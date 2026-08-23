// The mir4 slice quest verbs: accept at the giver, inspect a clue site, turn
// in for the exact source rewards. State is runtime-only on PlayerMeta
// (mir4Quests) for this slice; persistence rides the Phase 5 quest port.
// Everything validates position server-side (giver proximity, site proximity)
// exactly like the classic quest commands, so a client can only request.

import { MIR4_QUESTS } from '../content/mir4/quests';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { dist2d, INTERACT_RANGE } from '../types';
import { grantMir4Xp } from './combat';
import { markMir4WireDirty } from './wire_revision';

export { mir4QuestTrackerEntries } from './quest_tracker';

const SITE_INSPECT_YARDS = 5;

export interface Mir4QuestProgress {
  state: 'active' | 'ready' | 'done';
  inspected: number[];
}

function progressOf(
  meta: { mir4Quests?: Record<string, Mir4QuestProgress> },
  id: string,
): Mir4QuestProgress | undefined {
  return meta.mir4Quests?.[id];
}

function giverEntity(ctx: SimContext, npcId: string): Entity | null {
  for (const e of ctx.entities.values()) {
    if (e.kind === 'npc' && e.templateId === npcId) return e;
  }
  return null;
}

/**
 * The one interaction verb: near the GIVER it accepts (or turns in, when
 * ready); near an uninspected clue site it inspects. Returns a player-facing
 * English notice (client-localized later via the sim_i18n matcher arm that
 * ships with the Phase 2 facet).
 */
export function mir4TalkOrInspect(ctx: SimContext, pid: number): string {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return 'You cannot do that right now.';
  const quest = MIR4_QUESTS.mir4_m01_q01;
  const prog = progressOf(meta, quest.id);

  // While the quest is active, an uninspected clue site in reach wins over
  // the giver: the ford clue stands next to Tarek, and inspecting it must not
  // collapse into the "remaining clues" progress line.
  if (prog?.state === 'active') {
    for (let i = 0; i < quest.sites.length; i++) {
      if (prog.inspected.includes(i)) continue;
      const site = quest.sites[i];
      if (
        dist2d(p.pos, { x: site.x, y: p.pos.y, z: site.z } as Entity['pos']) <= SITE_INSPECT_YARDS
      ) {
        prog.inspected.push(i);
        meta.counters.questProgress += 1;
        if (prog.inspected.length >= quest.sites.length) prog.state = 'ready';
        markMir4WireDirty(meta);
        return prog.state === 'ready'
          ? `${quest.name}: all clues found. Return to the giver.`
          : `${quest.name}: clue ${prog.inspected.length} of ${quest.sites.length}.`;
      }
    }
  }

  const giver = giverEntity(ctx, quest.giverNpcId);
  if (giver && dist2d(p.pos, giver.pos) <= INTERACT_RANGE + 2) {
    if (!prog) {
      meta.mir4Quests = { ...meta.mir4Quests, [quest.id]: { state: 'active', inspected: [] } };
      markMir4WireDirty(meta);
      return `${quest.name} accepted.`;
    }
    if (prog.state === 'ready') {
      prog.state = 'done';
      meta.counters.questsCompleted += 1;
      meta.copper += quest.copperReward;
      grantMir4Xp(ctx, quest.xpReward, meta);
      markMir4WireDirty(meta);
      return `${quest.name} complete.`;
    }
    if (prog.state === 'active') {
      return `Inspect the remaining clues: ${quest.sites.length - prog.inspected.length}.`;
    }
    return 'You have already finished this task.';
  }

  return 'Nothing to do here.';
}
