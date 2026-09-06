import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from './control';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { mir4NativeArbalistFocusBuffEvidenceExact } from './native_skill_quick_shot';

const SKILL_ID = 4110 as const;
const IMMUNITY_ATTACK_ID = 411000 as const;
const FOCUS_ATTACK_ID = 411001 as const;
const DIRECT_ATTACK_ID = 411002 as const;
const IMMUNITY_BUFF_ID = 40114 as const;
const PRESENTATION_BUFF_ID = 41001 as const;
const FOCUS_BUFF_ID = 41010 as const;

export interface Mir4NativeSeekingBoltPolicy {
  readonly skillId: 4110;
  readonly skillLevel: number;
  readonly immunity: Readonly<{
    buffId: 40114;
    attackId: 411000;
    applyAtMs: 20;
    durationMs: 1_500;
  }>;
  readonly focus: Readonly<{
    buffId: 41010;
    attackId: 411001;
    applyAtMs: 1_000;
  }>;
  readonly directAttackId: 411002;
  readonly unavoidable: boolean;
  readonly soulDestruction: Readonly<{
    chanceBasisPoints: 2_000 | 5_000 | 10_000;
    stunDurationMs: 2_000 | 3_000 | 4_000;
    buffId: 40534 | 40535 | 40536;
  }> | null;
  readonly evasionLoss: Readonly<{
    amount: 200 | 300;
    durationMs: 5_000 | 10_000;
    buffId: 40538;
  }> | null;
  readonly persistentPartyAccuracy: 0 | 20 | 50;
}

/** Exact SPECIAL_ABILITY milestones at ranks 1, 5, 8, and 10. */
export function mir4NativeSeekingBoltPolicy(
  requestedSkillLevel: number,
): Mir4NativeSeekingBoltPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.trunc(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    immunity: Object.freeze({
      buffId: IMMUNITY_BUFF_ID,
      attackId: IMMUNITY_ATTACK_ID,
      applyAtMs: 20 as const,
      durationMs: 1_500 as const,
    }),
    focus: Object.freeze({
      buffId: FOCUS_BUFF_ID,
      attackId: FOCUS_ATTACK_ID,
      applyAtMs: 1_000 as const,
    }),
    directAttackId: DIRECT_ATTACK_ID,
    unavoidable: rank8,
    soulDestruction: rank5
      ? Object.freeze({
          chanceBasisPoints: (rank10 ? 10_000 : rank8 ? 5_000 : 2_000) as 2_000 | 5_000 | 10_000,
          stunDurationMs: (rank10 ? 4_000 : rank8 ? 3_000 : 2_000) as 2_000 | 3_000 | 4_000,
          buffId: (rank10 ? 40536 : rank8 ? 40535 : 40534) as 40534 | 40535 | 40536,
        })
      : null,
    evasionLoss: rank8
      ? Object.freeze({
          amount: (rank10 ? 300 : 200) as 200 | 300,
          durationMs: (rank10 ? 10_000 : 5_000) as 5_000 | 10_000,
          buffId: 40538 as const,
        })
      : null,
    persistentPartyAccuracy: (rank10 ? 50 : rank8 ? 20 : 0) as 0 | 20 | 50,
  });
}

function exactImmunityBuffEvidence(): boolean {
  const immunity = mir4NativeSkillBuffEvidenceById(IMMUNITY_BUFF_ID)?.rawRecord;
  const presentation = mir4NativeSkillBuffEvidenceById(PRESENTATION_BUFF_ID)?.rawRecord;
  return Boolean(
    immunity &&
      immunity.ApplyType === 0 &&
      immunity.BuffTarget === 1 &&
      immunity.BuffTime === 1.5 &&
      immunity.BuffIndexType_1 === 3 &&
      immunity.BuffIndex_1 === 4004 &&
      presentation &&
      presentation.ApplyType === 2 &&
      presentation.BuffTarget === 0 &&
      presentation.ActEffect === 2050143 &&
      presentation.BuffTime === 1,
  );
}

export function mir4NativeSeekingBoltSetupBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    exactImmunityBuffEvidence() &&
    row.attackId === IMMUNITY_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 2 &&
    row.nativeBehavior.buffIds[0] === IMMUNITY_BUFF_ID &&
    row.nativeBehavior.buffIds[1] === PRESENTATION_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 20
  );
}

export function mir4NativeSeekingBoltFocusBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    row.attackId === FOCUS_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 1_000
  );
}

export function mir4NativeSeekingBoltSchedules(): Readonly<{
  immunity: { skillId: 4110; attackId: 411000; applyAtMs: 20 };
  focus: { skillId: 4110; attackId: 411001; applyAtMs: 1_000 };
}> {
  return Object.freeze({
    immunity: Object.freeze({
      skillId: SKILL_ID,
      attackId: IMMUNITY_ATTACK_ID,
      applyAtMs: 20 as const,
    }),
    focus: Object.freeze({
      skillId: SKILL_ID,
      attackId: FOCUS_ATTACK_ID,
      applyAtMs: 1_000 as const,
    }),
  });
}

export function applyMir4NativeSeekingBoltCastingImmunity(
  ctx: SimContext,
  source: Entity,
): boolean {
  if (source.dead || !exactImmunityBuffEvidence()) return false;
  const effectId = `mir4_native_buff_${IMMUNITY_BUFF_ID}`;
  if (source.mir4Effects) {
    source.mir4Effects.active = source.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, source, {
    effectId,
    kind: 'knockdown-stun-immunity',
    durationSeconds: 1.5,
    magnitude: 0,
    name: mir4SkillById(SKILL_ID)?.displayName ?? 'Seeking Bolt',
    sourceId: source.id,
  }).ok;
}

function targetKind(target: Entity): 'player' | 'monster' {
  return target.kind === 'player' || target.ownerId !== null ? 'player' : 'monster';
}

function replaceEvasionLoss(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  amount: number,
  durationMs: number,
): boolean {
  const effectId = `mir4_native_buff_${40538}_29`;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude: -amount,
    nativeStatusId: 29,
    name: 'Seeking Bolt: Evasion Reduction',
    sourceId: source.id,
  }).ok;
}

export interface Mir4NativeSeekingBoltContactResult {
  readonly applied: boolean;
  readonly evasionReduced: boolean;
  readonly soulDestructionTriggered: boolean;
  readonly stunned: boolean;
}

/** Resolve the rank package only after the authored 411002 damage contact lands. */
export function applyMir4NativeSeekingBoltDirectContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
  critical: boolean,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): Mir4NativeSeekingBoltContactResult {
  const empty = Object.freeze({
    applied: false,
    evasionReduced: false,
    soulDestructionTriggered: false,
    stunned: false,
  });
  const policy = mir4NativeSeekingBoltPolicy(requestedSkillLevel);
  if (
    !policy ||
    attackId !== DIRECT_ATTACK_ID ||
    source.dead ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }

  const evasionReduced = policy.evasionLoss
    ? replaceEvasionLoss(
        ctx,
        source,
        target,
        policy.evasionLoss.amount,
        policy.evasionLoss.durationMs,
      )
    : false;
  const soulDestructionTriggered = Boolean(
    critical &&
      policy.soulDestruction &&
      rollBasisPoints() < policy.soulDestruction.chanceBasisPoints,
  );
  let stunned = false;
  if (soulDestructionTriggered && policy.soulDestruction) {
    const kind = targetKind(target);
    const chance = mir4ControlChanceFromStatuses(
      10_000,
      'stun',
      source.mir4?.statusValues,
      target.mir4?.statusValues,
      kind,
      mir4NativeStatusBonus(target, 49),
    );
    const durationMs = mir4ControlDurationMs(
      policy.soulDestruction.stunDurationMs,
      'stun',
      source.mir4?.statusValues,
      target.mir4?.statusValues,
      kind,
      mir4NativeStatusBonus(target, 49),
    );
    stunned =
      rollBasisPoints() < chance &&
      applyMir4Effect(ctx, target, {
        effectId: `mir4_native_buff_${policy.soulDestruction.buffId}`,
        kind: 'stun',
        durationSeconds: durationMs / 1_000,
        magnitude: 0,
        name: 'Seeking Bolt: Soul Destruction',
        sourceId: source.id,
      }).ok;
  }
  return Object.freeze({
    applied: evasionReduced || soulDestructionTriggered,
    evasionReduced,
    soulDestructionTriggered,
    stunned,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

/** Persistent party aura 40401; only the strongest learned rank contributes. */
export function mir4NativeSeekingBoltPartyAccuracy(
  ctx: Pick<SimContext, 'entities' | 'partyOf' | 'players'>,
  source: Entity,
): number {
  const memberIds = ctx.partyOf(source.id)?.members ?? [source.id];
  let strongest = 0;
  for (const memberId of memberIds) {
    const member = ctx.entities.get(memberId);
    if (!member || member.dead || member.kind !== 'player' || member.mir4?.classId !== 4) {
      continue;
    }
    const accuracy =
      mir4NativeSeekingBoltPolicy(learnedSkillLevel(ctx, member))?.persistentPartyAccuracy ?? 0;
    strongest = Math.max(strongest, accuracy);
  }
  return strongest;
}
