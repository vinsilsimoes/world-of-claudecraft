import { mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4EffectKind } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import {
  mir4NativeRipostePlayerKnockdownChanceBasisPoints,
  mir4NativeRuntimeRipostePolicy,
} from './native_skill_riposte';

const RIPOSTE_SKILL_ID = 1301;

function riposteName(): string | null {
  return mir4SkillById(RIPOSTE_SKILL_ID)?.displayName ?? null;
}

/** Apply Riposte's source-side direct BUFF graph at action start. */
export function applyMir4NativeRiposteSourceBuffs(
  ctx: SimContext,
  source: Entity,
  skillLevel: number,
): boolean {
  const policy = mir4NativeRuntimeRipostePolicy(skillLevel);
  const name = riposteName();
  if (!policy || name === null || source.dead) return false;

  const effects: Array<{
    effectId: string;
    kind: Mir4EffectKind;
    durationSeconds: number;
    magnitude: number;
  }> = [
    {
      effectId: policy.controlImmunity.effectId,
      kind: 'control-immunity' as const,
      durationSeconds: policy.controlImmunity.durationMs / 1000,
      magnitude: 0,
    },
    {
      effectId: policy.baseAllDamageReduction.effectId,
      kind: 'all-damage-reduction' as const,
      durationSeconds: policy.baseAllDamageReduction.durationMs / 1000,
      magnitude: policy.baseAllDamageReduction.magnitudeBasisPoints,
    },
  ];
  if (policy.specialAllDamageReduction) {
    effects.push({
      effectId: policy.specialAllDamageReduction.effectId,
      kind: 'all-damage-reduction',
      durationSeconds: policy.specialAllDamageReduction.durationMs / 1000,
      magnitude: policy.specialAllDamageReduction.magnitudeBasisPoints,
    });
  }
  if (policy.bossDamageReduction) {
    effects.push({
      effectId: policy.bossDamageReduction.effectId,
      kind: 'boss-damage-reduction',
      durationSeconds: policy.bossDamageReduction.durationMs / 1000,
      magnitude: policy.bossDamageReduction.magnitudeBasisPoints,
    });
  }

  for (const effect of effects) {
    const admission = applyMir4Effect(ctx, source, {
      ...effect,
      name,
      sourceId: source.id,
    });
    if (!admission.ok) return false;
  }

  if (policy.immediateHealMaxHpBasisPoints > 0) {
    const healing = Math.floor((source.maxHp * policy.immediateHealMaxHpBasisPoints) / 10_000);
    source.hp = Math.min(source.maxHp, source.hp + healing);
  }
  return true;
}

/** Apply BUFF 13012's five-second taunt to one setup-volume target. */
export function applyMir4NativeRiposteTaunt(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillLevel: number,
): boolean {
  const policy = mir4NativeRuntimeRipostePolicy(skillLevel);
  if (!policy || target.dead || target.kind !== 'mob' || !ctx.isHostileTo(source, target)) {
    return false;
  }
  if (!ctx.applyTaunt(source, target)) return false;
  if (target.forcedTargetId === source.id) {
    target.forcedTargetTimer = Math.max(target.forcedTargetTimer, policy.taunt.durationMs / 1000);
  }
  return true;
}

/** Apply row 130102's recovered knockdown to an admitted monster target. */
export function applyMir4NativeRiposteMonsterKnockdown(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillLevel: number,
): boolean {
  const policy = mir4NativeRuntimeRipostePolicy(skillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(RIPOSTE_SKILL_ID, 130102);
  const name = riposteName();
  if (
    !policy ||
    !reaction ||
    name === null ||
    target.dead ||
    target.kind !== 'mob' ||
    !ctx.isHostileTo(source, target)
  ) {
    return false;
  }
  const admission = applyMir4Effect(ctx, target, {
    effectId: reaction.effectId,
    kind: reaction.kind,
    durationSeconds: reaction.durationMs / 1000,
    magnitude: 0,
    name,
    sourceId: source.id,
  });
  if (!admission.ok) return false;
  return applyMir4NativeAdmittedCrowdControlReaction(
    ctx,
    source,
    target,
    RIPOSTE_SKILL_ID,
    130102,
    reaction,
  );
}

/** Apply row 130102's native player chance before the shared CC admission. */
export function applyMir4NativeRipostePlayerKnockdown(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillLevel: number,
  rollBasisPoints: number,
): boolean {
  const policy = mir4NativeRuntimeRipostePolicy(skillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(RIPOSTE_SKILL_ID, 130102);
  const baseChance = mir4NativeRipostePlayerKnockdownChanceBasisPoints(
    skillLevel,
    source.mir4?.statusValues,
    target.mir4?.statusValues,
  );
  const chance =
    baseChance === null
      ? null
      : Math.max(0, baseChance - Math.max(0, -mir4NativeStatusBonus(target, 128)));
  const name = riposteName();
  if (
    !policy ||
    !reaction ||
    chance === null ||
    name === null ||
    target.dead ||
    target.kind !== 'player' ||
    !ctx.isHostileTo(source, target) ||
    Math.trunc(rollBasisPoints) >= chance
  ) {
    return false;
  }
  const admission = applyMir4Effect(ctx, target, {
    effectId: reaction.effectId,
    kind: reaction.kind,
    durationSeconds: reaction.durationMs / 1000,
    magnitude: 0,
    name,
    sourceId: source.id,
  });
  if (!admission.ok) return false;
  return applyMir4NativeAdmittedCrowdControlReaction(
    ctx,
    source,
    target,
    RIPOSTE_SKILL_ID,
    130102,
    reaction,
  );
}

/** Heal once after a Riposte contact batch, capped at five player knockdowns. */
export function applyMir4NativeRipostePlayerKnockdownRecovery(
  source: Entity,
  skillLevel: number,
  successfulTargets: number,
): number {
  const policy = mir4NativeRuntimeRipostePolicy(skillLevel);
  if (!policy || source.dead || successfulTargets <= 0) return 0;
  const basisPoints = Math.min(
    policy.playerKnockdownHealMaxBasisPoints,
    policy.playerKnockdownHealBasisPointsPerTarget * Math.floor(successfulTargets),
  );
  if (basisPoints <= 0) return 0;
  const healthBefore = source.hp;
  source.hp = Math.min(source.maxHp, source.hp + Math.floor((source.maxHp * basisPoints) / 10_000));
  return source.hp - healthBefore;
}
