// MIR4 Mount progression over native Aeldrune visual shells. The
// 85 logical identities, grades, stats, ticket probabilities and collection
// rules are gameplay data; every rendered/summoned model remains a target-owned
// WoC mount selected deterministically by mir4MountVisualKey.

import {
  MIR4_MOUNTS_CATALOG,
  type Mir4MountDef,
  mir4MountById,
} from '../content/mir4/mounts_catalog';
import type { MountKey } from '../content/mounts';
import {
  type Mir4AlbumAward,
  type Mir4AlbumBonuses,
  mir4AlbumAwardForIndex,
  mir4AlbumBonuses,
} from './collection_album';

export type Mir4MountTicketId = 'mount-ticket-dawn' | 'mount-ticket-twilight';

export interface Mir4MountPending {
  id: string;
  mountId: string;
  grade: number;
}

export interface Mir4MountState {
  owned?: Record<string, number>;
  discovered?: string[];
  equippedMountId?: string;
  pending?: Mir4MountPending[];
  nextPendingId?: number;
}

export type Mir4MountBonuses = Mir4AlbumBonuses & {
  moveSpeedBps: number;
  basicAttackSpeedBps: number;
};

export interface Mir4MountRuntimeStats {
  moveSpeedBps: number;
  basicAttackSpeedBps: number;
  physicalDefense: number;
  magicDefense: number;
}

// Mount confirmation rows include native-shell identity and therefore cost
// more persisted bytes than Spirit rows. 128 still admits every supported
// x100 summon while keeping the combined MIR4 owner snapshot below 128 KiB.
export const MIR4_MOUNT_PENDING_LIMIT = 128;

export const MIR4_MOUNT_MOVE_SPEED_BPS_BY_GRADE: Readonly<Record<number, number>> = {
  1: 1_000,
  2: 1_500,
  3: 2_000,
  4: 2_500,
  5: 5_000,
  6: 8_000,
};

export const MIR4_MOUNT_BASIC_ATTACK_SPEED_BPS_BY_GRADE: Readonly<Record<number, number>> = {
  1: 500,
  2: 1_000,
  3: 1_500,
  4: 2_000,
  5: 3_500,
  6: 5_000,
};

export function mir4MountMoveSpeedBpsForGrade(grade: number): number {
  return MIR4_MOUNT_MOVE_SPEED_BPS_BY_GRADE[grade] ?? 0;
}

export function mir4MountBasicAttackSpeedBpsForGrade(grade: number): number {
  return MIR4_MOUNT_BASIC_ATTACK_SPEED_BPS_BY_GRADE[grade] ?? 0;
}

/** Live balance projection over the preserved, generated source catalog. */
export function mir4MountRuntimeStats(mount: Mir4MountDef): Mir4MountRuntimeStats {
  return {
    ...mount.stats,
    moveSpeedBps: mir4MountMoveSpeedBpsForGrade(mount.grade),
    basicAttackSpeedBps: mir4MountBasicAttackSpeedBpsForGrade(mount.grade),
  };
}

const TICKET_GRADES: Readonly<Record<Mir4MountTicketId, readonly (readonly [number, number])[]>> = {
  'mount-ticket-dawn': [
    [1, 7_900],
    [2, 2_000],
    [3, 100],
  ],
  'mount-ticket-twilight': [
    [3, 9_900],
    [4, 100],
  ],
};

/**
 * Version-1 visual-shell pool. This order is deliberately independent from
 * MOUNT_KEYS: growing or reordering the native WoC catalog must not change the
 * appearance already assigned to any persisted MIR4 Mount identity.
 */
export const MIR4_NATIVE_MOUNT_VISUAL_KEYS = [
  'valorsteed',
  'stormfeather_griffin',
  'shadowjump_toad',
  'grag_bear',
  'stalkglider_snail',
  'aether_hover_cycle',
  'thunderstrut_gobbler',
  'drakemaw_raptor',
] as const satisfies readonly MountKey[];

function hash(value: string): number {
  let out = 2166136261;
  for (let index = 0; index < value.length; index++) {
    out ^= value.charCodeAt(index);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

/** Stable target-native appearance. It has no gameplay authority. */
export function mir4MountVisualKey(mountId: string): MountKey {
  const visual =
    MIR4_NATIVE_MOUNT_VISUAL_KEYS[hash(mountId) % MIR4_NATIVE_MOUNT_VISUAL_KEYS.length];
  if (!visual) throw new Error('MIR4 native Mount visual pool is empty');
  return visual;
}

function gradeForRoll(ticketId: Mir4MountTicketId, roll: number): number {
  const scaled = Math.floor(Math.max(0, Math.min(0.999999999, roll)) * 10_000);
  let cursor = 0;
  for (const [grade, weight] of TICKET_GRADES[ticketId]) {
    cursor += weight;
    if (scaled < cursor) return grade;
  }
  const fallback = TICKET_GRADES[ticketId].at(-1);
  if (!fallback) throw new Error(`MIR4 Mount ticket ${ticketId} has no grade weights`);
  return fallback[0];
}

export function drawMir4Mount(ticketId: Mir4MountTicketId, gradeRoll: number, mountRoll: number) {
  const grade = gradeForRoll(ticketId, gradeRoll);
  return drawMir4MountFromGrade(grade, mountRoll);
}

export function drawMir4MountFromGrade(grade: number, roll: number) {
  const pool = MIR4_MOUNTS_CATALOG.filter((mount) => mount.grade === grade);
  if (pool.length === 0) throw new Error(`no MIR4 Mounts for grade ${grade}`);
  const mount =
    pool[
      Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999999, roll)) * pool.length))
    ];
  if (!mount) throw new Error(`no MIR4 Mount selected for grade ${grade}`);
  return mount;
}

export function mir4MountOwnedCount(state: Mir4MountState | undefined, grade: number): number {
  return Object.entries(state?.owned ?? {}).reduce(
    (sum, [mountId, count]) => sum + (mir4MountById(mountId)?.grade === grade ? count : 0),
    0,
  );
}

export function mir4MountAlbumBonuses(state: Mir4MountState | undefined): Mir4AlbumBonuses {
  return mir4AlbumBonuses(MIR4_MOUNTS_CATALOG, state?.discovered);
}

export const MIR4_MOUNT_ALBUM_MAX_BONUSES = mir4AlbumBonuses(
  MIR4_MOUNTS_CATALOG,
  MIR4_MOUNTS_CATALOG.map((mount) => mount.id),
);

export function mir4MountAlbumAward(mountId: string): Mir4AlbumAward | null {
  const index = MIR4_MOUNTS_CATALOG.findIndex((mount) => mount.id === mountId);
  const mount = MIR4_MOUNTS_CATALOG[index];
  return mount ? mir4AlbumAwardForIndex(index, mount.grade) : null;
}

export function mir4MountBonuses(state: Mir4MountState | undefined): Mir4MountBonuses {
  const equipped = state?.equippedMountId ? mir4MountById(state.equippedMountId) : null;
  const equippedStats = equipped ? mir4MountRuntimeStats(equipped) : null;
  const album = mir4MountAlbumBonuses(state);
  return {
    ...album,
    moveSpeedBps: equippedStats?.moveSpeedBps ?? 0,
    basicAttackSpeedBps: equippedStats?.basicAttackSpeedBps ?? 0,
    physicalDefense: (equippedStats?.physicalDefense ?? 0) + album.physicalDefense,
    magicDefense: (equippedStats?.magicDefense ?? 0) + album.magicDefense,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeMir4MountState(value: unknown): Mir4MountState | undefined {
  if (!isRecord(value)) return undefined;
  const owned: Record<string, number> = {};
  if (isRecord(value.owned)) {
    for (const [mountId, rawCount] of Object.entries(value.owned)) {
      if (!mir4MountById(mountId) || !Number.isFinite(rawCount) || Number(rawCount) <= 0) continue;
      owned[mountId] = Math.min(1_000_000, Math.floor(Number(rawCount)));
    }
  }
  const discovered = [
    ...new Set([
      ...(Array.isArray(value.discovered)
        ? value.discovered.filter(
            (mountId): mountId is string => typeof mountId === 'string' && !!mir4MountById(mountId),
          )
        : []),
      ...Object.keys(owned),
    ]),
  ].slice(0, MIR4_MOUNTS_CATALOG.length);
  const equippedMountId =
    typeof value.equippedMountId === 'string' && owned[value.equippedMountId] > 0
      ? value.equippedMountId
      : undefined;
  const pending: Mir4MountPending[] = [];
  const ids = new Set<string>();
  if (Array.isArray(value.pending)) {
    for (const raw of value.pending) {
      if (
        !isRecord(raw) ||
        typeof raw.id !== 'string' ||
        ids.has(raw.id) ||
        typeof raw.mountId !== 'string'
      )
        continue;
      const mount = mir4MountById(raw.mountId);
      if (!mount || mount.grade < 4 || raw.grade !== mount.grade) continue;
      ids.add(raw.id);
      pending.push({ id: raw.id.slice(0, 96), mountId: mount.id, grade: mount.grade });
      if (pending.length === MIR4_MOUNT_PENDING_LIMIT) break;
    }
  }
  const nextPendingId =
    Number.isSafeInteger(value.nextPendingId) && Number(value.nextPendingId) > 0
      ? Math.min(1_000_000_000, Number(value.nextPendingId))
      : undefined;
  if (
    Object.keys(owned).length === 0 &&
    discovered.length === 0 &&
    pending.length === 0 &&
    !nextPendingId
  ) {
    return undefined;
  }
  return {
    ...(Object.keys(owned).length > 0 ? { owned } : {}),
    ...(discovered.length > 0 ? { discovered } : {}),
    ...(equippedMountId ? { equippedMountId } : {}),
    ...(pending.length > 0 ? { pending } : {}),
    ...(nextPendingId ? { nextPendingId } : {}),
  };
}
