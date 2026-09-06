import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import { deepFreezeMir4NativeEvidence } from '../content/mir4/native_skill_raw_records';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { mir4NativeDarknessStacks } from './native_darkness';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import { mir4StatusRecordValue } from './status_values';

const SKILL_ID = 5205 as const;
const BASE_ATTACK_ID = 520502 as const;
const FAR_ATTACK_ID = 520503 as const;

export const MIR4_NATIVE_PIERCING_SPEAR_RANK_EVIDENCE = deepFreezeMir4NativeEvidence({
  provenance: {
    specialAbilitySha256: '9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db',
    passiveSha256: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
    buffSha256: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
  },
  specialRows: [
    {
      id: 288,
      minLevel: 5,
      maxLevel: 7,
      triggerAttackId: BASE_ATTACK_ID,
      skillOnlyPassiveIds: [651014, 651015, 651016, 651017],
    },
    {
      id: 289,
      minLevel: 8,
      maxLevel: 9,
      triggerAttackId: BASE_ATTACK_ID,
      skillOnlyPassiveIds: [651024, 651025, 651026, 651027],
    },
    {
      id: 290,
      minLevel: 10,
      maxLevel: 10,
      triggerAttackId: BASE_ATTACK_ID,
      skillOnlyPassiveIds: [651034, 651035, 651036, 651037],
    },
  ],
});

export interface Mir4NativePiercingSpearPolicy {
  readonly skillId: 5205;
  readonly skillLevel: number;
  readonly baseAttackId: 520502;
  readonly conditionalFarAttackId: 520503;
  readonly monsterKnockdownChanceBasisPoints: 10_000;
  readonly playerKnockdownChanceBasisPoints: number;
  readonly failureResistanceDebuff: Readonly<{
    buffId: 50505;
    effectId: 'mir4_native_buff_50505_120';
    nativeStatusId: 120;
    magnitudeBasisPoints: number;
    durationMs: number;
  }> | null;
  readonly darknessBlind: Readonly<{
    buffId: 50514;
    durationMs: number;
    chancesByStacks: readonly [number, number, number];
  }> | null;
  readonly playerMultiTargetChanceRule: 'client-passed-unused';
}

function rank(requestedSkillLevel: number): number | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  return Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
}

function knockdownSuccessEvidenceExact(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(10101)?.rawRecord;
  return (
    raw?.BuffId === 10101 &&
    raw.ApplyType === 0 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 3 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 1 &&
    raw.BuffIndex_1 === 127 &&
    raw.BuffValue_1 === 50 &&
    raw.LevelUpBuffValue_1 === 50
  );
}

function failureDebuffEvidenceExact(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(50505)?.rawRecord;
  return (
    raw?.BuffId === 50505 &&
    raw.ApplyType === 1 &&
    raw.BuffTime === 10 &&
    raw.LevelUpBuffTime === 5 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 1 &&
    raw.BuffIndex_1 === 120 &&
    raw.BuffValue_1 === -100 &&
    raw.LevelUpBuffValue_1 === -50
  );
}

function blindEvidenceExact(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(50514)?.rawRecord;
  return (
    raw?.BuffId === 50514 &&
    raw.ApplyType === 1 &&
    raw.BuffTime === 1 &&
    raw.LevelUpBuffTime === 1 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4031 &&
    raw.BuffIndexType_2 === 1 &&
    raw.BuffIndex_2 === 60 &&
    raw.BuffValue_2 === -100_000
  );
}

/** Exact 5205 row and BUFF guard; source drift closes every owned mechanic. */
export function mir4NativePiercingSpearSourceMatches(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const guide = action?.rows[0];
  const base = action?.rows[1];
  const far = action?.rows[2];
  return (
    action?.cooldownMs === 37_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 4_800 &&
    action.attackAnimationMs === 1_440 &&
    action.endCutAnimationMs === 1_400 &&
    action.hitCount === 1 &&
    action.requiredClassLevel === 40 &&
    action.targeting &&
    action.blockingCheck === 1 &&
    action.nativeBehavior.damageType === 1 &&
    action.nativeBehavior.primaryDamage.coefficient === 80 &&
    action.nativeBehavior.primaryDamage.levelUpCoefficient === 2 &&
    action.nativeBehavior.secondaryDamage.coefficient === 130 &&
    action.nativeBehavior.secondaryDamage.levelUpCoefficient === 3 &&
    action.rows.length === 3 &&
    guide?.attackId === 520501 &&
    guide.guideEffectId === 103 &&
    guide.targetDistance.nativeMax === 1_450 &&
    guide.impactOffsetsMs.length === 1 &&
    guide.impactOffsetsMs[0] === 360 &&
    base?.attackId === BASE_ATTACK_ID &&
    base.impactType === 3 &&
    base.authorialTargetValue === 8 &&
    base.targetDistance.nativeMax === 1_450 &&
    base.geometry.nativeDistanceMin === 0 &&
    base.geometry.nativeDistanceMax === 2_000 &&
    base.geometry.nativeWidth === 400 &&
    base.geometry.nativeHeight === 500 &&
    base.geometry.nativeOffset.x === -50 &&
    base.impactOffsetsMs.length === 1 &&
    base.impactOffsetsMs[0] === 380 &&
    base.nativeBehavior.physicalDamage.coefficient === 8_000 &&
    base.nativeBehavior.physicalDamage.levelUpCoefficient === 200 &&
    base.nativeBehavior.magicDamage.coefficient === 13_000 &&
    base.nativeBehavior.magicDamage.levelUpCoefficient === 200 &&
    base.reaction.kind === 'knock-down' &&
    base.reaction.probabilityPercent === 100 &&
    far?.attackId === FAR_ATTACK_ID &&
    far.impactType === 3 &&
    far.authorialTargetValue === 8 &&
    far.viewTarget === 2 &&
    far.targetDistance.nativeMax === 2_000 &&
    far.geometry.nativeDistanceMin === 1_500 &&
    far.geometry.nativeDistanceMax === 2_000 &&
    far.geometry.nativeWidth === 400 &&
    far.geometry.nativeHeight === 500 &&
    far.geometry.nativeOffset.x === -50 &&
    far.impactOffsetsMs.length === 1 &&
    far.impactOffsetsMs[0] === 400 &&
    far.nativeBehavior.physicalDamage.coefficient === 8_000 &&
    far.nativeBehavior.physicalDamage.levelUpCoefficient === 200 &&
    far.nativeBehavior.magicDamage.coefficient === 13_000 &&
    far.nativeBehavior.magicDamage.levelUpCoefficient === 200 &&
    far.reaction.kind === 'knock-down' &&
    far.reaction.probabilityPercent === 100 &&
    knockdownSuccessEvidenceExact() &&
    failureDebuffEvidenceExact() &&
    blindEvidenceExact()
  );
}

/** Rank 1/5/8/10 semantics recovered from special rows 288..290. */
export function mir4NativePiercingSpearPolicy(
  requestedSkillLevel: number,
): Mir4NativePiercingSpearPolicy | null {
  const skillLevel = rank(requestedSkillLevel);
  if (skillLevel === null || !mir4NativePiercingSpearSourceMatches()) return null;
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    baseAttackId: BASE_ATTACK_ID,
    conditionalFarAttackId: FAR_ATTACK_ID,
    monsterKnockdownChanceBasisPoints: 10_000 as const,
    playerKnockdownChanceBasisPoints: rank10 ? 10_000 : rank8 ? 6_000 : rank5 ? 3_000 : 1_000,
    failureResistanceDebuff: rank5
      ? Object.freeze({
          buffId: 50505 as const,
          effectId: 'mir4_native_buff_50505_120' as const,
          nativeStatusId: 120 as const,
          magnitudeBasisPoints: rank10 ? -2_000 : rank8 ? -1_500 : -1_000,
          durationMs: rank10 ? 20_000 : rank8 ? 15_000 : 10_000,
        })
      : null,
    darknessBlind: rank5
      ? Object.freeze({
          buffId: 50514 as const,
          durationMs: rank10 ? 5_000 : rank8 ? 4_000 : 2_000,
          chancesByStacks: Object.freeze(
            rank10 ? [8_000, 9_000, 10_000] : rank8 ? [6_000, 6_500, 7_000] : [4_000, 4_500, 5_000],
          ) as readonly [number, number, number],
        })
      : null,
    playerMultiTargetChanceRule: 'client-passed-unused' as const,
  });
}

function playerControlled(target: Entity): boolean {
  return target.kind === 'player' || target.ownerId !== null;
}

/** Live chance after permanent and temporary Knockdown success/resistance lanes. */
export function mir4NativePiercingSpearKnockdownChanceBasisPoints(
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): number | null {
  const policy = mir4NativePiercingSpearPolicy(requestedSkillLevel);
  if (!policy) return null;
  const versusPlayer = playerControlled(target);
  const base = versusPlayer
    ? policy.playerKnockdownChanceBasisPoints
    : policy.monsterKnockdownChanceBasisPoints;
  const successIds = versusPlayer ? [119, 127] : [119, 135];
  const resistanceIds = versusPlayer ? [120, 128] : [120, 136];
  const success = successIds.reduce(
    (total, statusId) =>
      total +
      mir4StatusRecordValue(source.mir4?.statusValues, statusId) +
      mir4NativeStatusBonus(source, statusId),
    0,
  );
  const resistance = resistanceIds.reduce(
    (total, statusId) =>
      total +
      mir4StatusRecordValue(target.mir4?.statusValues, statusId) +
      mir4NativeStatusBonus(target, statusId),
    0,
  );
  return Math.max(0, Math.min(10_000, Math.trunc(base + success - resistance)));
}

function replaceFailureResistanceDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: Mir4NativePiercingSpearPolicy,
): boolean {
  const debuff = policy.failureResistanceDebuff;
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  if (!debuff || !skillName) return false;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== debuff.effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId: debuff.effectId,
    kind: 'native-status-boost',
    durationSeconds: debuff.durationMs / 1_000,
    magnitude: debuff.magnitudeBasisPoints,
    nativeStatusId: debuff.nativeStatusId,
    name: `${skillName}: Knockdown RES`,
    sourceId: source.id,
  }).ok;
}

function replaceBlind(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  durationMs: number,
  skillName: string,
): boolean {
  const effectId = 'mir4_native_buff_50514_blind';
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'blind',
    durationSeconds: durationMs / 1_000,
    magnitude: 1,
    name: `${skillName}: Blind`,
    sourceId: source.id,
  }).ok;
}

export interface Mir4NativePiercingSpearContactResult {
  readonly applied: boolean;
  readonly knockedDown: boolean;
  readonly failureResistanceDebuffApplied: boolean;
  readonly blinded: boolean;
}

/** Resolve one native contact; rank passives are attached only to attack 520502. */
export function applyMir4NativePiercingSpearContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): Mir4NativePiercingSpearContactResult {
  const empty = {
    applied: false,
    knockedDown: false,
    failureResistanceDebuffApplied: false,
    blinded: false,
  } as const;
  const policy = mir4NativePiercingSpearPolicy(requestedSkillLevel);
  const reaction = mir4NativeRuntimeCrowdControlReaction(SKILL_ID, attackId);
  const skillName = mir4SkillById(SKILL_ID)?.displayName;
  if (
    !policy ||
    !reaction ||
    !skillName ||
    (attackId !== BASE_ATTACK_ID && attackId !== FAR_ATTACK_ID) ||
    sourceImpactIndex !== 0 ||
    source.dead ||
    target.dead
  ) {
    return empty;
  }

  const chance = mir4NativePiercingSpearKnockdownChanceBasisPoints(
    source,
    target,
    policy.skillLevel,
  );
  const chanceLanded = chance !== null && (chance >= 10_000 || rollBasisPoints() < chance);
  let knockedDown = false;
  if (chanceLanded) {
    const admission = applyMir4Effect(ctx, target, {
      effectId: reaction.effectId,
      kind: reaction.kind,
      durationSeconds: reaction.durationMs / 1_000,
      magnitude: 0,
      name: skillName,
      sourceId: source.id,
    });
    knockedDown =
      admission.ok &&
      applyMir4NativeAdmittedCrowdControlReaction(
        ctx,
        source,
        target,
        SKILL_ID,
        attackId,
        reaction,
      );
  }

  const firstContact = attackId === BASE_ATTACK_ID;
  const failureResistanceDebuffApplied =
    firstContact && !knockedDown
      ? replaceFailureResistanceDebuff(ctx, source, target, policy)
      : false;
  const darknessStacks = firstContact ? mir4NativeDarknessStacks(target) : 0;
  const blind = policy.darknessBlind;
  const blindChance = blind && darknessStacks > 0 ? blind.chancesByStacks[darknessStacks - 1] : 0;
  const blinded =
    blind !== null &&
    blindChance > 0 &&
    (blindChance >= 10_000 || rollBasisPoints() < blindChance) &&
    replaceBlind(ctx, source, target, blind.durationMs, skillName);

  return {
    applied: true,
    knockedDown,
    failureResistanceDebuffApplied,
    blinded,
  };
}
