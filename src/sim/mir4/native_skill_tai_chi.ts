import type {
  Mir4NativeSkillAction,
  Mir4NativeSkillAttackRow,
  Mir4SkillDef,
} from '../content/mir4';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_taoist';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4PendingImpact } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { applyMir4Effect } from './effects';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import { mir4PartyPulseTargets } from './party_support';
import { mir4StatusRecordValue } from './status_values';

const SKILL_ID = 3201 as const;
const CONTROL_IMMUNITY_BUFF_ID = 31051 as const;
const SOURCE_SPECIAL_ATTACK_ID = 320102 as const;
const FINAL_DAMAGE_ATTACK_ID = 320106 as const;
const PARTY_SPECIAL_ATTACK_ID = 320107 as const;

export interface Mir4NativeTaiChiPolicy {
  readonly skillId: 3201;
  readonly skillLevel: number;
  readonly controlImmunityAttackId: 320101;
  readonly controlImmunityApplyAtMs: 20;
  readonly controlImmunityDurationMs: 5_000;
  readonly sourceSpecialAttackId: 320102;
  readonly sourceSpecialApplyAtMs: 490;
  readonly partySpecialAttackId: 320107;
  readonly partySpecialApplyAtMs: 1_440;
  readonly partyRadiusYards: 10;
  readonly partyHeightYards: 4;
  readonly partyTargetCap: 8;
  readonly permanentEvasion: number;
  readonly burstEvasion: number;
  readonly monsterSkillDamageAmplificationBasisPoints: number;
  readonly playerSkillDamageAmplificationBasisPoints: number;
  readonly partySkillHealingBasisPoints: number;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownChanceBasisPoints: number;
  readonly knockdownDurationMs: 2_100;
  readonly brokenWeapon: Readonly<{
    chanceBasisPoints: number;
    amount: number;
    durationMs: 300_000;
  }> | null;
  readonly accuracyLoss: Readonly<{ amount: 300; durationMs: 15_000 }> | null;
  /** MirMobile passes CCUserCheck but its recovered consumer never reads it. */
  readonly targetCountChanceRule: 'client-passed-unused';
}

export type Mir4NativeTaiChiSetup = Extract<
  NonNullable<Mir4PendingImpact['nativeSetup']>,
  | 'taoist-tai-chi-control-immunity'
  | 'taoist-tai-chi-source-rank-effects'
  | 'taoist-tai-chi-party-recovery'
>;

export interface Mir4NativeTaiChiScheduledImpact {
  readonly attackId: 320101 | 320102 | 320107;
  readonly target: Entity;
  readonly dueOffsetMs: 20 | 490 | 1440;
  readonly nativeSetup: Mir4NativeTaiChiSetup;
}

function exactNativeTaiChiSource(): Mir4NativeSkillAction | null {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  if (
    !action ||
    action.nativeBehavior.damageType !== 0 ||
    action.nativeBehavior.primaryDamage.coefficient !== 240 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 5 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 80 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 2 ||
    action.rows.length !== 7
  ) {
    return null;
  }
  return action;
}

/**
 * Reconcile the SKILL-level hybrid summary with the six exact SKILL_ATTACK rows.
 * The source summary rounds each channel independently to whole percentage points;
 * runtime damage remains owned by the unrounded per-row coefficients.
 */
export function mir4NativeTaiChiDamageSummaryMatches(
  action: Mir4NativeSkillAction,
  skill: Mir4SkillDef,
): boolean {
  const exact = exactNativeTaiChiSource();
  if (exact !== action || !skill.damage || skill.skillId !== SKILL_ID) return false;
  const damagingRows = action.rows.filter((row) => row.nativeBehavior.damageType === 3);
  const physicalCoefficient = damagingRows.reduce(
    (total, row) => total + row.nativeBehavior.physicalDamage.coefficient,
    0,
  );
  const physicalLevelUp = damagingRows.reduce(
    (total, row) => total + row.nativeBehavior.physicalDamage.levelUpCoefficient,
    0,
  );
  const magicCoefficient = damagingRows.reduce(
    (total, row) => total + row.nativeBehavior.magicDamage.coefficient,
    0,
  );
  const magicLevelUp = damagingRows.reduce(
    (total, row) => total + row.nativeBehavior.magicDamage.levelUpCoefficient,
    0,
  );
  return (
    physicalCoefficient === 24_000 &&
    physicalLevelUp === 500 &&
    magicCoefficient === 8_000 &&
    magicLevelUp === 160 &&
    skill.damage.aggregateCoefficient === 32_000 &&
    skill.damage.aggregateLevelUpCoefficient === 660
  );
}

/** First contact applies the native five-second cast control-immunity marker. */
export function mir4NativeTaiChiBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  const action = exactNativeTaiChiSource();
  const buff = mir4NativeSkillBuffEvidenceById(CONTROL_IMMUNITY_BUFF_ID)?.rawRecord;
  return (
    action?.rows[0] === row &&
    row.attackId === 320101 &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === CONTROL_IMMUNITY_BUFF_ID &&
    row.nativeBehavior.ccBuffIds.length === 0 &&
    buff?.BuffTime === 5 &&
    buff.BuffTarget === 1 &&
    buff.BuffIndexType_1 === 3 &&
    buff.BuffIndex_1 === 4004 &&
    buff.BuffProbability === 1000
  );
}

/** Exact rank milestones recovered from special rows 148..153 and their BUFF links. */
export function mir4NativeTaiChiPolicy(requestedSkillLevel: number): Mir4NativeTaiChiPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeTaiChiSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    controlImmunityAttackId: 320101,
    controlImmunityApplyAtMs: 20,
    controlImmunityDurationMs: 5_000,
    sourceSpecialAttackId: SOURCE_SPECIAL_ATTACK_ID,
    sourceSpecialApplyAtMs: 490,
    partySpecialAttackId: PARTY_SPECIAL_ATTACK_ID,
    partySpecialApplyAtMs: 1_440,
    partyRadiusYards: 10,
    partyHeightYards: 4,
    partyTargetCap: 8,
    permanentEvasion: rank5 ? 50 : 0,
    burstEvasion: rank10 ? 750 : rank8 ? 500 : rank5 ? 250 : 0,
    monsterSkillDamageAmplificationBasisPoints: rank10 ? 2_000 : rank8 ? 1_500 : rank5 ? 1_000 : 0,
    playerSkillDamageAmplificationBasisPoints: rank10 ? 1_500 : rank8 ? 1_000 : rank5 ? 500 : 0,
    partySkillHealingBasisPoints: rank10 ? 5_000 : rank8 ? 3_000 : rank5 ? 1_500 : 0,
    monsterKnockdownChanceBasisPoints: 10_000,
    playerKnockdownChanceBasisPoints: rank10 ? 10_000 : rank8 ? 6_000 : rank5 ? 3_000 : 1_000,
    knockdownDurationMs: 2_100,
    brokenWeapon: rank8
      ? Object.freeze({
          chanceBasisPoints: rank10 ? 10_000 : 6_500,
          amount: rank10 ? 80 : 50,
          durationMs: 300_000 as const,
        })
      : null,
    accuracyLoss: rank10
      ? Object.freeze({ amount: 300 as const, durationMs: 15_000 as const })
      : null,
    targetCountChanceRule: 'client-passed-unused' as const,
  });
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
  target.auras = target.auras.filter((aura) => aura.id !== spec.effectId);
  return applyMir4Effect(ctx, target, { ...spec, sourceId: source.id }).ok;
}

function applyStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  statusId: number,
  durationMs: number,
  magnitude: number,
  unremovable = false,
): boolean {
  return replaceEffect(ctx, source, target, {
    effectId: `mir4_native_buff_${buffId}_${statusId}`,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude,
    nativeStatusId: statusId,
    unremovable,
    name: 'Tai Chi',
    sourceId: source.id,
  });
}

function activeNativeBuff(target: Entity, buffId: number): boolean {
  const prefix = `mir4_native_buff_${buffId}`;
  return (
    target.mir4Effects?.active.some(
      (effect) =>
        effect.remaining > CAST_COMPLETE_EPS &&
        (effect.effectId === prefix || effect.effectId.startsWith(`${prefix}_`)),
    ) === true
  );
}

export function applyMir4NativeTaiChiControlImmunity(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeTaiChiPolicy(requestedSkillLevel);
  if (!policy || source.dead) return false;
  return replaceEffect(ctx, source, source, {
    effectId: 'mir4_native_buff_31051',
    kind: 'control-immunity',
    durationSeconds: policy.controlImmunityDurationMs / 1_000,
    magnitude: 0,
    name: 'Tai Chi: Control Immunity',
    sourceId: source.id,
  });
}

export function applyMir4NativeTaiChiSourceRankEffects(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeTaiChiPolicy(requestedSkillLevel);
  if (!policy || source.dead || policy.permanentEvasion <= 0) return false;
  const temporaryKnockdownSuccessBasisPoints = policy.playerKnockdownChanceBasisPoints - 1_000;
  return [
    applyStatus(ctx, source, source, 30103, 29, 30_000, policy.permanentEvasion),
    applyStatus(ctx, source, source, 30104, 29, 5_000, policy.burstEvasion),
    applyStatus(ctx, source, source, 10101, 127, 3_000, temporaryKnockdownSuccessBasisPoints),
  ].every(Boolean);
}

/** Test/diagnostic convenience for the complete source-side package. */
export function applyMir4NativeTaiChiSourceEffects(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const immunity = applyMir4NativeTaiChiControlImmunity(ctx, source, requestedSkillLevel);
  const policy = mir4NativeTaiChiPolicy(requestedSkillLevel);
  if (!policy || !immunity) return false;
  return (
    policy.permanentEvasion <= 0 ||
    applyMir4NativeTaiChiSourceRankEffects(ctx, source, policy.skillLevel)
  );
}

export function applyMir4NativeTaiChiPartyRecoveryBuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeTaiChiPolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead || policy.partySkillHealingBasisPoints <= 0)
    return false;
  return applyStatus(ctx, source, target, 30211, 148, 8_000, policy.partySkillHealingBasisPoints);
}

export function mir4NativeTaiChiScheduledImpacts(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): readonly Mir4NativeTaiChiScheduledImpact[] {
  const policy = mir4NativeTaiChiPolicy(requestedSkillLevel);
  if (!policy || source.dead) return [];
  const impacts: Mir4NativeTaiChiScheduledImpact[] = [
    {
      attackId: policy.controlImmunityAttackId,
      target: source,
      dueOffsetMs: policy.controlImmunityApplyAtMs,
      nativeSetup: 'taoist-tai-chi-control-immunity',
    },
  ];
  if (policy.permanentEvasion <= 0) return impacts;
  impacts.push({
    attackId: policy.sourceSpecialAttackId,
    target: source,
    dueOffsetMs: policy.sourceSpecialApplyAtMs,
    nativeSetup: 'taoist-tai-chi-source-rank-effects',
  });
  for (const target of mir4PartyPulseTargets(ctx, source, {
    radiusYards: policy.partyRadiusYards,
    heightYards: policy.partyHeightYards,
    maxTargets: policy.partyTargetCap,
  })) {
    impacts.push({
      attackId: policy.partySpecialAttackId,
      target,
      dueOffsetMs: policy.partySpecialApplyAtMs,
      nativeSetup: 'taoist-tai-chi-party-recovery',
    });
  }
  return impacts;
}

export function isMir4NativeTaiChiSetup(
  skillId: number | undefined,
  nativeSetup: Mir4PendingImpact['nativeSetup'],
): nativeSetup is Mir4NativeTaiChiSetup {
  return (
    skillId === SKILL_ID &&
    (nativeSetup === 'taoist-tai-chi-control-immunity' ||
      nativeSetup === 'taoist-tai-chi-source-rank-effects' ||
      nativeSetup === 'taoist-tai-chi-party-recovery')
  );
}

/** Rank 5+ target effects belong to the first landed 320102 hybrid contact. */
export function applyMir4NativeTaiChiSpecialContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): boolean {
  const policy = mir4NativeTaiChiPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    target.dead ||
    attackId !== SOURCE_SPECIAL_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    !ctx.isHostileTo(source, target) ||
    policy.permanentEvasion <= 0
  ) {
    return false;
  }
  const pvpTarget = target.kind === 'player' || target.ownerId !== null;
  const amplificationBasisPoints = pvpTarget
    ? policy.playerSkillDamageAmplificationBasisPoints
    : policy.monsterSkillDamageAmplificationBasisPoints;
  let applied = applyStatus(
    ctx,
    source,
    target,
    30502,
    45,
    30_000,
    -amplificationBasisPoints / 100,
  );
  if (
    policy.brokenWeapon &&
    activeNativeBuff(target, 30514) &&
    activeNativeBuff(target, 30515) &&
    (policy.brokenWeapon.chanceBasisPoints >= 10_000 ||
      rollBasisPoints() < policy.brokenWeapon.chanceBasisPoints)
  ) {
    for (const statusId of [28, 29] as const) {
      applied =
        applyStatus(
          ctx,
          source,
          target,
          30516,
          statusId,
          policy.brokenWeapon.durationMs,
          -policy.brokenWeapon.amount,
          true,
        ) || applied;
    }
    for (const statusId of [20, 22] as const) {
      applied =
        applyStatus(
          ctx,
          source,
          target,
          30517,
          statusId,
          policy.brokenWeapon.durationMs,
          -policy.brokenWeapon.amount,
          true,
        ) || applied;
    }
  }
  if (policy.accuracyLoss) {
    applied =
      applyStatus(
        ctx,
        source,
        target,
        30504,
        28,
        policy.accuracyLoss.durationMs,
        -policy.accuracyLoss.amount,
      ) || applied;
  }
  return applied;
}

function taiChiKnockdownChanceBasisPoints(
  source: Entity,
  target: Entity,
  policy: Mir4NativeTaiChiPolicy,
): number {
  const sourceStatuses = source.mir4?.statusValues;
  const targetStatuses = target.mir4?.statusValues;
  const pvpTarget = target.kind === 'player' || target.ownerId !== null;
  const base = pvpTarget
    ? policy.playerKnockdownChanceBasisPoints
    : policy.monsterKnockdownChanceBasisPoints;
  const success =
    mir4StatusRecordValue(sourceStatuses, 119) +
    mir4StatusRecordValue(sourceStatuses, pvpTarget ? 127 : 135);
  const resistance =
    mir4StatusRecordValue(targetStatuses, 120) +
    mir4StatusRecordValue(targetStatuses, pvpTarget ? 128 : 136);
  return Math.max(0, Math.min(10_000, Math.trunc(base + success - resistance)));
}

/** Apply the final contact's native monster/PvP knockdown ladder once per hybrid hit. */
export function applyMir4NativeTaiChiFinalContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): boolean {
  const policy = mir4NativeTaiChiPolicy(requestedSkillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(SKILL_ID, FINAL_DAMAGE_ATTACK_ID);
  if (
    !policy ||
    !reaction ||
    source.dead ||
    target.dead ||
    attackId !== FINAL_DAMAGE_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    !ctx.isHostileTo(source, target)
  ) {
    return false;
  }
  const chance = taiChiKnockdownChanceBasisPoints(source, target, policy);
  if (chance <= 0 || (chance < 10_000 && rollBasisPoints() >= chance)) return false;
  const applied = replaceEffect(ctx, source, target, {
    effectId: reaction.effectId,
    kind: reaction.kind,
    durationSeconds: policy.knockdownDurationMs / 1_000,
    magnitude: 0,
    name: 'Tai Chi',
    sourceId: source.id,
  });
  if (!applied) return false;
  applyMir4NativeAdmittedCrowdControlReaction(
    ctx,
    source,
    target,
    SKILL_ID,
    FINAL_DAMAGE_ATTACK_ID,
    reaction,
  );
  return true;
}
