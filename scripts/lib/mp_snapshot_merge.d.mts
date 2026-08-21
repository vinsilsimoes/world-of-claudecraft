export type SnapshotRecord = Record<string, unknown> & { id: number; k?: unknown };

export interface EntitySnapshotDelta {
  readonly ents: readonly SnapshotRecord[];
  readonly keep?: readonly number[];
}

export function mergeSelfSnapshot<T extends Record<string, unknown>>(
  previous: Record<string, unknown> | null,
  delta: T,
): T & Record<string, unknown>;

export function mergeEntitySnapshot(
  previousEntities: ReadonlyMap<number, SnapshotRecord>,
  snapshot: EntitySnapshotDelta,
): Map<number, SnapshotRecord>;
