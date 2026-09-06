import type { SimEvent } from '../types';
import { mir4NativeDistanceToYards } from './native_skill_units';
import type { Mir4SkillExecutionPlan } from './skill_execution_types';

type Mir4SkillGuideEvent = Extract<SimEvent, { type: 'mir4SkillGuide' }>;

/**
 * Projects compiler-approved native guide rows onto the host-neutral event wire.
 * Unapproved skills never reach this function with a plan, and rows without an
 * admitted guide remain silent.
 */
export function mir4NativeSkillGuideEvents(
  sourceId: number,
  plan: Mir4SkillExecutionPlan,
): readonly Mir4SkillGuideEvent[] {
  return plan.rows.flatMap((row): Mir4SkillGuideEvent[] => {
    const guide = row.guide;
    if (guide === null) return [];
    const common = {
      type: 'mir4SkillGuide' as const,
      sourceId,
      skillId: plan.skillId,
      attackId: row.attackId,
      applyTo: guide.applyTo,
      aliveMs: guide.aliveMs,
      scalingMs: guide.scalingMs,
      materialScalarCurve: guide.materialScalarCurve,
      materialAssetPath: guide.materialAssetPath,
      colors: {
        primary: [...guide.colors.primary] as [number, number, number],
        secondary: [...guide.colors.secondary] as [number, number, number],
        emissive: [...guide.colors.emissive] as [number, number, number],
      },
    };
    if (guide.guideShape === 'circle') {
      return [
        {
          ...common,
          shape: 'circle',
          radiusYards: mir4NativeDistanceToYards(guide.indicatorNativeRadius),
        },
      ];
    }
    if (guide.guideShape === 'sector') {
      return [
        {
          ...common,
          shape: 'sector',
          angleDegrees: guide.indicatorNativeAngle,
          radiusYards: mir4NativeDistanceToYards(guide.indicatorNativeRadius),
          forwardOffsetYards: mir4NativeDistanceToYards(guide.indicatorNativeOffset),
        },
      ];
    }
    return [
      {
        ...common,
        shape: 'direct',
        lengthYards: mir4NativeDistanceToYards(guide.indicatorNativeLength),
        widthYards: mir4NativeDistanceToYards(guide.indicatorNativeWidth),
      },
    ];
  });
}
