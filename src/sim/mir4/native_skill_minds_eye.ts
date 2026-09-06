import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { mir4NativeDirectRawEvidenceBySkillId } from '../content/mir4/native_skill_direct_raw_evidence';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4PendingImpact } from '../types';
import { applyMir4Effect } from './effects';
import { mir4NativeArbalistFocusBuffEvidenceExact } from './native_skill_quick_shot';
import { mir4PartyPulseTargets } from './party_support';

const SKILL_ID = 4111 as const;
const ATTACK_ID = 411101 as const;
const BASE_BUFF_ID = 43041 as const;
const FOCUS_BUFF_ID = 41010 as const;

export interface Mir4NativeMindsEyeMilestone {
  readonly accuracy: number;
  readonly critical: number;
  readonly durationMs: number;
  readonly dispelsBlind: boolean;
  readonly mpPotionEfficiencyBasisPoints: number;
}

export interface Mir4NativeMindsEyePolicy {
  readonly skillId: 4111;
  readonly skillLevel: number;
  readonly attackId: 411101;
  readonly sourceAttackId: 411101;
  readonly buffId: 43041;
  readonly applyAtMs: 564;
  readonly radiusYards: 15;
  readonly heightYards: 4;
  readonly targetCap: 5;
  readonly physicalAttackFlat: number;
  readonly buffDurationMs: 30_000;
  readonly focusBuffId: 41010;
  readonly milestone: Mir4NativeMindsEyeMilestone | null;
  readonly persistentBossDamageBasisPoints: number;
  readonly persistentAllDamageReductionBasisPoints: number;
}

export type Mir4NativeMindsEyeSetup = Extract<
  NonNullable<Mir4PendingImpact['nativeSetup']>,
  'arbalist-minds-eye-party-buffs'
>;

export interface Mir4NativeMindsEyeScheduledImpact {
  readonly attackId: 411101;
  readonly target: Entity;
  readonly dueOffsetMs: 564;
  readonly nativeSetup: Mir4NativeMindsEyeSetup;
}

function exactNativeMindsEyeSource(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const rawSkill = mir4NativeDirectRawEvidenceBySkillId(SKILL_ID)?.rawSkillRecord;
  const row = action?.rows[0];
  const buff = mir4NativeSkillBuffEvidenceById(BASE_BUFF_ID)?.rawRecord;
  const ability = action?.nativeBehavior.abilities[0];
  return Boolean(
    action &&
      rawSkill &&
      row &&
      buff &&
      action.cooldownMs === 30_000 &&
      action.skillCostType === 2 &&
      action.skillCost === 2_000 &&
      action.attackAnimationMs === 1_000 &&
      action.endCutAnimationMs === 850 &&
      action.hitCount === 5 &&
      action.requiredClassLevel === 16 &&
      action.targeting === false &&
      rawSkill.SpecialLevel.join(',') === '1,5,8,10' &&
      rawSkill.SpecialNoteSid.join(',') === '344211,344311,344411,344511' &&
      ability?.type === 20 &&
      ability.value === 10 &&
      ability.levelUpValue === 10 &&
      ability.time === 30 &&
      row.attackId === ATTACK_ID &&
      row.nativeBehavior.attackUseType === 1 &&
      row.targetType === 2 &&
      row.authorialTargetValue === 5 &&
      row.impactType === 2 &&
      row.impactOffsetsMs.length === 1 &&
      row.impactOffsetsMs[0] === 564 &&
      row.geometry.angleDegrees === 360 &&
      row.geometry.nativeDistanceMax === 1_500 &&
      row.geometry.nativeHeight === 400 &&
      buff.BuffTime === 30 &&
      buff.BuffIndexType_1 === 1 &&
      buff.BuffIndex_1 === 20 &&
      buff.BuffValue_1 === 10 &&
      buff.LevelUpBuffValue_1 === 10 &&
      mir4NativeArbalistFocusBuffEvidenceExact(),
  );
}

export function mir4NativeMindsEyeBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    exactNativeMindsEyeSource() &&
    row.attackId === ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 2 &&
    row.nativeBehavior.buffIds[0] === BASE_BUFF_ID &&
    row.nativeBehavior.buffIds[1] === FOCUS_BUFF_ID &&
    row.nativeBehavior.ccBuffIds.length === 0
  );
}

export function mir4NativeMindsEyePolicy(
  requestedSkillLevel: number,
): Mir4NativeMindsEyePolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeMindsEyeSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.trunc(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  const milestone = rank10
    ? Object.freeze({
        accuracy: 240,
        critical: 120,
        durationMs: 15_000,
        dispelsBlind: true,
        mpPotionEfficiencyBasisPoints: 3_000,
      })
    : rank8
      ? Object.freeze({
          accuracy: 160,
          critical: 80,
          durationMs: 10_000,
          dispelsBlind: true,
          mpPotionEfficiencyBasisPoints: 2_000,
        })
      : rank5
        ? Object.freeze({
            accuracy: 100,
            critical: 50,
            durationMs: 10_000,
            dispelsBlind: false,
            mpPotionEfficiencyBasisPoints: 0,
          })
        : null;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    attackId: ATTACK_ID,
    sourceAttackId: ATTACK_ID,
    buffId: BASE_BUFF_ID,
    applyAtMs: 564,
    radiusYards: 15,
    heightYards: 4,
    targetCap: 5,
    physicalAttackFlat: 10 + 10 * (skillLevel - 1),
    buffDurationMs: 30_000,
    focusBuffId: FOCUS_BUFF_ID,
    milestone,
    persistentBossDamageBasisPoints: rank10 ? 1_500 : rank8 ? 1_000 : 0,
    persistentAllDamageReductionBasisPoints: rank10 ? 2_000 : rank8 ? 1_000 : 0,
  });
}

export function mir4NativeMindsEyeScheduledImpacts(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): readonly Mir4NativeMindsEyeScheduledImpact[] {
  const policy = mir4NativeMindsEyePolicy(requestedSkillLevel);
  if (!policy || source.dead) return [];
  return mir4PartyPulseTargets(ctx, source, {
    radiusYards: policy.radiusYards,
    heightYards: policy.heightYards,
    maxTargets: policy.targetCap,
  }).map((target) => ({
    attackId: policy.attackId,
    target,
    dueOffsetMs: policy.applyAtMs,
    nativeSetup: 'arbalist-minds-eye-party-buffs' as const,
  }));
}

export function isMir4NativeMindsEyeSetup(
  skillId: number | undefined,
  nativeSetup: Mir4PendingImpact['nativeSetup'],
): nativeSetup is Mir4NativeMindsEyeSetup {
  return skillId === SKILL_ID && nativeSetup === 'arbalist-minds-eye-party-buffs';
}

function removeEffects(target: Entity, predicate: (kind: string) => boolean): void {
  const removed = new Set(
    (target.mir4Effects?.active ?? [])
      .filter((effect) => !effect.unremovable && predicate(effect.kind))
      .map((effect) => effect.effectId),
  );
  if (removed.size === 0 || !target.mir4Effects) return;
  target.mir4Effects.active = target.mir4Effects.active.filter(
    (effect) => !removed.has(effect.effectId),
  );
  target.auras = target.auras.filter((aura) => !removed.has(aura.id));
}

function replaceNativeStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  effectId: string,
  statusId: number,
  magnitude: number,
  durationMs: number,
  exclusiveEffectIds: readonly string[] = [],
): boolean {
  if (target.mir4Effects) {
    const replaced = new Set([effectId, ...exclusiveEffectIds]);
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => !replaced.has(effect.effectId),
    );
  }
  target.auras = target.auras.filter(
    (aura) => aura.id !== effectId && !exclusiveEffectIds.includes(aura.id),
  );
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude,
    nativeStatusId: statusId,
    name: mir4SkillById(SKILL_ID)?.displayName ?? "Mind's Eye",
    sourceId: source.id,
  }).ok;
}

export function applyMir4NativeMindsEyePartyBuffs(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeMindsEyePolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead) return false;
  const results = [
    replaceNativeStatus(
      ctx,
      source,
      target,
      'mir4_native_buff_43041_20',
      20,
      policy.physicalAttackFlat,
      policy.buffDurationMs,
    ),
  ];
  if (!policy.milestone) return results.every(Boolean);
  if (policy.milestone.dispelsBlind) removeEffects(target, (kind) => kind === 'blind');
  const highRank = policy.skillLevel >= 10;
  results.push(
    replaceNativeStatus(
      ctx,
      source,
      target,
      `mir4_native_buff_${highRank ? 40104 : 40103}_28`,
      28,
      policy.milestone.accuracy,
      policy.milestone.durationMs,
      [`mir4_native_buff_${highRank ? 40103 : 40104}_28`],
    ),
    replaceNativeStatus(
      ctx,
      source,
      target,
      `mir4_native_buff_${highRank ? 40106 : 40105}_30`,
      30,
      policy.milestone.critical,
      policy.milestone.durationMs,
      [`mir4_native_buff_${highRank ? 40105 : 40106}_30`],
    ),
  );
  if (policy.milestone.mpPotionEfficiencyBasisPoints > 0) {
    results.push(
      replaceNativeStatus(
        ctx,
        source,
        target,
        'mir4_native_buff_40107_147',
        147,
        policy.milestone.mpPotionEfficiencyBasisPoints,
        policy.milestone.durationMs,
      ),
    );
  }
  return results.every(Boolean);
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

export function mir4NativeMindsEyePersistentBossDamageBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeMindsEyePolicy(learnedSkillLevel(ctx, source))?.persistentBossDamageBasisPoints ?? 0
  );
}

export function mir4NativeMindsEyePersistentAllDamageReductionBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeMindsEyePolicy(learnedSkillLevel(ctx, source))
      ?.persistentAllDamageReductionBasisPoints ?? 0
  );
}
