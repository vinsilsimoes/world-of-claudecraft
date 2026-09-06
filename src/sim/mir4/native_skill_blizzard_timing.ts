import type {
  Mir4NativeSkillAction,
  Mir4NativeSkillAttackRow,
} from '../content/mir4/native_skill_action_types';

export interface Mir4NativeRuntimeImpactTimingPolicy {
  readonly authority: 'authorial-browser-reconstruction';
  readonly nativeClaim: false;
  readonly policyId: 'mir4-authorial.skill2203.row-local-impact-time-v1';
  readonly skillId: 2203;
  readonly attackId: 220302;
  readonly sourceImpactStartMs: 900;
  readonly sourceImpactTimeMs: 700;
  readonly offsetsMs: readonly [1600];
  readonly unresolvedNativeFact: 'native-impact-time-reference-frame';
}

const BLIZZARD_DIRECT_TIMING = Object.freeze({
  authority: 'authorial-browser-reconstruction' as const,
  nativeClaim: false as const,
  policyId: 'mir4-authorial.skill2203.row-local-impact-time-v1' as const,
  skillId: 2203 as const,
  attackId: 220302 as const,
  sourceImpactStartMs: 900 as const,
  sourceImpactTimeMs: 700 as const,
  offsetsMs: Object.freeze([1600] as const),
  unresolvedNativeFact: 'native-impact-time-reference-frame' as const,
}) satisfies Mir4NativeRuntimeImpactTimingPolicy;

/**
 * The Blizzard terminal row is the only recovered direct row whose ImpactTime
 * precedes ImpactStartTime. Its 700 ms value is therefore reconstructed as a
 * row-local delay, placing the contact at 1600 ms inside the 1633 ms action.
 * Every source field is guarded so drift falls back to the raw, invalid timing
 * and keeps the skill out of the runtime allowlist.
 */
export function mir4NativeRuntimeImpactTimingPolicy(
  action: Mir4NativeSkillAction,
  row: Mir4NativeSkillAttackRow,
): Mir4NativeRuntimeImpactTimingPolicy | null {
  if (
    action.skillId !== 2203 ||
    action.attackAnimationMs !== 1633 ||
    action.endCutAnimationMs !== 1600 ||
    row.attackId !== 220302 ||
    row.impactStartMs !== 900 ||
    row.impactOffsetsMs.length !== 1 ||
    row.impactOffsetsMs[0] !== 700
  ) {
    return null;
  }
  return BLIZZARD_DIRECT_TIMING;
}

export function mir4NativeRuntimeImpactOffsets(
  action: Mir4NativeSkillAction,
  row: Mir4NativeSkillAttackRow,
): readonly number[] {
  return mir4NativeRuntimeImpactTimingPolicy(action, row)?.offsetsMs ?? row.impactOffsetsMs;
}
