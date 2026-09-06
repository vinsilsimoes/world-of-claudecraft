import type { SimContext } from '../sim_context';
import type { Entity, Mir4ActiveEffect } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { applyMir4Effect, mir4EffectIsHarmful } from './effects';

const SKILL_ID = 3301;
const SPECIAL_ATTACK_ID = 330102;

export interface Mir4NativeMoonlightOrbPolicy {
  readonly skillLevel: number;
  readonly quellDurationMs: number;
  readonly chaosDurationMs: number;
  readonly skillDamageReductionLossBps: number;
  readonly skillDamageReductionLossDurationMs: number;
  readonly criticalEvasionLoss: number;
  readonly criticalEvasionLossDurationMs: number;
  readonly enhancementDispelChanceBps: Readonly<{ monster: number; player: number }>;
  readonly magicShieldOrStealthDispelChanceBps: number;
  readonly monsterDamageBps: number;
  readonly partyDefenseFlat: number;
}

/**
 * Exact rank milestones from SKILL_SPECIAL_ABILITY 126..129 and their
 * referenced PASSIVE/BUFF rows. Ranks above 10 retain the rank-10 contract.
 */
export function mir4NativeMoonlightOrbPolicy(
  requestedSkillLevel: number,
): Mir4NativeMoonlightOrbPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillLevel,
    quellDurationMs: rank10 ? 15_000 : rank8 ? 12_000 : rank5 ? 10_000 : 8_000,
    chaosDurationMs: rank8 ? 10_000 : 0,
    skillDamageReductionLossBps: rank10 ? 2_000 : rank8 ? 1_500 : rank5 ? 1_000 : 0,
    skillDamageReductionLossDurationMs: rank8 ? 30_000 : rank5 ? 15_000 : 0,
    criticalEvasionLoss: rank10 ? 300 : 0,
    criticalEvasionLossDurationMs: rank10 ? 10_000 : 0,
    enhancementDispelChanceBps: Object.freeze({
      monster: rank10 ? 10_000 : rank8 ? 7_000 : rank5 ? 3_500 : 0,
      player: rank10 ? 6_000 : rank8 ? 4_000 : rank5 ? 2_000 : 0,
    }),
    magicShieldOrStealthDispelChanceBps: rank10 ? 6_000 : rank8 ? 4_000 : 0,
    monsterDamageBps: rank10 ? 1_200 : rank8 ? 800 : rank5 ? 400 : 0,
    partyDefenseFlat: rank10 ? 100 : rank8 ? 60 : rank5 ? 20 : 0,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

/** Persistent monster-damage passive owned by the character's learned rank. */
export function mir4NativeMoonlightOrbPersistentMonsterDamageBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return mir4NativeMoonlightOrbPolicy(learnedSkillLevel(ctx, source))?.monsterDamageBps ?? 0;
}

/**
 * Party BUFF 30403. The source does not expose a stacking rule, so the browser
 * runtime uses the strongest learned contribution instead of stacking Taoists.
 */
export function mir4NativeMoonlightOrbPartyDefenseBonus(
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
      mir4NativeMoonlightOrbPolicy(learnedSkillLevel(ctx, member))?.partyDefenseFlat ?? 0;
    strongest = Math.max(strongest, bonus);
  }
  return strongest;
}

function chanceLands(ctx: Pick<SimContext, 'rng'>, chanceBasisPoints: number): boolean {
  if (chanceBasisPoints >= 10_000) return true;
  return chanceBasisPoints > 0 && Math.floor(ctx.rng.next() * 10_000) < chanceBasisPoints;
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

function enhancementEffect(effect: Mir4ActiveEffect): boolean {
  if (effect.remaining <= CAST_COMPLETE_EPS || mir4EffectIsHarmful(effect.kind, effect.magnitude)) {
    return false;
  }
  return (
    effect.kind === 'all-damage-reduction' ||
    effect.kind === 'boss-damage-reduction' ||
    effect.kind === 'damage-boost' ||
    effect.kind === 'defense-boost' ||
    effect.kind === 'dodge-boost' ||
    effect.kind === 'invincible' ||
    effect.kind === 'native-status-boost'
  );
}

function removeOneEnhancement(target: Entity): boolean {
  const index = target.mir4Effects?.active.findIndex(enhancementEffect) ?? -1;
  if (index < 0 || !target.mir4Effects) return false;
  target.mir4Effects.active.splice(index, 1);
  return true;
}

function removeMagicShieldOrStealth(ctx: SimContext, target: Entity): boolean {
  const hadShield = target.mir4Shield !== undefined;
  const hadStealth = target.stealthed || target.auras.some((aura) => aura.kind === 'stealth');
  if (hadShield) target.mir4Shield = undefined;
  if (hadStealth) ctx.breakStealth(target);
  return hadShield || hadStealth;
}

export interface Mir4NativeMoonlightOrbSpecialResult {
  readonly applied: boolean;
  readonly enhancementDispelled: boolean;
  readonly magicShieldOrStealthDispelled: boolean;
}

/** Apply the direct 330102 contact's native rank effects exactly once per cast. */
export function applyMir4NativeMoonlightOrbSpecialContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
): Mir4NativeMoonlightOrbSpecialResult {
  const empty = {
    applied: false,
    enhancementDispelled: false,
    magicShieldOrStealthDispelled: false,
  } as const;
  const policy = mir4NativeMoonlightOrbPolicy(requestedSkillLevel);
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

  let applied = replaceEffect(ctx, source, target, {
    effectId: 'mir4_native_buff_30010',
    kind: 'spell-attack-reduction',
    durationSeconds: policy.quellDurationMs / 1_000,
    magnitude: 0.25,
    name: 'Quell',
    sourceId: source.id,
  });
  if (policy.chaosDurationMs > 0) {
    applied =
      replaceEffect(ctx, source, target, {
        effectId: 'mir4_native_buff_10020',
        kind: 'physical-attack-reduction',
        durationSeconds: policy.chaosDurationMs / 1_000,
        magnitude: 0.25,
        name: 'Chaos',
        sourceId: source.id,
      }) || applied;
  }
  if (policy.skillDamageReductionLossBps > 0) {
    applied =
      replaceEffect(ctx, source, target, {
        effectId: 'mir4_native_buff_30502_45',
        kind: 'native-status-boost',
        durationSeconds: policy.skillDamageReductionLossDurationMs / 1_000,
        magnitude: -policy.skillDamageReductionLossBps / 100,
        nativeStatusId: 45,
        name: 'Moonlight Orb: Skill DMG Reduction',
        sourceId: source.id,
      }) || applied;
  }
  if (policy.criticalEvasionLoss > 0) {
    applied =
      replaceEffect(ctx, source, target, {
        effectId: 'mir4_native_buff_30503_31',
        kind: 'native-status-boost',
        durationSeconds: policy.criticalEvasionLossDurationMs / 1_000,
        magnitude: -policy.criticalEvasionLoss,
        nativeStatusId: 31,
        name: 'Moonlight Orb: Critical Evasion',
        sourceId: source.id,
      }) || applied;
  }

  const enhancementChance =
    target.kind === 'player'
      ? policy.enhancementDispelChanceBps.player
      : policy.enhancementDispelChanceBps.monster;
  const enhancementDispelled = chanceLands(ctx, enhancementChance) && removeOneEnhancement(target);
  const magicShieldOrStealthDispelled =
    chanceLands(ctx, policy.magicShieldOrStealthDispelChanceBps) &&
    removeMagicShieldOrStealth(ctx, target);
  return { applied, enhancementDispelled, magicShieldOrStealthDispelled };
}
