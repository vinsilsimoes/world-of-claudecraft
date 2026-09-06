import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import { mir4StatusRecordValue } from './status_values';

const SKILL_ID = 5101 as const;
const FINAL_ATTACK_ID = 510102 as const;

export interface Mir4NativeCrescentBladeResistanceDebuff {
  readonly buffId: 50505;
  readonly effectId: 'mir4_native_buff_50505_120';
  readonly nativeStatusId: 120;
  readonly magnitudeBasisPoints: number;
  readonly durationMs: number;
}

export interface Mir4NativeCrescentBladePolicy {
  readonly skillId: 5101;
  readonly skillLevel: number;
  readonly bashDamageBasisPoints: number;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownChanceBasisPoints: number;
  readonly monsterSkillDamageBasisPoints: number;
  readonly chilledTwoStackDamageBasisPoints: number;
  readonly chilledThreeStackDamageBasisPoints: number;
  readonly failureResistanceDebuff: Mir4NativeCrescentBladeResistanceDebuff | null;
  readonly persistentBashDamageBasisPoints: number;
  readonly playerMultiTargetChanceRule: 'client-passed-unused';
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

/** Exact 5101 row guard; any source-table drift closes the runtime policy. */
export function mir4NativeCrescentBladeSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const first = action?.rows[0];
  const second = action?.rows[1];
  return (
    action?.cooldownMs === 16_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 2_000 &&
    action.attackAnimationMs === 1_967 &&
    action.endCutAnimationMs === 1_560 &&
    action.hitCount === 3 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.rows.length === 2 &&
    first?.attackId === 510101 &&
    first.nextAttackId === FINAL_ATTACK_ID &&
    first.movement?.kind === 'forward' &&
    first.movement.nativeRange === 250 &&
    first.movement.durationMs === 300 &&
    first.impactOffsetsMs.length === 1 &&
    first.impactOffsetsMs[0] === 400 &&
    first.damage.coefficient === 13_000 &&
    first.damage.levelUpCoefficient === 260 &&
    second?.attackId === FINAL_ATTACK_ID &&
    second.movement?.kind === 'target' &&
    second.movement.nativeRange === 180 &&
    second.movement.durationMs === 300 &&
    second.impactOffsetsMs.length === 1 &&
    second.impactOffsetsMs[0] === 1_120 &&
    second.damage.coefficient === 6_000 &&
    second.damage.levelUpCoefficient === 140 &&
    second.reaction.kind === 'knock-down' &&
    second.reaction.probabilityPercent === 10
  );
}

/** Rank milestones recovered from 5101's special/passive graph and BUFF 50505. */
export function mir4NativeCrescentBladePolicy(
  requestedSkillLevel: number,
): Mir4NativeCrescentBladePolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null || !mir4NativeCrescentBladeSourceMatches()) return null;
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  const failureResistanceDebuff = rank5
    ? Object.freeze({
        buffId: 50505 as const,
        effectId: 'mir4_native_buff_50505_120' as const,
        nativeStatusId: 120 as const,
        magnitudeBasisPoints: rank10 ? -2_000 : rank8 ? -1_500 : -1_000,
        durationMs: rank10 ? 20_000 : rank8 ? 15_000 : 10_000,
      })
    : null;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    bashDamageBasisPoints: rank10 ? 10_000 : rank8 ? 8_000 : rank5 ? 6_500 : 5_000,
    monsterKnockdownChanceBasisPoints: 10_000 as const,
    playerKnockdownChanceBasisPoints: rank10 ? 10_000 : rank8 ? 6_000 : rank5 ? 3_000 : 1_000,
    monsterSkillDamageBasisPoints: rank10 ? 10_000 : rank8 ? 5_000 : 0,
    chilledTwoStackDamageBasisPoints: rank10 ? 6_000 : rank8 ? 3_500 : 0,
    chilledThreeStackDamageBasisPoints: rank10 ? 7_000 : rank8 ? 4_000 : 0,
    failureResistanceDebuff,
    persistentBashDamageBasisPoints: rank10 ? 2_000 : rank8 ? 1_500 : 0,
    playerMultiTargetChanceRule: 'client-passed-unused' as const,
  });
}

function playerControlled(target: Entity): boolean {
  return target.kind === 'player' || target.ownerId !== null;
}

/** Live chance after permanent and temporary Knockdown success/resistance lanes. */
export function mir4NativeCrescentBladeKnockdownChanceBasisPoints(
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): number | null {
  const policy = mir4NativeCrescentBladePolicy(requestedSkillLevel);
  if (!policy) return null;
  const versusPlayer = playerControlled(target);
  const base = versusPlayer
    ? policy.playerKnockdownChanceBasisPoints
    : policy.monsterKnockdownChanceBasisPoints;
  const successIds = versusPlayer ? [119, 127] : [119, 135];
  const resistanceIds = versusPlayer ? [120, 128] : [120, 136];
  const success = successIds.reduce(
    (total, statusId) =>
      total +
      mir4StatusRecordValue(source.mir4?.statusValues, statusId) +
      mir4NativeStatusBonus(source, statusId),
    0,
  );
  const resistance = resistanceIds.reduce(
    (total, statusId) =>
      total +
      mir4StatusRecordValue(target.mir4?.statusValues, statusId) +
      mir4NativeStatusBonus(target, statusId),
    0,
  );
  return Math.max(0, Math.min(10_000, Math.trunc(base + success - resistance)));
}

function chillStacks(target: Entity): number {
  const chill = (target.mir4Effects?.active ?? []).find(
    (effect) =>
      effect.remaining > CAST_COMPLETE_EPS &&
      (effect.effectId === 'mir4_native_buff_20020' ||
        effect.effectId.startsWith('mir4_native_buff_20020_')),
  );
  return chill ? Math.max(1, Math.floor(chill.nativeStacks ?? 1)) : 0;
}

/** Total skill-owned multiplier: base + monster bonus + exact Chill-stack bonus. */
export function mir4NativeCrescentBladeConditionalDamageBasisPoints(
  target: Entity,
  requestedSkillLevel: number,
): number {
  const policy = mir4NativeCrescentBladePolicy(requestedSkillLevel);
  if (!policy) return 10_000;
  const stacks = chillStacks(target);
  const chilledBonus =
    stacks >= 3
      ? policy.chilledThreeStackDamageBasisPoints
      : stacks >= 2
        ? policy.chilledTwoStackDamageBasisPoints
        : 0;
  return 10_000 + (target.kind === 'mob' ? policy.monsterSkillDamageBasisPoints : 0) + chilledBonus;
}

function replaceFailureResistanceDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: Mir4NativeCrescentBladePolicy,
): boolean {
  const debuff = policy.failureResistanceDebuff;
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  if (!debuff || !skillName) return false;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== debuff.effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId: debuff.effectId,
    kind: 'native-status-boost',
    durationSeconds: debuff.durationMs / 1_000,
    magnitude: debuff.magnitudeBasisPoints,
    nativeStatusId: debuff.nativeStatusId,
    name: `${skillName}: Knockdown RES`,
    sourceId: source.id,
  }).ok;
}

/** Resolve the second contact's rank-aware Knockdown and failure branch exactly once. */
export function applyMir4NativeCrescentBladeFinalContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): { readonly knockedDown: boolean; readonly failureResistanceDebuffApplied: boolean } {
  const policy = mir4NativeCrescentBladePolicy(requestedSkillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(SKILL_ID, attackId);
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  if (
    !policy ||
    !reaction ||
    !skillName ||
    attackId !== FINAL_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    source.dead ||
    target.dead
  ) {
    return { knockedDown: false, failureResistanceDebuffApplied: false };
  }

  const chance = mir4NativeCrescentBladeKnockdownChanceBasisPoints(
    source,
    target,
    policy.skillLevel,
  );
  const chanceLanded = chance !== null && (chance >= 10_000 || rollBasisPoints() < chance);
  if (chanceLanded) {
    const admission = applyMir4Effect(ctx, target, {
      effectId: reaction.effectId,
      kind: reaction.kind,
      durationSeconds: reaction.durationMs / 1_000,
      magnitude: 0,
      name: skillName,
      sourceId: source.id,
    });
    if (
      admission.ok &&
      applyMir4NativeAdmittedCrowdControlReaction(
        ctx,
        source,
        target,
        SKILL_ID,
        FINAL_ATTACK_ID,
        reaction,
      )
    ) {
      return { knockedDown: true, failureResistanceDebuffApplied: false };
    }
  }

  return {
    knockedDown: false,
    failureResistanceDebuffApplied: replaceFailureResistanceDebuff(ctx, source, target, policy),
  };
}
