import { mir4NativeSkillActionById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeCrowdControlReactionMatchesRow,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import {
  applyMir4NativeKnockbackReaction,
  mir4NativeKnockbackReactionMatchesRow,
  mir4NativeRuntimeKnockbackReaction,
} from './native_skill_knockback';
import {
  applyMir4NativePushToPointReaction,
  mir4NativePushToPointReactionMatchesRow,
  mir4NativeRuntimePushToPointReaction,
} from './native_skill_push_to_point';
import { mir4NativeUltimateExecutionPlanBySkillId } from './native_ultimate_runtime';

function nativeUltimateContactRow(skillId: number, attackId: number, sourceImpactIndex: number) {
  const plan = mir4NativeUltimateExecutionPlanBySkillId(skillId);
  if (
    !plan?.contacts.some(
      (contact) => contact.attackId === attackId && contact.sourceImpactIndex === sourceImpactIndex,
    )
  ) {
    return null;
  }
  return (
    mir4NativeSkillActionById(skillId)?.rows.find((candidate) => candidate.attackId === attackId) ??
    null
  );
}

/** Exact row-authored chance, converted from native percent to simulation basis points. */
export function mir4NativeUltimateReactionProbabilityBasisPoints(
  skillId: number,
  attackId: number,
  sourceImpactIndex: number,
): number | null {
  const row = nativeUltimateContactRow(skillId, attackId, sourceImpactIndex);
  if (!row) return null;
  const exactReaction =
    mir4NativePushToPointReactionMatchesRow(row) ||
    mir4NativeKnockbackReactionMatchesRow(row) ||
    mir4NativeCrowdControlReactionMatchesRow(row);
  if (!exactReaction) return null;
  return Math.max(0, Math.min(10_000, Math.trunc(row.reaction.probabilityPercent * 100)));
}

/**
 * Dispatch the exact reaction authored on an admitted native ultimate contact.
 * Returning true means the contact belongs to this dispatcher even when control
 * immunity or the native probability prevents movement.
 */
export function applyMir4NativeUltimateReaction(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  attackId: number,
  sourceImpactIndex: number,
): boolean {
  const plan = mir4NativeUltimateExecutionPlanBySkillId(skillId);
  const chanceBps = mir4NativeUltimateReactionProbabilityBasisPoints(
    skillId,
    attackId,
    sourceImpactIndex,
  );
  if (chanceBps === null) return false;

  const pushToPoint = mir4NativeRuntimePushToPointReaction(skillId, attackId);
  if (pushToPoint) {
    if (Math.floor(ctx.rng.next() * 10_000) < chanceBps) {
      applyMir4NativePushToPointReaction(ctx, source, target, skillId, attackId, pushToPoint);
    }
    return true;
  }

  const knockback = mir4NativeRuntimeKnockbackReaction(skillId, attackId);
  if (knockback) {
    if (
      sourceImpactIndex === knockback.triggerSourceImpactIndex &&
      Math.floor(ctx.rng.next() * 10_000) < chanceBps
    ) {
      applyMir4NativeKnockbackReaction(
        ctx,
        source,
        target,
        skillId,
        attackId,
        sourceImpactIndex,
        knockback,
      );
    }
    return true;
  }

  const crowdControl = mir4NativeRuntimeCrowdControlReaction(skillId, attackId);
  if (crowdControl && Math.floor(ctx.rng.next() * 10_000) < chanceBps) {
    const applied = applyMir4Effect(ctx, target, {
      effectId: crowdControl.effectId,
      kind: crowdControl.kind,
      durationSeconds: crowdControl.durationMs / 1_000,
      magnitude: 0,
      name: plan?.sourceInvincibility.name ?? 'Dragon Flame',
      sourceId: source.id,
    });
    if (applied.ok) {
      applyMir4NativeAdmittedCrowdControlReaction(
        ctx,
        source,
        target,
        skillId,
        attackId,
        crowdControl,
      );
    }
  }
  return true;
}
