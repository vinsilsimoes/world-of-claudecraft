// Authoritative MIR4 Mount commands. Logical collection/progression is source
// gameplay; equip delegates appearance and riding to the existing native WoC
// reins/model runtime.

import { bagsFullError } from '../bags';
import { mir4MountById } from '../content/mir4/mounts_catalog';
import { MIR4_GAME_PROFILE } from '../game_profile';
import { forceDismount, mountItemId, mountOwned, summonMountItem } from '../mounts';
import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import { MIR4_COLLECTION_COMBINE_ALL_LIMIT } from './collection_limits';
import {
  drawMir4Mount,
  drawMir4MountFromGrade,
  MIR4_MOUNT_PENDING_LIMIT,
  type Mir4MountState,
  type Mir4MountTicketId,
  mir4MountVisualKey,
} from './mounts';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';
import { markMir4WireDirty } from './wire_revision';

export type Mir4MountCommandResult =
  | {
      ok: true;
      status: 'owned' | 'pending-confirmation' | 'confirmed' | 'equipped' | 'unequipped';
      mountId?: string;
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
        | 'insufficient-copies'
        | 'bags-full'
        | 'summon-blocked';
    };

interface Mir4MountCombinationCandidate {
  mountId: string;
  count: number;
}

function combinationCandidates(
  state: Mir4MountState | undefined,
  sourceGrade: number,
): Mir4MountCombinationCandidate[] {
  return Object.entries(state?.owned ?? {})
    .filter(([mountId, count]) => mir4MountById(mountId)?.grade === sourceGrade && count > 0)
    .map(([mountId, count]) => ({ mountId, count }))
    .sort((left, right) => {
      if (left.mountId < right.mountId) return -1;
      if (left.mountId > right.mountId) return 1;
      return 0;
    });
}

function consumeCombinationCopies(
  state: Mir4MountState,
  candidates: readonly Mir4MountCombinationCandidate[],
  count: number,
): void {
  const owned = state.owned;
  if (!owned) return;
  let remaining = count;
  for (const candidate of candidates) {
    const consumed = Math.min(candidate.count, remaining);
    const next = candidate.count - consumed;
    if (next > 0) owned[candidate.mountId] = next;
    else delete owned[candidate.mountId];
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

function addOwned(state: Mir4MountState, mountId: string): void {
  state.owned ??= {};
  state.owned[mountId] = (state.owned[mountId] ?? 0) + 1;
  state.discovered = [...new Set([...(state.discovered ?? []), mountId])];
}

function queueOrOwn(
  state: Mir4MountState,
  pid: number,
  mountId: string,
): Extract<Mir4MountCommandResult, { ok: true }> {
  const mount = mir4MountById(mountId);
  if (!mount) throw new Error(`unknown MIR4 Mount ${mountId}`);
  if (mount.grade < 4) {
    addOwned(state, mount.id);
    return { ok: true, status: 'owned', mountId: mount.id, grade: mount.grade };
  }
  const serial = Math.max(1, Math.floor(state.nextPendingId ?? 1));
  state.nextPendingId = serial + 1;
  const pendingId = `mount-pending-${pid}-${serial}`;
  state.pending = [
    ...(state.pending ?? []),
    {
      id: pendingId,
      mountId: mount.id,
      grade: mount.grade,
    },
  ];
  return {
    ok: true,
    status: 'pending-confirmation',
    pendingId,
    mountId: mount.id,
    grade: mount.grade,
  };
}

export function redeemMir4MountTicket(
  ctx: SimContext,
  pid: number,
  ticketId: Mir4MountTicketId,
): Mir4MountCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  if (!resolved) return { ok: false, reason: 'unavailable' };
  const { meta } = resolved;
  if (!meta.mir4ArcRewards?.systems?.includes('mount-summon')) {
    return { ok: false, reason: 'locked' };
  }
  const balance = meta.mir4ArcRewards.tickets?.[ticketId] ?? 0;
  if (balance < 1) return { ok: false, reason: 'unavailable' };
  meta.mir4Mounts ??= {};
  const state = meta.mir4Mounts;
  if (
    ticketId === 'mount-ticket-twilight' &&
    (state.pending?.length ?? 0) >= MIR4_MOUNT_PENDING_LIMIT
  ) {
    return { ok: false, reason: 'pending-full' };
  }
  const mount = drawMir4Mount(ticketId, ctx.rng.next(), ctx.rng.next());
  const result = queueOrOwn(state, pid, mount.id);
  const tickets = meta.mir4ArcRewards.tickets;
  if (balance === 1) delete tickets?.[ticketId];
  else if (tickets) tickets[ticketId] = balance - 1;
  if (tickets && Object.keys(tickets).length === 0) delete meta.mir4ArcRewards.tickets;
  meta.ridingTrained = true;
  if (result.status === 'owned') recalcFor(ctx, pid);
  markMir4WireDirty(meta);
  return result;
}

export function confirmMir4Mount(
  ctx: SimContext,
  pid: number,
  pendingId: string,
): Mir4MountCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  const state = resolved?.meta.mir4Mounts;
  const pendingEntries = state?.pending;
  const index = pendingEntries?.findIndex((entry) => entry.id === pendingId) ?? -1;
  const pending = index >= 0 ? pendingEntries?.[index] : undefined;
  if (!resolved || !state || !pendingEntries || !pending) {
    return { ok: false, reason: 'pending-unknown' };
  }
  state.pending = pendingEntries.filter((_, candidate) => candidate !== index);
  if (state.pending.length === 0) delete state.pending;
  addOwned(state, pending.mountId);
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  return { ok: true, status: 'confirmed', mountId: pending.mountId, grade: pending.grade };
}

export function confirmAllMir4Mounts(ctx: SimContext, pid: number): Mir4MountCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  const state = resolved?.meta.mir4Mounts;
  const pendingEntries = state?.pending;
  if (!resolved || !state || !pendingEntries || pendingEntries.length === 0) {
    return { ok: false, reason: 'pending-unknown' };
  }

  for (const pending of pendingEntries) addOwned(state, pending.mountId);
  delete state.pending;
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  return { ok: true, status: 'confirmed', batchCount: pendingEntries.length };
}

export function equipMir4Mount(
  ctx: SimContext,
  pid: number,
  mountId: string | null,
): Mir4MountCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  const resolved = ctx.resolve(pid);
  if (!resolved) return { ok: false, reason: 'unavailable' };
  const { meta, e: entity } = resolved;
  meta.mir4Mounts ??= {};
  const state = meta.mir4Mounts;
  if (mountId === null) {
    delete state.equippedMountId;
    forceDismount(ctx, entity);
    recalcFor(ctx, pid);
    markMir4WireDirty(meta);
    return { ok: true, status: 'unequipped' };
  }
  const mount = mir4MountById(mountId);
  if (!mount || (state.owned?.[mountId] ?? 0) < 1) return { ok: false, reason: 'not-owned' };
  const visualKey = mir4MountVisualKey(mountId);
  const visualItemId = mountItemId(visualKey);
  if (!visualItemId) return { ok: false, reason: 'unavailable' };
  let mintedNativeReins = false;
  if (!mountOwned(meta, visualKey)) {
    if (!ctx.canAddItem(visualItemId, 1, pid)) {
      bagsFullError(ctx, pid);
      return { ok: false, reason: 'bags-full' };
    }
    // The native reins is only a bound presentation handle. Logical ownership
    // remains in mir4Mounts, so this shell must never be tradeable or mint a
    // second player's collection entry.
    ctx.addItemInstance(visualItemId, { boundTo: pid }, pid);
    mintedNativeReins = true;
  }
  if (entity.mountKey !== visualKey && !summonMountItem(ctx, pid, visualKey)) {
    // The reins is a presentation handle, not the logical Mount reward. A
    // blocked summon must remain atomic: if this command minted the handle,
    // remove that exact first copy before reporting failure.
    if (mintedNativeReins) ctx.removeItem(visualItemId, 1, pid);
    return { ok: false, reason: 'summon-blocked' };
  }
  state.equippedMountId = mountId;
  recalcFor(ctx, pid);
  creditMir4ArcTutorialReceipt(meta, { kind: 'summon-mount' });
  markMir4WireDirty(meta);
  return { ok: true, status: 'equipped', mountId, grade: mount.grade };
}

export function combineMir4Mounts(
  ctx: SimContext,
  pid: number,
  sourceGrade: number,
): Mir4MountCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  if (!Number.isInteger(sourceGrade) || sourceGrade < 1 || sourceGrade > 5) {
    return { ok: false, reason: 'invalid-grade' };
  }
  const resolved = ctx.resolve(pid);
  if (!resolved) return { ok: false, reason: 'unavailable' };
  if (!resolved.meta.mir4ArcRewards?.systems?.includes('mount-summon')) {
    return { ok: false, reason: 'locked' };
  }
  const state = resolved.meta.mir4Mounts;
  if (sourceGrade >= 3 && (state?.pending?.length ?? 0) >= MIR4_MOUNT_PENDING_LIMIT) {
    return { ok: false, reason: 'pending-full' };
  }
  const candidates = combinationCandidates(state, sourceGrade);
  if (!state?.owned || candidates.reduce((sum, entry) => sum + entry.count, 0) < 4) {
    return { ok: false, reason: 'insufficient-copies' };
  }
  consumeCombinationCopies(state, candidates, 4);
  if (state.equippedMountId && (state.owned[state.equippedMountId] ?? 0) < 1) {
    delete state.equippedMountId;
    forceDismount(ctx, resolved.e);
  }
  const success = ctx.rng.next() < 0.2;
  const reward = drawMir4MountFromGrade(success ? sourceGrade + 1 : sourceGrade, ctx.rng.next());
  const granted = queueOrOwn(state, pid, reward.id);
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  return { ...granted, outcome: success ? 'success' : 'failure' };
}

export function combineAllMir4Mounts(
  ctx: SimContext,
  pid: number,
  sourceGrade: number,
): Mir4MountCommandResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return { ok: false, reason: 'wrong-profile' };
  if (!Number.isInteger(sourceGrade) || sourceGrade < 1 || sourceGrade > 5) {
    return { ok: false, reason: 'invalid-grade' };
  }
  const resolved = ctx.resolve(pid);
  if (!resolved) return { ok: false, reason: 'unavailable' };
  if (!resolved.meta.mir4ArcRewards?.systems?.includes('mount-summon')) {
    return { ok: false, reason: 'locked' };
  }

  const state = resolved.meta.mir4Mounts;
  const candidates = combinationCandidates(state, sourceGrade);
  const ownedAttempts = Math.floor(candidates.reduce((sum, entry) => sum + entry.count, 0) / 4);
  if (ownedAttempts < 1 || !state?.owned) return { ok: false, reason: 'insufficient-copies' };
  if (ownedAttempts > MIR4_COLLECTION_COMBINE_ALL_LIMIT) {
    return { ok: false, reason: 'unavailable' };
  }
  const availablePending = Math.max(0, MIR4_MOUNT_PENDING_LIMIT - (state.pending?.length ?? 0));
  const attempts = sourceGrade < 3 ? ownedAttempts : Math.min(ownedAttempts, availablePending);
  if (attempts < 1) return { ok: false, reason: 'pending-full' };

  consumeCombinationCopies(state, candidates, attempts * 4);
  if (state.equippedMountId && (state.owned[state.equippedMountId] ?? 0) < 1) {
    delete state.equippedMountId;
    forceDismount(ctx, resolved.e);
  }

  let successCount = 0;
  let failureCount = 0;
  let best: Extract<Mir4MountCommandResult, { ok: true }> | undefined;
  for (let index = 0; index < attempts; index += 1) {
    const success = ctx.rng.next() < 0.2;
    if (success) successCount += 1;
    else failureCount += 1;
    const reward = drawMir4MountFromGrade(success ? sourceGrade + 1 : sourceGrade, ctx.rng.next());
    const granted = queueOrOwn(state, pid, reward.id);
    if (!best || (granted.grade ?? 0) > (best.grade ?? 0)) best = granted;
  }
  if (!best) return { ok: false, reason: 'unavailable' };

  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  return {
    ...best,
    outcome: successCount > 0 ? 'success' : 'failure',
    batchCount: attempts,
    successCount,
    failureCount,
  };
}
