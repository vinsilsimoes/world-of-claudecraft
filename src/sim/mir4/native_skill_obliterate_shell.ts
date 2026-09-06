import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { resolveMobTemplate } from '../mob/template';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import type { Mir4StatusRecord } from './status_values';
import { mir4StatusRecordValue } from './status_values';

const SKILL_ID = 4109 as const;
const SETUP_ATTACK_ID = 410901 as const;
const KNOCKDOWN_ATTACK_ID = 410902 as const;
const FOCUS_BUFF_ID = 41010;

export interface Mir4NativeObliterateShellPolicy {
  readonly skillId: 4109;
  readonly skillLevel: number;
  readonly focusApplyAtMs: 380;
  readonly bashDamageBasisPoints: number;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownChanceBasisPoints: number;
  readonly knockdownDurationMs: 2_100;
  readonly bossSkillDamageBasisPoints: number;
  readonly stunnedAllDamageBasisPoints: number;
  /**
   * MirMobile passes CCUserCheck to its control helper, but the recovered
   * callee never reads it. Target count therefore cannot author a decay rule.
   */
  readonly playerMultiTargetChanceRule: 'client-passed-unused';
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

/**
 * Exact rank milestones recovered from SKILL_PASSIVE 640911..640915 and their
 * rank-8/rank-10 successors, BUFF 10101 and STRING_TEMPLATE 344209..344509.
 */
export function mir4NativeObliterateShellPolicy(
  requestedSkillLevel: number,
): Mir4NativeObliterateShellPolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null) return null;
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    focusApplyAtMs: 380 as const,
    bashDamageBasisPoints: rank10 ? 10_000 : rank8 ? 8_000 : rank5 ? 6_500 : 5_000,
    monsterKnockdownChanceBasisPoints: 10_000 as const,
    playerKnockdownChanceBasisPoints: rank10 ? 10_000 : rank8 ? 6_000 : rank5 ? 3_000 : 1_000,
    knockdownDurationMs: 2_100 as const,
    bossSkillDamageBasisPoints: rank10 ? 9_000 : rank8 ? 6_000 : rank5 ? 3_000 : 0,
    stunnedAllDamageBasisPoints: rank10 ? 12_000 : rank8 ? 8_000 : rank5 ? 4_000 : 0,
    playerMultiTargetChanceRule: 'client-passed-unused' as const,
  });
}

/** Exact source gate for BUFF 41010 on the zero-damage setup row. */
export function mir4NativeObliterateShellFocusBuffMatchesRow(
  row: Mir4NativeSkillAttackRow,
): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(FOCUS_BUFF_ID)?.rawRecord;
  return (
    raw?.BuffId === FOCUS_BUFF_ID &&
    raw.ApplyType === 2 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 30 &&
    raw.BuffOverlap === 10 &&
    row.attackId === SETUP_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 380
  );
}

export function mir4NativeObliterateShellFocusSchedule(): {
  readonly skillId: 4109;
  readonly attackId: 410901;
  readonly applyAtMs: 380;
} {
  return { skillId: SKILL_ID, attackId: SETUP_ATTACK_ID, applyAtMs: 380 };
}

export function mir4NativeObliterateShellPlayerKnockdownChanceBasisPoints(
  requestedSkillLevel: number,
  attackerStatuses?: Mir4StatusRecord,
  defenderStatuses?: Mir4StatusRecord,
): number | null {
  const policy = mir4NativeObliterateShellPolicy(requestedSkillLevel);
  if (!policy) return null;
  const success =
    mir4StatusRecordValue(attackerStatuses, 119) + mir4StatusRecordValue(attackerStatuses, 127);
  const resistance =
    mir4StatusRecordValue(defenderStatuses, 120) + mir4StatusRecordValue(defenderStatuses, 128);
  return Math.max(
    0,
    Math.min(10_000, Math.trunc(policy.playerKnockdownChanceBasisPoints + success - resistance)),
  );
}

/** Skill-owned boss and Stunned-target packages; 10_000 means no change. */
export function mir4NativeObliterateShellConditionalDamageBasisPoints(
  ctx: Pick<SimContext, 'mir4RuntimeMobTemplates'>,
  target: Entity,
  skillId: number | undefined,
  requestedSkillLevel: number | undefined,
): number {
  if (skillId !== SKILL_ID) return 10_000;
  const policy = mir4NativeObliterateShellPolicy(requestedSkillLevel ?? 1);
  if (!policy) return 10_000;
  const template =
    target.kind === 'mob'
      ? resolveMobTemplate(target.templateId, ctx.mir4RuntimeMobTemplates)
      : undefined;
  const bossBonus = template?.boss ? policy.bossSkillDamageBasisPoints : 0;
  const stunned = (target.mir4Effects?.active ?? []).some(
    (effect) => effect.kind === 'stun' && effect.remaining > CAST_COMPLETE_EPS,
  );
  return 10_000 + bossBonus + (stunned ? policy.stunnedAllDamageBasisPoints : 0);
}

/** Apply row 410902's rank-aware Knockdown after a landed contact. */
export function applyMir4NativeObliterateShellKnockdown(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
  rollBasisPoints: number,
): boolean {
  const policy = mir4NativeObliterateShellPolicy(requestedSkillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(SKILL_ID, attackId);
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  if (
    !policy ||
    attackId !== KNOCKDOWN_ATTACK_ID ||
    !reaction ||
    !skillName ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return false;
  }
  const playerTarget = target.kind === 'player' || target.ownerId !== null;
  const permanentChance = playerTarget
    ? mir4NativeObliterateShellPlayerKnockdownChanceBasisPoints(
        requestedSkillLevel,
        source.mir4?.statusValues,
        target.mir4?.statusValues,
      )
    : policy.monsterKnockdownChanceBasisPoints;
  if (permanentChance === null) return false;
  const temporarySuccess = playerTarget
    ? mir4NativeStatusBonus(source, 119) + mir4NativeStatusBonus(source, 127)
    : mir4NativeStatusBonus(source, 119) + mir4NativeStatusBonus(source, 135);
  const temporaryResistance = playerTarget
    ? mir4NativeStatusBonus(target, 120) + mir4NativeStatusBonus(target, 128)
    : mir4NativeStatusBonus(target, 120) + mir4NativeStatusBonus(target, 136);
  const chance = Math.max(
    0,
    Math.min(10_000, Math.trunc(permanentChance + temporarySuccess - temporaryResistance)),
  );
  if (Math.trunc(rollBasisPoints) >= chance) return false;

  const admission = applyMir4Effect(ctx, target, {
    effectId: reaction.effectId,
    kind: reaction.kind,
    durationSeconds: policy.knockdownDurationMs / 1_000,
    magnitude: 0,
    name: skillName,
    sourceId: source.id,
  });
  if (!admission.ok) return false;
  return applyMir4NativeAdmittedCrowdControlReaction(
    ctx,
    source,
    target,
    SKILL_ID,
    KNOCKDOWN_ATTACK_ID,
    reaction,
  );
}
