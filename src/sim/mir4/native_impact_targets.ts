import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4NativeImpactType1Targets } from './native_impact_type1_targets';
import { mir4NativeImpactType2Targets } from './native_impact_type2_targets';
import { mir4NativeImpactType3Targets } from './native_impact_type3_targets';
import { applyMir4NativeViewTargetFacing } from './native_skill_view_target';
import { mir4NativeUltimateExecutionPlanBySkillId } from './native_ultimate_runtime';
import { mir4RuntimeSkillExecutionPlan } from './runtime_skill_execution';

/**
 * Route contact-time native target rebuilding only for a compiler-approved row.
 * Recovered geometry may be tested before the rest of a skill is homologated,
 * but it cannot silently activate inside the live combat path by itself.
 */
export function mir4NativeApprovedImpactTargets(
  ctx: SimContext,
  source: Entity,
  skillId: number,
  attackId: number,
  anchor?: Entity,
): Entity[] | null {
  const skillPlan = mir4RuntimeSkillExecutionPlan(skillId);
  const ultimatePlan = mir4NativeUltimateExecutionPlanBySkillId(skillId);
  if (
    !skillPlan?.rows.some((row) => row.attackId === attackId) &&
    !ultimatePlan?.attackIds.includes(attackId)
  ) {
    return null;
  }
  if (anchor) {
    const type1Targets = mir4NativeImpactType1Targets(ctx, source, anchor, skillId, attackId);
    if (type1Targets !== null) return type1Targets;
  }
  const type2Targets = mir4NativeImpactType2Targets(ctx, source, skillId, attackId, anchor);
  if (type2Targets !== null) return type2Targets;
  applyMir4NativeViewTargetFacing(source, anchor, skillId, attackId);
  return mir4NativeImpactType3Targets(ctx, source, skillId, attackId);
}
