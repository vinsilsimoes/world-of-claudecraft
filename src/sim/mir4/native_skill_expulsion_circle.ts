import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_taoist';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4PendingImpact } from '../types';
import { mir4ControlFamilyOf } from './control';
import { applyMir4Effect } from './effects';
import { mir4PartyPulseTargets } from './party_support';

const SKILL_ID = 3404 as const;
const PARTY_BUFF_ATTACK_ID = 340401 as const;
const BASE_SPELL_DEFENSE_BUFF_ID = 35012 as const;

export interface Mir4NativeExpulsionCircleMilestone {
  readonly spellDefense: number;
  readonly bossDamageReductionBasisPoints: number;
  readonly skillDamageReductionPercentagePoints: number;
  readonly durationMs: number;
  readonly bossDurationMs: number;
}

export interface Mir4NativeExpulsionCirclePolicy {
  readonly skillId: 3404;
  readonly skillLevel: number;
  readonly partyBuffAttackId: 340401;
  readonly partyBuffApplyAtMs: 564;
  readonly partyRadiusYards: 15;
  readonly partyHeightYards: 4;
  readonly partyTargetCap: 5;
  readonly baseSpellDefense: number;
  readonly baseDurationMs: 60_000;
  readonly milestone: Mir4NativeExpulsionCircleMilestone | null;
  readonly usableWhileSilenced: boolean;
  readonly cleansesDebilitation: boolean;
  readonly cleansesSilence: boolean;
  readonly casterDebilitationResistanceBasisPoints: number;
  readonly casterSilenceResistanceBasisPoints: number;
  readonly partyDebilitationResistanceBasisPoints: number;
  readonly partySilenceResistanceBasisPoints: number;
  readonly resistanceDurationMs: number;
}

export type Mir4NativeExpulsionCircleSetup = Extract<
  NonNullable<Mir4PendingImpact['nativeSetup']>,
  'taoist-expulsion-circle-party-buffs'
>;

export interface Mir4NativeExpulsionCircleScheduledImpact {
  readonly attackId: 340401;
  readonly target: Entity;
  readonly dueOffsetMs: 564;
  readonly nativeSetup: Mir4NativeExpulsionCircleSetup;
}

/**
 * Exact visible rank packages from STRING_TEMPLATE 343414/24/34/44, tied to
 * SKILL_SPECIAL_ABILITY 164..166 and SKILL_PASSIVE 631111..631139.
 */
const MILESTONES = Object.freeze({
  rank5: Object.freeze({
    spellDefense: 50,
    bossDamageReductionBasisPoints: 1_000,
    skillDamageReductionPercentagePoints: 6,
    durationMs: 15_000,
    bossDurationMs: 20_000,
  }),
  rank8: Object.freeze({
    spellDefense: 100,
    bossDamageReductionBasisPoints: 1_500,
    skillDamageReductionPercentagePoints: 12,
    durationMs: 20_000,
    bossDurationMs: 30_000,
  }),
  rank10: Object.freeze({
    spellDefense: 150,
    bossDamageReductionBasisPoints: 2_000,
    skillDamageReductionPercentagePoints: 20,
    durationMs: 30_000,
    bossDurationMs: 60_000,
  }),
});

function exactNativeExpulsionCircleSource(): boolean {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  const baseBuff = mir4NativeSkillBuffEvidenceById(BASE_SPELL_DEFENSE_BUFF_ID)?.rawRecord;
  const row = action?.rows.find((candidate) => candidate.attackId === PARTY_BUFF_ATTACK_ID);
  return Boolean(
    action &&
      row &&
      baseBuff &&
      action.cooldownMs === 46_000 &&
      action.skillCostType === 2 &&
      action.skillCost === 3_000 &&
      action.attackAnimationMs === 1_000 &&
      action.endCutAnimationMs === 950 &&
      action.hitCount === 0 &&
      action.requiredClassLevel === 48 &&
      action.targeting === false &&
      action.nativeBehavior.abilities[0]?.type === 26 &&
      action.nativeBehavior.abilities[0]?.value === 25 &&
      action.nativeBehavior.abilities[0]?.levelUpValue === 5 &&
      action.nativeBehavior.abilities[0]?.time === 60 &&
      row.nativeBehavior.attackUseType === 1 &&
      row.targetType === 4 &&
      row.authorialTargetValue === 5 &&
      row.impactType === 2 &&
      row.impactOffsetsMs[0] === 564 &&
      row.geometry.nativeDistanceMax === 1_500 &&
      row.geometry.nativeHeight === 400 &&
      row.guideEffectId === 102 &&
      baseBuff.BuffTime === 60 &&
      baseBuff.BuffIndexType_1 === 1 &&
      baseBuff.BuffIndex_1 === 26 &&
      baseBuff.BuffValue_1 === 25 &&
      baseBuff.LevelUpBuffValue_1 === 5,
  );
}

export function mir4NativeExpulsionCircleBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    exactNativeExpulsionCircleSource() &&
    row.attackId === PARTY_BUFF_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === BASE_SPELL_DEFENSE_BUFF_ID &&
    row.nativeBehavior.ccBuffIds.length === 0
  );
}

export function mir4NativeExpulsionCirclePolicy(
  requestedSkillLevel: number,
): Mir4NativeExpulsionCirclePolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeExpulsionCircleSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    partyBuffAttackId: PARTY_BUFF_ATTACK_ID,
    partyBuffApplyAtMs: 564,
    partyRadiusYards: 15,
    partyHeightYards: 4,
    partyTargetCap: 5,
    baseSpellDefense: 25 + 5 * (skillLevel - 1),
    baseDurationMs: 60_000,
    milestone: rank10
      ? MILESTONES.rank10
      : rank8
        ? MILESTONES.rank8
        : rank5
          ? MILESTONES.rank5
          : null,
    usableWhileSilenced: rank8,
    cleansesDebilitation: rank8,
    cleansesSilence: rank8,
    casterDebilitationResistanceBasisPoints: rank10 ? 5_000 : rank8 ? 1_000 : 0,
    casterSilenceResistanceBasisPoints: rank10 ? 7_000 : rank8 ? 1_000 : 0,
    partyDebilitationResistanceBasisPoints: rank10 ? 2_500 : rank8 ? 2_000 : 0,
    partySilenceResistanceBasisPoints: rank10 ? 3_500 : rank8 ? 2_000 : 0,
    resistanceDurationMs: rank10 ? 60_000 : rank8 ? 30_000 : 0,
  });
}

/** Snapshot the native five-player party envelope when the action commits. */
export function mir4NativeExpulsionCircleScheduledImpacts(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): readonly Mir4NativeExpulsionCircleScheduledImpact[] {
  const policy = mir4NativeExpulsionCirclePolicy(requestedSkillLevel);
  if (!policy || source.dead) return [];
  return mir4PartyPulseTargets(ctx, source, {
    radiusYards: policy.partyRadiusYards,
    heightYards: policy.partyHeightYards,
    maxTargets: policy.partyTargetCap,
  }).map((target) => ({
    attackId: policy.partyBuffAttackId,
    target,
    dueOffsetMs: policy.partyBuffApplyAtMs,
    nativeSetup: 'taoist-expulsion-circle-party-buffs' as const,
  }));
}

export function isMir4NativeExpulsionCircleSetup(
  skillId: number | undefined,
  nativeSetup: Mir4PendingImpact['nativeSetup'],
): nativeSetup is Mir4NativeExpulsionCircleSetup {
  return skillId === SKILL_ID && nativeSetup === 'taoist-expulsion-circle-party-buffs';
}

function removeEffects(
  target: Entity,
  predicate: (effect: NonNullable<Entity['mir4Effects']>['active'][number]) => boolean,
): boolean {
  const bag = target.mir4Effects;
  if (!bag) return false;
  const removedIds = new Set(
    bag.active
      .filter((effect) => !effect.unremovable && predicate(effect))
      .map((effect) => effect.effectId),
  );
  if (removedIds.size === 0) return false;
  bag.active = bag.active.filter((effect) => !removedIds.has(effect.effectId));
  target.auras = target.auras.filter((aura) => !removedIds.has(aura.id));
  return true;
}

function replaceStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  statusId: number,
  durationMs: number,
  magnitude: number,
): boolean {
  const effectId = `mir4_native_buff_${buffId}_${statusId}`;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  target.auras = target.auras.filter((aura) => aura.id !== effectId);
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude,
    nativeStatusId: statusId,
    name: mir4SkillById(SKILL_ID)?.displayName ?? 'Expulsion Circle',
    sourceId: source.id,
  }).ok;
}

/** Resolve BUFF 35012 and the exact rank package on one snapshotted party target. */
export function applyMir4NativeExpulsionCirclePartyBuffs(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeExpulsionCirclePolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead) return false;
  if (policy.cleansesSilence) {
    removeEffects(target, (effect) => effect.kind === 'silence');
  }
  if (policy.cleansesDebilitation) {
    removeEffects(target, (effect) => mir4ControlFamilyOf(effect.kind) === 'debilitation');
  }

  const results = [
    replaceStatus(
      ctx,
      source,
      target,
      BASE_SPELL_DEFENSE_BUFF_ID,
      26,
      policy.baseDurationMs,
      policy.baseSpellDefense,
    ),
  ];
  if (policy.milestone) {
    const highRank = policy.skillLevel >= 8;
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        highRank ? 30204 : 30207,
        26,
        policy.milestone.durationMs,
        policy.milestone.spellDefense,
      ),
      replaceStatus(
        ctx,
        source,
        target,
        highRank ? 30205 : 30208,
        43,
        policy.milestone.bossDurationMs,
        policy.milestone.bossDamageReductionBasisPoints,
      ),
      replaceStatus(
        ctx,
        source,
        target,
        highRank ? 30212 : 30213,
        45,
        policy.milestone.durationMs,
        policy.milestone.skillDamageReductionPercentagePoints,
      ),
    );
  }
  const self = target.id === source.id;
  const debilitationResistance = self
    ? policy.casterDebilitationResistanceBasisPoints
    : policy.partyDebilitationResistanceBasisPoints;
  const silenceResistance = self
    ? policy.casterSilenceResistanceBasisPoints
    : policy.partySilenceResistanceBasisPoints;
  if (debilitationResistance > 0) {
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        self ? 30108 : 30303,
        51,
        policy.resistanceDurationMs,
        debilitationResistance,
      ),
    );
  }
  if (silenceResistance > 0) {
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        self ? 30109 : 30304,
        53,
        policy.resistanceDurationMs,
        silenceResistance,
      ),
    );
  }
  return results.every(Boolean);
}
