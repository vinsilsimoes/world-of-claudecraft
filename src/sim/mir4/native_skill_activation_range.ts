import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import { mir4NativeGeneratedMechanicalAction } from './native_skill_generated_contract';
import { MIR4_NATIVE_UNITS_PER_YARD, mir4NativeDistanceToYards } from './native_skill_units';

/** Native MM_PCFSM_Trace subtracts this from contact reach before pursuing. */
export const MIR4_NATIVE_TRACE_STOP_PADDING = 100;

interface Mir4NativeActivationRangeExpectation {
  readonly firstAttackId: number;
  readonly targetDistanceMaxNative: number;
  readonly targetHeightNative: number;
  readonly blockingCheck: boolean;
}

const RUNTIME_ACTIVATION_RANGE_EXPECTATIONS = new Map<number, Mir4NativeActivationRangeExpectation>(
  [
    [
      1101,
      Object.freeze({
        firstAttackId: 110100,
        targetDistanceMaxNative: 450,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1102,
      Object.freeze({
        firstAttackId: 110201,
        targetDistanceMaxNative: 550,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1103,
      Object.freeze({
        firstAttackId: 110105,
        targetDistanceMaxNative: 1_200,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1104,
      Object.freeze({
        firstAttackId: 110401,
        targetDistanceMaxNative: 550,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1201,
      Object.freeze({
        firstAttackId: 120101,
        targetDistanceMaxNative: 1_600,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1301,
      Object.freeze({
        firstAttackId: 130101,
        targetDistanceMaxNative: 1_100,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1302,
      Object.freeze({
        firstAttackId: 130201,
        targetDistanceMaxNative: 450,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1304,
      Object.freeze({
        firstAttackId: 130401,
        targetDistanceMaxNative: 550,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1401,
      Object.freeze({
        firstAttackId: 140101,
        targetDistanceMaxNative: 650,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1403,
      Object.freeze({
        firstAttackId: 140301,
        targetDistanceMaxNative: 700,
        targetHeightNative: 800,
        blockingCheck: false,
      }),
    ],
    [
      1501,
      Object.freeze({
        firstAttackId: 150101,
        targetDistanceMaxNative: 700,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      1601,
      Object.freeze({
        firstAttackId: 160101,
        targetDistanceMaxNative: 850,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      3506,
      Object.freeze({
        firstAttackId: 350601,
        targetDistanceMaxNative: 800,
        targetHeightNative: 700,
        blockingCheck: true,
      }),
    ],
    [
      4101,
      Object.freeze({
        firstAttackId: 410101,
        targetDistanceMaxNative: 1_200,
        targetHeightNative: 500,
        blockingCheck: true,
      }),
    ],
    [
      4102,
      Object.freeze({
        firstAttackId: 410201,
        targetDistanceMaxNative: 700,
        targetHeightNative: 500,
        blockingCheck: true,
      }),
    ],
    [
      4103,
      Object.freeze({
        firstAttackId: 410301,
        targetDistanceMaxNative: 1_200,
        targetHeightNative: 800,
        blockingCheck: true,
      }),
    ],
    [
      4104,
      Object.freeze({
        firstAttackId: 410401,
        targetDistanceMaxNative: 1_200,
        targetHeightNative: 800,
        blockingCheck: true,
      }),
    ],
    [
      4105,
      Object.freeze({
        firstAttackId: 410501,
        targetDistanceMaxNative: 1_200,
        targetHeightNative: 800,
        blockingCheck: true,
      }),
    ],
    [
      4106,
      Object.freeze({
        firstAttackId: 410601,
        targetDistanceMaxNative: 1_400,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
    [
      4107,
      Object.freeze({
        firstAttackId: 410701,
        targetDistanceMaxNative: 1_200,
        targetHeightNative: 800,
        blockingCheck: true,
      }),
    ],
    [
      4110,
      Object.freeze({
        firstAttackId: 411000,
        targetDistanceMaxNative: 2_500,
        targetHeightNative: 400,
        blockingCheck: true,
      }),
    ],
  ],
);

export interface Mir4NativeSkillActivationRangeOptions {
  /** Aeldrune collision radius for the currently captured target. */
  readonly targetBodyRadiusYards: number;
  /** Native per-character table value keyed by SkillID and channel 2. */
  readonly skillDistanceBonusNative: number;
}

export interface Mir4NativeSkillActivationRanges {
  readonly skillId: number;
  readonly firstAttackId: number;
  readonly targetDistanceMaxNative: number;
  readonly skillDistanceBonusNative: number;
  readonly targetBodyRadiusYards: number;
  readonly directContactRangeYards: number;
  readonly traceStopRangeYards: number;
  readonly targetHeightYards: number;
  readonly blockingCheck: boolean;
}

export interface Mir4NativeRuntimeActivationRangePolicy {
  readonly skillId: number;
  readonly firstAttackId: number;
  readonly targetDistanceMaxNative: number;
  readonly traceStopPaddingNative: number;
  readonly targetHeightNative: number;
  readonly blockingCheck: boolean;
}

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new Error(`${field} must be finite`);
}

function requireFiniteNonNegative(value: number, field: string): void {
  requireFinite(value, field);
  if (value < 0) throw new Error(`${field} must be non-negative`);
}

/** Static source contract shared by the runtime calculator and plan compiler. */
export function mir4NativeRuntimeActivationRangePolicy(
  skillId: number,
): Mir4NativeRuntimeActivationRangePolicy | null {
  const expected = RUNTIME_ACTIVATION_RANGE_EXPECTATIONS.get(skillId);
  const generatedAction = mir4NativeGeneratedMechanicalAction(skillId);
  const action = generatedAction ?? mir4NativeDirectSkillActionEvidenceById(skillId);
  const generatedExpectation: Mir4NativeActivationRangeExpectation | null =
    generatedAction?.targeting && generatedAction.rows[0]
      ? Object.freeze({
          firstAttackId: generatedAction.rows[0].attackId,
          targetDistanceMaxNative: generatedAction.rows[0].targetDistance.nativeMax,
          targetHeightNative: generatedAction.indicator.nativeHeight,
          blockingCheck: generatedAction.blockingCheck === 1,
        })
      : null;
  const resolvedExpectation = expected ?? generatedExpectation;
  if (!resolvedExpectation) return null;
  const firstRow = action?.rows[0];
  if (
    !action?.targeting ||
    !firstRow ||
    firstRow.attackId !== resolvedExpectation.firstAttackId ||
    firstRow.targetDistance.nativeMax !== resolvedExpectation.targetDistanceMaxNative ||
    action.indicator.nativeHeight !== resolvedExpectation.targetHeightNative ||
    action.blockingCheck !== Number(resolvedExpectation.blockingCheck)
  ) {
    return null;
  }
  return Object.freeze({
    skillId,
    firstAttackId: firstRow.attackId,
    targetDistanceMaxNative: firstRow.targetDistance.nativeMax,
    traceStopPaddingNative: MIR4_NATIVE_TRACE_STOP_PADDING,
    targetHeightNative: action.indicator.nativeHeight,
    blockingCheck: resolvedExpectation.blockingCheck,
  });
}

/**
 * Compile the two ranges used by the native targeted-skill flow.
 *
 * Client `FUN_1407445f0` returns target body radius plus
 * `FUN_140768e30`, whose base is the first SKILL_ATTACK row's
 * TargetDistanceMax plus the character's SkillID/channel-2 modifier.
 * `MM_PCFSM_Trace::OnEnter` then subtracts 100 native units and clamps at
 * zero. Direct admission uses the full contact reach; a traced pursuit uses
 * the padded stop reach. Keeping both avoids erasing the native hysteresis.
 *
 * Null is deliberate: only skills whose native consumer and runtime route
 * have both been proved are admitted here.
 */
export function mir4NativeSkillActivationRanges(
  skillId: number,
  options: Mir4NativeSkillActivationRangeOptions,
): Mir4NativeSkillActivationRanges | null {
  requireFiniteNonNegative(options.targetBodyRadiusYards, 'targetBodyRadiusYards');
  requireFinite(options.skillDistanceBonusNative, 'skillDistanceBonusNative');
  const policy = mir4NativeRuntimeActivationRangePolicy(skillId);
  if (!policy) return null;
  requireFiniteNonNegative(policy.targetDistanceMaxNative, 'TargetDistanceMax');
  requireFiniteNonNegative(policy.targetHeightNative, 'TargetHeight');

  const targetRadiusNative = options.targetBodyRadiusYards * MIR4_NATIVE_UNITS_PER_YARD;
  const directContactNative =
    policy.targetDistanceMaxNative + options.skillDistanceBonusNative + targetRadiusNative;
  const traceStopNative = Math.max(0, directContactNative - policy.traceStopPaddingNative);

  return Object.freeze({
    skillId,
    firstAttackId: policy.firstAttackId,
    targetDistanceMaxNative: policy.targetDistanceMaxNative,
    skillDistanceBonusNative: options.skillDistanceBonusNative,
    targetBodyRadiusYards: options.targetBodyRadiusYards,
    directContactRangeYards: mir4NativeDistanceToYards(Math.max(0, directContactNative)),
    traceStopRangeYards: mir4NativeDistanceToYards(traceStopNative),
    targetHeightYards: mir4NativeDistanceToYards(policy.targetHeightNative),
    blockingCheck: policy.blockingCheck,
  });
}

/** Native direct CheckTargetbyRange uses a strict horizontal comparison. */
export function mir4NativeDirectAdmissionWithinRange(
  horizontalDistanceYards: number,
  ranges: Mir4NativeSkillActivationRanges,
): boolean {
  requireFiniteNonNegative(horizontalDistanceYards, 'horizontalDistanceYards');
  return horizontalDistanceYards < ranges.directContactRangeYards;
}

/** Native trace Tick commits at or inside its padded stop radius. */
export function mir4NativeTraceCommitWithinRange(
  horizontalDistanceYards: number,
  ranges: Mir4NativeSkillActivationRanges,
): boolean {
  requireFiniteNonNegative(horizontalDistanceYards, 'horizontalDistanceYards');
  return horizontalDistanceYards <= ranges.traceStopRangeYards;
}

/** Native trace Tick rejects equality with TargetHeight in either direction. */
export function mir4NativeTargetHeightAdmitted(
  signedHeightDeltaYards: number,
  ranges: Mir4NativeSkillActivationRanges,
): boolean {
  requireFinite(signedHeightDeltaYards, 'signedHeightDeltaYards');
  return Math.abs(signedHeightDeltaYards) < ranges.targetHeightYards;
}
