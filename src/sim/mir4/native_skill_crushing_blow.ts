import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { resolveMobTemplate } from '../mob/template';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import { mir4StatusRecordValue } from './status_values';

const SKILL_ID = 5303 as const;
const SETUP_ATTACK_ID = 530301 as const;
const BUFF_ATTACK_ID = 530302 as const;
const FINAL_ATTACK_ID = 530303 as const;
const INVINCIBLE_BUFF_ID = 53011 as const;

export interface Mir4NativeCrushingBlowTimedStatus {
  readonly buffId: 50101 | 50102 | 50107;
  readonly magnitudeBasisPoints: number;
  readonly durationMs: number;
}

export interface Mir4NativeCrushingBlowResistanceDebuff {
  readonly buffId: 50505;
  readonly effectId: 'mir4_native_buff_50505_120';
  readonly nativeStatusId: 120;
  readonly magnitudeBasisPoints: number;
  readonly durationMs: number;
}

export interface Mir4NativeCrushingBlowPolicy {
  readonly skillId: 5303;
  readonly skillLevel: number;
  readonly invincibility: Readonly<{ buffId: 53011; applyAtMs: 20; durationMs: 1_000 }>;
  readonly rankBuffApplyAtMs: 400;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownChanceBasisPoints: number;
  readonly bossSkillDamageBasisPoints: number;
  readonly sourceSkillDamageBoost: Mir4NativeCrushingBlowTimedStatus | null;
  readonly sourceCooldownReduction: Mir4NativeCrushingBlowTimedStatus | null;
  readonly failureResistanceDebuff: Mir4NativeCrushingBlowResistanceDebuff | null;
  readonly playerMultiTargetChanceRule: 'client-passed-unused';
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

function invincibilityEvidenceExact(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(INVINCIBLE_BUFF_ID)?.rawRecord;
  return (
    raw?.BuffId === INVINCIBLE_BUFF_ID &&
    raw.BuffUseType === 1 &&
    raw.ApplyType === 0 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 1 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4003
  );
}

function timedStatusEvidenceExact(buffId: 50101 | 50102 | 50107, statusId: 44 | 95): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(buffId)?.rawRecord;
  if (!raw) return false;
  if (
    raw.BuffId !== buffId ||
    raw.ApplyType !== 0 ||
    raw.BuffProbability !== 1_000 ||
    raw.BuffIndexType_1 !== 1 ||
    raw.BuffIndex_1 !== statusId ||
    raw.BuffOverlap !== 0
  ) {
    return false;
  }
  if (buffId === 50101) {
    return raw.BuffTime === 15 && raw.BuffValue_1 === 100 && raw.LevelUpBuffValue_1 === 100;
  }
  if (buffId === 50102) {
    return raw.BuffTime === 15 && raw.BuffValue_1 === 2_000 && raw.LevelUpBuffValue_1 === 0;
  }
  return raw.BuffTime === 20 && raw.BuffValue_1 === 3_000 && raw.LevelUpBuffValue_1 === 2_000;
}

function failureDebuffEvidenceExact(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(50505)?.rawRecord;
  return (
    raw?.BuffId === 50505 &&
    raw.ApplyType === 1 &&
    raw.BuffTime === 10 &&
    raw.LevelUpBuffTime === 5 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 1 &&
    raw.BuffIndex_1 === 120 &&
    raw.BuffValue_1 === -100 &&
    raw.LevelUpBuffValue_1 === -50
  );
}

/** Exact 5303 action guard; source drift closes every skill-owned policy. */
export function mir4NativeCrushingBlowSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const setup = action?.rows[0];
  const spin = action?.rows[1];
  const finish = action?.rows[2];
  return (
    action?.cooldownMs === 38_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 4_200 &&
    action.attackAnimationMs === 1_760 &&
    action.endCutAnimationMs === 1_600 &&
    action.hitCount === 4 &&
    action.requiredClassLevel === 24 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.nativeBehavior.primaryDamage.coefficient === 240 &&
    action.nativeBehavior.primaryDamage.levelUpCoefficient === 5 &&
    action.rows.length === 3 &&
    setup?.attackId === SETUP_ATTACK_ID &&
    setup.nextAttackId === BUFF_ATTACK_ID &&
    setup.movement.kind === 'target' &&
    setup.movement.nativeRange === 300 &&
    setup.movement.durationMs === 300 &&
    setup.impactOffsetsMs.length === 1 &&
    setup.impactOffsetsMs[0] === 20 &&
    setup.nativeBehavior.buffIds.length === 1 &&
    setup.nativeBehavior.buffIds[0] === INVINCIBLE_BUFF_ID &&
    spin?.attackId === BUFF_ATTACK_ID &&
    spin.nextAttackId === FINAL_ATTACK_ID &&
    spin.movement.kind === 'target' &&
    spin.movement.nativeRange === 100 &&
    spin.movement.durationMs === 400 &&
    spin.impactOffsetsMs.length === 3 &&
    spin.impactOffsetsMs[0] === 400 &&
    spin.impactOffsetsMs[1] === 550 &&
    spin.impactOffsetsMs[2] === 700 &&
    spin.nativeBehavior.physicalDamage.coefficient === 18_000 &&
    spin.nativeBehavior.physicalDamage.levelUpCoefficient === 350 &&
    spin.reaction.kind === 'knock-back' &&
    finish?.attackId === FINAL_ATTACK_ID &&
    finish.viewTarget === 2 &&
    finish.movement.kind === 'none' &&
    finish.impactOffsetsMs.length === 1 &&
    finish.impactOffsetsMs[0] === 890 &&
    finish.nativeBehavior.physicalDamage.coefficient === 6_000 &&
    finish.nativeBehavior.physicalDamage.levelUpCoefficient === 150 &&
    finish.reaction.kind === 'knock-down' &&
    finish.nativeBehavior.superIgnore === 100 &&
    finish.nativeBehavior.superArmor === 9_000 &&
    finish.nativeBehavior.ccUserCheck === 1_000 &&
    invincibilityEvidenceExact() &&
    timedStatusEvidenceExact(50101, 44) &&
    timedStatusEvidenceExact(50102, 95) &&
    timedStatusEvidenceExact(50107, 95) &&
    failureDebuffEvidenceExact()
  );
}

/** Rank 1/5/8/10 semantics from special rows 278..283 and their BUFF links. */
export function mir4NativeCrushingBlowPolicy(
  requestedSkillLevel: number,
): Mir4NativeCrushingBlowPolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null || !mir4NativeCrushingBlowSourceMatches()) return null;
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    invincibility: Object.freeze({
      buffId: INVINCIBLE_BUFF_ID,
      applyAtMs: 20 as const,
      durationMs: 1_000 as const,
    }),
    rankBuffApplyAtMs: 400 as const,
    monsterKnockdownChanceBasisPoints: 10_000 as const,
    playerKnockdownChanceBasisPoints: rank10 ? 10_000 : rank8 ? 6_000 : rank5 ? 3_000 : 1_000,
    bossSkillDamageBasisPoints: rank10 ? 10_000 : rank8 ? 5_000 : rank5 ? 2_500 : 0,
    sourceSkillDamageBoost: rank5
      ? Object.freeze({
          buffId: 50101 as const,
          magnitudeBasisPoints: rank10 ? 3_000 : rank8 ? 2_000 : 1_000,
          durationMs: 15_000,
        })
      : null,
    sourceCooldownReduction: rank5
      ? Object.freeze({
          buffId: (rank8 ? 50107 : 50102) as 50102 | 50107,
          magnitudeBasisPoints: rank10 ? 5_000 : rank8 ? 3_000 : 2_000,
          durationMs: rank8 ? 20_000 : 15_000,
        })
      : null,
    failureResistanceDebuff: rank5
      ? Object.freeze({
          buffId: 50505 as const,
          effectId: 'mir4_native_buff_50505_120' as const,
          nativeStatusId: 120 as const,
          magnitudeBasisPoints: rank10 ? -2_000 : rank8 ? -1_500 : -1_000,
          durationMs: rank10 ? 20_000 : rank8 ? 15_000 : 10_000,
        })
      : null,
    playerMultiTargetChanceRule: 'client-passed-unused' as const,
  });
}

export function mir4NativeCrushingBlowBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeCrushingBlowSourceMatches() &&
    row.attackId === SETUP_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === INVINCIBLE_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 20
  );
}

function replaceEffect(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: Parameters<typeof applyMir4Effect>[2],
): boolean {
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== spec.effectId,
    );
  }
  return applyMir4Effect(ctx, target, { ...spec, sourceId: source.id }).ok;
}

export function applyMir4NativeCrushingBlowInvincibility(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeCrushingBlowPolicy(requestedSkillLevel);
  if (!policy || source.dead) return false;
  return replaceEffect(ctx, source, source, {
    effectId: `mir4_native_buff_${policy.invincibility.buffId}`,
    kind: 'invincible',
    durationSeconds: policy.invincibility.durationMs / 1_000,
    magnitude: 0,
    name: 'Crushing Blow: Invincible',
    sourceId: source.id,
  });
}

export function applyMir4NativeCrushingBlowRankBuffs(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeCrushingBlowPolicy(requestedSkillLevel);
  if (!policy || source.dead) return false;
  if (!policy.sourceSkillDamageBoost || !policy.sourceCooldownReduction) return true;
  const skillDamage = policy.sourceSkillDamageBoost;
  const cooldown = policy.sourceCooldownReduction;
  return [
    replaceEffect(ctx, source, source, {
      effectId: `mir4_native_buff_${skillDamage.buffId}_44`,
      kind: 'native-status-boost',
      durationSeconds: skillDamage.durationMs / 1_000,
      magnitude: skillDamage.magnitudeBasisPoints,
      nativeStatusId: 44,
      name: 'Crushing Blow: Skill Damage',
      sourceId: source.id,
    }),
    replaceEffect(ctx, source, source, {
      effectId: `mir4_native_buff_${cooldown.buffId}_95`,
      kind: 'native-status-boost',
      durationSeconds: cooldown.durationMs / 1_000,
      magnitude: cooldown.magnitudeBasisPoints,
      nativeStatusId: 95,
      name: 'Crushing Blow: Skill Cooldown Reduction',
      sourceId: source.id,
    }),
  ].every(Boolean);
}

/** Skill-owned boss multiplier; 10_000 means no change. */
export function mir4NativeCrushingBlowConditionalDamageBasisPoints(
  ctx: Pick<SimContext, 'mir4RuntimeMobTemplates'>,
  target: Entity,
  skillId: number | undefined,
  requestedSkillLevel: number,
): number {
  if (skillId !== SKILL_ID) return 10_000;
  const policy = mir4NativeCrushingBlowPolicy(requestedSkillLevel);
  if (!policy || target.kind !== 'mob') return 10_000;
  const template = resolveMobTemplate(target.templateId, ctx.mir4RuntimeMobTemplates);
  return 10_000 + (template?.boss ? policy.bossSkillDamageBasisPoints : 0);
}

function playerControlled(target: Entity): boolean {
  return target.kind === 'player' || target.ownerId !== null;
}

export function mir4NativeCrushingBlowKnockdownChanceBasisPoints(
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): number | null {
  const policy = mir4NativeCrushingBlowPolicy(requestedSkillLevel);
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
  policy: Mir4NativeCrushingBlowPolicy,
): boolean {
  const debuff = policy.failureResistanceDebuff;
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  if (!debuff || !skillName) return false;
  return replaceEffect(ctx, source, target, {
    effectId: debuff.effectId,
    kind: 'native-status-boost',
    durationSeconds: debuff.durationMs / 1_000,
    magnitude: debuff.magnitudeBasisPoints,
    nativeStatusId: debuff.nativeStatusId,
    name: `${skillName}: Knockdown RES`,
    sourceId: source.id,
  });
}

export function applyMir4NativeCrushingBlowFinalContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): { readonly knockedDown: boolean; readonly failureResistanceDebuffApplied: boolean } {
  const policy = mir4NativeCrushingBlowPolicy(requestedSkillLevel);
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

  const chance = mir4NativeCrushingBlowKnockdownChanceBasisPoints(
    source,
    target,
    policy.skillLevel,
  );
  if (chance !== null && (chance >= 10_000 || rollBasisPoints() < chance)) {
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
