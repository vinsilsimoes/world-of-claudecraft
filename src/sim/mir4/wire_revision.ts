const MIR4_WIRE_REVISIONS = new WeakMap<object, number>();

export function mir4WireRevision(meta: object): number {
  return MIR4_WIRE_REVISIONS.get(meta) ?? 0;
}

export function markMir4WireDirty(meta: object): void {
  MIR4_WIRE_REVISIONS.set(meta, mir4WireRevision(meta) + 1);
}
