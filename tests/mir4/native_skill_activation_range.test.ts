import { describe, expect, it } from 'vitest';
import {
  MIR4_NATIVE_TRACE_STOP_PADDING,
  mir4NativeDirectAdmissionWithinRange,
  mir4NativeRuntimeActivationRangePolicy,
  mir4NativeSkillActivationRanges,
  mir4NativeTargetHeightAdmitted,
  mir4NativeTraceCommitWithinRange,
} from '../../src/sim/mir4/native_skill_activation_range';

describe('MIR4 native targeted-skill activation range', () => {
  it('publishes the exact static policy consumed by runtime and homologation compiler', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(1102)).toEqual({
      skillId: 1102,
      firstAttackId: 110201,
      targetDistanceMaxNative: 550,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(1103)).toEqual({
      skillId: 1103,
      firstAttackId: 110105,
      targetDistanceMaxNative: 1_200,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(1104)).toEqual({
      skillId: 1104,
      firstAttackId: 110401,
      targetDistanceMaxNative: 550,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(1304)).toEqual({
      skillId: 1304,
      firstAttackId: 130401,
      targetDistanceMaxNative: 550,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(1401)).toEqual({
      skillId: 1401,
      firstAttackId: 140101,
      targetDistanceMaxNative: 650,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(1501)).toEqual({
      skillId: 1501,
      firstAttackId: 150101,
      targetDistanceMaxNative: 700,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(3101)).toEqual({
      skillId: 3101,
      firstAttackId: 310101,
      targetDistanceMaxNative: 700,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(4101)).toEqual({
      skillId: 4101,
      firstAttackId: 410101,
      targetDistanceMaxNative: 1_200,
      traceStopPaddingNative: 100,
      targetHeightNative: 500,
      blockingCheck: true,
    });
    expect(mir4NativeRuntimeActivationRangePolicy(4103)).toEqual({
      skillId: 4103,
      firstAttackId: 410301,
      targetDistanceMaxNative: 1_200,
      traceStopPaddingNative: 100,
      targetHeightNative: 800,
      blockingCheck: true,
    });
  });

  it('rebuilds Warrior 1102 direct-contact and trace-stop ranges from its first attack row', () => {
    const ranges = mir4NativeSkillActivationRanges(1102, {
      targetBodyRadiusYards: 0.5,
      skillDistanceBonusNative: 0,
    });

    expect(MIR4_NATIVE_TRACE_STOP_PADDING).toBe(100);
    expect(ranges).toEqual({
      skillId: 1102,
      firstAttackId: 110201,
      targetDistanceMaxNative: 550,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 6,
      traceStopRangeYards: 5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
  });

  it('adds the target body radius and the keyed skill-distance modifier before trace padding', () => {
    expect(
      mir4NativeSkillActivationRanges(1102, {
        targetBodyRadiusYards: 0.8,
        skillDistanceBonusNative: 75,
      }),
    ).toMatchObject({
      directContactRangeYards: 7.05,
      traceStopRangeYards: 6.05,
    });
  });

  it('rebuilds Barbaric Charge admission and pursuit from its native setup row', () => {
    expect(
      mir4NativeSkillActivationRanges(1103, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 1103,
      firstAttackId: 110105,
      targetDistanceMaxNative: 1_200,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 12.5,
      traceStopRangeYards: 11.5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
  });

  it('rebuilds Splitting Slash admission and pursuit from its native setup row', () => {
    expect(
      mir4NativeSkillActivationRanges(1104, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 1104,
      firstAttackId: 110401,
      targetDistanceMaxNative: 550,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 6,
      traceStopRangeYards: 5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
  });

  it('rebuilds Body Check admission and pursuit from its native setup row', () => {
    expect(
      mir4NativeSkillActivationRanges(1304, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 1304,
      firstAttackId: 130401,
      targetDistanceMaxNative: 550,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 6,
      traceStopRangeYards: 5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
  });

  it('rebuilds Ground Smash admission and pursuit from its native setup row', () => {
    expect(
      mir4NativeSkillActivationRanges(1401, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 1401,
      firstAttackId: 140101,
      targetDistanceMaxNative: 650,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 7,
      traceStopRangeYards: 6,
      targetHeightYards: 4,
      blockingCheck: true,
    });
  });

  it('rebuilds Gale Slash admission and pursuit from its first damage row', () => {
    expect(
      mir4NativeSkillActivationRanges(1501, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 1501,
      firstAttackId: 150101,
      targetDistanceMaxNative: 700,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 7.5,
      traceStopRangeYards: 6.5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
  });

  it('uses the native strict direct boundary and inclusive trace-stop boundary', () => {
    const ranges = mir4NativeSkillActivationRanges(1102, {
      targetBodyRadiusYards: 0.5,
      skillDistanceBonusNative: 0,
    });
    if (!ranges) throw new Error('missing admitted 1102 native range');

    expect(mir4NativeDirectAdmissionWithinRange(5.999, ranges)).toBe(true);
    expect(mir4NativeDirectAdmissionWithinRange(6, ranges)).toBe(false);
    expect(mir4NativeTraceCommitWithinRange(5, ranges)).toBe(true);
    expect(mir4NativeTraceCommitWithinRange(5.001, ranges)).toBe(false);
  });

  it('uses the native strict target-height boundary', () => {
    const ranges = mir4NativeSkillActivationRanges(1102, {
      targetBodyRadiusYards: 0.5,
      skillDistanceBonusNative: 0,
    });
    if (!ranges) throw new Error('missing admitted 1102 native range');

    expect(mir4NativeTargetHeightAdmitted(3.999, ranges)).toBe(true);
    expect(mir4NativeTargetHeightAdmitted(-3.999, ranges)).toBe(true);
    expect(mir4NativeTargetHeightAdmitted(4, ranges)).toBe(false);
    expect(mir4NativeTargetHeightAdmitted(-4, ranges)).toBe(false);
  });

  it('rebuilds Flame Orb admission and pursuit from its native setup row', () => {
    expect(
      mir4NativeSkillActivationRanges(2101, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 2101,
      firstAttackId: 210101,
      targetDistanceMaxNative: 1500,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 15.5,
      traceStopRangeYards: 14.5,
      targetHeightYards: 7,
      blockingCheck: true,
    });
  });

  it('rebuilds Moonlight Wave admission and pursuit from its native setup row', () => {
    expect(
      mir4NativeSkillActivationRanges(3506, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 3506,
      firstAttackId: 350601,
      targetDistanceMaxNative: 800,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 8.5,
      traceStopRangeYards: 7.5,
      targetHeightYards: 7,
      blockingCheck: true,
    });
  });

  it('rebuilds Sunbeam Sword admission and pursuit from its native setup row', () => {
    expect(
      mir4NativeSkillActivationRanges(3101, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 3101,
      firstAttackId: 310101,
      targetDistanceMaxNative: 700,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 7.5,
      traceStopRangeYards: 6.5,
      targetHeightYards: 4,
      blockingCheck: true,
    });
  });

  it('rebuilds Quick Shot admission and pursuit from its first damage row', () => {
    expect(
      mir4NativeSkillActivationRanges(4101, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: 0,
      }),
    ).toEqual({
      skillId: 4101,
      firstAttackId: 410101,
      targetDistanceMaxNative: 1_200,
      skillDistanceBonusNative: 0,
      targetBodyRadiusYards: 0.5,
      directContactRangeYards: 12.5,
      traceStopRangeYards: 11.5,
      targetHeightYards: 5,
      blockingCheck: true,
    });
  });

  it('rejects non-finite and negative physical inputs without normalizing them', () => {
    expect(() =>
      mir4NativeSkillActivationRanges(1102, {
        targetBodyRadiusYards: -0.01,
        skillDistanceBonusNative: 0,
      }),
    ).toThrow(/targetBodyRadiusYards/);
    expect(() =>
      mir4NativeSkillActivationRanges(1102, {
        targetBodyRadiusYards: 0.5,
        skillDistanceBonusNative: Number.NaN,
      }),
    ).toThrow(/skillDistanceBonusNative/);
  });
});
