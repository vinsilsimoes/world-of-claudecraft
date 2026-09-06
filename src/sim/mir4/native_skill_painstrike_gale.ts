import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from './control';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import {
  applyMir4NativeArbalistFocus,
  mir4NativeArbalistFocusBuffEvidenceExact,
} from './native_skill_quick_shot';

const SKILL_ID = 4106;
const SOURCE_ATTACK_ID = 410601;
const CONTACT_ATTACK_ID = 410602;
const FOCUS_BUFF_ID = 41010;
const INVINCIBLE_BUFF_ID = 40115;

export interface Mir4NativePainstrikeGalePolicy {
  readonly skillLevel: number;
  readonly source: Readonly<{
    attackId: 410601;
    applyAtMs: 20;
    focusBuffId: 41010;
    invincibleBuffId: 40115;
    invincibleDurationMs: 1000;
  }>;
  readonly contact: Readonly<{
    attackId: 410602;
    applyAtMs: 450;
    markBuffId: 40010;
    markDurationMs: number;
    markCriticalEvasion: -25;
    monsterStunBuffId: 10522 | 10523;
    monsterStunChanceBasisPoints: 10_000;
    monsterStunDurationMs: 2_000 | 3_000;
    playerStunBuffId: 40524 | 40525 | 40526 | 40527;
    playerStunChanceBasisPoints: 1_000 | 3_000 | 5_000 | 7_000;
    playerStunDurationMs: 1_000 | 2_000;
    criticalDamageReductionDebuff: Readonly<{
      buffId: 40510 | 40511;
      magnitude: -100 | -200 | -400;
      durationMs: 5_000 | 8_000;
    }> | null;
    criticalEvasionDebuff: Readonly<{
      buffId: 40512;
      magnitude: -200 | -400;
      durationMs: 5_000 | 8_000;
    }> | null;
  }>;
}

/** Exact rank 1/5/8/10 milestones from MIR4 special rows 208..211. */
export function mir4NativePainstrikeGalePolicy(
  requestedSkillLevel: number,
): Mir4NativePainstrikeGalePolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillLevel,
    source: Object.freeze({
      attackId: SOURCE_ATTACK_ID,
      applyAtMs: 20,
      focusBuffId: FOCUS_BUFF_ID,
      invincibleBuffId: INVINCIBLE_BUFF_ID,
      invincibleDurationMs: 1_000,
    }),
    contact: Object.freeze({
      attackId: CONTACT_ATTACK_ID,
      applyAtMs: 450,
      markBuffId: 40010,
      markDurationMs: rank8 ? 10_000 : rank5 ? 8_000 : 5_000,
      markCriticalEvasion: -25,
      monsterStunBuffId: rank10 ? 10523 : 10522,
      monsterStunChanceBasisPoints: 10_000,
      monsterStunDurationMs: rank10 ? 3_000 : 2_000,
      playerStunBuffId: rank10 ? 40527 : rank8 ? 40526 : rank5 ? 40525 : 40524,
      playerStunChanceBasisPoints: rank10 ? 7_000 : rank8 ? 5_000 : rank5 ? 3_000 : 1_000,
      playerStunDurationMs: rank10 ? 2_000 : 1_000,
      criticalDamageReductionDebuff: rank5
        ? Object.freeze({
            buffId: rank10 ? 40511 : 40510,
            magnitude: rank10 ? -400 : rank8 ? -200 : -100,
            durationMs: rank10 ? 8_000 : 5_000,
          })
        : null,
      criticalEvasionDebuff: rank8
        ? Object.freeze({
            buffId: 40512,
            magnitude: rank10 ? -400 : -200,
            durationMs: rank10 ? 8_000 : 5_000,
          })
        : null,
    }),
  });
}

function exactInvincibilityEvidence(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(INVINCIBLE_BUFF_ID)?.rawRecord;
  return (
    raw?.BuffId === INVINCIBLE_BUFF_ID &&
    raw.BuffUseType === 3 &&
    raw.ApplyType === 0 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === 1 &&
    raw.LevelUpBuffTime === 0 &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4003
  );
}

/** Exact zero-damage setup row carrying Focus and one-second invincibility. */
export function mir4NativePainstrikeGaleBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    exactInvincibilityEvidence() &&
    row.attackId === SOURCE_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 2 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
    row.nativeBehavior.buffIds[1] === INVINCIBLE_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 20
  );
}

/** Resolve both source-owned setup buffs at the native 20ms router contact. */
export function applyMir4NativePainstrikeGaleSourceBuffs(ctx: SimContext, source: Entity): boolean {
  if (source.dead || !exactInvincibilityEvidence()) return false;
  const focus = applyMir4NativeArbalistFocus(ctx, source);
  const invincible = applyMir4Effect(ctx, source, {
    effectId: `mir4_native_buff_${INVINCIBLE_BUFF_ID}`,
    kind: 'invincible',
    durationSeconds: 1,
    magnitude: 0,
    name: 'Painstrike Gale: Invincible',
    sourceId: source.id,
  }).ok;
  return focus && invincible;
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
    durationSeconds: durationMs / 1_000,
    magnitude,
    nativeStatusId: statusId,
    name: 'Painstrike Gale',
    sourceId: source.id,
  }).ok;
}

function targetKind(target: Entity): 'player' | 'monster' {
  return target.kind === 'player' || target.ownerId != null ? 'player' : 'monster';
}

export interface Mir4NativePainstrikeGaleContactResult {
  readonly applied: boolean;
  readonly marked: boolean;
  readonly stunned: boolean;
  readonly criticalDamageReductionDebuffed: boolean;
  readonly criticalEvasionDebuffed: boolean;
}

/** Apply only after 410602 has landed on this contact's current target list. */
export function applyMir4NativePainstrikeGaleContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
): Mir4NativePainstrikeGaleContactResult {
  const empty = {
    applied: false,
    marked: false,
    stunned: false,
    criticalDamageReductionDebuffed: false,
    criticalEvasionDebuffed: false,
  } as const;
  const policy = mir4NativePainstrikeGalePolicy(requestedSkillLevel);
  if (
    !policy ||
    attackId !== policy.contact.attackId ||
    source.dead ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }

  const marked = replaceNativeStatus(
    ctx,
    source,
    target,
    policy.contact.markBuffId,
    31,
    policy.contact.markCriticalEvasion,
    policy.contact.markDurationMs,
  );
  const kind = targetKind(target);
  const baseChance =
    kind === 'player'
      ? policy.contact.playerStunChanceBasisPoints
      : policy.contact.monsterStunChanceBasisPoints;
  const chance = mir4ControlChanceFromStatuses(
    baseChance,
    'stun',
    source.mir4?.statusValues,
    target.mir4?.statusValues,
    kind,
    mir4NativeStatusBonus(target, 49),
  );
  // The native special profile performs an authored probability draw even at
  // its 100% monster base, keeping the deterministic combat stream aligned.
  const stunRoll = Math.floor(ctx.rng.next() * 10_000);
  const stunBuffId =
    kind === 'player' ? policy.contact.playerStunBuffId : policy.contact.monsterStunBuffId;
  const stunDurationMs = mir4ControlDurationMs(
    kind === 'player' ? policy.contact.playerStunDurationMs : policy.contact.monsterStunDurationMs,
    'stun',
    source.mir4?.statusValues,
    target.mir4?.statusValues,
    kind,
    mir4NativeStatusBonus(target, 49),
  );
  const stunned =
    stunRoll < chance &&
    applyMir4Effect(ctx, target, {
      effectId: `mir4_native_buff_${stunBuffId}`,
      kind: 'stun',
      durationSeconds: stunDurationMs / 1_000,
      magnitude: 0,
      name: 'Painstrike Gale: Stun',
      sourceId: source.id,
    }).ok;

  const criticalDamageReductionDebuffed = policy.contact.criticalDamageReductionDebuff
    ? replaceNativeStatus(
        ctx,
        source,
        target,
        policy.contact.criticalDamageReductionDebuff.buffId,
        33,
        policy.contact.criticalDamageReductionDebuff.magnitude,
        policy.contact.criticalDamageReductionDebuff.durationMs,
      )
    : false;
  const criticalEvasionDebuffed = policy.contact.criticalEvasionDebuff
    ? replaceNativeStatus(
        ctx,
        source,
        target,
        policy.contact.criticalEvasionDebuff.buffId,
        31,
        policy.contact.criticalEvasionDebuff.magnitude,
        policy.contact.criticalEvasionDebuff.durationMs,
      )
    : false;
  return {
    applied: marked || stunned || criticalDamageReductionDebuffed || criticalEvasionDebuffed,
    marked,
    stunned,
    criticalDamageReductionDebuffed,
    criticalEvasionDebuffed,
  };
}
