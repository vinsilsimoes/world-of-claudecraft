// Pure timing bridge between the authoritative MIR4 action window and the
// duration of whichever native WoC clip the current rig actually selected.
// Keeping this three-free makes the contract cheap to pin without loading GLBs.

export function mir4ActionTimeScale(
  clipDurationSeconds: number,
  durationMs: number | undefined,
  fallbackTimeScale: number,
): number {
  if (
    !Number.isFinite(clipDurationSeconds) ||
    clipDurationSeconds <= 0 ||
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return fallbackTimeScale;
  }
  return clipDurationSeconds / (durationMs / 1_000);
}

export function mir4ActionDurationSeconds(
  durationMs: number | undefined,
  fallbackSeconds: number,
): number {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs <= 0) {
    return fallbackSeconds;
  }
  return durationMs / 1_000;
}
