import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import type { Mir4SkillDef } from '../content/mir4/skills_runtime';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from './control';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';

const SKILL_ID = 5103 as const;
const EFFECT_ATTACK_ID = 510302 as const;

type StackChances = readonly [number, number, number];

export interface Mir4NativeAscendingDragonPolicy {
  readonly skillId: 5103;
  readonly skillLevel: number;
  readonly chill: Readonly<{
    buffId: 20020;
    durationMs: number;
    maxStacks: 3;
    nativeStatusId: 45;
    nativeMagnitudePerStack: -25;
  }>;
  readonly monsterMoveSpeed: Readonly<{
    buffId: 20501;
    durationMs: 5000;
    nativeStatusId: 76;
    nativeMagnitude: -50 | -100 | -150;
  }> | null;
  readonly severeCold: Readonly<{
    buffId: 20512 | 20515 | 20517;
    chancesByChillStacks: StackChances;
    durationMs: 2000 | 5000 | 7000;
  }> | null;
  readonly persistentMonsterDamageBasisPoints: 0 | 400 | 800 | 1200;
}

/** Exact SKILL/SKILL_ATTACK mechanical rows for Ascending Dragon. */
export function mir4NativeAscendingDragonSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const [setup, first, second, third] = action?.rows ?? [];
  const exactCircle = (row: typeof first): boolean =>
    row?.targetDistance.nativeMax === 650 &&
    row.targetType === 1 &&
    row.authorialTargetValue === 8 &&
    row.impactType === 2 &&
    row.geometry.angleDegrees === 360 &&
    row.geometry.nativeDistanceMax === 600 &&
    row.geometry.nativeHeight === 500 &&
    row.geometry.nativeOffset.x === 400;
  return (
    action?.cooldownMs === 25_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 2_500 &&
    action.attackAnimationMs === 2_000 &&
    action.endCutAnimationMs === 1_800 &&
    action.hitCount === 6 &&
    action.requiredClassLevel === 16 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.nativeBehavior.useControlTime === 2 &&
    action.rows.length === 4 &&
    setup?.attackId === 510301 &&
    setup.movement.kind === 'none' &&
    setup.damage.type === 0 &&
    exactCircle(setup) &&
    first?.attackId === 510302 &&
    first.impactOffsetsMs.length === 1 &&
    first.impactOffsetsMs[0] === 580 &&
    first.nativeBehavior.physicalDamage.coefficient === 4_000 &&
    first.nativeBehavior.physicalDamage.levelUpCoefficient === 60 &&
    first.nativeBehavior.magicDamage.coefficient === 5_000 &&
    first.nativeBehavior.magicDamage.levelUpCoefficient === 100 &&
    exactCircle(first) &&
    second?.attackId === 510303 &&
    second.impactOffsetsMs.length === 1 &&
    second.impactOffsetsMs[0] === 960 &&
    second.nativeBehavior.physicalDamage.coefficient === 4_000 &&
    second.nativeBehavior.physicalDamage.levelUpCoefficient === 60 &&
    second.nativeBehavior.magicDamage.coefficient === 5_000 &&
    second.nativeBehavior.magicDamage.levelUpCoefficient === 100 &&
    exactCircle(second) &&
    third?.attackId === 510304 &&
    third.impactOffsetsMs.length === 1 &&
    third.impactOffsetsMs[0] === 1_240 &&
    third.nativeBehavior.physicalDamage.coefficient === 4_000 &&
    third.nativeBehavior.physicalDamage.levelUpCoefficient === 80 &&
    third.nativeBehavior.magicDamage.coefficient === 6_000 &&
    third.nativeBehavior.magicDamage.levelUpCoefficient === 100 &&
    exactCircle(third)
  );
}

/** Reconcile both SKILL header channels with the six authored damage components. */
export function mir4NativeAscendingDragonDamageSummaryMatches(
  action: Mir4NativeSkillAction,
  skill: Mir4SkillDef,
): boolean {
  if (
    action.skillId !== SKILL_ID ||
    skill.skillId !== SKILL_ID ||
    !skill.damage ||
    !mir4NativeAscendingDragonSourceMatches()
  ) {
    return false;
  }
  const physical = skill.damage.components.filter((component) => component.damageType === 1);
  const magic = skill.damage.components.filter((component) => component.damageType === 2);
  return (
    skill.damage.components.length === 6 &&
    skill.damage.components.every((component) => component.impactCount === 1) &&
    physical.length === 3 &&
    magic.length === 3 &&
    physical.reduce((sum, component) => sum + component.coefficient, 0) ===
      action.nativeBehavior.primaryDamage.coefficient * 100 &&
    physical.reduce((sum, component) => sum + component.levelUpCoefficient, 0) ===
      action.nativeBehavior.primaryDamage.levelUpCoefficient * 100 &&
    magic.reduce((sum, component) => sum + component.coefficient, 0) ===
      action.nativeBehavior.secondaryDamage.coefficient * 100 &&
    magic.reduce((sum, component) => sum + component.levelUpCoefficient, 0) ===
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * 100
  );
}

export function mir4NativeAscendingDragonPolicy(
  requestedSkillLevel: number,
): Mir4NativeAscendingDragonPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !mir4NativeAscendingDragonSourceMatches()) {
    return null;
  }
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    chill: Object.freeze({
      buffId: 20020 as const,
      durationMs: rank8 ? 10_000 : rank5 ? 8_000 : 5_000,
      maxStacks: 3 as const,
      nativeStatusId: 45 as const,
      nativeMagnitudePerStack: -25 as const,
    }),
    monsterMoveSpeed: rank5
      ? Object.freeze({
          buffId: 20501 as const,
          durationMs: 5_000 as const,
          nativeStatusId: 76 as const,
          nativeMagnitude: (rank10 ? -150 : rank8 ? -100 : -50) as -50 | -100 | -150,
        })
      : null,
    severeCold: rank5
      ? Object.freeze({
          buffId: (rank10 ? 20517 : rank8 ? 20515 : 20512) as 20512 | 20515 | 20517,
          chancesByChillStacks: Object.freeze(
            rank10 ? [6_000, 6_500, 7_000] : rank8 ? [4_000, 4_500, 5_000] : [3_000, 3_500, 4_000],
          ) as StackChances,
          durationMs: (rank10 ? 7_000 : rank8 ? 5_000 : 2_000) as 2000 | 5000 | 7000,
        })
      : null,
    persistentMonsterDamageBasisPoints: (rank10 ? 1_200 : rank8 ? 800 : rank5 ? 400 : 0) as
      | 0
      | 400
      | 800
      | 1200,
  });
}

function targetKind(target: Entity): 'player' | 'monster' {
  return target.kind === 'player' || target.ownerId !== null ? 'player' : 'monster';
}

function replaceNativeStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  nativeStatusId: number,
  magnitude: number,
  durationMs: number,
  name: string,
): boolean {
  const effectId = `mir4_native_buff_${buffId}_${nativeStatusId}`;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude,
    nativeStatusId,
    name,
    sourceId: source.id,
  }).ok;
}

function applyChill(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: Mir4NativeAscendingDragonPolicy,
  name: string,
): number {
  if (!target.mir4Effects) target.mir4Effects = { active: [], controlImmuneUntil: 0 };
  const effectId = `mir4_native_buff_${policy.chill.buffId}`;
  const existing = target.mir4Effects.active.find(
    (effect) => effect.effectId === effectId && effect.remaining > 0,
  );
  const priorStacks = existing ? Math.max(1, existing.nativeStacks ?? 1) : 0;
  const stacks = Math.min(policy.chill.maxStacks, priorStacks + 1);
  if (existing) {
    existing.kind = 'native-status-boost';
    existing.remaining = policy.chill.durationMs / 1_000;
    existing.duration = existing.remaining;
    existing.magnitude = policy.chill.nativeMagnitudePerStack * stacks;
    existing.nativeStatusId = policy.chill.nativeStatusId;
    existing.nativeStacks = stacks;
    existing.sourceId = source.id;
    return stacks;
  }
  const applied = applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: policy.chill.durationMs / 1_000,
    magnitude: policy.chill.nativeMagnitudePerStack,
    nativeStatusId: policy.chill.nativeStatusId,
    nativeStacks: 1,
    name,
    sourceId: source.id,
  });
  return applied.ok ? 1 : 0;
}

function applyFreeze(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: NonNullable<Mir4NativeAscendingDragonPolicy['severeCold']>,
  name: string,
): boolean {
  const kind = targetKind(target);
  const durationMs = mir4ControlDurationMs(
    policy.durationMs,
    'debilitation',
    source.mir4?.statusValues,
    target.mir4?.statusValues,
    kind,
    mir4NativeStatusBonus(target, 51),
  );
  return applyMir4Effect(ctx, target, {
    effectId: `mir4_native_buff_${policy.buffId}_freeze`,
    kind: 'freeze',
    durationSeconds: durationMs / 1_000,
    magnitude: 0,
    name,
    sourceId: source.id,
  }).ok;
}

export interface Mir4NativeAscendingDragonContactResult {
  readonly applied: boolean;
  readonly chillStacks: number;
  readonly monsterMoveSpeedReduced: boolean;
  readonly severeColdTriggered: boolean;
  readonly frozen: boolean;
}

/** Apply the 510302 special graph exactly once on its first logical damage contact. */
export function applyMir4NativeAscendingDragonContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): Mir4NativeAscendingDragonContactResult {
  const rejected = Object.freeze({
    applied: false,
    chillStacks: 0,
    monsterMoveSpeedReduced: false,
    severeColdTriggered: false,
    frozen: false,
  });
  const policy = mir4NativeAscendingDragonPolicy(requestedSkillLevel);
  if (
    !policy ||
    attackId !== EFFECT_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    source.dead ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return rejected;
  }

  const name = 'Ascending Dragon';
  const chillStacks = applyChill(ctx, source, target, policy, name);
  const kind = targetKind(target);
  const monsterMoveSpeedReduced =
    kind === 'monster' &&
    policy.monsterMoveSpeed !== null &&
    replaceNativeStatus(
      ctx,
      source,
      target,
      policy.monsterMoveSpeed.buffId,
      policy.monsterMoveSpeed.nativeStatusId,
      policy.monsterMoveSpeed.nativeMagnitude,
      policy.monsterMoveSpeed.durationMs,
      name,
    );

  let severeColdTriggered = false;
  let frozen = false;
  if (policy.severeCold && chillStacks > 0) {
    const triggerChance = policy.severeCold.chancesByChillStacks[Math.min(2, chillStacks - 1)] ?? 0;
    severeColdTriggered = rollBasisPoints() < triggerChance;
    if (severeColdTriggered) {
      const controlChance = mir4ControlChanceFromStatuses(
        10_000,
        'debilitation',
        source.mir4?.statusValues,
        target.mir4?.statusValues,
        kind,
        mir4NativeStatusBonus(target, 51),
      );
      if (rollBasisPoints() < controlChance) {
        frozen = applyFreeze(ctx, source, target, policy.severeCold, name);
      }
    }
  }
  return Object.freeze({
    applied: chillStacks > 0 || monsterMoveSpeedReduced || frozen,
    chillStacks,
    monsterMoveSpeedReduced,
    severeColdTriggered,
    frozen,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

export function mir4NativeAscendingDragonPersistentMonsterDamageBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeAscendingDragonPolicy(learnedSkillLevel(ctx, source))
      ?.persistentMonsterDamageBasisPoints ?? 0
  );
}
