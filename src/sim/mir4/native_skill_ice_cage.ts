import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from './control';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { mir4NativeDarknessStacks } from './native_darkness';
import { mir4NativeArbalistFocusBuffEvidenceExact } from './native_skill_quick_shot';

const SKILL_ID = 4105 as const;
const SETUP_ATTACK_ID = 410501 as const;
const DIRECT_ATTACK_ID = 410502 as const;

type StackChances = readonly [number, number, number];

export interface Mir4NativeIceCagePolicy {
  readonly skillId: 4105;
  readonly skillLevel: number;
  readonly directAttackId: 410502;
  readonly chill: Readonly<{
    buffId: 20020;
    durationMs: number;
    maxStacks: 3;
    nativeStatusId: 45;
    nativeMagnitudePerStack: -25;
  }>;
  readonly monsterMoveSpeed: Readonly<{
    buffId: 50500;
    durationMs: 10000;
    nativeStatusId: 76;
    nativeMagnitude: -50 | -100 | -150;
  }>;
  readonly monsterFreeze: Readonly<{
    buffId: 20513 | 20515;
    chanceBasisPoints: 5000 | 10000;
    durationMs: 3000 | 5000;
  }> | null;
  readonly frostbite: Readonly<{
    buffId: 40541;
    chancesByChillStacks: StackChances;
    durationMs: 5000 | 8000;
    nativeStatusId: 76;
    nativeMagnitude: -100;
  }> | null;
  readonly severeCold: Readonly<{
    buffId: 20513 | 20515;
    chancesByChillStacks: StackChances;
    durationMs: 3000 | 5000;
  }> | null;
  readonly evadeDisabled: Readonly<{
    buffId: 40502 | 40523;
    chanceBasisPoints: 2000 | 5000;
    durationMs: 10000;
  }> | null;
  readonly darknessDamageBasisPointsByStacks: StackChances | null;
}

/** Exact SPECIAL_ABILITY 202..207 and SKILL_PASSIVE 60030x/6405xx milestones. */
export function mir4NativeIceCagePolicy(
  requestedSkillLevel: number,
): Mir4NativeIceCagePolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    directAttackId: DIRECT_ATTACK_ID,
    chill: Object.freeze({
      buffId: 20020 as const,
      durationMs: rank8 ? 10_000 : rank5 ? 8_000 : 5_000,
      maxStacks: 3 as const,
      nativeStatusId: 45 as const,
      nativeMagnitudePerStack: -25 as const,
    }),
    monsterMoveSpeed: Object.freeze({
      buffId: 50500 as const,
      durationMs: 10_000 as const,
      nativeStatusId: 76 as const,
      nativeMagnitude: (rank10 ? -150 : rank8 ? -100 : -50) as -50 | -100 | -150,
    }),
    monsterFreeze: rank5
      ? Object.freeze({
          buffId: (rank10 ? 20515 : 20513) as 20513 | 20515,
          chanceBasisPoints: (rank8 ? 10_000 : 5_000) as 5000 | 10000,
          durationMs: (rank10 ? 5_000 : 3_000) as 3000 | 5000,
        })
      : null,
    frostbite: rank5
      ? Object.freeze({
          buffId: 40541 as const,
          chancesByChillStacks: Object.freeze(
            rank10 ? [6_000, 7_000, 8_000] : rank8 ? [4_000, 5_000, 6_000] : [1_000, 2_000, 3_000],
          ) as StackChances,
          durationMs: (rank10 ? 8_000 : 5_000) as 5000 | 8000,
          nativeStatusId: 76 as const,
          nativeMagnitude: -100 as const,
        })
      : null,
    severeCold: rank8
      ? Object.freeze({
          buffId: (rank10 ? 20515 : 20513) as 20513 | 20515,
          chancesByChillStacks: Object.freeze(
            rank10 ? [5_000, 5_500, 6_000] : [2_000, 2_500, 3_000],
          ) as StackChances,
          durationMs: (rank10 ? 5_000 : 3_000) as 3000 | 5000,
        })
      : null,
    evadeDisabled: rank8
      ? Object.freeze({
          buffId: (rank10 ? 40523 : 40502) as 40502 | 40523,
          chanceBasisPoints: (rank10 ? 5_000 : 2_000) as 2000 | 5000,
          durationMs: 10_000 as const,
        })
      : null,
    darknessDamageBasisPointsByStacks: rank8
      ? (Object.freeze(
          rank10 ? [10_000, 16_000, 17_000] : [10_000, 13_500, 14_000],
        ) as StackChances)
      : null,
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
  policy: Mir4NativeIceCagePolicy,
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

function roll(ctx: SimContext, chanceBasisPoints: number): boolean {
  return Math.floor(ctx.rng.next() * 10_000) < chanceBasisPoints;
}

function applyFreeze(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: 20513 | 20515,
  durationMs: number,
  name: string,
): boolean {
  const kind = targetKind(target);
  const adjustedDurationMs = mir4ControlDurationMs(
    durationMs,
    'debilitation',
    source.mir4?.statusValues,
    target.mir4?.statusValues,
    kind,
    mir4NativeStatusBonus(target, 51),
  );
  return applyMir4Effect(ctx, target, {
    effectId: `mir4_native_buff_${buffId}_freeze`,
    kind: 'freeze',
    durationSeconds: adjustedDurationMs / 1_000,
    magnitude: 0,
    name,
    sourceId: source.id,
  }).ok;
}

export interface Mir4NativeIceCageContactResult {
  readonly applied: boolean;
  readonly chillStacks: number;
  readonly monsterMoveSpeedReduced: boolean;
  readonly frostbitten: boolean;
  readonly frozen: boolean;
  readonly evadeDisabled: boolean;
}

/** Rank graph applies only when the authored direct 410502 contact lands. */
export function applyMir4NativeIceCageDirectContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
): Mir4NativeIceCageContactResult {
  const empty = Object.freeze({
    applied: false,
    chillStacks: 0,
    monsterMoveSpeedReduced: false,
    frostbitten: false,
    frozen: false,
    evadeDisabled: false,
  });
  const policy = mir4NativeIceCagePolicy(requestedSkillLevel);
  if (
    !policy ||
    attackId !== DIRECT_ATTACK_ID ||
    source.dead ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }
  const name = mir4SkillById(SKILL_ID)?.displayName ?? 'Ice Cage';
  const chillStacks = applyChill(ctx, source, target, policy, name);
  const kind = targetKind(target);
  const monsterMoveSpeedReduced =
    kind === 'monster' &&
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

  let frozen = false;
  if (kind === 'monster' && policy.monsterFreeze) {
    const chance = mir4ControlChanceFromStatuses(
      policy.monsterFreeze.chanceBasisPoints,
      'debilitation',
      source.mir4?.statusValues,
      target.mir4?.statusValues,
      kind,
      mir4NativeStatusBonus(target, 51),
    );
    if (roll(ctx, chance)) {
      frozen = applyFreeze(
        ctx,
        source,
        target,
        policy.monsterFreeze.buffId,
        policy.monsterFreeze.durationMs,
        name,
      );
    }
  }

  let frostbitten = false;
  if (policy.frostbite && chillStacks > 0) {
    const chance = policy.frostbite.chancesByChillStacks[Math.min(2, chillStacks - 1)] ?? 0;
    if (roll(ctx, chance)) {
      frostbitten = replaceNativeStatus(
        ctx,
        source,
        target,
        policy.frostbite.buffId,
        policy.frostbite.nativeStatusId,
        policy.frostbite.nativeMagnitude,
        policy.frostbite.durationMs,
        name,
      );
    }
  }

  if (policy.severeCold && chillStacks > 0) {
    const baseChance = policy.severeCold.chancesByChillStacks[Math.min(2, chillStacks - 1)] ?? 0;
    const chance = mir4ControlChanceFromStatuses(
      baseChance,
      'debilitation',
      source.mir4?.statusValues,
      target.mir4?.statusValues,
      kind,
      mir4NativeStatusBonus(target, 51),
    );
    if (roll(ctx, chance)) {
      const severeFreeze = applyFreeze(
        ctx,
        source,
        target,
        policy.severeCold.buffId,
        policy.severeCold.durationMs,
        name,
      );
      frozen = frozen || severeFreeze;
    }
  }

  let evadeDisabled = false;
  if (policy.evadeDisabled && roll(ctx, policy.evadeDisabled.chanceBasisPoints)) {
    evadeDisabled = applyMir4Effect(ctx, target, {
      effectId: `mir4_native_buff_${policy.evadeDisabled.buffId}_evade_disabled`,
      kind: 'evade-disabled',
      durationSeconds: policy.evadeDisabled.durationMs / 1_000,
      magnitude: 1,
      name,
      sourceId: source.id,
    }).ok;
  }
  return Object.freeze({
    applied: chillStacks > 0 || monsterMoveSpeedReduced || frostbitten || frozen || evadeDisabled,
    chillStacks,
    monsterMoveSpeedReduced,
    frostbitten,
    frozen,
    evadeDisabled,
  });
}

/** Skill-wide rank bonus against targets carrying two or three Darkness stacks. */
export function mir4NativeIceCageDarknessDamageBasisPoints(
  skillId: number | undefined,
  target: Entity,
  requestedSkillLevel: number | undefined,
): number {
  if (skillId !== SKILL_ID) return 10_000;
  const policy = mir4NativeIceCagePolicy(requestedSkillLevel ?? 1);
  if (!policy?.darknessDamageBasisPointsByStacks) return 10_000;
  const stacks = mir4NativeDarknessStacks(target);
  return policy.darknessDamageBasisPointsByStacks[Math.min(2, Math.max(0, stacks - 1))] ?? 10_000;
}

export function mir4NativeIceCageFocusBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    row.attackId === SETUP_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === 41010 &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 560
  );
}

export function mir4NativeIceCageFocusSchedule(): {
  readonly skillId: 4105;
  readonly attackId: 410501;
  readonly applyAtMs: 560;
} {
  return Object.freeze({
    skillId: SKILL_ID,
    attackId: SETUP_ATTACK_ID,
    applyAtMs: 560,
  });
}
