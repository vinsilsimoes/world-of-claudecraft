import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { applyMir4Effect } from './effects';

const SKILL_ID = 3104;
const SPECIAL_ATTACK_ID = 310402;

export interface Mir4NativeRainOfBladesPolicy {
  readonly skillLevel: number;
  readonly unavoidable: boolean;
  readonly bashBonusBasisPoints: number;
  readonly refreshDebilitationDurationMs: number;
  readonly damagedWeapon: Readonly<{
    attackLoss: number;
    durationMs: number;
  }> | null;
  readonly evasionLoss: Readonly<{
    chanceBasisPoints: number;
    amount: number;
    durationMs: number;
  }> | null;
  readonly silence: Readonly<{
    curseChanceBasisPoints: number;
    durationMs: number;
  }> | null;
  readonly bashDamageReductionLossBasisPoints: number;
  readonly partySkillDamageReductionBasisPoints: number;
}

/** Exact rank milestones from special rows 130..133 and BUFF 30402/30513..30522. */
export function mir4NativeRainOfBladesPolicy(
  requestedSkillLevel: number,
): Mir4NativeRainOfBladesPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillLevel,
    unavoidable: rank8,
    bashBonusBasisPoints: rank10 ? 10_000 : rank8 ? 8_000 : rank5 ? 6_500 : 5_000,
    refreshDebilitationDurationMs: rank5 ? 10_000 : 0,
    damagedWeapon: rank5
      ? Object.freeze({
          attackLoss: rank10 ? 30 : rank8 ? 20 : 10,
          durationMs: rank10 ? 180_000 : rank8 ? 120_000 : 60_000,
        })
      : null,
    evasionLoss: rank5
      ? Object.freeze({
          chanceBasisPoints: rank10 ? 6_000 : rank8 ? 4_000 : 3_000,
          amount: rank10 ? 800 : rank8 ? 500 : 300,
          durationMs: rank10 ? 6_000 : 4_000,
        })
      : null,
    silence: rank8
      ? Object.freeze({
          curseChanceBasisPoints: rank10 ? 6_000 : 4_000,
          durationMs: rank10 ? 6_000 : 4_000,
        })
      : null,
    bashDamageReductionLossBasisPoints: rank10 ? 5_000 : rank8 ? 2_000 : 0,
    partySkillDamageReductionBasisPoints: rank10 ? 1_200 : rank8 ? 800 : rank5 ? 400 : 0,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

/** Persistent BUFF 30402; the strongest learned party contribution wins. */
export function mir4NativeRainOfBladesPartySkillDamageReductionBps(
  ctx: Pick<SimContext, 'players' | 'entities' | 'partyOf'>,
  target: Entity,
): number {
  const party = ctx.partyOf(target.id);
  const memberIds = party?.members ?? [target.id];
  let strongest = 0;
  for (const memberId of memberIds) {
    const member = ctx.entities.get(memberId);
    if (!member || member.dead || member.kind !== 'player') continue;
    const bonus =
      mir4NativeRainOfBladesPolicy(learnedSkillLevel(ctx, member))
        ?.partySkillDamageReductionBasisPoints ?? 0;
    strongest = Math.max(strongest, bonus);
  }
  return strongest;
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
  return applyMir4Effect(ctx, target, { ...spec, sourceId: source.id }).ok;
}

function refreshActiveDebilitation(target: Entity, durationMs: number): boolean {
  if (durationMs <= 0) return false;
  let refreshed = false;
  for (const effect of target.mir4Effects?.active ?? []) {
    if (
      effect.remaining <= CAST_COMPLETE_EPS ||
      (effect.effectId !== 'mir4_native_buff_10020' && effect.effectId !== 'mir4_native_buff_20020')
    ) {
      continue;
    }
    effect.remaining = durationMs / 1_000;
    effect.duration = durationMs / 1_000;
    effect.nativeStacks = Math.min(3, (effect.nativeStacks ?? 1) + 1);
    refreshed = true;
  }
  return refreshed;
}

export interface Mir4NativeRainOfBladesSpecialResult {
  readonly applied: boolean;
  readonly debilitationRefreshed: boolean;
  readonly evasionReduced: boolean;
  readonly silenced: boolean;
}

/** Apply the direct 310402 contact's rank effects once for its hybrid contact. */
export function applyMir4NativeRainOfBladesSpecialContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
  critical: boolean,
  rollBasisPoints: () => number = () => Math.floor(ctx.rng.next() * 10_000),
): Mir4NativeRainOfBladesSpecialResult {
  const empty = {
    applied: false,
    debilitationRefreshed: false,
    evasionReduced: false,
    silenced: false,
  } as const;
  const policy = mir4NativeRainOfBladesPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    target.dead ||
    attackId !== SPECIAL_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }

  const debilitationRefreshed = refreshActiveDebilitation(
    target,
    policy.refreshDebilitationDurationMs,
  );
  let applied = debilitationRefreshed;
  if (critical && policy.damagedWeapon) {
    const common = {
      kind: 'native-status-boost' as const,
      durationSeconds: policy.damagedWeapon.durationMs / 1_000,
      name: 'Damaged Weapon',
      sourceId: source.id,
      unremovable: true,
    };
    applied =
      replaceEffect(ctx, source, target, {
        ...common,
        effectId: 'mir4_native_buff_30514_20',
        magnitude: -policy.damagedWeapon.attackLoss,
        nativeStatusId: 20,
      }) || applied;
    applied =
      replaceEffect(ctx, source, target, {
        ...common,
        effectId: 'mir4_native_buff_30514_22',
        magnitude: -policy.damagedWeapon.attackLoss,
        nativeStatusId: 22,
      }) || applied;
  }

  let evasionReduced = false;
  if (policy.evasionLoss && rollBasisPoints() < policy.evasionLoss.chanceBasisPoints) {
    evasionReduced = replaceEffect(ctx, source, target, {
      effectId: `mir4_native_buff_${policy.skillLevel >= 8 ? 30521 : 30520}_29`,
      kind: 'native-status-boost',
      durationSeconds: policy.evasionLoss.durationMs / 1_000,
      magnitude: -policy.evasionLoss.amount,
      nativeStatusId: 29,
      name: 'Rain of Blades: Evasion Reduction',
      sourceId: source.id,
    });
    applied = evasionReduced || applied;
  }

  let silenced = false;
  if (policy.silence && rollBasisPoints() < policy.silence.curseChanceBasisPoints) {
    silenced = replaceEffect(ctx, source, target, {
      effectId: 'mir4_native_buff_30522',
      kind: 'silence',
      durationSeconds: policy.silence.durationMs / 1_000,
      magnitude: 0,
      name: 'Rain of Blades: Curse',
      sourceId: source.id,
    });
    applied = silenced || applied;
  }

  if (policy.bashDamageReductionLossBasisPoints > 0) {
    applied =
      replaceEffect(ctx, source, target, {
        effectId: 'mir4_native_buff_30513_35',
        kind: 'native-status-boost',
        durationSeconds: 10,
        magnitude: -policy.bashDamageReductionLossBasisPoints,
        nativeStatusId: 35,
        name: 'Rain of Blades: Bash DMG Reduction',
        sourceId: source.id,
      }) || applied;
  }
  return { applied, debilitationRefreshed, evasionReduced, silenced };
}
