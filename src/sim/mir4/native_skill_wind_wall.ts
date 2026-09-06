import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { MIR4_NATIVE_LANCER_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_lancer';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4PendingImpact } from '../types';
import { applyMir4Effect } from './effects';
import { mir4NativeAbsorptionShieldBlocked } from './native_skill_absorption';
import { mir4NativeWindWallPolicy } from './native_skill_wind_wall_policy';
import { mir4PartyPulseTargets } from './party_support';

const SKILL_ID = 5403 as const;
const SOURCE_ATTACK_ID = 540301 as const;
const PARTY_ATTACK_ID = 540302 as const;

export type Mir4NativeWindWallSetup = Extract<
  NonNullable<Mir4PendingImpact['nativeSetup']>,
  'lancer-wind-wall-source-buffs' | 'lancer-wind-wall-party-buffs'
>;

export interface Mir4NativeWindWallScheduledImpact {
  readonly attackId: 540301 | 540302;
  readonly target: Entity;
  readonly dueOffsetMs: 20 | 200;
  readonly nativeSetup: Mir4NativeWindWallSetup;
}

function exactBuff(
  buffId: number,
  statusId: number,
  value: number,
  levelUpValue: number,
  time: number,
): boolean {
  const buff = mir4NativeSkillBuffEvidenceById(buffId)?.rawRecord;
  return (
    buff?.BuffId === buffId &&
    buff.BuffIndexType_1 === 1 &&
    buff.BuffIndex_1 === statusId &&
    buff.BuffValue_1 === value &&
    buff.LevelUpBuffValue_1 === levelUpValue &&
    buff.BuffTime === time
  );
}

function exactNativeWindWallSource(): boolean {
  const action = MIR4_NATIVE_LANCER_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  const source = action?.rows.find((row) => row.attackId === SOURCE_ATTACK_ID);
  const party = action?.rows.find((row) => row.attackId === PARTY_ATTACK_ID);
  return (
    action?.cooldownMs === 45_000 &&
    action.attackAnimationMs === 800 &&
    action.endCutAnimationMs === 720 &&
    action.targeting === true &&
    action.nativeBehavior.primaryDamage.coefficient === 140 &&
    action.nativeBehavior.secondaryDamage.coefficient === 80 &&
    source?.impactOffsetsMs[0] === 20 &&
    source.nativeBehavior.buffIds.join(',') === '51011,54011,50109' &&
    party?.impactOffsetsMs[0] === 200 &&
    party.targetType === 4 &&
    party.authorialTargetValue === 8 &&
    party.geometry.nativeDistanceMax === 700 &&
    party.geometry.nativeHeight === 500 &&
    exactBuff(54011, 47, 200, 0, 5) &&
    exactBuff(50109, 35, 150, 30, 15) &&
    exactBuff(50103, 42, 50, 100, 8) &&
    exactBuff(50105, 42, 200, 100, 12) &&
    exactBuff(50106, 43, 200, 100, 12) &&
    exactBuff(50010, 47, 300, 200, 4) &&
    exactBuff(50108, 43, 200, 150, 6) &&
    exactBuff(50402, 22, 20, 40, 0)
  );
}

export function mir4NativeWindWallBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    exactNativeWindWallSource() &&
    row.attackId === SOURCE_ATTACK_ID &&
    row.nativeBehavior.buffIds.join(',') === '51011,54011,50109' &&
    row.nativeBehavior.ccBuffIds.length === 0
  );
}

export function mir4NativeWindWallScheduledImpacts(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): readonly Mir4NativeWindWallScheduledImpact[] {
  const policy = mir4NativeWindWallPolicy(requestedSkillLevel);
  if (!policy || !exactNativeWindWallSource() || source.dead) return [];
  const impacts: Mir4NativeWindWallScheduledImpact[] = [
    {
      attackId: SOURCE_ATTACK_ID,
      target: source,
      dueOffsetMs: policy.sourceApplyAtMs,
      nativeSetup: 'lancer-wind-wall-source-buffs',
    },
  ];
  for (const target of mir4PartyPulseTargets(ctx, source, {
    radiusYards: 7,
    heightYards: 5,
    maxTargets: 8,
  })) {
    impacts.push({
      attackId: PARTY_ATTACK_ID,
      target,
      dueOffsetMs: policy.partyApplyAtMs,
      nativeSetup: 'lancer-wind-wall-party-buffs',
    });
  }
  return impacts;
}

export function isMir4NativeWindWallSetup(
  skillId: number | undefined,
  nativeSetup: Mir4PendingImpact['nativeSetup'],
): nativeSetup is Mir4NativeWindWallSetup {
  return (
    skillId === SKILL_ID &&
    (nativeSetup === 'lancer-wind-wall-source-buffs' ||
      nativeSetup === 'lancer-wind-wall-party-buffs')
  );
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
    name: mir4SkillById(SKILL_ID)?.displayName ?? 'Wind Wall',
    sourceId: source.id,
  }).ok;
}

export function applyMir4NativeWindWallSourceBuffs(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeWindWallPolicy(requestedSkillLevel);
  if (!policy || !exactNativeWindWallSource() || source.dead) return false;
  return [
    replaceStatus(
      ctx,
      source,
      source,
      54011,
      47,
      policy.allDamageReductionDurationMs,
      policy.allDamageReductionBasisPoints,
    ),
    replaceStatus(
      ctx,
      source,
      source,
      50109,
      35,
      policy.bashDamageReductionDurationMs,
      policy.bashDamageReductionBasisPoints,
    ),
  ].every(Boolean);
}

export function applyMir4NativeWindWallPartyBuffs(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeWindWallPolicy(requestedSkillLevel);
  if (!policy || !exactNativeWindWallSource() || source.dead || target.dead) return false;
  const results: boolean[] = [];
  if (target.id === source.id) {
    const monsterBuffId = policy.skillLevel >= 8 ? 50105 : 50103;
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        monsterBuffId,
        42,
        policy.monsterDamageReductionDurationMs,
        policy.monsterDamageReductionBasisPoints,
      ),
    );
    if (policy.bossDamageReductionBasisPoints > 0) {
      results.push(
        replaceStatus(
          ctx,
          source,
          target,
          50106,
          43,
          policy.bossDamageReductionDurationMs,
          policy.bossDamageReductionBasisPoints,
        ),
      );
    }
  }
  if (policy.partyAllDamageReductionBasisPoints > 0 && !mir4NativeAbsorptionShieldBlocked(target)) {
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        50010,
        47,
        policy.partyAllDamageReductionDurationMs,
        policy.partyAllDamageReductionBasisPoints,
      ),
    );
  }
  if (policy.partyBossDamageReductionBasisPoints > 0) {
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        50108,
        43,
        policy.partyBossDamageReductionDurationMs,
        policy.partyBossDamageReductionBasisPoints,
      ),
    );
  }
  return results.length === 0 || results.every(Boolean);
}
