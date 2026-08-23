// Authoritative MIR4 Mount commands. Logical collection/progression is source
// gameplay; equip delegates appearance and riding to the existing native WoC
// reins/model runtime.

import { bagsFullError } from '../bags';
import { mir4MountById } from '../content/mir4/mounts_catalog';
import { MIR4_GAME_PROFILE } from '../game_profile';
import { forceDismount, mountItemId, mountOwned, summonMountItem } from '../mounts';
import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import {
  drawMir4Mount,
  drawMir4MountFromGrade,
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
        | 'insufficient-copies'
        | 'bags-full'
        | 'summon-blocked';
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
  ].slice(-64);
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
  const mount = drawMir4Mount(ticketId, ctx.rng.next(), ctx.rng.next());
  meta.mir4Mounts ??= {};
  const state = meta.mir4Mounts;
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
  const index = state?.pending?.findIndex((entry) => entry.id === pendingId) ?? -1;
  if (!resolved || !state || index < 0) return { ok: false, reason: 'pending-unknown' };
  const pending = state.pending![index]!;
  state.pending = state.pending!.filter((_, candidate) => candidate !== index);
  if (state.pending.length === 0) delete state.pending;
  addOwned(state, pending.mountId);
  recalcFor(ctx, pid);
  markMir4WireDirty(resolved.meta);
  return { ok: true, status: 'confirmed', mountId: pending.mountId, grade: pending.grade };
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
  const state = resolved.meta.mir4Mounts;
  const candidates = Object.entries(state?.owned ?? {})
    .map(([mountId, count]) => ({ mount: mir4MountById(mountId), count }))
    .filter((entry) => entry.mount?.grade === sourceGrade && entry.count > 0)
    .sort((left, right) => left.mount!.id.localeCompare(right.mount!.id));
  if (!state?.owned || candidates.reduce((sum, entry) => sum + entry.count, 0) < 4) {
    return { ok: false, reason: 'insufficient-copies' };
  }
  let remaining = 4;
  for (const candidate of candidates) {
    const consumed = Math.min(candidate.count, remaining);
    const next = candidate.count - consumed;
    if (next > 0) state.owned[candidate.mount!.id] = next;
    else delete state.owned[candidate.mount!.id];
    remaining -= consumed;
    if (remaining === 0) break;
  }
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
