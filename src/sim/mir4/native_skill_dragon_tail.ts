import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import type { Mir4SkillDef } from '../content/mir4/skills_runtime';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { applyMir4NativeDarknessStack, mir4NativeDarknessStacks } from './native_darkness';
import {
  applyMir4NativeHitReaction,
  type Mir4NativeRuntimeHitReaction,
} from './native_skill_hit_reaction';

const SKILL_ID = 5102 as const;
const EFFECT_ATTACK_ID = 510202 as const;

export interface Mir4NativeDragonTailDebuff {
  readonly magnitudeBasisPoints: number;
  readonly durationMs: number;
}

export interface Mir4NativeDragonTailPolicy {
  readonly skillId: 5102;
  readonly skillLevel: number;
  readonly monsterSkillDamageBasisPoints: number;
  readonly persistentBossDamageReductionBasisPoints: number;
  readonly recoveryDebuff: Mir4NativeDragonTailDebuff | null;
  readonly manaPotionDebuff: Mir4NativeDragonTailDebuff | null;
  readonly darknessDurationMs: number;
}

export function mir4NativeDragonTailSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const [setup, first, second, third] = action?.rows ?? [];
  return (
    action?.cooldownMs === 29_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 4_000 &&
    action.attackAnimationMs === 1_667 &&
    action.endCutAnimationMs === 1_600 &&
    action.hitCount === 3 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.rows.length === 4 &&
    setup?.attackId === 510201 &&
    setup.movement.kind === 'forward' &&
    setup.movement.nativeRange === 300 &&
    setup.movement.durationMs === 400 &&
    setup.damage.type === 0 &&
    first?.attackId === EFFECT_ATTACK_ID &&
    first.movement.kind === 'forward' &&
    first.movement.nativeRange === 300 &&
    first.movement.durationMs === 200 &&
    first.damage.coefficient === 16_000 &&
    first.damage.levelUpCoefficient === 270 &&
    second?.attackId === 510203 &&
    second.damage.coefficient === 16_000 &&
    second.damage.levelUpCoefficient === 370 &&
    third?.attackId === 510204 &&
    third.damage.coefficient === 4_000 &&
    third.damage.levelUpCoefficient === 60
  );
}

/** Reconcile the SKILL header total with the three physical SKILL_ATTACK contacts. */
export function mir4NativeDragonTailDamageSummaryMatches(
  action: Mir4NativeSkillAction,
  skill: Mir4SkillDef,
): boolean {
  if (
    action.skillId !== SKILL_ID ||
    skill.skillId !== SKILL_ID ||
    !skill.damage ||
    !mir4NativeDragonTailSourceMatches()
  ) {
    return false;
  }
  const components = skill.damage.components;
  return (
    components.length === 3 &&
    components.every((component) => component.damageType === 1 && component.impactCount === 1) &&
    components.reduce((sum, component) => sum + component.coefficient, 0) ===
      action.nativeBehavior.primaryDamage.coefficient * 100 &&
    components.reduce((sum, component) => sum + component.levelUpCoefficient, 0) ===
      action.nativeBehavior.primaryDamage.levelUpCoefficient * 100
  );
}

export function mir4NativeDragonTailHitReaction(
  attackId: number,
): Mir4NativeRuntimeHitReaction | null {
  const row = mir4NativeSkillActionById(SKILL_ID)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (
    row?.attackId !== 510204 ||
    row.reaction.kind !== 'hit' ||
    row.reaction.stance !== 'hit-01' ||
    row.reaction.value !== 0 ||
    row.reaction.nativeHeight !== 0 ||
    row.reaction.valueEx !== 0 ||
    row.reaction.durationMs !== 300 ||
    row.reaction.probabilityPercent !== 10 ||
    row.reaction.direction !== 0
  ) {
    return null;
  }
  return Object.freeze({ durationMs: 300, stance: 'hit-01' as const });
}

export function applyMir4NativeDragonTailHitReaction(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): boolean {
  const reaction = mir4NativeDragonTailHitReaction(attackId);
  if (
    !reaction ||
    sourceImpactIndex !== 0 ||
    source.dead ||
    target.dead ||
    rollBasisPoints() >= 1_000
  ) {
    return false;
  }
  return applyMir4NativeHitReaction(ctx, target, {
    sourceId: source.id,
    skillId: SKILL_ID,
    attackId,
    ...reaction,
  });
}

export function mir4NativeDragonTailPolicy(
  requestedSkillLevel: number,
): Mir4NativeDragonTailPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !mir4NativeDragonTailSourceMatches()) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    monsterSkillDamageBasisPoints: rank10 ? 10_000 : rank8 ? 7_000 : rank5 ? 5_000 : 3_000,
    persistentBossDamageReductionBasisPoints: rank10 ? 1_500 : rank8 ? 1_000 : rank5 ? 500 : 0,
    recoveryDebuff: rank5
      ? Object.freeze({
          magnitudeBasisPoints: rank10 ? -3_000 : rank8 ? -2_000 : -1_000,
          durationMs: rank10 ? 20_000 : rank8 ? 15_000 : 10_000,
        })
      : null,
    manaPotionDebuff: rank8
      ? Object.freeze({
          magnitudeBasisPoints: -3_000,
          durationMs: rank10 ? 30_000 : 15_000,
        })
      : null,
    darknessDurationMs: rank8 ? 10_000 : 0,
  });
}

export function mir4NativeDragonTailMonsterDamageBasisPoints(
  target: Entity,
  requestedSkillLevel: number,
): number {
  const policy = mir4NativeDragonTailPolicy(requestedSkillLevel);
  return 10_000 + (target.kind === 'mob' ? (policy?.monsterSkillDamageBasisPoints ?? 0) : 0);
}

function replaceStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  statusId: number,
  debuff: Mir4NativeDragonTailDebuff,
): boolean {
  const effectId = `mir4_native_buff_${buffId}_${statusId}`;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: debuff.durationMs / 1_000,
    magnitude: debuff.magnitudeBasisPoints,
    nativeStatusId: statusId,
    name: 'Dragon Tail',
    sourceId: source.id,
  }).ok;
}

export function applyMir4NativeDragonTailContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
): {
  readonly applied: boolean;
  readonly darknessStacks: number;
  readonly recoveryReduced: boolean;
  readonly manaPotionRecoveryReduced: boolean;
} {
  const policy = mir4NativeDragonTailPolicy(requestedSkillLevel);
  const rejected = {
    applied: false,
    darknessStacks: mir4NativeDarknessStacks(target),
    recoveryReduced: false,
    manaPotionRecoveryReduced: false,
  } as const;
  if (
    !policy ||
    source.dead ||
    target.dead ||
    attackId !== EFFECT_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    !ctx.isHostileTo(source, target)
  ) {
    return rejected;
  }

  const darknessStacks =
    policy.darknessDurationMs > 0
      ? applyMir4NativeDarknessStack(
          ctx,
          source,
          target,
          policy.darknessDurationMs,
          'Dragon Tail: Darkness',
        )
      : rejected.darknessStacks;
  const recoveryReduced = policy.recoveryDebuff
    ? replaceStatus(ctx, source, target, 50509, 148, policy.recoveryDebuff)
    : false;
  const manaPotionRecoveryReduced = policy.manaPotionDebuff
    ? replaceStatus(ctx, source, target, 50510, 147, policy.manaPotionDebuff)
    : false;
  return {
    applied:
      darknessStacks > rejected.darknessStacks || recoveryReduced || manaPotionRecoveryReduced,
    darknessStacks,
    recoveryReduced,
    manaPotionRecoveryReduced,
  };
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

export function mir4NativeDragonTailPersistentBossDamageReductionBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeDragonTailPolicy(learnedSkillLevel(ctx, source))
      ?.persistentBossDamageReductionBasisPoints ?? 0
  );
}
