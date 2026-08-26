// Pure projection for the dedicated MIR4 Spirit collection surface. Gameplay
// remains authoritative in sim/mir4/spirits; this module owns no DOM or command.

import { MIR4_SPIRITS_CATALOG } from '../sim/content/mir4/spirits_catalog';
import type { Mir4AlbumAward, Mir4AlbumBonuses } from '../sim/mir4/collection_album';
import { MIR4_COLLECTION_COMBINE_ALL_LIMIT } from '../sim/mir4/collection_limits';
import {
  isMir4SpiritTicketId,
  MIR4_SPIRIT_ALBUM_MAX_BONUSES,
  MIR4_SPIRIT_PENDING_LIMIT,
  type Mir4SpiritSpecialSkill,
  type Mir4SpiritTicketId,
  mir4SpiritAlbumAward,
  mir4SpiritAlbumBonuses,
  mir4SpiritOwnedCount,
  mir4SpiritSpecialSkill,
} from '../sim/mir4/spirits';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';

export type Mir4SpiritCodexStatus =
  | 'undiscovered'
  | 'discovered'
  | 'owned'
  | 'equipped'
  | 'pending';

export interface Mir4SpiritCodexEntryView {
  spiritId: string;
  grade: number;
  gradeKey: string;
  status: Mir4SpiritCodexStatus;
  count: number;
  pendingId: string | null;
  stats: Readonly<Record<string, number>>;
  skill: Mir4SpiritSpecialSkill;
}

export interface Mir4SpiritCodexTicketView {
  ticketId: Mir4SpiritTicketId;
  count: number;
  pendingCapacity: number | null;
}

export interface Mir4SpiritCodexCombinationView {
  grade: number;
  owned: number;
  attempts: number;
  combineAllAttempts: number;
}

export interface Mir4SpiritCodexConfirmationView {
  pendingId: string;
  spiritId: string;
  grade: number;
  gradeKey: string;
  albumAward: Mir4AlbumAward | null;
}

export interface Mir4SpiritCodexAlbumView {
  discovered: number;
  total: number;
  current: Mir4AlbumBonuses;
  maximum: Mir4AlbumBonuses;
}

export interface Mir4SpiritCodexView {
  entries: readonly Mir4SpiritCodexEntryView[];
  selected: Mir4SpiritCodexEntryView | null;
  tickets: readonly Mir4SpiritCodexTicketView[];
  combinations: readonly Mir4SpiritCodexCombinationView[];
  confirmations: readonly Mir4SpiritCodexConfirmationView[];
  album: Mir4SpiritCodexAlbumView;
  pendingCapacity: number;
}

export function buildMir4SpiritCodexView(
  state: Readonly<Mir4PlayerUiState>,
  preferredSpiritId?: string | null,
): Mir4SpiritCodexView {
  const spirits = state.mir4Spirits;
  const discovered = new Set(spirits?.discovered ?? []);
  const pendingBySpirit = new Map((spirits?.pending ?? []).map((entry) => [entry.spiritId, entry]));
  const entries = MIR4_SPIRITS_CATALOG.map((spirit): Mir4SpiritCodexEntryView => {
    const count = spirits?.owned?.[spirit.id] ?? 0;
    const pending = pendingBySpirit.get(spirit.id);
    const status: Mir4SpiritCodexStatus = pending
      ? 'pending'
      : spirits?.equippedSpiritId === spirit.id
        ? 'equipped'
        : count > 0
          ? 'owned'
          : discovered.has(spirit.id)
            ? 'discovered'
            : 'undiscovered';
    const skill = mir4SpiritSpecialSkill(spirit.id);
    if (!skill) throw new Error(`Missing MIR4 special skill for spirit ${spirit.id}`);
    return {
      spiritId: spirit.id,
      grade: spirit.grade,
      gradeKey: spirit.gradeKey,
      status,
      count,
      pendingId: pending?.id ?? null,
      stats: spirit.stats,
      skill,
    };
  });
  const preferred = entries.find((entry) => entry.spiritId === preferredSpiritId);
  const selected =
    preferred ??
    entries.find((entry) => entry.status === 'equipped') ??
    entries.find((entry) => entry.status === 'pending') ??
    entries.find((entry) => entry.status === 'owned') ??
    entries[0] ??
    null;
  const pendingCapacity = Math.max(0, MIR4_SPIRIT_PENDING_LIMIT - (spirits?.pending?.length ?? 0));
  const tickets = Object.entries(state.mir4ArcRewards?.tickets ?? {})
    .filter(
      (entry): entry is [Mir4SpiritTicketId, number] =>
        isMir4SpiritTicketId(entry[0]) && entry[1] > 0,
    )
    .map(([ticketId, count]) => ({
      ticketId,
      count,
      pendingCapacity: ticketId === 'spirit-ticket-sunset' ? pendingCapacity : null,
    }));
  const combinations = [1, 2, 3, 4, 5].map((grade) => {
    const owned = mir4SpiritOwnedCount(spirits, grade);
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
  const confirmations = (spirits?.pending ?? []).flatMap((pending) => {
    const spirit = MIR4_SPIRITS_CATALOG.find((candidate) => candidate.id === pending.spiritId);
    if (!spirit) return [];
    // Any unconfirmed copy can be chosen first. Only an already-discovered
    // identity is truthfully a duplicate at render time.
    const albumAward = discovered.has(spirit.id) ? null : mir4SpiritAlbumAward(spirit.id);
    return [
      {
        pendingId: pending.id,
        spiritId: spirit.id,
        grade: spirit.grade,
        gradeKey: spirit.gradeKey,
        albumAward,
      },
    ];
  });
  const album = {
    discovered: MIR4_SPIRITS_CATALOG.filter((spirit) => discovered.has(spirit.id)).length,
    total: MIR4_SPIRITS_CATALOG.length,
    current: mir4SpiritAlbumBonuses(spirits),
    maximum: MIR4_SPIRIT_ALBUM_MAX_BONUSES,
  };
  return { entries, selected, tickets, combinations, confirmations, album, pendingCapacity };
}
