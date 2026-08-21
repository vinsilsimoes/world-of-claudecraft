// Authoritative Spirit commands for the MIR4 profile. They consume campaign
// ticket balances, use the shared deterministic RNG, and feed the single MIR4
// stat recalculation funnel. No renderer or 2D asset enters this module.

import { mir4SpiritById } from '../content/mir4/spirits_catalog';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import {
  drawMir4Spirit,
  drawMir4SpiritFromGrade,
  isMir4SpiritTicketId,
  type Mir4SpiritState,
} from './spirits';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';
import { markMir4WireDirty } from './wire_revision';

export type Mir4SpiritCommandResult =
  | {
      ok: true;
      status: 'owned' | 'pending-confirmation' | 'equipped' | 'unequipped' | 'confirmed';
      spiritId?: string;
      pendingId?: string;
      grade?: number;
      outcome?: 'success' | 'failure';
    }
  | {
      ok: false;
      reason:
        | 'wrong-profile'
        | 'unavailable'
        | 'locked'
        | 'not-owned'
        | 'pending-unknown'
        | 'invalid-grade'
        | 'insufficient-copies';
    };

function recalcFor(ctx: SimContext, pid: number): void {
  const resolved = ctx.resolve(pid);
  if (!resolved) return;
  const { meta, e: entity } = resolved;
  recalcMir4PlayerStats(
    entity,
    mir4RecalcClassOf(entity),
    entity.level,
    meta.mir4Equipment,
    meta.mir4EquipmentInstances,
    meta.mir4Spirits,
    meta.mir4Mounts,
  );
}

function addOwned(state: Mir4SpiritState, spiritId: string): void {
  state.owned ??= {};
  state.owned[spiritId] = (state.owned[spiritId] ?? 0) + 1;
  state.discovered = [...new Set([...(state.discovered ?? []), spiritId])];
}

function queueOrOwn(
  state: Mir4SpiritState,
  pid: number,
  spiritId: string,
): Extract<Mir4SpiritCommandResult, { ok: true }> {
  const spirit = mir4SpiritById(spiritId);
  if (!spirit) throw new Error(`unknown MIR4 Spirit ${spiritId}`);
  if (spirit.grade < 4) {
    addOwned(state, spirit.id);
    return { ok: true, status: 'owned', spiritId: spirit.id, grade: spirit.grade };
  }
  const serial = Math.max(1, Math.floor(state.nextPendingId ?? 1));
  state.nextPendingId = serial + 1;
  const pendingId = `spirit-pending-${pid}-${serial}`;
  state.pending = [
    ...(state.pending ?? []),
    { id: pendingId, spiritId: spirit.id, grade: spirit.grade },
  ].slice(-64);
  return {
    ok: true,
    status: 'pending-confirmation',
    pendingId,
    spiritId: spirit.id,
    grade: spirit.grade,
  };
}

export function summonMir4Spirit(
  ctx: SimContext,
  pid: number,
  ticketId: string,
): Mir4SpiritCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  if (!resolved || !isMir4SpiritTicketId(ticketId)) return { ok: false, reason: 'unavailable' };
  const { meta } = resolved;
  if (!meta.mir4ArcRewards?.systems?.includes('spirit-summon')) {
    return { ok: false, reason: 'locked' };
  }
  const balance = meta.mir4ArcRewards.tickets?.[ticketId] ?? 0;
  if (balance < 1) return { ok: false, reason: 'unavailable' };

  // The source contract draws grade first and the within-grade Spirit second.
  const spirit = drawMir4Spirit(ticketId, ctx.rng.next(), ctx.rng.next());
  meta.mir4Spirits ??= {};
  const state = meta.mir4Spirits;
  const result = queueOrOwn(state, pid, spirit.id);
  const tickets = meta.mir4ArcRewards.tickets;
  if (balance === 1) delete tickets?.[ticketId];
  else if (tickets) tickets[ticketId] = balance - 1;
  if (tickets && Object.keys(tickets).length === 0) delete meta.mir4ArcRewards.tickets;
  if (result.status === 'owned') recalcFor(ctx, pid);
  markMir4WireDirty(meta);
  return result;
}

export function confirmMir4Spirit(
  ctx: SimContext,
  pid: number,
  pendingId: string,
): Mir4SpiritCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  const state = resolved?.meta.mir4Spirits;
  if (!resolved || !state || typeof pendingId !== 'string') {
    return { ok: false, reason: 'pending-unknown' };
  }
  const index = state.pending?.findIndex((entry) => entry.id === pendingId) ?? -1;
  if (index < 0) return { ok: false, reason: 'pending-unknown' };
  const pending = state.pending![index]!;
  state.pending = state.pending!.filter((_, candidate) => candidate !== index);
  if (state.pending.length === 0) delete state.pending;
  addOwned(state, pending.spiritId);
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  return {
    ok: true,
    status: 'confirmed',
    spiritId: pending.spiritId,
    grade: pending.grade,
  };
}

export function equipMir4Spirit(
  ctx: SimContext,
  pid: number,
  spiritId: string | null,
): Mir4SpiritCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  if (!resolved) return { ok: false, reason: 'unavailable' };
  resolved.meta.mir4Spirits ??= {};
  const state = resolved.meta.mir4Spirits;
  if (spiritId !== null && (!mir4SpiritById(spiritId) || (state.owned?.[spiritId] ?? 0) < 1)) {
    return { ok: false, reason: 'not-owned' };
  }
  if (spiritId === null) delete state.equippedSpiritId;
  else state.equippedSpiritId = spiritId;
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  if (spiritId !== null) creditMir4ArcTutorialReceipt(resolved.meta, { kind: 'equip-spirit' });
  return {
    ok: true,
    status: spiritId === null ? 'unequipped' : 'equipped',
    ...(spiritId ? { spiritId } : {}),
  };
}

export function combineMir4Spirits(
  ctx: SimContext,
  pid: number,
  sourceGrade: number,
): Mir4SpiritCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  if (!Number.isInteger(sourceGrade) || sourceGrade < 1 || sourceGrade > 5) {
    return { ok: false, reason: 'invalid-grade' };
  }
  const resolved = ctx.resolve(pid);
  if (!resolved) return { ok: false, reason: 'unavailable' };
  if (!resolved.meta.mir4ArcRewards?.systems?.includes('spirit-summon')) {
    return { ok: false, reason: 'locked' };
  }
  const state = resolved.meta.mir4Spirits;
  const candidates = Object.entries(state?.owned ?? {})
    .map(([spiritId, count]) => ({ spirit: mir4SpiritById(spiritId), count }))
    .filter((entry) => entry.spirit?.grade === sourceGrade && entry.count > 0)
    .sort((left, right) => left.spirit!.id.localeCompare(right.spirit!.id));
  if (candidates.reduce((sum, entry) => sum + entry.count, 0) < 4 || !state?.owned) {
    return { ok: false, reason: 'insufficient-copies' };
  }
  let remaining = 4;
  for (const candidate of candidates) {
    const consumed = Math.min(candidate.count, remaining);
    const next = candidate.count - consumed;
    if (next > 0) state.owned[candidate.spirit!.id] = next;
    else delete state.owned[candidate.spirit!.id];
    remaining -= consumed;
    if (remaining === 0) break;
  }
  if (state.equippedSpiritId && (state.owned[state.equippedSpiritId] ?? 0) < 1) {
    delete state.equippedSpiritId;
  }
  const success = ctx.rng.next() < 0.2;
  const reward = drawMir4SpiritFromGrade(success ? sourceGrade + 1 : sourceGrade, ctx.rng.next());
  const granted = queueOrOwn(state, pid, reward.id);
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  creditMir4ArcTutorialReceipt(resolved.meta, { kind: 'combine-spirit' });
  return { ...granted, outcome: success ? 'success' : 'failure' };
}
