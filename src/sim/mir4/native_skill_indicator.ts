import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { mir4NativeGeneratedMechanicalAction } from './native_skill_generated_contract';

export interface Mir4NativeRuntimeIndicator {
  readonly skillId: number;
  readonly shape: 'none' | 'direct' | 'circle';
  readonly index: 0 | 102 | 103;
  readonly angleDegrees: number;
  readonly nativeMin: number;
  readonly nativeMax: number;
  readonly nativeWidth: number;
  readonly nativeHeight: number;
  readonly nativeOffset: number;
  /** No SKILL_ATTACK guide row supplies a cast-time lifetime for this action. */
  readonly presentation: 'targeting-metadata';
}

const BARBARIC_CHARGE_INDICATOR = Object.freeze({
  skillId: 1103,
  shape: 'direct' as const,
  index: 103 as const,
  angleDegrees: 0,
  nativeMin: 0,
  nativeMax: 1_200,
  nativeWidth: 500,
  nativeHeight: 400,
  nativeOffset: 0,
  presentation: 'targeting-metadata' as const,
});

const GROUND_SMASH_INDICATOR = Object.freeze({
  skillId: 1401,
  shape: 'circle' as const,
  index: 102 as const,
  angleDegrees: 360,
  nativeMin: 0,
  nativeMax: 500,
  nativeWidth: 0,
  nativeHeight: 400,
  nativeOffset: 600,
  presentation: 'targeting-metadata' as const,
});

const IRON_SHACKLE_INDICATOR = Object.freeze({
  skillId: 1201,
  shape: 'circle' as const,
  index: 102 as const,
  angleDegrees: 360,
  nativeMin: 0,
  nativeMax: 1_100,
  nativeWidth: 0,
  nativeHeight: 400,
  nativeOffset: 500,
  presentation: 'targeting-metadata' as const,
});

const LION_ROAR_INDICATOR = Object.freeze({
  skillId: 1302,
  shape: 'circle' as const,
  index: 102 as const,
  angleDegrees: 360,
  nativeMin: 0,
  nativeMax: 400,
  nativeWidth: 0,
  nativeHeight: 400,
  nativeOffset: 0,
  presentation: 'targeting-metadata' as const,
});

const RIPOSTE_INDICATOR = Object.freeze({
  skillId: 1301,
  shape: 'circle' as const,
  index: 102 as const,
  angleDegrees: 360,
  nativeMin: 0,
  nativeMax: 450,
  nativeWidth: 0,
  nativeHeight: 400,
  nativeOffset: 250,
  presentation: 'targeting-metadata' as const,
});

const GALE_SLASH_INDICATOR = Object.freeze({
  skillId: 1501,
  shape: 'circle' as const,
  index: 102 as const,
  angleDegrees: 360,
  nativeMin: 0,
  nativeMax: 700,
  nativeWidth: 0,
  nativeHeight: 400,
  nativeOffset: 0,
  presentation: 'targeting-metadata' as const,
});

const CRESCENT_STRIKE_INDICATOR = Object.freeze({
  skillId: 1601,
  shape: 'direct' as const,
  index: 103 as const,
  angleDegrees: 0,
  nativeMin: 0,
  nativeMax: 900,
  nativeWidth: 500,
  nativeHeight: 400,
  nativeOffset: 0,
  presentation: 'targeting-metadata' as const,
});

const UNBREAKABLE_STANCE_INDICATOR = Object.freeze({
  skillId: 1502,
  shape: 'none' as const,
  index: 0 as const,
  angleDegrees: 0,
  nativeMin: 0,
  nativeMax: 0,
  nativeWidth: 0,
  nativeHeight: 400,
  nativeOffset: 0,
  presentation: 'targeting-metadata' as const,
});

const RUNTIME_INDICATORS = new Map<number, Mir4NativeRuntimeIndicator>([
  [BARBARIC_CHARGE_INDICATOR.skillId, BARBARIC_CHARGE_INDICATOR],
  [IRON_SHACKLE_INDICATOR.skillId, IRON_SHACKLE_INDICATOR],
  [RIPOSTE_INDICATOR.skillId, RIPOSTE_INDICATOR],
  [LION_ROAR_INDICATOR.skillId, LION_ROAR_INDICATOR],
  [GROUND_SMASH_INDICATOR.skillId, GROUND_SMASH_INDICATOR],
  [GALE_SLASH_INDICATOR.skillId, GALE_SLASH_INDICATOR],
  [CRESCENT_STRIKE_INDICATOR.skillId, CRESCENT_STRIKE_INDICATOR],
  [UNBREAKABLE_STANCE_INDICATOR.skillId, UNBREAKABLE_STANCE_INDICATOR],
]);

export function mir4NativeExpectedIndicator(skillId: number): Mir4NativeRuntimeIndicator | null {
  return RUNTIME_INDICATORS.get(skillId) ?? generatedIndicator(skillId);
}

function generatedIndicator(skillId: number): Mir4NativeRuntimeIndicator | null {
  const action = mir4NativeGeneratedMechanicalAction(skillId);
  if (!action || action.indicator.type !== 0) return null;
  const indicator = action.indicator;
  if (indicator.index !== 0 && indicator.index !== 102 && indicator.index !== 103) return null;
  const shape =
    indicator.index === 103
      ? ('direct' as const)
      : indicator.index === 102 || indicator.angleDegrees === 360
        ? ('circle' as const)
        : ('none' as const);
  return Object.freeze({
    skillId,
    shape,
    index: indicator.index,
    angleDegrees: indicator.angleDegrees,
    nativeMin: indicator.nativeMin,
    nativeMax: indicator.nativeMax,
    nativeWidth: indicator.nativeWidth,
    nativeHeight: indicator.nativeHeight,
    nativeOffset: indicator.nativeOffset,
    presentation: 'targeting-metadata' as const,
  });
}

/**
 * Admit only the exact SKILL.json targeting footprint recovered for 1103.
 * The row has no GuideEffectId or guide lifetime, so this is selection metadata
 * and must not be promoted into an invented cast-time decal event.
 */
export function mir4NativeRuntimeIndicator(
  skillId: number,
  actionOverride?: Mir4NativeSkillAction,
): Mir4NativeRuntimeIndicator | null {
  const expected = RUNTIME_INDICATORS.get(skillId) ?? generatedIndicator(skillId);
  if (!expected) return null;
  const action = actionOverride ?? mir4NativeSkillActionById(skillId);
  if (!action || action.skillId !== skillId) return null;
  const indicator = action.indicator;
  if (
    indicator.type !== 0 ||
    indicator.index !== expected.index ||
    indicator.angleDegrees !== expected.angleDegrees ||
    indicator.nativeMin !== expected.nativeMin ||
    indicator.nativeMax !== expected.nativeMax ||
    indicator.nativeWidth !== expected.nativeWidth ||
    indicator.nativeHeight !== expected.nativeHeight ||
    indicator.nativeOffset !== expected.nativeOffset
  ) {
    return null;
  }
  return expected;
}
