import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_taoist';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4PendingImpact } from '../types';
import { applyMir4Effect, mir4EffectiveSpellPower, mir4NativeStatusBonus } from './effects';
import { mir4PartyPulseTargets } from './party_support';
import { mir4ManaRecoveredFromHealing, mir4ModifiedSkillHealing } from './status_effects';

const SKILL_ID = 3503;
const SOURCE_BUFF_ATTACK_ID = 350301;
const SPECIAL_ATTACK_ID = 350302;
const PARTY_BUFF_ATTACK_ID = 350303;
const HEAL_BUFF_ID = 35014;
const UNINTERRUPTIBLE_BUFF_ID = 33011;

export interface Mir4NativeHealPolicy {
  readonly skillId: 3503;
  readonly skillLevel: number;
  readonly sourceBuffAttackId: 350301;
  readonly sourceBuffApplyAtMs: 20;
  readonly partyBuffAttackId: 350303;
  readonly partyBuffApplyAtMs: 840;
  readonly specialAttackId: 350302;
  readonly specialApplyAtMs: 590;
  readonly pulseCount: 5;
  readonly pulseIntervalMs: 1_000;
  readonly spellAttackBasisPoints: number;
  readonly flatHealing: 100;
  readonly radiusYards: 30;
  readonly heightYards: 4;
  readonly targetCap: 5;
  readonly controlImmunityDurationMs: 2_000;
  readonly selfBonusMaxHpBasisPoints: number;
  readonly partyBonusMaxHpBasisPoints: number;
  readonly debilitationSelfCleanseChanceBasisPoints: number;
  readonly debilitationPartyCleanseChanceBasisPoints: number;
  readonly silenceCleanse: boolean;
  readonly stunPartyCleanse: boolean;
  readonly bossDamageReductionBasisPoints: number;
  readonly bossDamageReductionDurationMs: number;
  readonly usableWhileSilenced: boolean;
}

function exactNativeHealSource(): boolean {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  const healBuff = mir4NativeSkillBuffEvidenceById(HEAL_BUFF_ID)?.rawRecord;
  const uninterruptibleBuff = mir4NativeSkillBuffEvidenceById(UNINTERRUPTIBLE_BUFF_ID)?.rawRecord;
  if (!action || !healBuff || !uninterruptibleBuff) return false;
  const source = action.rows.find((row) => row.attackId === SOURCE_BUFF_ATTACK_ID);
  const special = action.rows.find((row) => row.attackId === SPECIAL_ATTACK_ID);
  const party = action.rows.find((row) => row.attackId === PARTY_BUFF_ATTACK_ID);
  return (
    action.cooldownMs === 20_000 &&
    action.attackAnimationMs === 1_400 &&
    action.endCutAnimationMs === 1_350 &&
    action.targeting === false &&
    action.nativeBehavior.abilities[0]?.type === 2027 &&
    action.nativeBehavior.abilities[0]?.value === 36 &&
    action.nativeBehavior.abilities[0]?.levelUpValue === 2 &&
    action.nativeBehavior.abilities[0]?.time === 5 &&
    action.nativeBehavior.abilities[1]?.type === 2021 &&
    action.nativeBehavior.abilities[1]?.value === 100 &&
    source?.impactOffsetsMs[0] === 20 &&
    source.targetType === 2 &&
    source.authorialTargetValue === 5 &&
    source.geometry.nativeDistanceMax === 3_000 &&
    source.geometry.nativeHeight === 400 &&
    source.nativeBehavior.buffIds.includes(HEAL_BUFF_ID) &&
    source.nativeBehavior.buffIds.includes(UNINTERRUPTIBLE_BUFF_ID) &&
    special?.impactOffsetsMs[0] === 590 &&
    special.targetType === 4 &&
    special.authorialTargetValue === 5 &&
    party?.impactOffsetsMs[0] === 840 &&
    party.targetType === 3 &&
    party.authorialTargetValue === 5 &&
    party.nativeBehavior.buffIds.includes(HEAL_BUFF_ID) &&
    healBuff.BuffTime === 5.3 &&
    healBuff.BuffIndexType_1 === 2 &&
    healBuff.BuffIndex_1 === 2027 &&
    healBuff.BuffValue_1 === 3_600 &&
    healBuff.LevelUpBuffValue_1 === 200 &&
    healBuff.BuffIndexType_2 === 2 &&
    healBuff.BuffIndex_2 === 2021 &&
    healBuff.BuffValue_2 === 100 &&
    uninterruptibleBuff.BuffTime === 2 &&
    uninterruptibleBuff.BuffIndexType_1 === 3 &&
    uninterruptibleBuff.BuffIndex_1 === 4004
  );
}

export function mir4NativeHealBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  if (!exactNativeHealSource()) return false;
  if (row.attackId === SOURCE_BUFF_ATTACK_ID) {
    return (
      row.nativeBehavior.buffIds.length === 2 &&
      row.nativeBehavior.buffIds[0] === HEAL_BUFF_ID &&
      row.nativeBehavior.buffIds[1] === UNINTERRUPTIBLE_BUFF_ID &&
      row.nativeBehavior.ccBuffIds.length === 0
    );
  }
  if (row.attackId === PARTY_BUFF_ATTACK_ID) {
    return (
      row.nativeBehavior.buffIds.length === 1 &&
      row.nativeBehavior.buffIds[0] === HEAL_BUFF_ID &&
      row.nativeBehavior.ccBuffIds.length === 0
    );
  }
  return false;
}

/**
 * Native Heal has four special tiers. Aeldrune keeps its rank-15 progression,
 * so the base 2 percentage-point Spell ATK growth continues after native rank
 * 10 while rank milestone effects remain capped at their rank-10 values.
 */
export function mir4NativeHealPolicy(requestedSkillLevel: number): Mir4NativeHealPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeHealSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    sourceBuffAttackId: SOURCE_BUFF_ATTACK_ID,
    sourceBuffApplyAtMs: 20,
    partyBuffAttackId: PARTY_BUFF_ATTACK_ID,
    partyBuffApplyAtMs: 840,
    specialAttackId: SPECIAL_ATTACK_ID,
    specialApplyAtMs: 590,
    pulseCount: 5,
    pulseIntervalMs: 1_000,
    spellAttackBasisPoints: 3_600 + 200 * (skillLevel - 1),
    flatHealing: 100,
    radiusYards: 30,
    heightYards: 4,
    targetCap: 5,
    controlImmunityDurationMs: 2_000,
    selfBonusMaxHpBasisPoints: rank10 ? 4_000 : rank8 ? 2_500 : rank5 ? 1_000 : 0,
    partyBonusMaxHpBasisPoints: rank10 ? 5_000 : rank8 ? 3_500 : rank5 ? 1_500 : 0,
    debilitationSelfCleanseChanceBasisPoints: rank8 ? 10_000 : 0,
    debilitationPartyCleanseChanceBasisPoints: rank10 ? 10_000 : rank8 ? 5_000 : 0,
    silenceCleanse: rank8,
    stunPartyCleanse: rank10,
    bossDamageReductionBasisPoints: rank10 ? 2_000 : rank8 ? 1_000 : 0,
    bossDamageReductionDurationMs: rank10 ? 60_000 : rank8 ? 30_000 : 0,
    usableWhileSilenced: rank8,
  });
}

/** Raw healing of one of BUFF 35014's five one-second pulses. */
export function mir4NativeHealPerPulse(spellAttack: number, requestedSkillLevel: number): number {
  const policy = mir4NativeHealPolicy(requestedSkillLevel);
  if (!policy) return 0;
  const safeSpellAttack = Number.isFinite(spellAttack) ? Math.max(0, spellAttack) : 0;
  return (
    Math.floor((safeSpellAttack * policy.spellAttackBasisPoints) / 10_000) + policy.flatHealing
  );
}

export type Mir4NativeHealSetup = Extract<
  NonNullable<Mir4PendingImpact['nativeSetup']>,
  'taoist-heal-control-immunity' | 'taoist-heal-rank-effects' | 'taoist-heal-pulse'
>;

export interface Mir4NativeHealScheduledImpact {
  readonly attackId: 350301 | 350302 | 350303;
  readonly target: Entity;
  readonly dueOffsetMs: number;
  readonly nativeSetup: Mir4NativeHealSetup;
}

/** Snapshot the exact five-player support envelope when the action commits. */
export function mir4NativeHealScheduledImpacts(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): readonly Mir4NativeHealScheduledImpact[] {
  const policy = mir4NativeHealPolicy(requestedSkillLevel);
  if (!policy || source.dead) return [];
  const targets = mir4PartyPulseTargets(ctx, source, {
    radiusYards: policy.radiusYards,
    heightYards: policy.heightYards,
    maxTargets: policy.targetCap,
  });
  const sourceTarget = targets.find((target) => target.id === source.id);
  if (!sourceTarget) return [];
  const impacts: Mir4NativeHealScheduledImpact[] = [
    {
      attackId: policy.sourceBuffAttackId,
      target: sourceTarget,
      dueOffsetMs: policy.sourceBuffApplyAtMs,
      nativeSetup: 'taoist-heal-control-immunity',
    },
  ];
  if (policy.selfBonusMaxHpBasisPoints > 0 || policy.partyBonusMaxHpBasisPoints > 0) {
    for (const target of targets) {
      impacts.push({
        attackId: policy.specialAttackId,
        target,
        dueOffsetMs: policy.specialApplyAtMs,
        nativeSetup: 'taoist-heal-rank-effects',
      });
    }
  }
  for (let pulse = 1; pulse <= policy.pulseCount; pulse += 1) {
    impacts.push({
      attackId: policy.sourceBuffAttackId,
      target: sourceTarget,
      dueOffsetMs: policy.sourceBuffApplyAtMs + pulse * policy.pulseIntervalMs,
      nativeSetup: 'taoist-heal-pulse',
    });
  }
  for (const target of targets) {
    if (target.id === source.id) continue;
    for (let pulse = 1; pulse <= policy.pulseCount; pulse += 1) {
      impacts.push({
        attackId: policy.partyBuffAttackId,
        target,
        dueOffsetMs: policy.partyBuffApplyAtMs + pulse * policy.pulseIntervalMs,
        nativeSetup: 'taoist-heal-pulse',
      });
    }
  }
  return impacts;
}

export function isMir4NativeHealSetup(
  skillId: number | undefined,
  nativeSetup: Mir4PendingImpact['nativeSetup'],
): nativeSetup is Mir4NativeHealSetup {
  return (
    skillId === SKILL_ID &&
    (nativeSetup === 'taoist-heal-control-immunity' ||
      nativeSetup === 'taoist-heal-rank-effects' ||
      nativeSetup === 'taoist-heal-pulse')
  );
}

/** BUFF 33011: uninterruptible and immune to Crowd Controls for two seconds. */
export function applyMir4NativeHealControlImmunity(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeHealPolicy(requestedSkillLevel);
  if (!policy || source.dead) return false;
  const existing = source.mir4Effects?.active.find(
    (effect) => effect.effectId === 'mir4_native_buff_33011',
  );
  if (existing) {
    existing.duration = policy.controlImmunityDurationMs / 1_000;
    existing.remaining = existing.duration;
    return true;
  }
  return applyMir4Effect(ctx, source, {
    effectId: 'mir4_native_buff_33011',
    kind: 'control-immunity',
    durationSeconds: policy.controlImmunityDurationMs / 1_000,
    magnitude: 0,
    name: 'Uninterruptible',
    sourceId: source.id,
  }).ok;
}

/** Resolve one BUFF 35014 tick and return the actual health restored. */
export function applyMir4NativeHealPulse(
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
  ctx?: Pick<SimContext, 'entities' | 'partyOf' | 'players'>,
): number {
  if (source.dead || target.dead) return 0;
  const rawHealing = mir4NativeHealPerPulse(
    mir4EffectiveSpellPower(source, ctx),
    requestedSkillLevel,
  );
  const healing = mir4ModifiedSkillHealing(
    rawHealing,
    source.mir4?.statusValues,
    mir4NativeStatusBonus(source, 148),
  );
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + healing);
  const restored = target.hp - before;
  source.resource = Math.min(
    source.maxResource,
    source.resource + mir4ManaRecoveredFromHealing(restored, source.mir4?.statusValues),
  );
  return restored;
}

const DEBILITATION_EFFECT_IDS = new Set(['mir4_native_buff_10020', 'mir4_native_buff_20020']);

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

function replaceBossDamageReduction(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: Mir4NativeHealPolicy,
): boolean {
  if (policy.bossDamageReductionBasisPoints <= 0) return false;
  const effectId = 'mir4_native_buff_30201';
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'boss-damage-reduction',
    durationSeconds: policy.bossDamageReductionDurationMs / 1_000,
    magnitude: policy.bossDamageReductionBasisPoints,
    name: 'Heal: Boss DMG Reduction',
    sourceId: source.id,
  }).ok;
}

/** Rank 5, 8, and 10 special effects from SKILL_SPECIAL_ABILITY rows 134 to 136. */
export function applyMir4NativeHealRankEffects(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): boolean {
  const policy = mir4NativeHealPolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead || policy.selfBonusMaxHpBasisPoints <= 0) return false;
  const self = source.id === target.id;
  const bonusBasisPoints = self
    ? policy.selfBonusMaxHpBasisPoints
    : policy.partyBonusMaxHpBasisPoints;
  const rawBonus = Math.floor((target.maxHp * bonusBasisPoints) / 10_000);
  const healing = mir4ModifiedSkillHealing(
    rawBonus,
    source.mir4?.statusValues,
    mir4NativeStatusBonus(source, 148),
  );
  const healthBefore = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + healing);
  source.resource = Math.min(
    source.maxResource,
    source.resource +
      mir4ManaRecoveredFromHealing(target.hp - healthBefore, source.mir4?.statusValues),
  );

  const cleanseChance = self
    ? policy.debilitationSelfCleanseChanceBasisPoints
    : policy.debilitationPartyCleanseChanceBasisPoints;
  if (cleanseChance >= 10_000 || (cleanseChance > 0 && rollBasisPoints() < cleanseChance)) {
    removeEffects(target, (effect) => DEBILITATION_EFFECT_IDS.has(effect.effectId));
  }
  if (policy.silenceCleanse) {
    removeEffects(target, (effect) => effect.kind === 'silence');
  }
  if (policy.stunPartyCleanse && !self) {
    removeEffects(target, (effect) => effect.kind === 'stun');
  }
  replaceBossDamageReduction(ctx, source, target, policy);
  return true;
}
