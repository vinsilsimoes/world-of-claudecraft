import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import type { Mir4SkillDef } from '../content/mir4/skills_runtime';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { applyMir4NativeDarknessStack, mir4NativeDarknessStacks } from './native_darkness';

const SKILL_ID = 5401 as const;
const PRIMARY_EFFECT_ATTACK_ID = 540102 as const;
const HIGH_RANK_COOLDOWN_ATTACK_ID = 540103 as const;

/** Reconcile the split SKILL header summary with all six hybrid attack rows. */
export function mir4NativeSweepingStormDamageSummaryMatches(
  action: Mir4NativeSkillAction,
  skill: Mir4SkillDef,
): boolean {
  if (action.skillId !== SKILL_ID || skill.skillId !== SKILL_ID || !skill.damage) return false;
  const physical = skill.damage.components.filter((component) => component.damageType === 1);
  const magic = skill.damage.components.filter((component) => component.damageType === 2);
  const sum = (components: typeof physical, field: 'coefficient' | 'levelUpCoefficient') =>
    components.reduce((total, component) => total + component[field], 0);
  const behavior = action.nativeBehavior;
  return (
    behavior.damageType === 1 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    behavior.secondaryDamage.additive === 0 &&
    behavior.secondaryDamage.levelUpAdditive === 0 &&
    behavior.primaryDamage.coefficient * 100 === sum(physical, 'coefficient') &&
    behavior.primaryDamage.levelUpCoefficient * 100 === sum(physical, 'levelUpCoefficient') &&
    behavior.secondaryDamage.coefficient * 100 === sum(magic, 'coefficient') &&
    behavior.secondaryDamage.levelUpCoefficient * 100 === sum(magic, 'levelUpCoefficient')
  );
}

export interface Mir4NativeSweepingStormPolicy {
  readonly skillId: 5401;
  readonly skillLevel: number;
  readonly darknessDurationMs: number;
  readonly extraDarknessChanceBasisPoints: readonly [number, number];
  readonly monsterAttackLoss: number;
  readonly characterAttackLoss: number;
  readonly attackLossDurationMs: number;
  readonly cooldownReductionLossByStacks: readonly [number, number, number];
  readonly cooldownReductionLossDurationMs: number;
  readonly cooldownReductionAttackId: 540102 | 540103 | null;
}

/**
 * Exact rank graph from SKILL_SPECIAL_ABILITY 264 to 269 and their
 * SKILL_PASSIVE/BUFF links. Ranks above 10 retain the rank-10 contract.
 *
 * SKILL_SPECIAL_ABILITY.json sha256
 * 9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db
 * SKILL_PASSIVE.json sha256
 * 533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e
 * BUFF.json sha256
 * 797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b
 */
export function mir4NativeSweepingStormPolicy(
  requestedSkillLevel: number,
): Mir4NativeSweepingStormPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  if (skillLevel >= 10) {
    return Object.freeze({
      skillId: SKILL_ID,
      skillLevel,
      darknessDurationMs: 10_000,
      extraDarknessChanceBasisPoints: Object.freeze([7_000, 3_500]) as readonly [number, number],
      monsterAttackLoss: 300,
      characterAttackLoss: 200,
      attackLossDurationMs: 20_000,
      cooldownReductionLossByStacks: Object.freeze([8_000, 9_000, 10_000]) as readonly [
        number,
        number,
        number,
      ],
      cooldownReductionLossDurationMs: 20_000,
      cooldownReductionAttackId: HIGH_RANK_COOLDOWN_ATTACK_ID,
    });
  }
  if (skillLevel >= 8) {
    return Object.freeze({
      skillId: SKILL_ID,
      skillLevel,
      darknessDurationMs: 10_000,
      extraDarknessChanceBasisPoints: Object.freeze([4_000, 2_000]) as readonly [number, number],
      monsterAttackLoss: 200,
      characterAttackLoss: 150,
      attackLossDurationMs: 15_000,
      cooldownReductionLossByStacks: Object.freeze([5_000, 5_500, 6_000]) as readonly [
        number,
        number,
        number,
      ],
      cooldownReductionLossDurationMs: 15_000,
      cooldownReductionAttackId: HIGH_RANK_COOLDOWN_ATTACK_ID,
    });
  }
  if (skillLevel >= 5) {
    return Object.freeze({
      skillId: SKILL_ID,
      skillLevel,
      darknessDurationMs: 8_000,
      extraDarknessChanceBasisPoints: Object.freeze([0, 0]) as readonly [number, number],
      monsterAttackLoss: 150,
      characterAttackLoss: 100,
      attackLossDurationMs: 10_000,
      cooldownReductionLossByStacks: Object.freeze([3_000, 3_500, 4_000]) as readonly [
        number,
        number,
        number,
      ],
      cooldownReductionLossDurationMs: 10_000,
      cooldownReductionAttackId: PRIMARY_EFFECT_ATTACK_ID,
    });
  }
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    darknessDurationMs: 5_000,
    extraDarknessChanceBasisPoints: Object.freeze([0, 0]) as readonly [number, number],
    monsterAttackLoss: 100,
    characterAttackLoss: 0,
    attackLossDurationMs: 5_000,
    cooldownReductionLossByStacks: Object.freeze([0, 0, 0]) as readonly [number, number, number],
    cooldownReductionLossDurationMs: 0,
    cooldownReductionAttackId: null,
  });
}

function replaceNativeStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  statusId: number,
  magnitude: number,
  durationMs: number,
  mutuallyExclusiveBuffIds: readonly number[] = [],
): boolean {
  const effectId = `mir4_native_buff_${buffId}_${statusId}`;
  if (target.mir4Effects) {
    const family = new Set([buffId, ...mutuallyExclusiveBuffIds]);
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) =>
        !family.has(Number(/^mir4_native_buff_(\d+)_/.exec(effect.effectId)?.[1] ?? Number.NaN)) ||
        effect.nativeStatusId !== statusId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude,
    nativeStatusId: statusId,
    name: 'Sweeping Storm',
    sourceId: source.id,
  }).ok;
}

function chanceLands(rollBasisPoints: () => number, chanceBasisPoints: number): boolean {
  return chanceBasisPoints > 0 && rollBasisPoints() < chanceBasisPoints;
}

export interface Mir4NativeSweepingStormContactResult {
  readonly applied: boolean;
  readonly darknessStacks: number;
  readonly attackReduced: boolean;
  readonly cooldownReductionReduced: boolean;
}

/** Apply one native special-ability trigger after its paired hybrid contact lands. */
export function applyMir4NativeSweepingStormContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): Mir4NativeSweepingStormContactResult {
  const empty = {
    applied: false,
    darknessStacks: mir4NativeDarknessStacks(target),
    attackReduced: false,
    cooldownReductionReduced: false,
  } as const;
  const policy = mir4NativeSweepingStormPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    target.dead ||
    sourceImpactIndex !== 0 ||
    (attackId !== PRIMARY_EFFECT_ATTACK_ID && attackId !== HIGH_RANK_COOLDOWN_ATTACK_ID) ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }

  let darknessStacks = mir4NativeDarknessStacks(target);
  let attackReduced = false;
  if (attackId === PRIMARY_EFFECT_ATTACK_ID) {
    darknessStacks = applyMir4NativeDarknessStack(
      ctx,
      source,
      target,
      policy.darknessDurationMs,
      'Sweeping Storm: Darkness',
    );
    for (const chance of policy.extraDarknessChanceBasisPoints) {
      if (!chanceLands(rollBasisPoints, chance)) continue;
      darknessStacks = applyMir4NativeDarknessStack(
        ctx,
        source,
        target,
        policy.darknessDurationMs,
        'Sweeping Storm: Darkness',
      );
    }

    const characterTarget = target.kind === 'player' || target.ownerId !== null;
    const attackLoss = characterTarget ? policy.characterAttackLoss : policy.monsterAttackLoss;
    if (attackLoss > 0) {
      const buffId =
        !characterTarget && policy.skillLevel >= 10 ? 50520 : characterTarget ? 50507 : 50506;
      const exclusions = characterTarget ? [] : [50506, 50520];
      const physical = replaceNativeStatus(
        ctx,
        source,
        target,
        buffId,
        20,
        -attackLoss,
        policy.attackLossDurationMs,
        exclusions,
      );
      const magic = replaceNativeStatus(
        ctx,
        source,
        target,
        buffId,
        22,
        -attackLoss,
        policy.attackLossDurationMs,
        exclusions,
      );
      attackReduced = physical || magic;
    }
  }

  let cooldownReductionReduced = false;
  if (
    policy.cooldownReductionAttackId === attackId &&
    darknessStacks > 0 &&
    policy.cooldownReductionLossDurationMs > 0
  ) {
    const buffId = policy.skillLevel >= 10 ? 50508 : policy.skillLevel >= 8 ? 50521 : 50518;
    const loss = policy.cooldownReductionLossByStacks[Math.min(2, darknessStacks - 1)] ?? 0;
    cooldownReductionReduced = replaceNativeStatus(
      ctx,
      source,
      target,
      buffId,
      95,
      -loss,
      policy.cooldownReductionLossDurationMs,
      [50508, 50518, 50521],
    );
  }

  return {
    applied: darknessStacks > empty.darknessStacks || attackReduced || cooldownReductionReduced,
    darknessStacks,
    attackReduced,
    cooldownReductionReduced,
  };
}
