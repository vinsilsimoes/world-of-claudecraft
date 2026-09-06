import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { applyMir4NativeDarknessStack } from './native_darkness';
import { mir4NativeArbalistFocusBuffEvidenceExact } from './native_skill_quick_shot';

const SKILL_ID = 4104 as const;
const FOCUS_ATTACK_ID = 410401 as const;
const DIRECT_ATTACK_ID = 410403 as const;
const FOCUS_BUFF_ID = 41010 as const;
const MARK_EFFECT_ID = 'mir4_native_buff_40010_31';
const POTION_REDUCTION_EFFECT_ID = 'mir4_native_buff_40508_146';
const INVINCIBILITY_BLOCK_EFFECT_ID = 'mir4_native_buff_40501_4043';

export interface Mir4NativeVenomMistShellPolicy {
  readonly skillId: 4104;
  readonly skillLevel: number;
  readonly directAttackId: 410403;
  readonly mark: Readonly<{
    buffId: 40010;
    durationMs: 5_000 | 8_000 | 10_000;
    nativeStatusId: 31;
    nativeMagnitude: -25;
  }>;
  readonly darkness: Readonly<{
    buffId: 30020;
    durationMs: 5_000 | 8_000 | 10_000;
    guaranteedStacks: 1;
    extraStackChanceBasisPoints: 0 | 5_000 | 9_000;
  }>;
  readonly skillHealingReduction: Readonly<{
    buffId: 40507 | 40508;
    durationMs: 10_000 | 15_000 | 20_000;
    nativeStatusId: 148;
    nativeMagnitudeBasisPoints: -3_000 | -4_000 | -5_000;
  }> | null;
  readonly hpPotionReduction: Readonly<{
    buffId: 40508;
    durationMs: 20_000;
    nativeStatusId: 146;
    nativeMagnitudeBasisPoints: -1_000;
  }> | null;
  readonly invincibilityBlock: Readonly<{
    buffId: 40501;
    durationMs: 10_000 | 20_000;
    unremovable: true;
  }> | null;
  readonly persistentBossDamageReductionBasisPoints: 0 | 1_000 | 1_500;
}

/** Exact SPECIAL_ABILITY 4104 milestone graph at ranks 1, 5, 8, and 10. */
export function mir4NativeVenomMistShellPolicy(
  requestedSkillLevel: number,
): Mir4NativeVenomMistShellPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.trunc(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  const sharedDurationMs = (rank8 ? 10_000 : rank5 ? 8_000 : 5_000) as 5_000 | 8_000 | 10_000;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    directAttackId: DIRECT_ATTACK_ID,
    mark: Object.freeze({
      buffId: 40010 as const,
      durationMs: sharedDurationMs,
      nativeStatusId: 31 as const,
      nativeMagnitude: -25 as const,
    }),
    darkness: Object.freeze({
      buffId: 30020 as const,
      durationMs: sharedDurationMs,
      guaranteedStacks: 1 as const,
      extraStackChanceBasisPoints: (rank10 ? 9_000 : rank8 ? 5_000 : 0) as 0 | 5_000 | 9_000,
    }),
    skillHealingReduction: rank5
      ? Object.freeze({
          buffId: (rank10 ? 40508 : 40507) as 40507 | 40508,
          durationMs: (rank10 ? 20_000 : rank8 ? 15_000 : 10_000) as 10_000 | 15_000 | 20_000,
          nativeStatusId: 148 as const,
          nativeMagnitudeBasisPoints: (rank10 ? -5_000 : rank8 ? -4_000 : -3_000) as
            | -3_000
            | -4_000
            | -5_000,
        })
      : null,
    hpPotionReduction: rank10
      ? Object.freeze({
          buffId: 40508 as const,
          durationMs: 20_000 as const,
          nativeStatusId: 146 as const,
          nativeMagnitudeBasisPoints: -1_000 as const,
        })
      : null,
    invincibilityBlock: rank8
      ? Object.freeze({
          buffId: 40501 as const,
          durationMs: (rank10 ? 20_000 : 10_000) as 10_000 | 20_000,
          unremovable: true as const,
        })
      : null,
    persistentBossDamageReductionBasisPoints: (rank10 ? 1_500 : rank8 ? 1_000 : 0) as
      | 0
      | 1_000
      | 1_500,
  });
}

export function mir4NativeVenomMistShellFocusBuffMatchesRow(
  row: Mir4NativeSkillAttackRow,
): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    row.attackId === FOCUS_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 220
  );
}

export function mir4NativeVenomMistShellFocusSchedule(): {
  readonly skillId: 4104;
  readonly attackId: 410401;
  readonly applyAtMs: 220;
} {
  return { skillId: SKILL_ID, attackId: FOCUS_ATTACK_ID, applyAtMs: 220 };
}

function replaceEffect(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: Parameters<typeof applyMir4Effect>[2],
  mutuallyExclusiveIds: readonly string[] = [],
): boolean {
  const replaced = new Set([spec.effectId, ...mutuallyExclusiveIds]);
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => !replaced.has(effect.effectId),
    );
  }
  target.auras = target.auras.filter((aura) => !replaced.has(aura.id));
  return applyMir4Effect(ctx, target, { ...spec, sourceId: source.id }).ok;
}

function roll(ctx: SimContext, chanceBasisPoints: number): boolean {
  return chanceBasisPoints > 0 && Math.floor(ctx.rng.next() * 10_000) < chanceBasisPoints;
}

export interface Mir4NativeVenomMistShellContactResult {
  readonly applied: boolean;
  readonly markApplied: boolean;
  readonly darknessStacks: number;
  readonly extraDarknessApplied: boolean;
  readonly skillHealingReduced: boolean;
  readonly hpPotionReduced: boolean;
  readonly invincibilityBlocked: boolean;
}

/** Apply the rank graph only after the authored direct 410403 contact lands. */
export function applyMir4NativeVenomMistShellDirectContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
): Mir4NativeVenomMistShellContactResult {
  const empty = Object.freeze({
    applied: false,
    markApplied: false,
    darknessStacks: 0,
    extraDarknessApplied: false,
    skillHealingReduced: false,
    hpPotionReduced: false,
    invincibilityBlocked: false,
  });
  const policy = mir4NativeVenomMistShellPolicy(requestedSkillLevel);
  if (
    !policy ||
    attackId !== DIRECT_ATTACK_ID ||
    source.dead ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }
  const name = mir4SkillById(SKILL_ID)?.displayName ?? 'Venom Mist Shell';
  const markApplied = replaceEffect(ctx, source, target, {
    effectId: MARK_EFFECT_ID,
    kind: 'native-status-boost',
    durationSeconds: policy.mark.durationMs / 1_000,
    magnitude: policy.mark.nativeMagnitude,
    nativeStatusId: policy.mark.nativeStatusId,
    name,
    sourceId: source.id,
  });
  let darknessStacks = applyMir4NativeDarknessStack(
    ctx,
    source,
    target,
    policy.darkness.durationMs,
    name,
  );
  const extraDarknessApplied = roll(ctx, policy.darkness.extraStackChanceBasisPoints);
  if (extraDarknessApplied) {
    darknessStacks = applyMir4NativeDarknessStack(
      ctx,
      source,
      target,
      policy.darkness.durationMs,
      name,
    );
  }

  const skillHealingReduced = policy.skillHealingReduction
    ? replaceEffect(
        ctx,
        source,
        target,
        {
          effectId: `mir4_native_buff_${policy.skillHealingReduction.buffId}_148`,
          kind: 'native-status-boost',
          durationSeconds: policy.skillHealingReduction.durationMs / 1_000,
          magnitude: policy.skillHealingReduction.nativeMagnitudeBasisPoints,
          nativeStatusId: policy.skillHealingReduction.nativeStatusId,
          name,
          sourceId: source.id,
        },
        [`mir4_native_buff_${policy.skillHealingReduction.buffId === 40507 ? 40508 : 40507}_148`],
      )
    : false;
  const hpPotionReduced = policy.hpPotionReduction
    ? replaceEffect(ctx, source, target, {
        effectId: POTION_REDUCTION_EFFECT_ID,
        kind: 'native-status-boost',
        durationSeconds: policy.hpPotionReduction.durationMs / 1_000,
        magnitude: policy.hpPotionReduction.nativeMagnitudeBasisPoints,
        nativeStatusId: policy.hpPotionReduction.nativeStatusId,
        name,
        sourceId: source.id,
      })
    : false;
  const invincibilityBlocked = policy.invincibilityBlock
    ? replaceEffect(ctx, source, target, {
        effectId: INVINCIBILITY_BLOCK_EFFECT_ID,
        kind: 'invincibility-blocked',
        durationSeconds: policy.invincibilityBlock.durationMs / 1_000,
        unremovable: policy.invincibilityBlock.unremovable,
        name,
        sourceId: source.id,
      })
    : false;
  return Object.freeze({
    applied: true,
    markApplied,
    darknessStacks,
    extraDarknessApplied,
    skillHealingReduced,
    hpPotionReduced,
    invincibilityBlocked,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

export function mir4NativeVenomMistShellPersistentBossDamageReductionBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return (
    mir4NativeVenomMistShellPolicy(learnedSkillLevel(ctx, source))
      ?.persistentBossDamageReductionBasisPoints ?? 0
  );
}
