import { mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { applyMir4Effect } from './effects';
import { mir4NativeBashResolution } from './native_skill_bash';

const SKILL_ID = 3101;
const SPECIAL_ATTACK_ID = 310102;

export interface Mir4NativeSunbeamSwordPolicy {
  readonly skillLevel: number;
  readonly mpPotionRecoveryBasisPoints: number;
  readonly pvpKnockdownResistanceReductionBasisPoints: number;
  readonly pvpKnockdownResistanceChanceBasisPoints: number;
  readonly brokenArmorDefenseReduction: number;
  readonly brokenArmorChanceBasisPoints: number;
  readonly brokenArmorDurationMs: number;
}

/** Exact rank milestones from PASSIVE 130213/23/33 and special rows 29-42. */
export function mir4NativeSunbeamSwordPolicy(
  requestedSkillLevel: number,
): Mir4NativeSunbeamSwordPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  return Object.freeze({
    skillLevel,
    mpPotionRecoveryBasisPoints:
      skillLevel >= 10 ? 1500 : skillLevel >= 8 ? 1000 : skillLevel >= 5 ? 500 : 0,
    pvpKnockdownResistanceReductionBasisPoints: skillLevel >= 5 ? 1000 : 0,
    pvpKnockdownResistanceChanceBasisPoints: skillLevel >= 8 ? 10_000 : skillLevel >= 5 ? 5000 : 0,
    brokenArmorDefenseReduction: skillLevel >= 10 ? 0.8 : skillLevel >= 8 ? 0.5 : 0,
    brokenArmorChanceBasisPoints: skillLevel >= 10 ? 10_000 : skillLevel >= 8 ? 6500 : 0,
    brokenArmorDurationMs: skillLevel >= 8 ? 300_000 : 0,
  });
}

export function mir4NativeSunbeamSwordMpPotionBonusBasisPoints(
  skillLevels: Readonly<Record<number, number>> | undefined,
): number {
  return (
    mir4NativeSunbeamSwordPolicy(skillLevels?.[SKILL_ID] ?? 1)?.mpPotionRecoveryBasisPoints ?? 0
  );
}

function hasNativeBuff(target: Entity, buffId: number): boolean {
  const prefix = `mir4_native_buff_${buffId}`;
  return (
    target.mir4Effects?.active.some(
      (effect) =>
        effect.remaining > CAST_COMPLETE_EPS &&
        (effect.effectId === prefix || effect.effectId.startsWith(`${prefix}_`)),
    ) === true
  );
}

function chanceLands(ctx: SimContext, chanceBasisPoints: number): boolean {
  if (chanceBasisPoints >= 10_000) return true;
  return chanceBasisPoints > 0 && Math.floor(ctx.rng.next() * 10_000) < chanceBasisPoints;
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

/**
 * Apply Sunbeam Sword's row-310102 Bash follow-ups once per target and cast.
 * The first row has already applied Quell, so this guard also proves Bash.
 */
export function applyMir4NativeSunbeamSwordSpecialContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeSunbeamSwordPolicy(requestedSkillLevel);
  const name = mir4SkillById(SKILL_ID)?.displayName ?? null;
  if (
    !policy ||
    !name ||
    source.dead ||
    target.dead ||
    attackId !== SPECIAL_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    !mir4NativeBashResolution(ctx, source, target, SKILL_ID, policy.skillLevel).triggered
  ) {
    return false;
  }

  let applied = false;
  if (
    target.kind === 'player' &&
    chanceLands(ctx, policy.pvpKnockdownResistanceChanceBasisPoints)
  ) {
    applied =
      replaceEffect(ctx, source, target, {
        effectId: 'mir4_native_buff_30501_128',
        kind: 'native-status-boost',
        durationSeconds: 15,
        magnitude: -policy.pvpKnockdownResistanceReductionBasisPoints,
        nativeStatusId: 128,
        name: `${name}: Knockdown RES`,
        sourceId: source.id,
      }) || applied;
  }

  if (
    hasNativeBuff(target, 30514) &&
    hasNativeBuff(target, 30515) &&
    chanceLands(ctx, policy.brokenArmorChanceBasisPoints)
  ) {
    applied =
      replaceEffect(ctx, source, target, {
        effectId: 'mir4_native_buff_30518',
        kind: 'defense-break',
        durationSeconds: policy.brokenArmorDurationMs / 1000,
        magnitude: policy.brokenArmorDefenseReduction,
        name: `${name}: Broken Armor`,
        sourceId: source.id,
      }) || applied;
  }
  return applied;
}
