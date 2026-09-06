import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_taoist';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import { revivePlayerAt } from '../spirit';
import { dropThreat } from '../threat';
import type { Entity, Mir4PendingImpact } from '../types';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { mir4DeadPartyTargets, mir4PartyPulseTargets } from './party_support';
import { mir4ManaRecoveredFromHealing, mir4ModifiedSkillHealing } from './status_effects';

const SKILL_ID = 3504;
const CONTROL_ATTACK_ID = 350401;
const HEAL_ATTACK_ID = 350402;
const RANK_10_REVIVE_ATTACK_ID = 350403;
const RANK_8_REVIVE_ATTACK_ID = 350404;
const CONTROL_BUFF_ID = 33011;
const BASE_HEAL_BUFF_ID = 35015;

export interface Mir4NativeGreaterHealPolicy {
  readonly skillId: 3504;
  readonly skillLevel: number;
  readonly controlAttackId: 350401;
  readonly controlApplyAtMs: 20;
  readonly healAttackId: 350402;
  readonly healApplyAtMs: 740;
  readonly reviveAttackId: 350403 | 350404 | null;
  readonly reviveApplyAtMs: 900 | 1050 | null;
  readonly radiusYards: 30;
  readonly heightYards: 4;
  readonly targetCap: 5;
  readonly baseMaxHpBasisPoints: 1000;
  readonly flatHealing: number;
  readonly selfBonusMaxHpBasisPoints: number;
  readonly partyBonusMaxHpBasisPoints: number;
  readonly stunCleanseChanceBasisPoints: number;
  readonly invincibleDurationMs: number;
  readonly reviveTargetCap: number;
  readonly reviveHpBasisPoints: number;
  readonly controlImmunityDurationMs: 2000;
  readonly usableWhileSilenced: boolean;
  readonly usableWhileStunned: boolean;
  readonly deathDelayMs: number;
  readonly deathDelayCooldownMs: number;
}

function exactNativeGreaterHealSource(): boolean {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  if (!action) return false;
  const control = action.rows.find((row) => row.attackId === CONTROL_ATTACK_ID);
  const heal = action.rows.find((row) => row.attackId === HEAL_ATTACK_ID);
  const rank10Revive = action.rows.find((row) => row.attackId === RANK_10_REVIVE_ATTACK_ID);
  const rank8Revive = action.rows.find((row) => row.attackId === RANK_8_REVIVE_ATTACK_ID);
  const buff = (id: number) => mir4NativeSkillBuffEvidenceById(id)?.rawRecord;
  return (
    action.cooldownMs === 46_000 &&
    action.attackAnimationMs === 1_640 &&
    action.endCutAnimationMs === 1_500 &&
    action.targeting === false &&
    action.requiredClassLevel === 56 &&
    action.nativeBehavior.abilities[0]?.type === 2027 &&
    action.nativeBehavior.abilities[0]?.value === 120 &&
    action.nativeBehavior.abilities[0]?.levelUpValue === 5 &&
    action.nativeBehavior.abilities[2]?.type === 2022 &&
    action.nativeBehavior.abilities[2]?.value === 10 &&
    control?.impactOffsetsMs[0] === 20 &&
    control.targetType === 4 &&
    control.authorialTargetValue === 5 &&
    control.nativeBehavior.buffIds.length === 1 &&
    control.nativeBehavior.buffIds[0] === CONTROL_BUFF_ID &&
    heal?.impactOffsetsMs[0] === 740 &&
    heal.targetType === 4 &&
    heal.authorialTargetValue === 5 &&
    heal.nativeBehavior.buffIds.length === 1 &&
    heal.nativeBehavior.buffIds[0] === BASE_HEAL_BUFF_ID &&
    rank10Revive?.impactOffsetsMs[0] === 900 &&
    rank10Revive.targetSubtype === 'dead-only' &&
    rank10Revive.authorialTargetValue === 5 &&
    rank8Revive?.impactOffsetsMs[0] === 1_050 &&
    rank8Revive.targetSubtype === 'dead-only' &&
    rank8Revive.authorialTargetValue === 1 &&
    buff(CONTROL_BUFF_ID)?.BuffIndex_1 === 4004 &&
    buff(CONTROL_BUFF_ID)?.BuffTime === 2 &&
    buff(BASE_HEAL_BUFF_ID)?.BuffIndex_1 === 2022 &&
    buff(BASE_HEAL_BUFF_ID)?.BuffValue_1 === 1_000 &&
    buff(BASE_HEAL_BUFF_ID)?.BuffIndex_2 === 2027 &&
    buff(BASE_HEAL_BUFF_ID)?.BuffValue_2 === 12_000 &&
    buff(BASE_HEAL_BUFF_ID)?.LevelUpBuffValue_2 === 500
  );
}

export function mir4NativeGreaterHealBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  if (!exactNativeGreaterHealSource()) return false;
  if (row.attackId === CONTROL_ATTACK_ID) {
    return (
      row.nativeBehavior.buffIds.length === 1 &&
      row.nativeBehavior.buffIds[0] === CONTROL_BUFF_ID &&
      row.nativeBehavior.ccBuffIds.length === 0
    );
  }
  if (row.attackId === HEAL_ATTACK_ID) {
    return (
      row.nativeBehavior.buffIds.length === 1 &&
      row.nativeBehavior.buffIds[0] === BASE_HEAL_BUFF_ID &&
      row.nativeBehavior.ccBuffIds.length === 0
    );
  }
  return false;
}

/** Native ranks stop at 10; Aeldrune's rank-15 lane continues only flat-heal scaling. */
export function mir4NativeGreaterHealPolicy(
  requestedSkillLevel: number,
): Mir4NativeGreaterHealPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeGreaterHealSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    controlAttackId: CONTROL_ATTACK_ID,
    controlApplyAtMs: 20,
    healAttackId: HEAL_ATTACK_ID,
    healApplyAtMs: 740,
    reviveAttackId: rank10 ? RANK_10_REVIVE_ATTACK_ID : rank8 ? RANK_8_REVIVE_ATTACK_ID : null,
    reviveApplyAtMs: rank10 ? 900 : rank8 ? 1_050 : null,
    radiusYards: 30,
    heightYards: 4,
    targetCap: 5,
    baseMaxHpBasisPoints: 1_000,
    flatHealing: 120 + 5 * (skillLevel - 1),
    selfBonusMaxHpBasisPoints: rank10 ? 3_000 : rank8 ? 2_000 : rank5 ? 1_000 : 0,
    partyBonusMaxHpBasisPoints: rank10 ? 6_000 : rank8 ? 3_500 : rank5 ? 2_000 : 0,
    stunCleanseChanceBasisPoints: rank10 ? 10_000 : rank8 ? 9_000 : rank5 ? 6_000 : 0,
    invincibleDurationMs: rank8 ? 2_000 : 0,
    reviveTargetCap: rank10 ? 5 : rank8 ? 1 : 0,
    reviveHpBasisPoints: rank10 ? 5_000 : rank8 ? 2_000 : 0,
    controlImmunityDurationMs: 2_000,
    usableWhileSilenced: rank8,
    usableWhileStunned: rank8,
    deathDelayMs: rank10 ? 15_000 : rank8 ? 5_000 : 0,
    deathDelayCooldownMs: rank8 ? 120_000 : 0,
  });
}

export function mir4NativeGreaterHealAmount(
  maxHp: number,
  requestedSkillLevel: number,
  self: boolean,
): number {
  const policy = mir4NativeGreaterHealPolicy(requestedSkillLevel);
  if (!policy) return 0;
  const safeMaxHp = Number.isFinite(maxHp) ? Math.max(0, maxHp) : 0;
  const bonus = self ? policy.selfBonusMaxHpBasisPoints : policy.partyBonusMaxHpBasisPoints;
  return (
    Math.floor((safeMaxHp * (policy.baseMaxHpBasisPoints + bonus)) / 10_000) + policy.flatHealing
  );
}

export type Mir4NativeGreaterHealSetup = Extract<
  NonNullable<Mir4PendingImpact['nativeSetup']>,
  | 'taoist-greater-heal-control-immunity'
  | 'taoist-greater-heal-protection'
  | 'taoist-greater-heal-living'
  | 'taoist-greater-heal-revive'
>;

export interface Mir4NativeGreaterHealScheduledImpact {
  readonly attackId: 350401 | 350402 | 350403 | 350404;
  readonly target: Entity;
  readonly dueOffsetMs: number;
  readonly nativeSetup: Mir4NativeGreaterHealSetup;
}

export function mir4NativeGreaterHealScheduledImpacts(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): readonly Mir4NativeGreaterHealScheduledImpact[] {
  const policy = mir4NativeGreaterHealPolicy(requestedSkillLevel);
  if (!policy || source.dead) return [];
  const living = mir4PartyPulseTargets(ctx, source, {
    radiusYards: policy.radiusYards,
    heightYards: policy.heightYards,
    maxTargets: policy.targetCap,
  });
  if (!living.some((target) => target.id === source.id)) return [];
  const impacts: Mir4NativeGreaterHealScheduledImpact[] = [
    {
      attackId: policy.controlAttackId,
      target: source,
      dueOffsetMs: policy.controlApplyAtMs,
      nativeSetup: 'taoist-greater-heal-control-immunity',
    },
  ];
  if (policy.invincibleDurationMs > 0) {
    for (const target of living) {
      impacts.push({
        attackId: policy.controlAttackId,
        target,
        dueOffsetMs: policy.controlApplyAtMs,
        nativeSetup: 'taoist-greater-heal-protection',
      });
    }
  }
  for (const target of living) {
    impacts.push({
      attackId: policy.healAttackId,
      target,
      dueOffsetMs: policy.healApplyAtMs,
      nativeSetup: 'taoist-greater-heal-living',
    });
  }
  if (policy.reviveAttackId !== null && policy.reviveApplyAtMs !== null) {
    for (const target of mir4DeadPartyTargets(ctx, source, {
      radiusYards: policy.radiusYards,
      heightYards: policy.heightYards,
      maxTargets: policy.reviveTargetCap,
    })) {
      impacts.push({
        attackId: policy.reviveAttackId,
        target,
        dueOffsetMs: policy.reviveApplyAtMs,
        nativeSetup: 'taoist-greater-heal-revive',
      });
    }
  }
  return impacts;
}

export function isMir4NativeGreaterHealSetup(
  skillId: number | undefined,
  nativeSetup: Mir4PendingImpact['nativeSetup'],
): nativeSetup is Mir4NativeGreaterHealSetup {
  return (
    skillId === SKILL_ID &&
    (nativeSetup === 'taoist-greater-heal-control-immunity' ||
      nativeSetup === 'taoist-greater-heal-protection' ||
      nativeSetup === 'taoist-greater-heal-living' ||
      nativeSetup === 'taoist-greater-heal-revive')
  );
}

const DEATH_DELAY_ICD_KEY = 'mir4_greater_heal_death_delay';
const DEATH_DELAY_EFFECT_ID = 'mir4_native_buff_30603';

function clearGreaterHealDeathDelay(target: Entity): void {
  delete target.mir4GreaterHealDeathDelayUntil;
  delete target.mir4GreaterHealDeathDelayKillerId;
  delete target.mir4GreaterHealDeathDelayKillerAbility;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== DEATH_DELAY_EFFECT_ID,
    );
  }
}

/**
 * Rank-8/10 passive rows 131226/131227/131229 and 131236/131237/131239:
 * the first lethal world hit on the 120-second ICD leaves the Taoist alive at
 * one HP for the native five/fifteen-second rescue window.
 */
export function tryBeginMir4GreaterHealDeathDelay(
  ctx: SimContext,
  target: Entity,
  killer: Entity | null,
  killerAbility?: string | null,
): boolean {
  if (target.kind !== 'player' || target.dead || target.mir4?.classId !== 3) return false;
  const skillLevel = ctx.players.get(target.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
  const policy = mir4NativeGreaterHealPolicy(skillLevel);
  if (!policy || policy.deathDelayMs <= 0 || policy.deathDelayCooldownMs <= 0) return false;
  if (target.mir4GreaterHealDeathDelayUntil !== undefined) return true;
  if (target.procState?.icds[DEATH_DELAY_ICD_KEY] !== undefined) return false;
  if (!target.procState) target.procState = { counters: {}, icds: {} };
  target.procState.icds[DEATH_DELAY_ICD_KEY] = policy.deathDelayCooldownMs / 1_000;
  target.hp = 1;
  target.mir4GreaterHealDeathDelayUntil = ctx.time + policy.deathDelayMs / 1_000;
  target.mir4GreaterHealDeathDelayKillerId = killer?.id ?? null;
  target.mir4GreaterHealDeathDelayKillerAbility = killerAbility ?? null;
  return replaceEffect(
    ctx,
    target,
    target,
    DEATH_DELAY_EFFECT_ID,
    'invincible',
    policy.deathDelayMs,
    'Greater Heal: Immortal',
  );
}

/** Resolve an unrescued native death warning at its deterministic deadline. */
export function updateMir4GreaterHealDeathDelay(ctx: SimContext): void {
  for (const target of ctx.entities.values()) {
    const deadline = target.mir4GreaterHealDeathDelayUntil;
    if (deadline === undefined) continue;
    if (target.dead) {
      clearGreaterHealDeathDelay(target);
      continue;
    }
    if (ctx.time + 1e-9 < deadline) continue;
    const killerId = target.mir4GreaterHealDeathDelayKillerId;
    const killerAbility = target.mir4GreaterHealDeathDelayKillerAbility;
    const killer =
      killerId === null || killerId === undefined ? null : (ctx.entities.get(killerId) ?? null);
    clearGreaterHealDeathDelay(target);
    target.hp = 0;
    ctx.handleDeath(target, killer, killerAbility);
  }
}

function replaceEffect(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  effectId: string,
  kind: 'control-immunity' | 'invincible',
  durationMs: number,
  name: string,
): boolean {
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind,
    durationSeconds: durationMs / 1_000,
    magnitude: 0,
    name,
    sourceId: source.id,
  }).ok;
}

function removeStun(target: Entity): boolean {
  const mir4Effects = target.mir4Effects;
  if (!mir4Effects) return false;
  const effects = mir4Effects.active;
  const removedIds = new Set(
    effects
      .filter((effect) => effect.kind === 'stun' && !effect.unremovable)
      .map((effect) => effect.effectId),
  );
  if (removedIds.size === 0) return false;
  mir4Effects.active = effects.filter((effect) => !removedIds.has(effect.effectId));
  target.auras = target.auras.filter((aura) => !removedIds.has(aura.id));
  return true;
}

export function applyMir4NativeGreaterHealControlImmunity(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeGreaterHealPolicy(requestedSkillLevel);
  if (!policy || source.dead) return false;
  return replaceEffect(
    ctx,
    source,
    source,
    'mir4_native_buff_33011',
    'control-immunity',
    policy.controlImmunityDurationMs,
    'Greater Heal: Uninterruptible',
  );
}

export function applyMir4NativeGreaterHealProtection(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): boolean {
  const policy = mir4NativeGreaterHealPolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead || policy.invincibleDurationMs <= 0) return false;
  const cleanse =
    policy.stunCleanseChanceBasisPoints >= 10_000 ||
    rollBasisPoints() < policy.stunCleanseChanceBasisPoints;
  if (cleanse) removeStun(target);
  return replaceEffect(
    ctx,
    source,
    target,
    'mir4_native_buff_36011',
    'invincible',
    policy.invincibleDurationMs,
    'Greater Heal: Invincible',
  );
}

function resetAttackingMonsterHate(ctx: SimContext, source: Entity): void {
  for (const entity of ctx.entities.values()) {
    if (entity.kind !== 'mob' || entity.dead || entity.aggroTargetId !== source.id) continue;
    dropThreat(entity, source.id);
    entity.aggroTargetId = null;
    if (entity.threat.size === 0) entity.inCombat = false;
  }
}

export function applyMir4NativeGreaterHealLiving(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): number {
  const policy = mir4NativeGreaterHealPolicy(requestedSkillLevel);
  if (!policy || source.dead || target.dead) return 0;
  if (target.id === source.id && source.mir4GreaterHealDeathDelayUntil !== undefined) {
    clearGreaterHealDeathDelay(source);
  }
  if (policy.invincibleDurationMs <= 0 && policy.stunCleanseChanceBasisPoints > 0) {
    if (
      policy.stunCleanseChanceBasisPoints >= 10_000 ||
      rollBasisPoints() < policy.stunCleanseChanceBasisPoints
    ) {
      removeStun(target);
    }
  }
  if (target.id === source.id && policy.usableWhileSilenced) resetAttackingMonsterHate(ctx, source);
  const rawHealing = mir4NativeGreaterHealAmount(
    target.maxHp,
    requestedSkillLevel,
    target.id === source.id,
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

export function applyMir4NativeGreaterHealRevive(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeGreaterHealPolicy(requestedSkillLevel);
  if (!policy || source.dead || !target.dead || policy.reviveHpBasisPoints <= 0) return false;
  revivePlayerAt(
    ctx,
    target.id,
    target.corpsePos ?? target.pos,
    policy.reviveHpBasisPoints / 10_000,
  );
  return !target.dead;
}
