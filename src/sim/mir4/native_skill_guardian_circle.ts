import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_taoist';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4PendingImpact } from '../types';
import { applyMir4Effect } from './effects';
import { mir4PartyPulseTargets } from './party_support';

const SKILL_ID = 3501 as const;
const SETUP_ATTACK_ID = 350101 as const;
const DAMAGE_ATTACK_ID = 350102 as const;
const PARTY_BUFF_ATTACK_ID = 350103 as const;
const BASH_REDUCTION_BUFF_ID = 35010 as const;
const PHYSICAL_DEFENSE_BUFF_ID = 35011 as const;

export interface Mir4NativeGuardianCircleMilestone {
  readonly physicalDefense: number;
  readonly monsterDamageReductionBasisPoints: number;
  readonly bashDamageReductionBasisPoints: number;
  readonly criticalDamageReductionBasisPoints: number;
  readonly durationMs: number;
}

export interface Mir4NativeGuardianCirclePolicy {
  readonly skillId: 3501;
  readonly skillLevel: number;
  readonly setupAttackId: 350101;
  readonly setupApplyAtMs: 20;
  readonly damageAttackId: 350102;
  readonly damageApplyAtMs: 400;
  readonly partyBuffAttackId: 350103;
  readonly partyBuffApplyAtMs: 550;
  readonly damageSpellAttackBasisPoints: number;
  readonly damageRadiusYards: 6;
  readonly damageHeightYards: 4;
  readonly damageTargetCap: 5;
  readonly partyRadiusYards: 15;
  readonly partyHeightYards: 4;
  readonly partyTargetCap: 5;
  readonly basePhysicalDefense: number;
  readonly baseBashDamageReductionBasisPoints: number;
  readonly baseDurationMs: 60_000;
  readonly milestone: Mir4NativeGuardianCircleMilestone | null;
  readonly usableWhileStunned: boolean;
  readonly removesStun: boolean;
  readonly casterStunResistanceBasisPoints: number;
  readonly partyStunResistanceBasisPoints: number;
  readonly stunResistanceDurationMs: number;
  readonly mpPotionRecoveryBasisPoints: number;
  readonly mpPotionRecoveryDurationMs: number;
  readonly lowestHealthAllDamageReductionBasisPoints: number;
  readonly lowestHealthAllDamageReductionDurationMs: number;
}

export type Mir4NativeGuardianCircleSetup = Extract<
  NonNullable<Mir4PendingImpact['nativeSetup']>,
  | 'taoist-guardian-circle-stun-removal'
  | 'taoist-guardian-circle-party-buffs'
  | 'taoist-guardian-circle-lowest-health-buff'
>;

export interface Mir4NativeGuardianCircleScheduledImpact {
  readonly attackId: 350101 | 350103;
  readonly target: Entity;
  readonly dueOffsetMs: 20 | 550;
  readonly nativeSetup: Mir4NativeGuardianCircleSetup;
}

/**
 * Rank milestone values recovered from the exact 3501 special-ability graph.
 *
 * Sources:
 * SKILL_SPECIAL_ABILITY.json sha256
 * 9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db
 * SKILL_PASSIVE.json sha256
 * 533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e
 * BUFF.json sha256
 * 797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b
 */
const MILESTONES = Object.freeze({
  rank5: Object.freeze({
    physicalDefense: 50,
    monsterDamageReductionBasisPoints: 1_000,
    bashDamageReductionBasisPoints: 1_000,
    criticalDamageReductionBasisPoints: 0,
    durationMs: 15_000,
  }),
  rank8: Object.freeze({
    physicalDefense: 100,
    monsterDamageReductionBasisPoints: 1_500,
    bashDamageReductionBasisPoints: 2_000,
    criticalDamageReductionBasisPoints: 1_500,
    durationMs: 20_000,
  }),
  rank10: Object.freeze({
    physicalDefense: 150,
    monsterDamageReductionBasisPoints: 2_000,
    bashDamageReductionBasisPoints: 4_000,
    criticalDamageReductionBasisPoints: 3_000,
    durationMs: 30_000,
  }),
});

function exactNativeGuardianCircleSource(): boolean {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  const bashBuff = mir4NativeSkillBuffEvidenceById(BASH_REDUCTION_BUFF_ID)?.rawRecord;
  const defenseBuff = mir4NativeSkillBuffEvidenceById(PHYSICAL_DEFENSE_BUFF_ID)?.rawRecord;
  if (!action || !bashBuff || !defenseBuff) return false;
  const setup = action.rows.find((row) => row.attackId === SETUP_ATTACK_ID);
  const damage = action.rows.find((row) => row.attackId === DAMAGE_ATTACK_ID);
  const party = action.rows.find((row) => row.attackId === PARTY_BUFF_ATTACK_ID);
  return (
    action.cooldownMs === 46_000 &&
    action.attackAnimationMs === 1_000 &&
    action.endCutAnimationMs === 950 &&
    action.targeting === false &&
    action.nativeBehavior.stateConditionUse === true &&
    action.nativeBehavior.moveConditionUse === false &&
    action.nativeBehavior.secondaryDamage.coefficient === 60 &&
    action.nativeBehavior.secondaryDamage.levelUpCoefficient === 1 &&
    action.nativeBehavior.abilities[0]?.type === 24 &&
    action.nativeBehavior.abilities[0]?.value === 25 &&
    action.nativeBehavior.abilities[0]?.levelUpValue === 5 &&
    action.nativeBehavior.abilities[0]?.time === 60 &&
    action.nativeBehavior.abilities[1]?.type === 0 &&
    action.nativeBehavior.abilities[1]?.value === 10 &&
    action.nativeBehavior.abilities[1]?.levelUpValue === 2 &&
    action.nativeBehavior.abilities[1]?.time === 60 &&
    setup?.impactOffsetsMs[0] === 20 &&
    setup.targetType === 4 &&
    setup.authorialTargetValue === 5 &&
    setup.geometry.nativeDistanceMax === 1_500 &&
    setup.geometry.nativeHeight === 400 &&
    damage?.impactOffsetsMs[0] === 400 &&
    damage.targetType === 1 &&
    damage.authorialTargetValue === 5 &&
    damage.impactType === 2 &&
    damage.geometry.nativeDistanceMax === 600 &&
    damage.geometry.nativeHeight === 400 &&
    damage.nativeBehavior.magicDamage.coefficient === 6_000 &&
    damage.nativeBehavior.magicDamage.levelUpCoefficient === 100 &&
    party?.impactOffsetsMs[0] === 550 &&
    party.targetType === 4 &&
    party.authorialTargetValue === 5 &&
    party.impactType === 2 &&
    party.geometry.nativeDistanceMax === 1_500 &&
    party.geometry.nativeHeight === 400 &&
    bashBuff.BuffTime === 60 &&
    bashBuff.BuffIndexType_1 === 1 &&
    bashBuff.BuffIndex_1 === 35 &&
    bashBuff.BuffValue_1 === 100 &&
    bashBuff.LevelUpBuffValue_1 === 20 &&
    defenseBuff.BuffTime === 60 &&
    defenseBuff.BuffIndexType_1 === 1 &&
    defenseBuff.BuffIndex_1 === 24 &&
    defenseBuff.BuffValue_1 === 25 &&
    defenseBuff.LevelUpBuffValue_1 === 5
  );
}

export function mir4NativeGuardianCircleBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    exactNativeGuardianCircleSource() &&
    row.attackId === PARTY_BUFF_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 2 &&
    row.nativeBehavior.buffIds[0] === BASH_REDUCTION_BUFF_ID &&
    row.nativeBehavior.buffIds[1] === PHYSICAL_DEFENSE_BUFF_ID &&
    row.nativeBehavior.ccBuffIds.length === 0
  );
}

export function mir4NativeGuardianCirclePolicy(
  requestedSkillLevel: number,
): Mir4NativeGuardianCirclePolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeGuardianCircleSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    setupAttackId: SETUP_ATTACK_ID,
    setupApplyAtMs: 20,
    damageAttackId: DAMAGE_ATTACK_ID,
    damageApplyAtMs: 400,
    partyBuffAttackId: PARTY_BUFF_ATTACK_ID,
    partyBuffApplyAtMs: 550,
    damageSpellAttackBasisPoints: 6_000 + 100 * (skillLevel - 1),
    damageRadiusYards: 6,
    damageHeightYards: 4,
    damageTargetCap: 5,
    partyRadiusYards: 15,
    partyHeightYards: 4,
    partyTargetCap: 5,
    basePhysicalDefense: 25 + 5 * (skillLevel - 1),
    baseBashDamageReductionBasisPoints: 1_000 + 200 * (skillLevel - 1),
    baseDurationMs: 60_000,
    milestone: rank10
      ? MILESTONES.rank10
      : rank8
        ? MILESTONES.rank8
        : rank5
          ? MILESTONES.rank5
          : null,
    usableWhileStunned: rank8,
    removesStun: rank8,
    casterStunResistanceBasisPoints: rank10 ? 5_000 : rank8 ? 2_000 : 0,
    partyStunResistanceBasisPoints: rank8 ? 2_000 : 0,
    stunResistanceDurationMs: rank10 ? 60_000 : rank8 ? 30_000 : 0,
    mpPotionRecoveryBasisPoints: rank10 ? 1_500 : rank8 ? 1_000 : 0,
    mpPotionRecoveryDurationMs: rank10 ? 30_000 : rank8 ? 20_000 : 0,
    lowestHealthAllDamageReductionBasisPoints: rank10 ? 3_000 : 0,
    lowestHealthAllDamageReductionDurationMs: rank10 ? 15_000 : 0,
  });
}

function lowerHealthRatio(left: Entity, right: Entity): boolean {
  return left.hp * Math.max(1, right.maxHp) < right.hp * Math.max(1, left.maxHp);
}

/** Snapshot the native five-player support envelope when the action commits. */
export function mir4NativeGuardianCircleScheduledImpacts(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): readonly Mir4NativeGuardianCircleScheduledImpact[] {
  const policy = mir4NativeGuardianCirclePolicy(requestedSkillLevel);
  if (!policy || source.dead) return [];
  const targets = mir4PartyPulseTargets(ctx, source, {
    radiusYards: policy.partyRadiusYards,
    heightYards: policy.partyHeightYards,
    maxTargets: policy.partyTargetCap,
  });
  if (!targets.some((target) => target.id === source.id)) return [];
  const impacts: Mir4NativeGuardianCircleScheduledImpact[] = [];
  if (policy.removesStun) {
    for (const target of targets) {
      impacts.push({
        attackId: policy.setupAttackId,
        target,
        dueOffsetMs: policy.setupApplyAtMs,
        nativeSetup: 'taoist-guardian-circle-stun-removal',
      });
    }
  }
  for (const target of targets) {
    impacts.push({
      attackId: policy.partyBuffAttackId,
      target,
      dueOffsetMs: policy.partyBuffApplyAtMs,
      nativeSetup: 'taoist-guardian-circle-party-buffs',
    });
  }
  if (policy.lowestHealthAllDamageReductionBasisPoints > 0 && targets.length > 0) {
    const lowest = targets.reduce((current, candidate) =>
      lowerHealthRatio(candidate, current) ? candidate : current,
    );
    impacts.push({
      attackId: policy.partyBuffAttackId,
      target: lowest,
      dueOffsetMs: policy.partyBuffApplyAtMs,
      nativeSetup: 'taoist-guardian-circle-lowest-health-buff',
    });
  }
  return impacts;
}

export function isMir4NativeGuardianCircleSetup(
  skillId: number | undefined,
  nativeSetup: Mir4PendingImpact['nativeSetup'],
): nativeSetup is Mir4NativeGuardianCircleSetup {
  return (
    skillId === SKILL_ID &&
    (nativeSetup === 'taoist-guardian-circle-stun-removal' ||
      nativeSetup === 'taoist-guardian-circle-party-buffs' ||
      nativeSetup === 'taoist-guardian-circle-lowest-health-buff')
  );
}

function replaceEffect(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: {
    readonly effectId: string;
    readonly kind: 'native-status-boost' | 'all-damage-reduction';
    readonly durationMs: number;
    readonly magnitude: number;
    readonly nativeStatusId?: number;
  },
): boolean {
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== spec.effectId,
    );
  }
  target.auras = target.auras.filter((aura) => aura.id !== spec.effectId);
  const name = mir4SkillById(SKILL_ID)?.displayName ?? 'Guardian Circle';
  return applyMir4Effect(ctx, target, {
    effectId: spec.effectId,
    kind: spec.kind,
    durationSeconds: spec.durationMs / 1_000,
    magnitude: spec.magnitude,
    nativeStatusId: spec.nativeStatusId,
    name,
    sourceId: source.id,
  }).ok;
}

function applyStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  statusId: number,
  durationMs: number,
  magnitude: number,
): boolean {
  return replaceEffect(ctx, source, target, {
    effectId: `mir4_native_buff_${buffId}_${statusId}`,
    kind: 'native-status-boost',
    durationMs,
    magnitude,
    nativeStatusId: statusId,
  });
}

/** Rank 8 setup row: remove removable Stun effects and their classic mirrors. */
export function applyMir4NativeGuardianCircleStunRemoval(target: Entity): boolean {
  const bag = target.mir4Effects;
  if (!bag) return false;
  const removed = new Set(
    bag.active
      .filter((effect) => effect.kind === 'stun' && !effect.unremovable)
      .map((effect) => effect.effectId),
  );
  if (removed.size === 0) return false;
  bag.active = bag.active.filter((effect) => !removed.has(effect.effectId));
  target.auras = target.auras.filter((aura) => !removed.has(aura.id));
  return true;
}

/** Apply the base BUFF rows plus the rank 5, 8, or 10 milestone package. */
export function applyMir4NativeGuardianCirclePartyBuffs(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeGuardianCirclePolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead) return false;
  const results = [
    applyStatus(
      ctx,
      source,
      target,
      PHYSICAL_DEFENSE_BUFF_ID,
      24,
      policy.baseDurationMs,
      policy.basePhysicalDefense,
    ),
    applyStatus(
      ctx,
      source,
      target,
      BASH_REDUCTION_BUFF_ID,
      35,
      policy.baseDurationMs,
      policy.baseBashDamageReductionBasisPoints,
    ),
  ];
  if (policy.milestone) {
    const highRank = policy.skillLevel >= 8;
    results.push(
      applyStatus(
        ctx,
        source,
        target,
        highRank ? 30202 : 30209,
        24,
        policy.milestone.durationMs,
        policy.milestone.physicalDefense,
      ),
      applyStatus(
        ctx,
        source,
        target,
        highRank ? 30101 : 30106,
        42,
        policy.milestone.durationMs,
        policy.milestone.monsterDamageReductionBasisPoints,
      ),
      applyStatus(
        ctx,
        source,
        target,
        highRank ? 30203 : 30210,
        35,
        policy.milestone.durationMs,
        policy.milestone.bashDamageReductionBasisPoints,
      ),
    );
    if (policy.milestone.criticalDamageReductionBasisPoints > 0) {
      results.push(
        applyStatus(
          ctx,
          source,
          target,
          30214,
          33,
          policy.milestone.durationMs,
          policy.milestone.criticalDamageReductionBasisPoints,
        ),
      );
    }
  }
  const stunResistance =
    target.id === source.id
      ? policy.casterStunResistanceBasisPoints
      : policy.partyStunResistanceBasisPoints;
  if (stunResistance > 0) {
    results.push(
      applyStatus(
        ctx,
        source,
        target,
        policy.skillLevel >= 10 ? 30301 : 30107,
        49,
        policy.stunResistanceDurationMs,
        stunResistance,
      ),
    );
  }
  if (policy.mpPotionRecoveryBasisPoints > 0) {
    results.push(
      applyStatus(
        ctx,
        source,
        target,
        30206,
        147,
        policy.mpPotionRecoveryDurationMs,
        policy.mpPotionRecoveryBasisPoints,
      ),
    );
  }
  return results.every(Boolean);
}

/** Rank 10 targetType 3 branch, resolved only for the snapshotted lowest-HP member. */
export function applyMir4NativeGuardianCircleLowestHealthBuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeGuardianCirclePolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead) return false;
  if (policy.lowestHealthAllDamageReductionBasisPoints <= 0) return false;
  return replaceEffect(ctx, source, target, {
    effectId: 'mir4_native_buff_30302_all_damage_reduction',
    kind: 'all-damage-reduction',
    durationMs: policy.lowestHealthAllDamageReductionDurationMs,
    magnitude: policy.lowestHealthAllDamageReductionBasisPoints,
  });
}
