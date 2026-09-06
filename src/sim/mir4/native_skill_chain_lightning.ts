import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { dist2d } from '../types';

export interface Mir4NativeChainLightningPolicy {
  readonly skillId: 2303;
  readonly attackId: 230301;
  readonly productType: 3;
  readonly maxTargets: 7;
  readonly jumpRadiusYards: 11;
  readonly targetHeightYards: 8;
  readonly impactOffsetsMs: readonly [979, 1110, 1250, 1390, 1530, 1670, 1800];
  /**
   * Per-hop scaling applied to SKILL_ATTACK.MagicDamage. The cooked row is
   * half the first-target SKILL summary (17600 -> 352%), while MIR4's official
   * notes establish a 220%-352% seven-target range and diminishing jumps.
   * The equal 6.25-point steps are therefore an explicit compatibility
   * reconstruction between those sealed endpoints, not a decoded UE consumer.
   */
  readonly contactCoefficientScaleBasisPoints: readonly [
    20000,
    18750,
    17500,
    16250,
    15000,
    13750,
    12500,
  ];
}

const CHAIN_LIGHTNING_POLICY = Object.freeze({
  skillId: 2303 as const,
  attackId: 230301 as const,
  productType: 3 as const,
  maxTargets: 7 as const,
  jumpRadiusYards: 11 as const,
  targetHeightYards: 8 as const,
  impactOffsetsMs: Object.freeze([979, 1110, 1250, 1390, 1530, 1670, 1800] as const),
  contactCoefficientScaleBasisPoints: Object.freeze([
    20000, 18750, 17500, 16250, 15000, 13750, 12500,
  ] as const),
}) satisfies Mir4NativeChainLightningPolicy;

/**
 * Return the sealed Chain Lightning contract only while the extracted action
 * row still matches every gameplay-relevant field used by the runtime.
 */
export function mir4NativeChainLightningPolicy(
  skillId: number,
): Mir4NativeChainLightningPolicy | null {
  if (skillId !== CHAIN_LIGHTNING_POLICY.skillId) return null;
  const action = mir4NativeDirectSkillActionEvidenceById(skillId);
  const row = action?.rows[0];
  if (
    !action ||
    action.rows.length !== 1 ||
    !row ||
    action.cooldownMs !== 18_000 ||
    action.skillCostType !== 2 ||
    action.skillCost !== 2_200 ||
    action.attackAnimationMs !== 2_100 ||
    action.endCutAnimationMs !== 1_890 ||
    action.requiredClassLevel !== 16 ||
    action.targeting !== true ||
    action.blockingCheck !== 1 ||
    action.nativeBehavior.productType !== CHAIN_LIGHTNING_POLICY.productType ||
    action.nativeBehavior.secondaryDamage.coefficient !== 352 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 6 ||
    row.attackId !== CHAIN_LIGHTNING_POLICY.attackId ||
    row.targetType !== 1 ||
    row.authorialTargetValue !== 7 ||
    row.impactType !== 1 ||
    row.geometry.nativeDistanceMax !== 1_100 ||
    row.geometry.nativeHeight !== 800 ||
    row.nativeBehavior.damageType !== 2 ||
    row.nativeBehavior.damageAttribute !== 3 ||
    row.nativeBehavior.magicDamage.coefficient !== 17_600 ||
    row.nativeBehavior.magicDamage.levelUpCoefficient !== 300 ||
    row.impactOffsetsMs.length !== CHAIN_LIGHTNING_POLICY.impactOffsetsMs.length ||
    row.impactOffsetsMs.some(
      (offset, index) => offset !== CHAIN_LIGHTNING_POLICY.impactOffsetsMs[index],
    )
  ) {
    return null;
  }
  return CHAIN_LIGHTNING_POLICY;
}

function validChainTarget(ctx: SimContext, source: Entity, candidate: Entity): boolean {
  return (
    candidate.id !== source.id &&
    (candidate.kind === 'mob' || candidate.kind === 'player') &&
    !candidate.dead &&
    ctx.isHostileTo(source, candidate)
  );
}

/**
 * Freeze one deterministic chain at cast commit. MIR4's tables prove the
 * seven-target cap, 11-yard contact radius and 8-yard height. They do not
 * expose the closed native tie-breaker, so nearest unvisited target followed
 * by entity id is the documented compatibility reconstruction.
 */
export function mir4NativeChainLightningTargets(
  ctx: SimContext,
  source: Entity,
  skillId: number,
  primary: Entity,
): readonly Entity[] | null {
  const policy = mir4NativeChainLightningPolicy(skillId);
  if (!policy || !validChainTarget(ctx, source, primary)) return null;

  const selected: Entity[] = [primary];
  const visited = new Set<number>([source.id, primary.id]);
  while (selected.length < policy.maxTargets) {
    const origin = selected[selected.length - 1];
    let next: Entity | null = null;
    let nextDistance = Number.POSITIVE_INFINITY;
    for (const candidate of ctx.entities.values()) {
      if (visited.has(candidate.id) || !validChainTarget(ctx, source, candidate)) continue;
      if (Math.abs(candidate.pos.y - origin.pos.y) > policy.targetHeightYards) continue;
      const distance = dist2d(origin.pos, candidate.pos);
      if (distance > policy.jumpRadiusYards) continue;
      if (!ctx.hasLineOfSight(origin, candidate)) continue;
      if (
        distance < nextDistance ||
        (distance === nextDistance && candidate.id < (next?.id ?? Number.POSITIVE_INFINITY))
      ) {
        next = candidate;
        nextDistance = distance;
      }
    }
    if (!next) break;
    selected.push(next);
    visited.add(next.id);
  }
  return Object.freeze(selected);
}
