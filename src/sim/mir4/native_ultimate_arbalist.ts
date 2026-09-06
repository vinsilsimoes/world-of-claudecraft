import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { mir4NativeKnockbackReactionMatchesRow } from './native_skill_knockback';
import { mir4NativeArbalistFocusBuffEvidenceExact } from './native_skill_quick_shot';
import type { Mir4NativeUltimateExecutionPlan } from './native_ultimate_runtime';

const SKILL_ID = 4113;

interface RowExpectation {
  readonly attackId: number;
  readonly nextAttackId: number;
  readonly impactStartMs: number;
  readonly impactOffsetMs: number;
  readonly targetDistanceMax: number;
  readonly angleDegrees: number;
  readonly distanceMax: number;
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  readonly movementDelayMs: number;
  readonly reactionKind: Mir4NativeSkillAttackRow['reaction']['kind'];
}

const DAMAGE_ROWS = Object.freeze([
  {
    attackId: 411302,
    nextAttackId: 411303,
    impactStartMs: 300,
    impactOffsetMs: 539,
    targetDistanceMax: 1350,
    angleDegrees: 55,
    distanceMax: 2100,
    coefficient: 13_000,
    levelUpCoefficient: 220,
    movementDelayMs: 239,
    reactionKind: 'knock-back',
  },
  {
    attackId: 411303,
    nextAttackId: 411304,
    impactStartMs: 700,
    impactOffsetMs: 913,
    targetDistanceMax: 1450,
    angleDegrees: 65,
    distanceMax: 2200,
    coefficient: 13_000,
    levelUpCoefficient: 220,
    movementDelayMs: 213,
    reactionKind: 'hit',
  },
  {
    attackId: 411304,
    nextAttackId: 411305,
    impactStartMs: 1083,
    impactOffsetMs: 1283,
    targetDistanceMax: 1550,
    angleDegrees: 80,
    distanceMax: 2300,
    coefficient: 13_000,
    levelUpCoefficient: 270,
    movementDelayMs: 200,
    reactionKind: 'knock-back',
  },
  {
    attackId: 411305,
    nextAttackId: 411306,
    impactStartMs: 1483,
    impactOffsetMs: 1644,
    targetDistanceMax: 1650,
    angleDegrees: 100,
    distanceMax: 2400,
    coefficient: 13_000,
    levelUpCoefficient: 270,
    movementDelayMs: 200,
    reactionKind: 'hit',
  },
  {
    attackId: 411306,
    nextAttackId: 0,
    impactStartMs: 1800,
    impactOffsetMs: 2010,
    targetDistanceMax: 1750,
    angleDegrees: 120,
    distanceMax: 2500,
    coefficient: 13_000,
    levelUpCoefficient: 330,
    movementDelayMs: 200,
    reactionKind: 'hit',
  },
] as const satisfies readonly RowExpectation[]);

function setupRowExact(row: Mir4NativeSkillAttackRow | undefined): boolean {
  return (
    row?.attackId === 411301 &&
    row.nextAttackId === 411302 &&
    row.impactStartMs === 0 &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 300 &&
    row.movement.kind === 'none' &&
    row.viewTarget === 0 &&
    row.targetDistance.nativeMin === 0 &&
    row.targetDistance.nativeMax === 1200 &&
    row.targetType === 1 &&
    row.authorialTargetValue === 10 &&
    row.targetSubtype === 'alive-only' &&
    row.impactType === 2 &&
    row.geometry.angleDegrees === 40 &&
    row.geometry.nativeDistanceMin === 0 &&
    row.geometry.nativeDistanceMax === 2000 &&
    row.geometry.nativeWidth === 0 &&
    row.geometry.nativeHeight === 400 &&
    row.geometry.nativeOffset.x === 0 &&
    row.geometry.nativeOffset.y === 0 &&
    row.geometry.nativeOffset.z === 0 &&
    row.geometry.rotationDegrees === 0 &&
    row.nativeBehavior.damageType === 0 &&
    row.nativeBehavior.attackUseType === 1 &&
    row.nativeBehavior.projectile === null &&
    row.nativeBehavior.totem === null &&
    row.nativeBehavior.buffIds.length === 2 &&
    row.nativeBehavior.buffIds[0] === 41010 &&
    row.nativeBehavior.buffIds[1] === 24031 &&
    row.nativeBehavior.hitRagePoint === 240 &&
    row.nativeBehavior.aggroRate === 8000 &&
    row.reaction.kind === 'none'
  );
}

function damageRowExact(
  row: Mir4NativeSkillAttackRow | undefined,
  expected: RowExpectation,
): boolean {
  return (
    row?.attackId === expected.attackId &&
    row.nextAttackId === expected.nextAttackId &&
    row.impactStartMs === expected.impactStartMs &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === expected.impactOffsetMs &&
    row.movement.kind === 'direct' &&
    row.movement.nativeRange === -100 &&
    row.movement.delayMs === expected.movementDelayMs &&
    row.movement.durationMs === 100 &&
    row.viewTarget === 2 &&
    row.targetDistance.nativeMin === 0 &&
    row.targetDistance.nativeMax === expected.targetDistanceMax &&
    row.targetType === 1 &&
    row.authorialTargetValue === 10 &&
    row.targetSubtype === 'alive-only' &&
    row.impactType === 2 &&
    row.geometry.angleDegrees === expected.angleDegrees &&
    row.geometry.nativeDistanceMin === 0 &&
    row.geometry.nativeDistanceMax === expected.distanceMax &&
    row.geometry.nativeWidth === 0 &&
    row.geometry.nativeHeight === 400 &&
    row.geometry.nativeOffset.x === 0 &&
    row.geometry.nativeOffset.y === 0 &&
    row.geometry.nativeOffset.z === 0 &&
    row.geometry.rotationDegrees === 0 &&
    row.nativeBehavior.damageType === 1 &&
    row.nativeBehavior.attackUseType === 1 &&
    row.nativeBehavior.projectile === null &&
    row.nativeBehavior.totem === null &&
    row.nativeBehavior.physicalDamage.coefficient === expected.coefficient &&
    row.nativeBehavior.physicalDamage.levelUpCoefficient === expected.levelUpCoefficient &&
    row.nativeBehavior.physicalDamage.additive === 0 &&
    row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
    row.nativeBehavior.magicDamage.coefficient === 0 &&
    row.nativeBehavior.magicDamage.levelUpCoefficient === 0 &&
    row.nativeBehavior.buffIds.length === 0 &&
    row.nativeBehavior.superArmor === 9000 &&
    row.nativeBehavior.hitRagePoint === 240 &&
    row.nativeBehavior.aggroRate === 8000 &&
    row.reaction.kind === expected.reactionKind &&
    (expected.reactionKind === 'knock-back'
      ? mir4NativeKnockbackReactionMatchesRow(row)
      : row.reaction.stance === 'hit-01' &&
        row.reaction.value === 0 &&
        row.reaction.nativeHeight === 0 &&
        row.reaction.valueEx === 0 &&
        row.reaction.durationMs === 100 &&
        row.reaction.probabilityPercent === 100 &&
        row.reaction.direction === 0)
  );
}

function invincibilityEvidenceExact(): boolean {
  const buff = mir4NativeSkillBuffEvidenceById(24031)?.rawRecord;
  return (
    buff?.BuffTarget === 1 &&
    buff.ApplyType === 0 &&
    buff.BuffTime === 3 &&
    buff.LevelUpBuffTime === 0 &&
    buff.BuffProbability === 1000 &&
    buff.BuffIndexType_1 === 3 &&
    buff.BuffIndex_1 === 4003
  );
}

/** Compile Arrow Rain only while every gameplay-bearing native field matches. */
export function compileMir4NativeArbalistUltimatePlan(): Mir4NativeUltimateExecutionPlan | null {
  const action = mir4NativeDirectSkillActionEvidenceById(SKILL_ID);
  if (
    action?.nativeBehavior.skillType !== 3 ||
    action.nativeBehavior.productType !== 0 ||
    action.nativeBehavior.useControlTime !== 0 ||
    action.nativeBehavior.secondaryCostType !== 3 ||
    action.nativeBehavior.secondaryCost !== 10_000 ||
    action.nativeBehavior.darkChange !== 1 ||
    action.nativeBehavior.damageType !== 0 ||
    action.nativeBehavior.primaryDamage.coefficient !== 600 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 12 ||
    action.skillCostType !== 2 ||
    action.skillCost !== 7000 ||
    action.cooldownMs !== 10_000 ||
    action.attackAnimationMs !== 2933 ||
    action.endCutAnimationMs !== 2560 ||
    action.hitCount !== 5 ||
    action.requiredClassLevel !== 1 ||
    !action.targeting ||
    action.blockingCheck !== 1 ||
    action.indicator.type !== 0 ||
    action.indicator.index !== 0 ||
    action.indicator.nativeMin !== 0 ||
    action.indicator.nativeMax !== 0 ||
    action.indicator.nativeWidth !== 0 ||
    action.indicator.nativeOffset !== 0 ||
    action.indicator.nativeHeight !== 400 ||
    action.rows.length !== 6 ||
    !setupRowExact(action.rows[0]) ||
    !DAMAGE_ROWS.every((expected, index) => damageRowExact(action.rows[index + 1], expected)) ||
    !mir4NativeArbalistFocusBuffEvidenceExact() ||
    !invincibilityEvidenceExact()
  ) {
    return null;
  }

  const contacts = DAMAGE_ROWS.map((row) =>
    Object.freeze({
      attackId: row.attackId,
      sourceImpactIndex: 0,
      offsetMs: row.impactOffsetMs,
      coefficient: row.coefficient,
    }),
  );
  // SKILL summarizes 600 + 12/rank, while the five executable SKILL_ATTACK
  // rows total 650 + 13.1/rank. Runtime contact timing and damage follow the
  // executable row graph; both distinct source values remain pinned above.
  if (contacts.reduce((sum, contact) => sum + contact.coefficient, 0) !== 65_000) {
    return null;
  }

  return Object.freeze({
    classId: 4,
    skillId: SKILL_ID,
    requiredGauge: 100,
    skillCostType: 2,
    skillCost: 7000,
    cooldownMs: 10_000,
    attackAnimationMs: 2933,
    endCutAnimationMs: 2560,
    channel: 'physical',
    sourceInvincibility: Object.freeze({
      attackId: 411301,
      buffId: 24031,
      applyAtMs: 300,
      durationMs: 3000,
      effectId: 'mir4_native_buff_24031',
      name: 'Arrow Rain',
    }),
    sourceFocus: Object.freeze({ attackId: 411301, buffId: 41010, applyAtMs: 300 }),
    sourceControlImmunity: null,
    totem: null,
    contacts: Object.freeze(contacts),
    attackIds: Object.freeze(action.rows.map((row) => row.attackId)),
  });
}
