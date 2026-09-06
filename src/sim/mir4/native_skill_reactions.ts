import type { Mir4NativeSkillAttackRow } from '../content/mir4';

/**
 * Reproduce the recovered GameServer row parser/consumer arithmetic.
 *
 * The server collapses CrowdControlValueEx + CrowdControlTime first, truncates
 * that sum to milliseconds, then multiplies it by this row's impact count.
 */
export function mir4NativeServerCrowdControlWindowMs(row: Mir4NativeSkillAttackRow): number {
  const perImpactMs = Math.trunc(row.reaction.durationMs + row.reaction.valueEx * 1000);
  return row.impactOffsetsMs.length * perImpactMs;
}

/** The native displacement basis is also multiplied by this row's impact count. */
export function mir4NativeServerCrowdControlMoveUnits(row: Mir4NativeSkillAttackRow): number {
  return row.impactOffsetsMs.length * row.reaction.value;
}
