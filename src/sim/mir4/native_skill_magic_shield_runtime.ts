import type { Entity } from '../types';
import { mir4NativeRuntimeMagicShieldPolicy } from './native_skill_magic_shield';

export function applyMir4NativeMagicShield(source: Entity, requestedSkillLevel: number): boolean {
  const policy = mir4NativeRuntimeMagicShieldPolicy(requestedSkillLevel);
  if (!policy || source.dead) return false;
  source.mir4Shield = {
    remaining: policy.durationMs / 1_000,
    damageReductionBasisPoints: policy.damageReductionBasisPoints,
    bashDamageReductionBasisPoints: policy.bashDamageReductionBasisPoints,
    absorptionRemaining: policy.absorptionLimit,
    hitsRemaining: policy.hitLimit,
  };
  return true;
}

/**
 * Reduce one positive incoming damage event. The native UI contract calls the
 * second budget an absorption limit; Aeldrune consumes it by damage prevented,
 * an explicit compatibility reconstruction until the type-3 gameplay consumer
 * is recovered. The hit that exhausts either budget still receives its full
 * configured reduction, then the shield disappears.
 */
export function mitigateMir4NativeMagicShield(target: Entity, incoming: number): number {
  const shield = target.mir4Shield;
  if (!shield || incoming <= 0) return incoming;
  const reduction = Math.max(0, Math.min(10_000, shield.damageReductionBasisPoints));
  const resolved = Math.max(1, Math.floor((incoming * (10_000 - reduction)) / 10_000));
  shield.absorptionRemaining -= Math.max(0, incoming - resolved);
  shield.hitsRemaining -= 1;
  if (shield.absorptionRemaining <= 0 || shield.hitsRemaining <= 0) {
    target.mir4Shield = undefined;
  }
  return resolved;
}
