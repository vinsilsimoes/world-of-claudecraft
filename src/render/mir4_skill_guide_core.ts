export interface Mir4SkillGuideFrame {
  readonly visible: boolean;
  readonly insideProgress: number;
}

const HIDDEN_FRAME = Object.freeze({ visible: false, insideProgress: 0 });

/**
 * Native MM_ExecuteDecalComponent timing: elapsed/scaling is written to the
 * material's Inside scalar, capped at 1.0. The full decal remains alive through
 * the inclusive alive-time boundary, then disappears.
 */
export function mir4SkillGuideFrame(
  elapsedMs: number,
  scalingMs: number,
  aliveMs: number,
): Mir4SkillGuideFrame {
  if (
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(scalingMs) ||
    !Number.isFinite(aliveMs) ||
    scalingMs <= 0 ||
    aliveMs <= 0
  ) {
    return HIDDEN_FRAME;
  }
  const clampedElapsedMs = Math.max(0, elapsedMs);
  return {
    visible: clampedElapsedMs <= aliveMs,
    insideProgress: Math.min(1, clampedElapsedMs / scalingMs),
  };
}
