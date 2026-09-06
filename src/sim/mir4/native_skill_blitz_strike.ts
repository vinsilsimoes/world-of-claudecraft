import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from './control';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { applyMir4NativePeriodicDamage } from './native_periodic_damage';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import { mir4StatusRecordValue } from './status_values';

const SKILL_ID = 5202 as const;
const FINAL_ATTACK_ID = 520202 as const;

export interface Mir4NativeBlitzStrikeResistanceDebuff {
  readonly buffId: 50505;
  readonly effectId: 'mir4_native_buff_50505_120';
  readonly nativeStatusId: 120;
  readonly magnitudeBasisPoints: number;
  readonly durationMs: number;
}

export interface Mir4NativeBlitzStrikeConcussion {
  readonly buffId: 50531 | 50532 | 50533;
  readonly chanceBasisPoints: number;
  readonly additionalStunMs: number;
}

export interface Mir4NativeBlitzStrikeBleed {
  readonly buffId: 50519;
  readonly buffLevel: number;
  readonly durationMs: 2_000;
}

export interface Mir4NativeBlitzStrikePolicy {
  readonly skillId: 5202;
  readonly skillLevel: number;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownChanceBasisPoints: number;
  readonly failureResistanceDebuff: Mir4NativeBlitzStrikeResistanceDebuff | null;
  readonly concussion: Mir4NativeBlitzStrikeConcussion | null;
  readonly bleed: Mir4NativeBlitzStrikeBleed | null;
  readonly persistentSkillDamageReductionBasisPoints: number;
  readonly playerMultiTargetChanceRule: 'client-passed-unused';
}

export interface Mir4NativeBlitzStrikeContactResult {
  readonly knockedDown: boolean;
  readonly failureResistanceDebuffApplied: boolean;
  readonly bleedApplied: boolean;
  readonly concussionTriggered: boolean;
  readonly stunned: boolean;
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

/** Exact 5202 action guard. Source drift closes every skill-specific branch. */
export function mir4NativeBlitzStrikeSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const rush = action?.rows[0];
  const pierce = action?.rows[1];
  return (
    action?.cooldownMs === 25_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 4_440 &&
    action.attackAnimationMs === 1_200 &&
    action.endCutAnimationMs === 1_080 &&
    action.hitCount === 2 &&
    action.requiredClassLevel === 56 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.nativeBehavior.useControlTime === 3 &&
    action.nativeBehavior.chainUseSkillLevel === 0 &&
    action.nativeBehavior.chainSkillId === 0 &&
    action.nativeBehavior.chainSkillDelay === 1 &&
    action.nativeBehavior.chainSkillCount === 1 &&
    action.nativeBehavior.darkChange === 1 &&
    action.nativeBehavior.damageType === 1 &&
    action.nativeBehavior.primaryDamage.coefficient === 280 &&
    action.nativeBehavior.primaryDamage.levelUpCoefficient === 6 &&
    action.rows.length === 2 &&
    rush?.attackId === 520201 &&
    rush.nextAttackId === FINAL_ATTACK_ID &&
    rush.movement?.kind === 'target' &&
    rush.movement.nativeRange === 120 &&
    rush.movement.durationMs === 500 &&
    rush.targetDistance.nativeMax === 1_200 &&
    rush.damage.type === 0 &&
    rush.damage.coefficient === 0 &&
    pierce?.attackId === FINAL_ATTACK_ID &&
    pierce.viewTarget === 2 &&
    pierce.movement?.kind === 'none' &&
    pierce.targetDistance.nativeMax === 1_200 &&
    pierce.targetType === 1 &&
    pierce.authorialTargetValue === 8 &&
    pierce.impactType === 3 &&
    pierce.impactOffsetsMs.length === 1 &&
    pierce.impactOffsetsMs[0] === 600 &&
    pierce.geometry.nativeDistanceMax === 650 &&
    pierce.geometry.nativeWidth === 400 &&
    pierce.geometry.nativeHeight === 500 &&
    pierce.geometry.nativeOffset.x === -150 &&
    pierce.damage.type === 1 &&
    pierce.damage.coefficient === 28_000 &&
    pierce.damage.levelUpCoefficient === 600 &&
    pierce.reaction.kind === 'knock-down' &&
    pierce.reaction.value === -1_100 &&
    pierce.reaction.nativeHeight === 350 &&
    pierce.reaction.valueEx === 0.9 &&
    pierce.reaction.durationMs === 2_100 &&
    pierce.reaction.probabilityPercent === 100
  );
}

/** Rank milestones recovered from SPA 295-297 and BUFF 50505/50519/50531-50533. */
export function mir4NativeBlitzStrikePolicy(
  requestedSkillLevel: number,
): Mir4NativeBlitzStrikePolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null || !mir4NativeBlitzStrikeSourceMatches()) return null;
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    monsterKnockdownChanceBasisPoints: 10_000 as const,
    playerKnockdownChanceBasisPoints: rank10 ? 10_000 : rank8 ? 6_000 : rank5 ? 3_000 : 1_000,
    failureResistanceDebuff: rank5
      ? Object.freeze({
          buffId: 50505 as const,
          effectId: 'mir4_native_buff_50505_120' as const,
          nativeStatusId: 120 as const,
          magnitudeBasisPoints: rank10 ? -2_000 : rank8 ? -1_500 : -1_000,
          durationMs: rank10 ? 20_000 : rank8 ? 15_000 : 10_000,
        })
      : null,
    concussion: rank5
      ? Object.freeze({
          buffId: (rank10 ? 50533 : rank8 ? 50532 : 50531) as 50531 | 50532 | 50533,
          chanceBasisPoints: rank10 ? 7_000 : rank8 ? 5_000 : 2_000,
          additionalStunMs: rank10 ? 4_000 : rank8 ? 3_000 : 2_000,
        })
      : null,
    bleed: rank5
      ? Object.freeze({
          buffId: 50519 as const,
          buffLevel: rank10 ? 7 : rank8 ? 4 : 1,
          durationMs: 2_000 as const,
        })
      : null,
    persistentSkillDamageReductionBasisPoints: rank10 ? 1_000 : rank8 ? 600 : rank5 ? 300 : 0,
    playerMultiTargetChanceRule: 'client-passed-unused' as const,
  });
}

function playerControlled(target: Entity): boolean {
  return target.kind === 'player' || target.ownerId !== null;
}

function knockdownTemporaryStatus(
  entity: Entity,
  lane: 'success' | 'resistance',
  versusPlayer: boolean,
): number {
  const generalId = lane === 'success' ? 119 : 120;
  const contextId = versusPlayer
    ? lane === 'success'
      ? 127
      : 128
    : lane === 'success'
      ? 135
      : 136;
  return mir4NativeStatusBonus(entity, generalId) + mir4NativeStatusBonus(entity, contextId);
}

export function mir4NativeBlitzStrikeKnockdownChanceBasisPoints(
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): number | null {
  const policy = mir4NativeBlitzStrikePolicy(requestedSkillLevel);
  if (!policy) return null;
  const versusPlayer = playerControlled(target);
  const base = versusPlayer
    ? policy.playerKnockdownChanceBasisPoints
    : policy.monsterKnockdownChanceBasisPoints;
  const successIds = versusPlayer ? [119, 127] : [119, 135];
  const resistanceIds = versusPlayer ? [120, 128] : [120, 136];
  const success =
    successIds.reduce(
      (total, statusId) => total + mir4StatusRecordValue(source.mir4?.statusValues, statusId),
      0,
    ) + knockdownTemporaryStatus(source, 'success', versusPlayer);
  const resistance =
    resistanceIds.reduce(
      (total, statusId) => total + mir4StatusRecordValue(target.mir4?.statusValues, statusId),
      0,
    ) + knockdownTemporaryStatus(target, 'resistance', versusPlayer);
  return Math.max(0, Math.min(10_000, Math.trunc(base + success - resistance)));
}

function stunTemporaryStatus(
  entity: Entity,
  lane: 'success' | 'resistance',
  versusPlayer: boolean,
): number {
  const generalId = lane === 'success' ? 48 : 49;
  const contextId = versusPlayer
    ? lane === 'success'
      ? 121
      : 122
    : lane === 'success'
      ? 129
      : 130;
  return mir4NativeStatusBonus(entity, generalId) + mir4NativeStatusBonus(entity, contextId);
}

export function mir4NativeBlitzStrikeConcussionChanceBasisPoints(
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): number | null {
  const concussion = mir4NativeBlitzStrikePolicy(requestedSkillLevel)?.concussion;
  if (!concussion) return null;
  const versusPlayer = playerControlled(target);
  return mir4ControlChanceFromStatuses(
    concussion.chanceBasisPoints + stunTemporaryStatus(source, 'success', versusPlayer),
    'stun',
    source.mir4?.statusValues,
    target.mir4?.statusValues,
    versusPlayer ? 'player' : 'monster',
    stunTemporaryStatus(target, 'resistance', versusPlayer),
  );
}

function concussionDurationMs(
  source: Entity,
  target: Entity,
  policy: Mir4NativeBlitzStrikePolicy,
): number {
  if (!policy.concussion) return 0;
  const versusPlayer = playerControlled(target);
  return mir4ControlDurationMs(
    policy.concussion.additionalStunMs,
    'stun',
    source.mir4?.statusValues,
    target.mir4?.statusValues,
    versusPlayer ? 'player' : 'monster',
    stunTemporaryStatus(target, 'resistance', versusPlayer),
    mir4NativeStatusBonus(source, 153),
  );
}

function replaceFailureResistanceDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: Mir4NativeBlitzStrikePolicy,
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

function chanceLands(chanceBasisPoints: number, rollBasisPoints: () => number): boolean {
  return (
    chanceBasisPoints >= 10_000 || (chanceBasisPoints > 0 && rollBasisPoints() < chanceBasisPoints)
  );
}

export function applyMir4NativeBlitzStrikeFinalContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  sourcePhysicalAttack: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): Mir4NativeBlitzStrikeContactResult {
  const policy = mir4NativeBlitzStrikePolicy(requestedSkillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(SKILL_ID, attackId);
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  const rejected: Mir4NativeBlitzStrikeContactResult = {
    knockedDown: false,
    failureResistanceDebuffApplied: false,
    bleedApplied: false,
    concussionTriggered: false,
    stunned: false,
  };
  if (
    !policy ||
    !reaction ||
    !skillName ||
    attackId !== FINAL_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    source.dead ||
    target.dead
  ) {
    return rejected;
  }

  const knockdownChance = mir4NativeBlitzStrikeKnockdownChanceBasisPoints(
    source,
    target,
    policy.skillLevel,
  );
  if (knockdownChance !== null && chanceLands(knockdownChance, rollBasisPoints)) {
    const concussionChance = mir4NativeBlitzStrikeConcussionChanceBasisPoints(
      source,
      target,
      policy.skillLevel,
    );
    const concussionTriggered =
      concussionChance !== null && chanceLands(concussionChance, rollBasisPoints);
    const additionalStunMs = concussionTriggered ? concussionDurationMs(source, target, policy) : 0;
    const admission = applyMir4Effect(ctx, target, {
      effectId: reaction.effectId,
      kind: reaction.kind,
      durationSeconds: (reaction.durationMs + additionalStunMs) / 1_000,
      magnitude: 0,
      name: concussionTriggered ? `${skillName}: Concussion` : skillName,
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
      const bleedApplied =
        policy.bleed !== null &&
        applyMir4NativePeriodicDamage(ctx, source, target, {
          buffId: policy.bleed.buffId,
          skillId: SKILL_ID,
          attackId: FINAL_ATTACK_ID,
          skillLevel: policy.bleed.buffLevel,
          sourcePhysicalAttack,
        });
      return {
        knockedDown: true,
        failureResistanceDebuffApplied: false,
        bleedApplied,
        concussionTriggered,
        stunned: concussionTriggered && additionalStunMs > 0,
      };
    }
  }

  return {
    knockedDown: false,
    failureResistanceDebuffApplied: replaceFailureResistanceDebuff(ctx, source, target, policy),
    bleedApplied: false,
    concussionTriggered: false,
    stunned: false,
  };
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

export function mir4NativeBlitzStrikePersistentSkillDamageReductionBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeBlitzStrikePolicy(learnedSkillLevel(ctx, source))
      ?.persistentSkillDamageReductionBasisPoints ?? 0
  );
}
