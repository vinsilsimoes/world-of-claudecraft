/**
 * Cosmetic ballistic lift for the native Down02 presentation. The native row
 * owns both the airborne window and peak height; the sim position stays on its
 * collision-resolved ground endpoint.
 */
export function mir4DownReactionLiftY(
  elapsedSeconds: number,
  moveDurationSeconds: number,
  heightYards: number,
): number {
  if (elapsedSeconds <= 0 || moveDurationSeconds <= 0 || heightYards <= 0) return 0;
  const phase = Math.min(1, elapsedSeconds / moveDurationSeconds);
  if (phase >= 1) return 0;
  return 4 * heightYards * phase * (1 - phase);
}
