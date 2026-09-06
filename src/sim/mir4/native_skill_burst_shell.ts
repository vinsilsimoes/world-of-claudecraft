import { deepFreezeMir4NativeEvidence } from '../content/mir4/native_skill_raw_records';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4NativePeriodicDamageState } from '../types';
import { applyMir4Effect } from './effects';

const SKILL_ID = 4103;
const TRIGGER_ATTACK_ID = 410311;
const DEFENSE_BUFF_ID = 40504;
const BURN_BUFF_ID = 40505;
const DAMAGE_AMPLIFICATION_BUFF_ID = 40506;

/**
 * Lossless values selected from the sealed SKILL_SPECIAL_ABILITY,
 * SKILL_PASSIVE and BUFF tables. Only fields consumed by this bounded rank
 * interpreter are projected here; source hashes prevent silent drift.
 */
export const MIR4_NATIVE_BURST_SHELL_RANK_EVIDENCE = deepFreezeMir4NativeEvidence({
  provenance: {
    specialAbilitySha256: '9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db',
    passiveSha256: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
    buffSha256: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
  },
  specialRows: [
    {
      id: 194,
      minLevel: 1,
      maxLevel: 4,
      triggerAttackId: 410311,
      passiveIds: [],
      skillOnlyPassiveIds: [640301],
    },
    {
      id: 195,
      minLevel: 5,
      maxLevel: 7,
      triggerAttackId: 410311,
      passiveIds: [],
      skillOnlyPassiveIds: [640311],
    },
    {
      id: 196,
      minLevel: 8,
      maxLevel: 9,
      triggerAttackId: 410311,
      passiveIds: [140324],
      skillOnlyPassiveIds: [640321, 640322, 640323],
    },
    {
      id: 197,
      minLevel: 10,
      maxLevel: 10,
      triggerAttackId: 410311,
      passiveIds: [140334],
      skillOnlyPassiveIds: [640331, 640332, 640333],
    },
  ],
  passiveRows: [
    { passiveId: 640301, castingCondition: 11, skillPassiveLevel: 1, buffId: 40504 },
    { passiveId: 640311, castingCondition: 11, skillPassiveLevel: 4, buffId: 40504 },
    { passiveId: 640321, castingCondition: 11, skillPassiveLevel: 6, buffId: 40504 },
    { passiveId: 640322, castingCondition: 11, skillPassiveLevel: 1, buffId: 40505 },
    { passiveId: 640323, castingCondition: 11, skillPassiveLevel: 1, buffId: 40506 },
    { passiveId: 640331, castingCondition: 11, skillPassiveLevel: 16, buffId: 40504 },
    { passiveId: 640332, castingCondition: 11, skillPassiveLevel: 2, buffId: 40505 },
    { passiveId: 640333, castingCondition: 11, skillPassiveLevel: 2, buffId: 40506 },
    { passiveId: 140324, abilityType: 40, abilityValue: 80 },
    { passiveId: 140334, abilityType: 40, abilityValue: 120 },
  ],
  buffRows: [
    {
      buffId: 40504,
      applyType: 1,
      buffTarget: 0,
      durationSeconds: 10,
      probability: 1000,
      contributions: [
        { indexType: 1, statusId: 24, value: -50, levelUpValue: -10 },
        { indexType: 1, statusId: 26, value: -50, levelUpValue: -10 },
      ],
    },
    {
      buffId: 40505,
      applyType: 1,
      buffTarget: 0,
      durationSeconds: 10,
      probability: 1000,
      contributions: [{ indexType: 2, statusId: 2002, value: 1000, levelUpValue: 1000 }],
    },
    {
      buffId: 40506,
      applyType: 1,
      buffTarget: 0,
      durationSeconds: 10,
      probability: 1000,
      contributions: [{ indexType: 1, statusId: 47, value: -100, levelUpValue: -150 }],
    },
  ],
});

export interface Mir4NativeBurstShellPolicy {
  readonly skillLevel: number;
  readonly triggerAttackId: 410311;
  readonly defense: Readonly<{
    buffId: 40504;
    passiveLevel: 1 | 4 | 6 | 16;
    physicalDefenseFlat: -50 | -80 | -100 | -200;
    spellDefenseFlat: -50 | -80 | -100 | -200;
    durationMs: 10_000;
  }>;
  readonly burn: Readonly<{
    buffId: 40505;
    passiveLevel: 1 | 2;
    physicalAttackBasisPoints: 1000 | 2000;
    durationMs: 10_000;
  }> | null;
  readonly damageAmplification: Readonly<{
    buffId: 40506;
    passiveLevel: 1 | 2;
    nativeDamageReductionValue: -100 | -250;
    resolvedDamageReductionBasisPoints: -1000 | -2500;
    durationMs: 10_000;
  }> | null;
  readonly monsterDamageBoostBasisPoints: 0 | 800 | 1200;
}

/** Exact rank 1/5/8/10 milestones from source rows 194..197. */
export function mir4NativeBurstShellPolicy(
  requestedSkillLevel: number,
): Mir4NativeBurstShellPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  const defense = rank10 ? -200 : rank8 ? -100 : rank5 ? -80 : -50;
  return Object.freeze({
    skillLevel,
    triggerAttackId: TRIGGER_ATTACK_ID,
    defense: Object.freeze({
      buffId: DEFENSE_BUFF_ID,
      passiveLevel: rank10 ? 16 : rank8 ? 6 : rank5 ? 4 : 1,
      physicalDefenseFlat: defense,
      spellDefenseFlat: defense,
      durationMs: 10_000,
    }),
    burn: rank8
      ? Object.freeze({
          buffId: BURN_BUFF_ID,
          passiveLevel: rank10 ? 2 : 1,
          physicalAttackBasisPoints: rank10 ? 2000 : 1000,
          durationMs: 10_000,
        })
      : null,
    damageAmplification: rank8
      ? Object.freeze({
          buffId: DAMAGE_AMPLIFICATION_BUFF_ID,
          passiveLevel: rank10 ? 2 : 1,
          nativeDamageReductionValue: rank10 ? -250 : -100,
          // Status 47 is a basis-point lane in Aeldrune, while this BUFF row
          // stores tenths of a percent: -100/-250 means -10%/-25% reduction.
          resolvedDamageReductionBasisPoints: rank10 ? -2500 : -1000,
          durationMs: 10_000,
        })
      : null,
    monsterDamageBoostBasisPoints: rank10 ? 1200 : rank8 ? 800 : 0,
  });
}

function replaceNativeStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  statusId: number,
  magnitude: number,
  durationMs: number,
): boolean {
  const effectId = `mir4_native_buff_${buffId}_${statusId}`;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1000,
    magnitude,
    nativeStatusId: statusId,
    name: 'Burst Shell',
    sourceId: source.id,
  }).ok;
}

function replacePhysicalBurn(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  policy: NonNullable<Mir4NativeBurstShellPolicy['burn']>,
  sourcePhysicalAttack: number,
): boolean {
  const rawDamage = Math.max(
    0,
    Math.floor(
      (Math.max(0, Math.floor(sourcePhysicalAttack)) * policy.physicalAttackBasisPoints) / 10_000,
    ),
  );
  const state: Mir4NativePeriodicDamageState = {
    buffId: policy.buffId,
    sourceId: source.id,
    skillId: SKILL_ID,
    attackId: TRIGGER_ATTACK_ID,
    skillLevel: policy.passiveLevel,
    expiresAt: ctx.time + policy.durationMs / 1000,
    entries: [{ buffIndex: 2002, channel: 'physical', rawDamage }],
  };
  target.mir4NativePeriodicLastPulseAt ??= ctx.time;
  const active = target.mir4NativePeriodicDamage ?? [];
  const existing = active.findIndex((candidate) => candidate.buffId === policy.buffId);
  if (existing >= 0) active[existing] = state;
  else active.push(state);
  target.mir4NativePeriodicDamage = active;
  return true;
}

export interface Mir4NativeBurstShellContactResult {
  readonly applied: boolean;
  readonly physicalDefenseReduced: boolean;
  readonly spellDefenseReduced: boolean;
  readonly burning: boolean;
  readonly damageAmplified: boolean;
}

/** Apply the selected rank graph after a 410311 contact lands. */
export function applyMir4NativeBurstShellContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
  sourcePhysicalAttack: number,
): Mir4NativeBurstShellContactResult {
  const empty = {
    applied: false,
    physicalDefenseReduced: false,
    spellDefenseReduced: false,
    burning: false,
    damageAmplified: false,
  } as const;
  const policy = mir4NativeBurstShellPolicy(requestedSkillLevel);
  if (
    !policy ||
    attackId !== policy.triggerAttackId ||
    source.dead ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }
  const physicalDefenseReduced = replaceNativeStatus(
    ctx,
    source,
    target,
    policy.defense.buffId,
    24,
    policy.defense.physicalDefenseFlat,
    policy.defense.durationMs,
  );
  const spellDefenseReduced = replaceNativeStatus(
    ctx,
    source,
    target,
    policy.defense.buffId,
    26,
    policy.defense.spellDefenseFlat,
    policy.defense.durationMs,
  );
  const burning = policy.burn
    ? replacePhysicalBurn(ctx, source, target, policy.burn, sourcePhysicalAttack)
    : false;
  const damageAmplified = policy.damageAmplification
    ? replaceNativeStatus(
        ctx,
        source,
        target,
        policy.damageAmplification.buffId,
        47,
        policy.damageAmplification.resolvedDamageReductionBasisPoints,
        policy.damageAmplification.durationMs,
      )
    : false;
  return {
    applied: physicalDefenseReduced || spellDefenseReduced || burning || damageAmplified,
    physicalDefenseReduced,
    spellDefenseReduced,
    burning,
    damageAmplified,
  };
}

/** Rank 8/10 AbilityType 40 lane, restricted to Burst Shell contacts against mobs. */
export function mir4NativeBurstShellMonsterDamageBasisPoints(
  skillId: number | undefined,
  target: Entity,
  requestedSkillLevel: number | undefined,
): number {
  if (skillId !== SKILL_ID || target.kind !== 'mob' || target.ownerId != null) return 10_000;
  const policy = mir4NativeBurstShellPolicy(requestedSkillLevel ?? 1);
  return 10_000 + (policy?.monsterDamageBoostBasisPoints ?? 0);
}
