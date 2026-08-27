// Aeldrune's open-world reputation state. Fame and the PK mark are deliberately
// separate: the mark enters at 500 but only clears at 1,500, so the system has
// hysteresis and a killer cannot erase the penalty with one trivial recovery.

export const DEFAULT_FAME = 2_000;
export const MAX_FAME = DEFAULT_FAME;
export const PK_ENTER_FAME = 500;
export const PK_CLEAR_FAME = 1_500;
export const INNOCENT_PLAYER_KILL_FAME = -100;
export const PK_PLAYER_KILL_FAME = 50;
export const ELIGIBLE_MONSTER_KILL_FAME = 1;
export const OPEN_WORLD_PVP_MIN_LEVEL = 20;
export const OPEN_WORLD_PVP_SELF_DEFENSE_SECONDS = 60;
export const OPEN_WORLD_PVP_DEFENSE_RIGHTS_MAX = 128;
export const PK_STAT_MULTIPLIER = 0.5;

export interface InfamyState {
  fame: number;
  pkMarked: boolean;
}

function clampedFame(value: unknown): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_FAME, Math.floor(Number(value))))
    : DEFAULT_FAME;
}

export function normalizeInfamyState(fame: unknown, pkMarked: unknown): InfamyState {
  const normalizedFame = clampedFame(fame);
  const wasMarked = pkMarked === true;
  return {
    fame: normalizedFame,
    pkMarked: wasMarked ? normalizedFame < PK_CLEAR_FAME : normalizedFame <= PK_ENTER_FAME,
  };
}

export function adjustFame(state: Readonly<InfamyState>, delta: number): InfamyState {
  const fame = clampedFame(state.fame + (Number.isFinite(delta) ? Math.trunc(delta) : 0));
  return {
    fame,
    pkMarked: state.pkMarked ? fame < PK_CLEAR_FAME : fame <= PK_ENTER_FAME,
  };
}

export function serializedInfamy(fame: number, pkMarked: boolean): Partial<InfamyState> {
  return fame === DEFAULT_FAME && !pkMarked ? {} : { fame, pkMarked };
}

/** Apply the PK penalty to one positive integral combat stat. */
export function pkStat(value: number, pkMarked: boolean): number {
  return pkMarked ? Math.max(0, Math.floor(value * PK_STAT_MULTIPLIER)) : value;
}

/** Keep the self-defense waiver bounded even under a coordinated dogpile. The
 * earliest-expiring right is least useful; opponent id breaks ties so eviction
 * stays deterministic across runtimes. */
export function rememberOpenWorldPvpDefenseRight(
  existing: Map<number, number> | undefined,
  opponentId: number,
  until: number,
  now: number,
): Map<number, number> {
  const rights = existing ?? new Map<number, number>();
  for (const [id, expiry] of rights) {
    if (expiry < now) rights.delete(id);
  }
  if (!rights.has(opponentId) && rights.size >= OPEN_WORLD_PVP_DEFENSE_RIGHTS_MAX) {
    let evictId: number | undefined;
    let evictExpiry = Number.POSITIVE_INFINITY;
    for (const [id, expiry] of rights) {
      if (
        expiry < evictExpiry ||
        (expiry === evictExpiry && (evictId === undefined || id < evictId))
      ) {
        evictId = id;
        evictExpiry = expiry;
      }
    }
    if (evictId !== undefined) rights.delete(evictId);
  }
  rights.set(opponentId, until);
  return rights;
}
