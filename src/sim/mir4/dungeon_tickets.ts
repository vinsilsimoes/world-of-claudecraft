// Deterministic MIR4 dungeon-entry wallet. Native WoC doors do not use this
// policy; only scripted MIR4 dungeon encounters reserve a limited daily entry.

import {
  dungeonAdmissionKind,
  MIR4_DUNGEON_TICKET_POLICY,
  mir4DungeonIdForQuest,
  mir4StoryDungeonIdForQuest,
} from './dungeon_access_policy';

const DAY_MS = 24 * 60 * 60 * 1_000;
const RESET_OFFSET_MS =
  (MIR4_DUNGEON_TICKET_POLICY.resetHour * 60 + MIR4_DUNGEON_TICKET_POLICY.resetMinute) * 60 * 1_000;

export interface Mir4DungeonTicketState {
  ticketType: 3;
  count: number;
  /** Most recent daily reset boundary applied to this wallet. */
  resetAtMs: number;
}

export interface Mir4DungeonAdmission {
  ok: boolean;
  source: 'story-bound' | 'daily';
  dungeonId: number | null;
  state: Mir4DungeonTicketState | undefined;
}

function resetBoundaryAt(nowMs: number): number {
  const safeNow = Number.isFinite(nowMs) ? Math.max(0, nowMs) : 0;
  const boundary = Math.floor((safeNow - RESET_OFFSET_MS) / DAY_MS) * DAY_MS + RESET_OFFSET_MS;
  return Math.max(0, boundary);
}

export function sanitizeMir4DungeonTickets(value: unknown): Mir4DungeonTicketState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (candidate.ticketType !== MIR4_DUNGEON_TICKET_POLICY.ticketType) return undefined;
  if (typeof candidate.count !== 'number' || !Number.isFinite(candidate.count)) return undefined;
  if (typeof candidate.resetAtMs !== 'number' || !Number.isFinite(candidate.resetAtMs)) {
    return undefined;
  }
  return {
    ticketType: MIR4_DUNGEON_TICKET_POLICY.ticketType,
    count: Math.max(
      0,
      Math.min(MIR4_DUNGEON_TICKET_POLICY.defaultMax, Math.floor(candidate.count)),
    ),
    resetAtMs: Math.max(0, Math.floor(candidate.resetAtMs)),
  };
}

export function currentMir4DungeonTickets(state: unknown, nowMs: number): Mir4DungeonTicketState {
  const boundary = resetBoundaryAt(nowMs);
  const current = sanitizeMir4DungeonTickets(state);
  if (!current || current.resetAtMs < boundary) {
    return {
      ticketType: MIR4_DUNGEON_TICKET_POLICY.ticketType,
      count: MIR4_DUNGEON_TICKET_POLICY.defaultMax,
      resetAtMs: boundary,
    };
  }
  return current;
}

export function reserveMir4DungeonAdmission(
  questId: string,
  state: unknown,
  nowMs: number,
): Mir4DungeonAdmission {
  const dungeonId = mir4DungeonIdForQuest(questId);
  if (dungeonId === null || dungeonAdmissionKind(dungeonId) !== 'mir4-ticketed') {
    return {
      ok: false,
      source: 'daily',
      dungeonId,
      state: sanitizeMir4DungeonTickets(state),
    };
  }
  // The first story clear is supplied by the quest itself. Main progression
  // therefore remains gated by combat power, never by a daily ticket timer.
  if (mir4StoryDungeonIdForQuest(questId) !== null) {
    return {
      ok: true,
      source: 'story-bound',
      dungeonId,
      state: sanitizeMir4DungeonTickets(state),
    };
  }

  const current = currentMir4DungeonTickets(state, nowMs);
  if (current.count < MIR4_DUNGEON_TICKET_POLICY.ticketCost) {
    return { ok: false, source: 'daily', dungeonId, state: current };
  }
  return {
    ok: true,
    source: 'daily',
    dungeonId,
    state: {
      ...current,
      count: current.count - MIR4_DUNGEON_TICKET_POLICY.ticketCost,
    },
  };
}
