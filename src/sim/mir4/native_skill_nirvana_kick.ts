import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { applyMir4NativePeriodicDamage } from './native_periodic_damage';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import { mir4StatusRecordValue } from './status_values';

const SKILL_ID = 5104 as const;
const FINAL_ATTACK_ID = 510402 as const;

export interface Mir4NativeNirvanaKickResistanceDebuff {
  readonly buffId: 50505;
  readonly effectId: 'mir4_native_buff_50505_120';
  readonly nativeStatusId: 120;
  readonly magnitudeBasisPoints: number;
  readonly durationMs: number;
}

export interface Mir4NativeNirvanaKickBleed {
  readonly buffId: 50519;
  readonly buffLevel: number;
  readonly durationMs: 2_000;
}

export interface Mir4NativeNirvanaKickPolicy {
  readonly skillId: 5104;
  readonly skillLevel: number;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownChanceBasisPoints: number;
  readonly failureResistanceDebuff: Mir4NativeNirvanaKickResistanceDebuff | null;
  readonly bleed: Mir4NativeNirvanaKickBleed | null;
  readonly persistentMonsterDamageBasisPoints: number;
  readonly persistentBossDamageBasisPoints: number;
  readonly playerMultiTargetChanceRule: 'client-passed-unused';
}

export interface Mir4NativeNirvanaKickAutoCondition {
  readonly skillId: 5104;
  readonly useControlTime: 3;
  readonly target: 'target';
  readonly condition: 'less-hp';
  readonly searchRangeYards: 10;
  readonly thresholdPercent: 30;
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

/** Exact 5104 action guard; any extracted source drift closes the policy. */
export function mir4NativeNirvanaKickSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const dash = action?.rows[0];
  const kick = action?.rows[1];
  return (
    action?.cooldownMs === 18_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 1_800 &&
    action.attackAnimationMs === 1_233 &&
    action.endCutAnimationMs === 1_000 &&
    action.hitCount === 2 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.rows.length === 2 &&
    dash?.attackId === 510401 &&
    dash.nextAttackId === FINAL_ATTACK_ID &&
    dash.movement?.kind === 'target' &&
    dash.movement.nativeRange === 100 &&
    dash.movement.durationMs === 350 &&
    dash.damage.type === 0 &&
    dash.damage.coefficient === 0 &&
    kick?.attackId === FINAL_ATTACK_ID &&
    kick.viewTarget === 2 &&
    kick.movement?.kind === 'none' &&
    kick.impactType === 3 &&
    kick.impactOffsetsMs.length === 1 &&
    kick.impactOffsetsMs[0] === 600 &&
    kick.geometry.nativeDistanceMax === 450 &&
    kick.geometry.nativeWidth === 500 &&
    kick.damage.type === 1 &&
    kick.damage.coefficient === 16_000 &&
    kick.damage.levelUpCoefficient === 300 &&
    kick.reaction.kind === 'knock-down' &&
    kick.reaction.probabilityPercent === 100 &&
    kick.nativeBehavior.ccUserCheck === 1_000
  );
}

/** Rank milestones recovered from SPA 257-260 and BUFF 50505/50519. */
export function mir4NativeNirvanaKickPolicy(
  requestedSkillLevel: number,
): Mir4NativeNirvanaKickPolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null || !mir4NativeNirvanaKickSourceMatches()) return null;
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
    bleed: rank5
      ? Object.freeze({
          buffId: 50519 as const,
          buffLevel: rank10 ? 13 : rank8 ? 7 : 3,
          durationMs: 2_000 as const,
        })
      : null,
    persistentMonsterDamageBasisPoints: rank10 ? 1_200 : rank8 ? 800 : 0,
    persistentBossDamageBasisPoints: rank10 ? 1_500 : rank8 ? 1_000 : 0,
    playerMultiTargetChanceRule: 'client-passed-unused' as const,
  });
}

/** Exact AUTO-use gate encoded by Target/Less_HP, range 1000, check value 30. */
export function mir4NativeNirvanaKickAutoCondition(): Mir4NativeNirvanaKickAutoCondition | null {
  const behavior = mir4NativeSkillActionById(SKILL_ID)?.nativeBehavior;
  if (
    behavior?.useControlTime !== 3 ||
    behavior.conditionTarget !== 1 ||
    behavior.conditionType !== 1 ||
    behavior.conditionValue !== 0 ||
    behavior.conditionRange !== 1_000 ||
    behavior.conditionCheckTime !== 30
  ) {
    return null;
  }
  return Object.freeze({
    skillId: SKILL_ID,
    useControlTime: 3,
    target: 'target',
    condition: 'less-hp',
    searchRangeYards: 10,
    thresholdPercent: 30,
  });
}

export function mir4NativeNirvanaKickAutoConditionMet(target: Entity): boolean {
  const condition = mir4NativeNirvanaKickAutoCondition();
  return (
    condition !== null &&
    target.maxHp > 0 &&
    (target.hp / target.maxHp) * 100 < condition.thresholdPercent
  );
}

function playerControlled(target: Entity): boolean {
  return target.kind === 'player' || target.ownerId !== null;
}

export function mir4NativeNirvanaKickKnockdownChanceBasisPoints(
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): number | null {
  const policy = mir4NativeNirvanaKickPolicy(requestedSkillLevel);
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

function replaceFailureResistanceDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: Mir4NativeNirvanaKickPolicy,
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

export function applyMir4NativeNirvanaKickFinalContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  sourcePhysicalAttack: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): {
  readonly knockedDown: boolean;
  readonly failureResistanceDebuffApplied: boolean;
  readonly bleedApplied: boolean;
} {
  const policy = mir4NativeNirvanaKickPolicy(requestedSkillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(SKILL_ID, attackId);
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  const rejected = {
    knockedDown: false,
    failureResistanceDebuffApplied: false,
    bleedApplied: false,
  } as const;
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

  const chance = mir4NativeNirvanaKickKnockdownChanceBasisPoints(source, target, policy.skillLevel);
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
      };
    }
  }

  return {
    knockedDown: false,
    failureResistanceDebuffApplied: replaceFailureResistanceDebuff(ctx, source, target, policy),
    bleedApplied: false,
  };
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

export function mir4NativeNirvanaKickPersistentMonsterDamageBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeNirvanaKickPolicy(learnedSkillLevel(ctx, source))
      ?.persistentMonsterDamageBasisPoints ?? 0
  );
}

export function mir4NativeNirvanaKickPersistentBossDamageBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeNirvanaKickPolicy(learnedSkillLevel(ctx, source))?.persistentBossDamageBasisPoints ??
    0
  );
}
