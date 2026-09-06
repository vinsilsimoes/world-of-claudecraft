import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { mir4NativeArbalistFocusBuffEvidenceExact } from './native_skill_quick_shot';

const SKILL_ID = 4108 as const;
const SETUP_ATTACK_ID = 410801 as const;
const DIRECT_ATTACK_ID = 410802 as const;
const MARK_BUFF_ID = 40010 as const;
const RELOAD_INTERNAL_COOLDOWN_SECONDS = 10;
const RELOAD_PROC_KEY = 'mir4_native_heavenly_bow_reload';

export interface Mir4NativeHeavenlyBowPolicy {
  readonly skillId: 4108;
  readonly skillLevel: number;
  readonly bashBonusBasisPoints: number;
  readonly reloadChanceBasisPoints: number;
  readonly reloadInternalCooldownMs: 10_000;
  readonly monsterDamageBps: number;
}

/** Exact milestones from SKILL_SPECIAL_ABILITY 216..219 and PASSIVE 640811/21/31. */
export function mir4NativeHeavenlyBowPolicy(
  requestedSkillLevel: number,
): Mir4NativeHeavenlyBowPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    bashBonusBasisPoints: rank10 ? 10_000 : rank8 ? 8_000 : rank5 ? 6_500 : 5_000,
    reloadChanceBasisPoints: rank10 ? 4_000 : rank8 ? 1_500 : rank5 ? 500 : 0,
    reloadInternalCooldownMs: 10_000 as const,
    monsterDamageBps: rank10 ? 1_200 : rank8 ? 800 : 0,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

/** Persistent Monster ATK DMG bonus from the learned rank-8/rank-10 passive. */
export function mir4NativeHeavenlyBowPersistentMonsterDamageBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return mir4NativeHeavenlyBowPolicy(learnedSkillLevel(ctx, source))?.monsterDamageBps ?? 0;
}

function targetHasMark(target: Entity): boolean {
  const prefix = `mir4_native_buff_${MARK_BUFF_ID}`;
  return (target.mir4Effects?.active ?? []).some(
    (effect) =>
      effect.remaining > CAST_COMPLETE_EPS &&
      (effect.effectId === prefix || effect.effectId.startsWith(`${prefix}_`)),
  );
}

export interface Mir4NativeHeavenlyBowReloadResult {
  readonly eligible: boolean;
  readonly reset: boolean;
  readonly chanceBasisPoints: number;
  readonly readyAt: number;
}

/** Resolve PASSIVE 140812/22/32 after one landed direct Bash contact. */
export function applyMir4NativeHeavenlyBowReload(
  ctx: Pick<SimContext, 'time' | 'rng' | 'isHostileTo'>,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
): Mir4NativeHeavenlyBowReloadResult {
  const policy = mir4NativeHeavenlyBowPolicy(requestedSkillLevel);
  const readyAt = source.procReadyAt?.[RELOAD_PROC_KEY] ?? 0;
  const eligible =
    policy !== null &&
    policy.reloadChanceBasisPoints > 0 &&
    attackId === DIRECT_ATTACK_ID &&
    !source.dead &&
    ctx.isHostileTo(source, target) &&
    targetHasMark(target) &&
    ctx.time + CAST_COMPLETE_EPS >= readyAt;
  if (!eligible || !policy) {
    return {
      eligible: false,
      reset: false,
      chanceBasisPoints: policy?.reloadChanceBasisPoints ?? 0,
      readyAt,
    };
  }
  const reset =
    policy.reloadChanceBasisPoints >= 10_000 ||
    Math.floor(ctx.rng.next() * 10_000) < policy.reloadChanceBasisPoints;
  if (!reset) {
    return {
      eligible: true,
      reset: false,
      chanceBasisPoints: policy.reloadChanceBasisPoints,
      readyAt,
    };
  }
  source.cooldowns.delete(String(SKILL_ID));
  source.procReadyAt ??= {};
  const nextReadyAt = ctx.time + RELOAD_INTERNAL_COOLDOWN_SECONDS;
  source.procReadyAt[RELOAD_PROC_KEY] = nextReadyAt;
  return {
    eligible: true,
    reset: true,
    chanceBasisPoints: policy.reloadChanceBasisPoints,
    readyAt: nextReadyAt,
  };
}

export function mir4NativeHeavenlyBowFocusBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    row.attackId === SETUP_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === 41010 &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 100
  );
}

export function mir4NativeHeavenlyBowFocusSchedule(): {
  readonly skillId: 4108;
  readonly attackId: 410801;
  readonly applyAtMs: 100;
} {
  return Object.freeze({ skillId: SKILL_ID, attackId: SETUP_ATTACK_ID, applyAtMs: 100 });
}
