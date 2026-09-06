import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { mir4NativeCrowdControlReactionMatchesRow } from './native_skill_crowd_control';
import type { Mir4NativeUltimateExecutionPlan } from './native_ultimate_runtime';

const SKILL_ID = 5203;

function setupRowExact(row: Mir4NativeSkillAttackRow | undefined): boolean {
  return (
    row?.attackId === 520301 &&
    row.nextAttackId === 520302 &&
    row.impactStartMs === 0 &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 20 &&
    row.movement.kind === 'none' &&
    row.viewTarget === 0 &&
    row.targetDistance.nativeMin === 0 &&
    row.targetDistance.nativeMax === 1550 &&
    row.targetType === 1 &&
    row.authorialTargetValue === 8 &&
    row.targetSubtype === 'alive-only' &&
    row.impactType === 3 &&
    row.geometry.angleDegrees === 0 &&
    row.geometry.nativeDistanceMin === 0 &&
    row.geometry.nativeDistanceMax === 1700 &&
    row.geometry.nativeWidth === 450 &&
    row.geometry.nativeHeight === 500 &&
    row.geometry.nativeOffset.x === -150 &&
    row.geometry.nativeOffset.y === 0 &&
    row.geometry.nativeOffset.z === 0 &&
    row.geometry.rotationDegrees === 0 &&
    row.nativeBehavior.attackUseType === 1 &&
    row.nativeBehavior.damageType === 0 &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === 53012 &&
    row.nativeBehavior.superIgnore === 0 &&
    row.nativeBehavior.superArmor === 9000 &&
    row.nativeBehavior.ccUserCheck === 0 &&
    row.nativeBehavior.hitRagePoint === 400 &&
    row.nativeBehavior.aggroRate === 0 &&
    row.guideEffectId === 103 &&
    row.reaction.kind === 'none'
  );
}

function damageRowExact(row: Mir4NativeSkillAttackRow | undefined): boolean {
  return (
    row?.attackId === 520302 &&
    row.nextAttackId === 0 &&
    row.impactStartMs === 1280 &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 1320 &&
    row.movement.kind === 'none' &&
    row.viewTarget === 2 &&
    row.targetDistance.nativeMin === 0 &&
    row.targetDistance.nativeMax === 1550 &&
    row.targetType === 1 &&
    row.authorialTargetValue === 8 &&
    row.targetSubtype === 'alive-only' &&
    row.impactType === 3 &&
    row.geometry.angleDegrees === 0 &&
    row.geometry.nativeDistanceMin === 0 &&
    row.geometry.nativeDistanceMax === 1700 &&
    row.geometry.nativeWidth === 450 &&
    row.geometry.nativeHeight === 500 &&
    row.geometry.nativeOffset.x === -150 &&
    row.geometry.nativeOffset.y === 0 &&
    row.geometry.nativeOffset.z === 0 &&
    row.geometry.rotationDegrees === 0 &&
    row.nativeBehavior.attackUseType === 1 &&
    row.nativeBehavior.damageType === 3 &&
    row.nativeBehavior.physicalDamage.coefficient === 30_000 &&
    row.nativeBehavior.physicalDamage.levelUpCoefficient === 600 &&
    row.nativeBehavior.physicalDamage.additive === 0 &&
    row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
    row.nativeBehavior.magicDamage.coefficient === 40_000 &&
    row.nativeBehavior.magicDamage.levelUpCoefficient === 800 &&
    row.nativeBehavior.magicDamage.additive === 0 &&
    row.nativeBehavior.magicDamage.levelUpAdditive === 0 &&
    row.nativeBehavior.buffIds.length === 0 &&
    row.nativeBehavior.superIgnore === 100 &&
    row.nativeBehavior.superArmor === 9000 &&
    row.nativeBehavior.ccUserCheck === 1000 &&
    row.nativeBehavior.hitRagePoint === 400 &&
    row.nativeBehavior.aggroRate === 10_000 &&
    row.guideEffectId === 0 &&
    mir4NativeCrowdControlReactionMatchesRow(row)
  );
}

function invincibilityEvidenceExact(): boolean {
  const buff = mir4NativeSkillBuffEvidenceById(53012)?.rawRecord;
  return (
    buff?.BuffTarget === 1 &&
    buff.ApplyType === 0 &&
    buff.BuffTime === 2 &&
    buff.LevelUpBuffTime === 0 &&
    buff.BuffProbability === 1000 &&
    buff.BuffIndexType_1 === 3 &&
    buff.BuffIndex_1 === 4003 &&
    buff.BuffIndexType_2 === 0 &&
    buff.BuffIndexType_3 === 0
  );
}

/** Compile Dragon Spear only while every gameplay-bearing native field matches. */
export function compileMir4NativeLancerUltimatePlan(): Mir4NativeUltimateExecutionPlan | null {
  const action = mir4NativeDirectSkillActionEvidenceById(SKILL_ID);
  if (
    action?.nativeBehavior.skillType !== 3 ||
    action.nativeBehavior.productType !== 2 ||
    action.nativeBehavior.useControlTime !== 0.2 ||
    action.nativeBehavior.secondaryCostType !== 3 ||
    action.nativeBehavior.secondaryCost !== 10_000 ||
    action.nativeBehavior.darkChange !== 1 ||
    action.nativeBehavior.damageType !== 1 ||
    action.nativeBehavior.primaryDamage.coefficient !== 300 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 6 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 400 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 8 ||
    action.skillCostType !== 2 ||
    action.skillCost !== 7000 ||
    action.cooldownMs !== 10_000 ||
    action.attackAnimationMs !== 2405 ||
    action.endCutAnimationMs !== 1910 ||
    action.hitCount !== 1 ||
    action.requiredClassLevel !== 1 ||
    !action.targeting ||
    action.blockingCheck !== 1 ||
    action.indicator.type !== 0 ||
    action.indicator.index !== 3 ||
    action.indicator.angleDegrees !== 0 ||
    action.indicator.nativeMin !== 0 ||
    action.indicator.nativeMax !== 1600 ||
    action.indicator.nativeWidth !== 500 ||
    action.indicator.nativeOffset !== 0 ||
    action.indicator.nativeHeight !== 400 ||
    action.rows.length !== 2 ||
    !setupRowExact(action.rows[0]) ||
    !damageRowExact(action.rows[1]) ||
    !invincibilityEvidenceExact()
  ) {
    return null;
  }

  return Object.freeze({
    classId: 5,
    skillId: SKILL_ID,
    requiredGauge: action.nativeBehavior.secondaryCost / 100,
    skillCostType: 2,
    skillCost: action.skillCost,
    cooldownMs: action.cooldownMs,
    attackAnimationMs: action.attackAnimationMs,
    endCutAnimationMs: action.endCutAnimationMs,
    channel: 'physical',
    sourceInvincibility: Object.freeze({
      attackId: 520301,
      buffId: 53012,
      applyAtMs: 20,
      durationMs: 2000,
      effectId: 'mir4_native_buff_53012',
      name: 'Dragon Spear',
    }),
    sourceFocus: null,
    sourceControlImmunity: null,
    totem: null,
    contacts: Object.freeze([
      Object.freeze({
        attackId: 520302,
        sourceImpactIndex: 0,
        offsetMs: 1320,
        coefficient: 70_000,
        damageComponents: Object.freeze([
          Object.freeze({ channel: 'physical' as const, coefficient: 30_000 }),
          Object.freeze({ channel: 'magic' as const, coefficient: 40_000 }),
        ]),
      }),
    ]),
    attackIds: Object.freeze(action.rows.map((row) => row.attackId)),
  });
}
