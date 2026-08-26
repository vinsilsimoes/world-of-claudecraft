// Pure projection for the dedicated MIR4 Mount collection surface. Gameplay
// remains authoritative in sim/mir4/mounts; this module owns no DOM or command.

import { MIR4_MOUNTS_CATALOG } from '../sim/content/mir4/mounts_catalog';
import type { Mir4AlbumAward, Mir4AlbumBonuses } from '../sim/mir4/collection_album';
import { MIR4_COLLECTION_COMBINE_ALL_LIMIT } from '../sim/mir4/collection_limits';
import { isMir4MountTicketId } from '../sim/mir4/collection_tickets';
import {
  MIR4_MOUNT_ALBUM_MAX_BONUSES,
  MIR4_MOUNT_PENDING_LIMIT,
  type Mir4MountTicketId,
  mir4MountAlbumAward,
  mir4MountAlbumBonuses,
  mir4MountOwnedCount,
  mir4MountRuntimeStats,
} from '../sim/mir4/mounts';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';

export type Mir4MountCodexStatus = 'undiscovered' | 'discovered' | 'owned' | 'equipped' | 'pending';

export interface Mir4MountCodexEntryView {
  mountId: string;
  grade: number;
  gradeKey: string;
  status: Mir4MountCodexStatus;
  count: number;
  pendingId: string | null;
  stats: Readonly<{
    moveSpeedBps: number;
    basicAttackSpeedBps: number;
    physicalDefense: number;
    magicDefense: number;
  }>;
}

export interface Mir4MountCodexTicketView {
  ticketId: Mir4MountTicketId;
  count: number;
  pendingCapacity: number | null;
}

export interface Mir4MountCodexCombinationView {
  grade: number;
  owned: number;
  attempts: number;
  combineAllAttempts: number;
}

export interface Mir4MountCodexConfirmationView {
  pendingId: string;
  mountId: string;
  grade: number;
  gradeKey: string;
  albumAward: Mir4AlbumAward | null;
}

export interface Mir4MountCodexAlbumView {
  discovered: number;
  total: number;
  current: Mir4AlbumBonuses;
  maximum: Mir4AlbumBonuses;
}

export interface Mir4MountCodexView {
  entries: readonly Mir4MountCodexEntryView[];
  selected: Mir4MountCodexEntryView | null;
  tickets: readonly Mir4MountCodexTicketView[];
  combinations: readonly Mir4MountCodexCombinationView[];
  confirmations: readonly Mir4MountCodexConfirmationView[];
  album: Mir4MountCodexAlbumView;
  pendingCapacity: number;
}

export function buildMir4MountCodexView(
  state: Readonly<Mir4PlayerUiState>,
  preferredMountId?: string | null,
): Mir4MountCodexView {
  const mounts = state.mir4Mounts;
  const discovered = new Set(mounts?.discovered ?? []);
  const pendingByMount = new Map((mounts?.pending ?? []).map((entry) => [entry.mountId, entry]));
  const entries = MIR4_MOUNTS_CATALOG.map((mount): Mir4MountCodexEntryView => {
    const count = mounts?.owned?.[mount.id] ?? 0;
    const pending = pendingByMount.get(mount.id);
    const status: Mir4MountCodexStatus = pending
      ? 'pending'
      : mounts?.equippedMountId === mount.id
        ? 'equipped'
        : count > 0
          ? 'owned'
          : discovered.has(mount.id)
            ? 'discovered'
            : 'undiscovered';
    return {
      mountId: mount.id,
      grade: mount.grade,
      gradeKey: mount.gradeKey,
      status,
      count,
      pendingId: pending?.id ?? null,
      stats: mir4MountRuntimeStats(mount),
    };
  });
  const preferred = entries.find((entry) => entry.mountId === preferredMountId);
  const selected =
    preferred ??
    entries.find((entry) => entry.status === 'equipped') ??
    entries.find((entry) => entry.status === 'pending') ??
    entries.find((entry) => entry.status === 'owned') ??
    entries[0] ??
    null;
  const pendingCapacity = Math.max(0, MIR4_MOUNT_PENDING_LIMIT - (mounts?.pending?.length ?? 0));
  const tickets = Object.entries(state.mir4ArcRewards?.tickets ?? {})
    .filter(
      (entry): entry is [Mir4MountTicketId, number] =>
        isMir4MountTicketId(entry[0]) && entry[1] > 0,
    )
    .map(([ticketId, count]) => ({
      ticketId,
      count,
      pendingCapacity: ticketId === 'mount-ticket-twilight' ? pendingCapacity : null,
    }));
  const combinations = [1, 2, 3, 4, 5].map((grade) => {
    const owned = mir4MountOwnedCount(mounts, grade);
    const attempts = Math.floor(owned / 4);
    return {
      grade,
      owned,
      attempts,
      combineAllAttempts:
        attempts > MIR4_COLLECTION_COMBINE_ALL_LIMIT
          ? 0
          : grade < 3
            ? attempts
            : Math.min(attempts, pendingCapacity),
    };
  });
  const confirmations = (mounts?.pending ?? []).flatMap((pending) => {
    const mount = MIR4_MOUNTS_CATALOG.find((candidate) => candidate.id === pending.mountId);
    if (!mount) return [];
    // Every unconfirmed copy of an undiscovered identity can be the first one
    // the player confirms. The next authoritative snapshot relabels remaining
    // copies as duplicates after discovery.
    const albumAward = discovered.has(mount.id) ? null : mir4MountAlbumAward(mount.id);
    return [
      {
        pendingId: pending.id,
        mountId: mount.id,
        grade: mount.grade,
        gradeKey: mount.gradeKey,
        albumAward,
      },
    ];
  });
  const album = {
    discovered: MIR4_MOUNTS_CATALOG.filter((mount) => discovered.has(mount.id)).length,
    total: MIR4_MOUNTS_CATALOG.length,
    current: mir4MountAlbumBonuses(mounts),
    maximum: MIR4_MOUNT_ALBUM_MAX_BONUSES,
  };
  return { entries, selected, tickets, combinations, confirmations, album, pendingCapacity };
}
