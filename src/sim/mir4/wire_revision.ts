const MIR4_WIRE_REVISIONS = new WeakMap<object, number>();
const MIR4_CODEX_WIRE_REVISIONS = new WeakMap<object, number>();

export function mir4WireRevision(meta: object): number {
  return MIR4_WIRE_REVISIONS.get(meta) ?? 0;
}

export function markMir4WireDirty(meta: object): void {
  MIR4_WIRE_REVISIONS.set(meta, mir4WireRevision(meta) + 1);
}

export function mir4CodexWireRevision(meta: object): number {
  return MIR4_CODEX_WIRE_REVISIONS.get(meta) ?? 0;
}

export function markMir4CodexWireDirty(meta: object): void {
  MIR4_CODEX_WIRE_REVISIONS.set(meta, mir4CodexWireRevision(meta) + 1);
}
