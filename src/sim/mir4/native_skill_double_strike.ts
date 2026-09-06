import { mir4NativeSkillActionById } from '../content/mir4';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';

const SKILL_ID = 5301 as const;

export interface Mir4NativeDoubleStrikePolicy {
  readonly skillId: 5301;
  readonly skillLevel: number;
  readonly bashDamageBasisPoints: number;
  readonly chilledDamageBasisPointsByStacks: readonly [number, number, number];
  readonly persistentBashDamageBasisPoints: number;
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

/** Exact 5301 row guard; any extracted source drift closes the rank policy. */
export function mir4NativeDoubleStrikeSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const [first, second, third] = action?.rows ?? [];
  return (
    action?.cooldownMs === 24_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 3_300 &&
    action.attackAnimationMs === 1_900 &&
    action.endCutAnimationMs === 1_700 &&
    action.hitCount === 3 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.rows.length === 3 &&
    first?.attackId === 530101 &&
    first.nextAttackId === 530102 &&
    first.movement?.kind === 'forward' &&
    first.movement.nativeRange === 350 &&
    first.movement.durationMs === 240 &&
    first.impactOffsetsMs[0] === 400 &&
    first.damage.coefficient === 9_000 &&
    first.damage.levelUpCoefficient === 180 &&
    first.reaction.kind === 'knock-back' &&
    first.reaction.value === 250 &&
    second?.attackId === 530102 &&
    second.nextAttackId === 530103 &&
    second.movement?.kind === 'target' &&
    second.movement.nativeRange === 120 &&
    second.movement.durationMs === 250 &&
    second.impactOffsetsMs[0] === 1_040 &&
    second.damage.coefficient === 8_000 &&
    second.damage.levelUpCoefficient === 160 &&
    second.guideEffectId === 103 &&
    third?.attackId === 530103 &&
    third.nextAttackId === 0 &&
    third.movement?.kind === 'none' &&
    third.viewTarget === 2 &&
    third.impactOffsetsMs[0] === 1_200 &&
    third.damage.coefficient === 8_000 &&
    third.damage.levelUpCoefficient === 160 &&
    third.reaction.kind === 'knock-back' &&
    third.reaction.value === 200
  );
}

/** Rank milestones recovered from 5301's special/passive graph. */
export function mir4NativeDoubleStrikePolicy(
  requestedSkillLevel: number,
): Mir4NativeDoubleStrikePolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null || !mir4NativeDoubleStrikeSourceMatches()) return null;
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    bashDamageBasisPoints: rank10 ? 10_000 : rank8 ? 8_000 : rank5 ? 6_500 : 5_000,
    chilledDamageBasisPointsByStacks: Object.freeze(
      rank10
        ? [9_000, 10_000, 11_000]
        : rank8
          ? [5_000, 6_000, 7_000]
          : rank5
            ? [2_000, 2_500, 3_000]
            : [0, 0, 0],
    ) as readonly [number, number, number],
    persistentBashDamageBasisPoints: rank10 ? 1_500 : rank8 ? 1_000 : 0,
  });
}

function chillStacks(target: Entity): number {
  const chill = (target.mir4Effects?.active ?? []).find(
    (effect) =>
      effect.remaining > CAST_COMPLETE_EPS &&
      (effect.effectId === 'mir4_native_buff_20020' ||
        effect.effectId.startsWith('mir4_native_buff_20020_')),
  );
  return chill ? Math.max(1, Math.min(3, Math.floor(chill.nativeStacks ?? 1))) : 0;
}

/** Skill-only damage multiplier for the exact 1/2/3 Chill-stack rank branches. */
export function mir4NativeDoubleStrikeConditionalDamageBasisPoints(
  target: Entity,
  requestedSkillLevel: number,
): number {
  const policy = mir4NativeDoubleStrikePolicy(requestedSkillLevel);
  const stacks = chillStacks(target);
  if (!policy || stacks === 0) return 10_000;
  return 10_000 + (policy.chilledDamageBasisPointsByStacks[stacks - 1] ?? 0);
}
