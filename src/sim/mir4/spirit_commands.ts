// Authoritative Spirit commands for the MIR4 profile. They consume campaign
// ticket balances, use the shared deterministic RNG, and feed the single MIR4
// stat recalculation funnel. No renderer or 2D asset enters this module.

import { mir4SpiritById } from '../content/mir4/spirits_catalog';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import { grantMir4ArcLogicalItem, spendMir4ArcLogicalItems } from './arc_rewards';
import { MIR4_COLLECTION_COMBINE_ALL_LIMIT } from './collection_limits';
import {
  drawMir4Spirit,
  drawMir4SpiritFromGrade,
  isMir4SpiritTicketId,
  MIR4_SPIRIT_PENDING_LIMIT,
  type Mir4SpiritState,
} from './spirits';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';
import { markMir4WireDirty } from './wire_revision';

export type Mir4SpiritCommandResult =
  | {
      ok: true;
      status:
        | 'owned'
        | 'pending-confirmation'
        | 'equipped'
        | 'unequipped'
        | 'confirmed'
        | 'tutorial-fusion';
      spiritId?: string;
      pendingId?: string;
      grade?: number;
      outcome?: 'success' | 'failure';
      batchCount?: number;
      successCount?: number;
      failureCount?: number;
    }
  | {
      ok: false;
      reason:
        | 'wrong-profile'
        | 'unavailable'
        | 'locked'
        | 'not-owned'
        | 'pending-unknown'
        | 'pending-full'
        | 'invalid-grade'
        | 'insufficient-copies';
    };

interface Mir4SpiritCombinationCandidate {
  spiritId: string;
  count: number;
}

function combinationCandidates(
  state: Mir4SpiritState | undefined,
  sourceGrade: number,
): Mir4SpiritCombinationCandidate[] {
  return Object.entries(state?.owned ?? {})
    .filter(([spiritId, count]) => mir4SpiritById(spiritId)?.grade === sourceGrade && count > 0)
    .map(([spiritId, count]) => ({ spiritId, count }))
    .sort((left, right) => {
      if (left.spiritId < right.spiritId) return -1;
      if (left.spiritId > right.spiritId) return 1;
      return 0;
    });
}

function consumeCombinationCopies(
  state: Mir4SpiritState,
  candidates: readonly Mir4SpiritCombinationCandidate[],
  count: number,
): void {
  const owned = state.owned;
  if (!owned) return;
  let remaining = count;
  for (const candidate of candidates) {
    const consumed = Math.min(candidate.count, remaining);
    const next = candidate.count - consumed;
    if (next > 0) owned[candidate.spiritId] = next;
    else delete owned[candidate.spiritId];
    remaining -= consumed;
    if (remaining === 0) break;
  }
}

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
    meta.mir4Codex,
    meta.mir4ArcRewards?.items,
    meta.mir4Training,
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
  ];
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
  meta.mir4Spirits ??= {};
  const state = meta.mir4Spirits;
  if (
    ticketId === 'spirit-ticket-sunset' &&
    (state.pending?.length ?? 0) >= MIR4_SPIRIT_PENDING_LIMIT
  ) {
    return { ok: false, reason: 'pending-full' };
  }

  // The source contract draws grade first and the within-grade Spirit second.
  const spirit = drawMir4Spirit(ticketId, ctx.rng.next(), ctx.rng.next());
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
  const pendingEntries = state.pending;
  const index = pendingEntries?.findIndex((entry) => entry.id === pendingId) ?? -1;
  const pending = index >= 0 ? pendingEntries?.[index] : undefined;
  if (!pendingEntries || !pending) return { ok: false, reason: 'pending-unknown' };
  state.pending = pendingEntries.filter((_, candidate) => candidate !== index);
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

export function confirmAllMir4Spirits(ctx: SimContext, pid: number): Mir4SpiritCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  const state = resolved?.meta.mir4Spirits;
  const pendingEntries = state?.pending;
  if (!resolved || !state || !pendingEntries || pendingEntries.length === 0) {
    return { ok: false, reason: 'pending-unknown' };
  }

  for (const pending of pendingEntries) addOwned(state, pending.spiritId);
  delete state.pending;
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  return { ok: true, status: 'confirmed', batchCount: pendingEntries.length };
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
  const tutorial = resolved.meta.mir4ArcQuests?.['M10-Q03'];
  if (tutorial?.state === 'active' && tutorial.stageIndex === 4) {
    const spent = spendMir4ArcLogicalItems(
      resolved.meta,
      4,
      (itemId) => itemId === 'bound-spirit-replica',
    );
    if (!spent) return { ok: false, reason: 'insufficient-copies' };
    const success = ctx.rng.next() < 0.2;
    if (!success) grantMir4ArcLogicalItem(resolved.meta, 'bound-spirit-replica', 1);
    markMir4WireDirty(resolved.meta);
    creditMir4ArcTutorialReceipt(resolved.meta, { kind: 'combine-spirit' });
    return {
      ok: true,
      status: 'tutorial-fusion',
      outcome: success ? 'success' : 'failure',
      grade: sourceGrade,
    };
  }
  const state = resolved.meta.mir4Spirits;
  if (sourceGrade >= 3 && (state?.pending?.length ?? 0) >= MIR4_SPIRIT_PENDING_LIMIT) {
    return { ok: false, reason: 'pending-full' };
  }
  const candidates = combinationCandidates(state, sourceGrade);
  if (candidates.reduce((sum, entry) => sum + entry.count, 0) < 4 || !state?.owned) {
    return { ok: false, reason: 'insufficient-copies' };
  }
  consumeCombinationCopies(state, candidates, 4);
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

export function combineAllMir4Spirits(
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
  const tutorial = resolved.meta.mir4ArcQuests?.['M10-Q03'];
  if (tutorial?.state === 'active' && tutorial.stageIndex === 4) {
    return { ok: false, reason: 'unavailable' };
  }

  const state = resolved.meta.mir4Spirits;
  const candidates = combinationCandidates(state, sourceGrade);
  const ownedAttempts = Math.floor(candidates.reduce((sum, entry) => sum + entry.count, 0) / 4);
  if (ownedAttempts < 1 || !state?.owned) return { ok: false, reason: 'insufficient-copies' };
  if (ownedAttempts > MIR4_COLLECTION_COMBINE_ALL_LIMIT) {
    return { ok: false, reason: 'unavailable' };
  }
  const availablePending = Math.max(0, MIR4_SPIRIT_PENDING_LIMIT - (state.pending?.length ?? 0));
  const attempts = sourceGrade < 3 ? ownedAttempts : Math.min(ownedAttempts, availablePending);
  if (attempts < 1) return { ok: false, reason: 'pending-full' };

  consumeCombinationCopies(state, candidates, attempts * 4);
  if (state.equippedSpiritId && (state.owned[state.equippedSpiritId] ?? 0) < 1) {
    delete state.equippedSpiritId;
  }

  let successCount = 0;
  let failureCount = 0;
  let best: Extract<Mir4SpiritCommandResult, { ok: true }> | undefined;
  for (let index = 0; index < attempts; index += 1) {
    const success = ctx.rng.next() < 0.2;
    if (success) successCount += 1;
    else failureCount += 1;
    const reward = drawMir4SpiritFromGrade(success ? sourceGrade + 1 : sourceGrade, ctx.rng.next());
    const granted = queueOrOwn(state, pid, reward.id);
    if (!best || (granted.grade ?? 0) > (best.grade ?? 0)) best = granted;
  }
  if (!best) return { ok: false, reason: 'unavailable' };

  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  creditMir4ArcTutorialReceipt(resolved.meta, { kind: 'combine-spirit' });
  return {
    ...best,
    outcome: successCount > 0 ? 'success' : 'failure',
    batchCount: attempts,
    successCount,
    failureCount,
  };
}
