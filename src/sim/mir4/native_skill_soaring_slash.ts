import type { Mir4NativeSkillAction, Mir4SkillDef } from '../content/mir4';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_taoist';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { applyMir4Effect } from './effects';

const SKILL_ID = 3203 as const;
const DEBILITATION_BUFF_IDS = Object.freeze([10020, 20020] as const);

export interface Mir4NativeSoaringSlashPolicy {
  readonly skillId: 3203;
  readonly skillLevel: number;
  readonly bashBonusBasisPoints: number;
  readonly baseDebilitationDurationMs: 5_000;
  readonly refreshAttackId: 320302;
  readonly refreshDebilitationDurationMs: number;
  readonly damagedArmor: Readonly<{ defenseLoss: number; durationMs: number }> | null;
  readonly bothDebilitationsSkillDamageBasisPoints: number;
  readonly criticalEvasionLoss: Readonly<{ amount: 500; durationMs: 10_000 }> | null;
  readonly partySkillDamageReductionBasisPoints: number;
}

export interface Mir4NativeSoaringSlashContactResult {
  readonly applied: boolean;
  readonly confuseApplied: boolean;
  readonly chillApplied: boolean;
  readonly debilitationRefreshed: boolean;
  readonly damagedArmorApplied: boolean;
  readonly criticalEvasionReduced: boolean;
}

function exactNativeSoaringSlashSource(): Mir4NativeSkillAction | null {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  if (
    !action ||
    action.nativeBehavior.damageType !== 0 ||
    action.nativeBehavior.primaryDamage.coefficient !== 290 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 6 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 110 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 2 ||
    action.rows.length !== 3 ||
    action.rows.some(
      (row) =>
        row.nativeBehavior.damageType !== 3 ||
        row.impactType !== 3 ||
        row.targetType !== 1 ||
        row.authorialTargetValue !== 8 ||
        row.impactOffsetsMs.length !== 3,
    ) ||
    action.nativeBehavior.smiteBuffIds.length !== 2 ||
    action.nativeBehavior.smiteBuffIds[0] !== 10020 ||
    action.nativeBehavior.smiteBuffIds[1] !== 20020 ||
    action.nativeBehavior.autoLearnPassiveIds.length !== 2 ||
    action.nativeBehavior.autoLearnPassiveIds[0] !== 101002 ||
    action.nativeBehavior.autoLearnPassiveIds[1] !== 102001
  ) {
    return null;
  }
  return action;
}

/**
 * Exact hybrid SKILL summary: 290% PHYS + 110% Spell across the three rows.
 * Runtime damage remains owned by those rows and their nine authored contacts.
 */
export function mir4NativeSoaringSlashDamageSummaryMatches(
  action: Mir4NativeSkillAction,
  skill: Mir4SkillDef,
): boolean {
  const exact = exactNativeSoaringSlashSource();
  if (exact !== action || skill.skillId !== SKILL_ID || !skill.damage) return false;
  const physical = skill.damage.components.filter((component) => component.damageType === 1);
  const magic = skill.damage.components.filter((component) => component.damageType === 2);
  return (
    physical.reduce((total, component) => total + component.coefficient, 0) === 29_000 &&
    physical.reduce((total, component) => total + component.levelUpCoefficient, 0) === 600 &&
    magic.reduce((total, component) => total + component.coefficient, 0) === 11_000 &&
    magic.reduce((total, component) => total + component.levelUpCoefficient, 0) === 200 &&
    skill.damage.aggregateCoefficient === 40_000 &&
    skill.damage.aggregateLevelUpCoefficient === 800
  );
}

/** Rank milestones from SKILL_SPECIAL_ABILITY rows 158..163 and strings 343213..343243. */
export function mir4NativeSoaringSlashPolicy(
  requestedSkillLevel: number,
): Mir4NativeSoaringSlashPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeSoaringSlashSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    bashBonusBasisPoints: rank10 ? 10_000 : rank8 ? 8_000 : rank5 ? 6_500 : 5_000,
    baseDebilitationDurationMs: 5_000,
    refreshAttackId: 320302,
    refreshDebilitationDurationMs: rank5 ? 10_000 : 0,
    damagedArmor: rank5
      ? Object.freeze({
          defenseLoss: rank10 ? 30 : rank8 ? 20 : 10,
          durationMs: rank10 ? 180_000 : rank8 ? 120_000 : 60_000,
        })
      : null,
    bothDebilitationsSkillDamageBasisPoints: rank10 ? 10_000 : rank8 ? 5_000 : 0,
    criticalEvasionLoss: rank10
      ? Object.freeze({ amount: 500 as const, durationMs: 10_000 as const })
      : null,
    partySkillDamageReductionBasisPoints: rank10 ? 1_200 : rank8 ? 800 : rank5 ? 400 : 0,
  });
}

function activeNativeBuff(target: Entity, buffId: number): boolean {
  const prefix = `mir4_native_buff_${buffId}`;
  return (
    target.mir4Effects?.active.some(
      (effect) =>
        effect.remaining > CAST_COMPLETE_EPS &&
        (effect.effectId === prefix || effect.effectId.startsWith(`${prefix}_`)),
    ) === true
  );
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
  target.auras = target.auras.filter((aura) => aura.id !== spec.effectId);
  return applyMir4Effect(ctx, target, { ...spec, sourceId: source.id }).ok;
}

function applyOrExtendDebilitation(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: 10020 | 20020,
  statusId: 24 | 45,
  durationMs: number,
): boolean {
  const effectId = `mir4_native_buff_${buffId}`;
  const existing = target.mir4Effects?.active.find((effect) => effect.effectId === effectId);
  if (existing && existing.remaining > CAST_COMPLETE_EPS) {
    const durationSeconds = durationMs / 1_000;
    existing.kind = 'native-status-boost';
    existing.duration = Math.max(existing.duration, durationSeconds);
    existing.remaining = Math.max(existing.remaining, durationSeconds);
    existing.magnitude = -25;
    existing.nativeStatusId = statusId;
    existing.sourceId = source.id;
    return true;
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude: -25,
    nativeStatusId: statusId,
    name: buffId === 10020 ? 'Confuse' : 'Chill',
    sourceId: source.id,
  }).ok;
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

/** Persistent BUFF 30404; the strongest learned party contribution wins. */
export function mir4NativeSoaringSlashPartySkillDamageReductionBps(
  ctx: Pick<SimContext, 'players' | 'entities' | 'partyOf'>,
  target: Entity,
): number {
  const party = ctx.partyOf(target.id);
  const memberIds = party?.members ?? [target.id];
  let strongest = 0;
  for (const memberId of memberIds) {
    const member = ctx.entities.get(memberId);
    if (!member || member.dead || member.kind !== 'player') continue;
    strongest = Math.max(
      strongest,
      mir4NativeSoaringSlashPolicy(learnedSkillLevel(ctx, member))
        ?.partySkillDamageReductionBasisPoints ?? 0,
    );
  }
  return strongest;
}

/** Conditional AbilityType 38 lane active only while both Confuse and Chill remain. */
export function mir4NativeSoaringSlashConditionalDamageBasisPoints(
  target: Entity,
  requestedSkillLevel: number,
): number {
  const policy = mir4NativeSoaringSlashPolicy(requestedSkillLevel);
  if (
    !policy ||
    !activeNativeBuff(target, DEBILITATION_BUFF_IDS[0]) ||
    !activeNativeBuff(target, DEBILITATION_BUFF_IDS[1])
  ) {
    return 0;
  }
  return policy.bothDebilitationsSkillDamageBasisPoints;
}

/** Apply one landed authored contact's native debilitation and rank effects. */
export function applyMir4NativeSoaringSlashContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  critical: boolean,
): Mir4NativeSoaringSlashContactResult {
  const empty = Object.freeze({
    applied: false,
    confuseApplied: false,
    chillApplied: false,
    debilitationRefreshed: false,
    damagedArmorApplied: false,
    criticalEvasionReduced: false,
  });
  const policy = mir4NativeSoaringSlashPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    target.dead ||
    ![320301, 320302, 320303].includes(attackId) ||
    sourceImpactIndex < 0 ||
    sourceImpactIndex > 2 ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }

  const confuseApplied = applyOrExtendDebilitation(
    ctx,
    source,
    target,
    10020,
    24,
    policy.baseDebilitationDurationMs,
  );
  const chillApplied = applyOrExtendDebilitation(
    ctx,
    source,
    target,
    20020,
    45,
    policy.baseDebilitationDurationMs,
  );
  const debilitationRefreshed =
    attackId === policy.refreshAttackId &&
    sourceImpactIndex === 0 &&
    policy.refreshDebilitationDurationMs > 0 &&
    DEBILITATION_BUFF_IDS.every((buffId) => {
      const effect = target.mir4Effects?.active.find(
        (candidate) => candidate.effectId === `mir4_native_buff_${buffId}`,
      );
      if (!effect) return false;
      effect.duration = policy.refreshDebilitationDurationMs / 1_000;
      effect.remaining = effect.duration;
      return true;
    });

  let damagedArmorApplied = false;
  if (critical && policy.damagedArmor) {
    const common = {
      kind: 'native-status-boost' as const,
      durationSeconds: policy.damagedArmor.durationMs / 1_000,
      magnitude: -policy.damagedArmor.defenseLoss,
      name: 'Damaged Armor',
      sourceId: source.id,
      unremovable: true,
    };
    const physical = replaceEffect(ctx, source, target, {
      ...common,
      effectId: 'mir4_native_buff_30515_24',
      nativeStatusId: 24,
    });
    const magic = replaceEffect(ctx, source, target, {
      ...common,
      effectId: 'mir4_native_buff_30515_26',
      nativeStatusId: 26,
    });
    damagedArmorApplied = physical || magic;
  }

  let criticalEvasionReduced = false;
  if (
    policy.criticalEvasionLoss &&
    activeNativeBuff(target, 10020) &&
    activeNativeBuff(target, 30010)
  ) {
    criticalEvasionReduced = replaceEffect(ctx, source, target, {
      effectId: 'mir4_native_buff_30510_31',
      kind: 'native-status-boost',
      durationSeconds: policy.criticalEvasionLoss.durationMs / 1_000,
      magnitude: -policy.criticalEvasionLoss.amount,
      nativeStatusId: 31,
      name: 'Soaring Slash: CRIT EVA Reduction',
      sourceId: source.id,
    });
  }

  return {
    applied:
      confuseApplied ||
      chillApplied ||
      debilitationRefreshed ||
      damagedArmorApplied ||
      criticalEvasionReduced,
    confuseApplied,
    chillApplied,
    debilitationRefreshed,
    damagedArmorApplied,
    criticalEvasionReduced,
  };
}
