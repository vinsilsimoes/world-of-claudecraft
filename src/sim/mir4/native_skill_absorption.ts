import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { mir4NativeDarknessStacks } from './native_darkness';
import { breakMir4NativeCloaking } from './native_skill_cloaking';
import { mir4ModifiedSkillHealing } from './status_effects';

const SKILL_ID = 5304 as const;
const ATTACK_ID = 530401 as const;
const CHILL_EFFECT_ID = 'mir4_native_buff_20020';
const DAMAGE_AMPLIFICATION_EFFECT_ID = 'mir4_native_buff_50522_47';
const SHIELD_EFFECT_ID = 'mir4_native_buff_50010_47';
const SHIELD_BLOCK_EFFECT_ID = 'mir4_native_buff_50515';
const POISON_EFFECT_ID = 'mir4_native_buff_50516';
const CHARACTER_KILL_PROC_KEY = 'mir4_native_passive_151129_151139';

export interface Mir4NativeAbsorptionPolicy {
  readonly skillId: 5304;
  readonly skillLevel: number;
  readonly damageRecoveryBasisPoints: 10_000 | 25_000 | 50_000 | 80_000;
  readonly selfChillDurationMs: 5_000 | 10_000 | 15_000 | 30_000;
  readonly damageAmplificationBasisPoints: 0 | 2_500 | 5_000 | 7_500;
  readonly damageAmplificationDurationMs: 0 | 5_000;
  readonly shieldBlockDurationMs: 0 | 30_000;
  readonly magicShieldDispelChanceBasisPoints: 0 | 7_000 | 10_000;
  readonly cloakingDispelChanceBasisPoints: 0 | 7_000 | 10_000;
  readonly darknessPoisonChanceBasisPoints: readonly [number, number, number];
  readonly darknessPoisonDurationMs: 0 | 5_000;
  readonly darknessPoisonSpellAttackBasisPoints: 0 | 2_000;
  readonly characterKillRecoveryBasisPoints: 0 | 1_000 | 3_000;
  readonly characterKillCooldownMs: 30_000;
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

/** Exact SKILL/SKILL_ATTACK guard for Lancer 5304. */
export function mir4NativeAbsorptionSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const row = action?.rows[0];
  return (
    action?.cooldownMs === 63_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 2_400 &&
    action.attackAnimationMs === 1_260 &&
    action.endCutAnimationMs === 1_100 &&
    action.hitCount === 0 &&
    action.requiredClassLevel === 48 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.nativeBehavior.conditionTarget === 2 &&
    action.nativeBehavior.conditionType === 5 &&
    action.nativeBehavior.conditionValue === 1_300 &&
    action.nativeBehavior.conditionCheckTime === 240 &&
    action.rows.length === 1 &&
    row?.attackId === ATTACK_ID &&
    row.movement.kind === 'none' &&
    row.targetDistance.nativeMin === 0 &&
    row.targetDistance.nativeMax === 800 &&
    row.targetType === 1 &&
    row.authorialTargetValue === 8 &&
    row.impactType === 2 &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 950 &&
    row.geometry.angleDegrees === 360 &&
    row.geometry.nativeDistanceMax === 800 &&
    row.geometry.nativeHeight === 500 &&
    row.nativeBehavior.physicalDamage.coefficient === 11_000 &&
    row.nativeBehavior.physicalDamage.levelUpCoefficient === 200 &&
    row.nativeBehavior.attackRagePoint === 684 &&
    row.nativeBehavior.hitRagePoint === 240 &&
    row.nativeBehavior.aggroRate === 10_000
  );
}

/** Rank 1/5/8/10 semantics from special rows 291..294 and passives 651101..651138. */
export function mir4NativeAbsorptionPolicy(
  requestedSkillLevel: number,
): Mir4NativeAbsorptionPolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null || !mir4NativeAbsorptionSourceMatches()) return null;
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    damageRecoveryBasisPoints: rank10 ? 80_000 : rank8 ? 50_000 : rank5 ? 25_000 : 10_000,
    selfChillDurationMs: rank10 ? 30_000 : rank8 ? 15_000 : rank5 ? 10_000 : 5_000,
    damageAmplificationBasisPoints: rank10 ? 7_500 : rank8 ? 5_000 : rank5 ? 2_500 : 0,
    damageAmplificationDurationMs: rank5 ? 5_000 : 0,
    shieldBlockDurationMs: rank8 ? 30_000 : 0,
    magicShieldDispelChanceBasisPoints: rank10 ? 10_000 : rank8 ? 7_000 : 0,
    cloakingDispelChanceBasisPoints: rank10 ? 10_000 : rank8 ? 7_000 : 0,
    darknessPoisonChanceBasisPoints: Object.freeze(
      rank10 ? ([7_000, 8_500, 10_000] as const) : ([0, 0, 0] as const),
    ),
    darknessPoisonDurationMs: rank10 ? 5_000 : 0,
    darknessPoisonSpellAttackBasisPoints: rank10 ? 2_000 : 0,
    characterKillRecoveryBasisPoints: rank10 ? 3_000 : rank8 ? 1_000 : 0,
    characterKillCooldownMs: 30_000 as const,
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

function chanceLands(rollBasisPoints: () => number, chanceBasisPoints: number): boolean {
  if (chanceBasisPoints <= 0) return false;
  if (chanceBasisPoints >= 10_000) return true;
  return rollBasisPoints() < chanceBasisPoints;
}

function removeShield(target: Entity): boolean {
  const hadShield =
    target.mir4Effects?.active.some((effect) => effect.effectId === SHIELD_EFFECT_ID) === true ||
    target.auras.some((aura) => aura.id === SHIELD_EFFECT_ID);
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== SHIELD_EFFECT_ID,
    );
  }
  target.auras = target.auras.filter((aura) => aura.id !== SHIELD_EFFECT_ID);
  return hadShield;
}

export function mir4NativeAbsorptionShieldBlocked(target: Entity): boolean {
  return (
    target.mir4Effects?.active.some(
      (effect) => effect.effectId === SHIELD_BLOCK_EFFECT_ID && effect.remaining > 0,
    ) === true
  );
}

export interface Mir4NativeAbsorptionContactResult {
  readonly applied: boolean;
  readonly healing: number;
  readonly selfChilled: boolean;
  readonly damageAmplificationApplied: boolean;
  readonly shieldRemoved: boolean;
  readonly shieldBlocked: boolean;
  readonly magicShieldDispelled: boolean;
  readonly cloakingDispelled: boolean;
  readonly poisonApplied: boolean;
}

export function applyMir4NativeAbsorptionContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  landedDamage: number,
  rollBasisPoints: () => number,
): Mir4NativeAbsorptionContactResult {
  const empty: Mir4NativeAbsorptionContactResult = {
    applied: false,
    healing: 0,
    selfChilled: false,
    damageAmplificationApplied: false,
    shieldRemoved: false,
    shieldBlocked: false,
    magicShieldDispelled: false,
    cloakingDispelled: false,
    poisonApplied: false,
  };
  const policy = mir4NativeAbsorptionPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    attackId !== ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    landedDamage <= 0
  ) {
    return empty;
  }

  const targetWasChilled = mir4NativeStatusBonus(target, 45) < 0;
  const baseHealing = Math.floor(
    (Math.max(0, Math.floor(landedDamage)) * policy.damageRecoveryBasisPoints) / 10_000,
  );
  const requestedHealing = mir4ModifiedSkillHealing(
    baseHealing,
    source.mir4?.statusValues,
    mir4NativeStatusBonus(source, 148),
  );
  const healthBefore = source.hp;
  source.hp = Math.min(source.maxHp, source.hp + requestedHealing);
  const healing = source.hp - healthBefore;

  const selfChilled =
    targetWasChilled &&
    replaceEffect(ctx, source, source, {
      effectId: CHILL_EFFECT_ID,
      kind: 'native-status-boost',
      durationSeconds: policy.selfChillDurationMs / 1_000,
      magnitude: -25,
      nativeStatusId: 45,
      name: 'Chill',
      sourceId: source.id,
    });

  if (target.dead) return { ...empty, applied: true, healing, selfChilled };

  const damageAmplificationApplied =
    policy.damageAmplificationBasisPoints > 0 &&
    replaceEffect(ctx, source, target, {
      effectId: DAMAGE_AMPLIFICATION_EFFECT_ID,
      kind: 'damage-amplification',
      durationSeconds: policy.damageAmplificationDurationMs / 1_000,
      magnitude: policy.damageAmplificationBasisPoints / 10_000,
      name: mir4SkillById(SKILL_ID)?.displayName ?? 'Absorption',
      sourceId: source.id,
    });

  const shieldRemoved = policy.shieldBlockDurationMs > 0 ? removeShield(target) : false;
  const shieldBlocked =
    policy.shieldBlockDurationMs > 0 &&
    replaceEffect(ctx, source, target, {
      effectId: SHIELD_BLOCK_EFFECT_ID,
      kind: 'shield-blocked',
      durationSeconds: policy.shieldBlockDurationMs / 1_000,
      name: 'Unable to receive Shield effect',
      sourceId: source.id,
    });

  const magicShieldDispelled =
    target.mir4Shield !== undefined &&
    chanceLands(rollBasisPoints, policy.magicShieldDispelChanceBasisPoints);
  if (magicShieldDispelled) target.mir4Shield = undefined;

  const hasCloaking = target.auras.some((aura) => aura.id === 'mir4_native_buff_40108');
  const cloakingDispelled =
    hasCloaking && chanceLands(rollBasisPoints, policy.cloakingDispelChanceBasisPoints);
  if (cloakingDispelled) breakMir4NativeCloaking(ctx, target);

  const darknessStacks = mir4NativeDarknessStacks(target);
  const poisonChance =
    darknessStacks > 0 ? (policy.darknessPoisonChanceBasisPoints[darknessStacks - 1] ?? 0) : 0;
  const poisonApplied =
    chanceLands(rollBasisPoints, poisonChance) &&
    replaceEffect(ctx, source, target, {
      effectId: POISON_EFFECT_ID,
      kind: 'burn',
      durationSeconds: policy.darknessPoisonDurationMs / 1_000,
      magnitude: policy.darknessPoisonSpellAttackBasisPoints / 10_000,
      name: 'Absorption: Poison',
      sourceId: source.id,
    });

  return {
    applied: true,
    healing,
    selfChilled,
    damageAmplificationApplied,
    shieldRemoved,
    shieldBlocked,
    magicShieldDispelled,
    cloakingDispelled,
    poisonApplied,
  };
}

/** Persistent rank-8/10 passive: character kills restore HP once per 30 seconds. */
export function applyMir4NativeAbsorptionCharacterKill(
  ctx: SimContext,
  source: Entity,
  victim: Entity,
): number {
  if (
    source.dead ||
    source.kind !== 'player' ||
    source.mir4?.classId !== 5 ||
    victim.kind !== 'player' ||
    source.id === victim.id
  ) {
    return 0;
  }
  const skillLevel = ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
  const policy = mir4NativeAbsorptionPolicy(skillLevel);
  if (!policy || policy.characterKillRecoveryBasisPoints <= 0) return 0;
  source.procReadyAt ??= {};
  if ((source.procReadyAt[CHARACTER_KILL_PROC_KEY] ?? 0) > ctx.time) return 0;

  const requestedHealing = mir4ModifiedSkillHealing(
    Math.floor((source.maxHp * policy.characterKillRecoveryBasisPoints) / 10_000),
    source.mir4.statusValues,
    mir4NativeStatusBonus(source, 148),
  );
  const healthBefore = source.hp;
  source.hp = Math.min(source.maxHp, source.hp + requestedHealing);
  source.procReadyAt[CHARACTER_KILL_PROC_KEY] = ctx.time + policy.characterKillCooldownMs / 1_000;
  return source.hp - healthBefore;
}
