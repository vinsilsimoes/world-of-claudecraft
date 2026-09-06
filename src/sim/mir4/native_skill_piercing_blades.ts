import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from './control';
import { applyMir4Effect, mir4NativeStatusBonus } from './effects';
import { mir4NativeBashResolution } from './native_skill_bash';

const SKILL_ID = 3103;
const SPECIAL_ATTACK_ID = 310302;

export interface Mir4NativePiercingBladesPolicy {
  readonly skillLevel: number;
  readonly stun: Readonly<{
    monsterChanceBasisPoints: number;
    playerChanceBasisPoints: number;
    durationMs: number;
  }> | null;
  readonly skillDamageReductionLoss: Readonly<{
    monsterBasisPoints: number;
    playerBasisPoints: number;
    durationMs: number;
  }> | null;
  readonly bashDebilitationDurationMs: number;
  readonly bossDamageBasisPoints: number;
}

/** Exact rank milestones from special rows 137 to 142 and BUFF 10522/10523/10525/30502. */
export function mir4NativePiercingBladesPolicy(
  requestedSkillLevel: number,
): Mir4NativePiercingBladesPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillLevel,
    stun: rank5
      ? Object.freeze({
          monsterChanceBasisPoints: 10_000,
          playerChanceBasisPoints: rank10 ? 6_000 : rank8 ? 4_000 : 2_000,
          durationMs: rank10 ? 5_000 : rank8 ? 3_000 : 2_000,
        })
      : null,
    skillDamageReductionLoss: rank8
      ? Object.freeze({
          monsterBasisPoints: rank10 ? 3_000 : 2_000,
          playerBasisPoints: rank10 ? 2_000 : 1_500,
          durationMs: 30_000,
        })
      : null,
    bashDebilitationDurationMs: rank10 ? 16_000 : rank8 ? 8_000 : 0,
    bossDamageBasisPoints: rank10 ? 2_000 : rank8 ? 1_500 : rank5 ? 1_000 : 0,
  });
}

function learnedSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  return ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
}

/** Persistent Boss ATK DMG learned from the character's Piercing Blades rank. */
export function mir4NativePiercingBladesPersistentBossDamageBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  return mir4NativePiercingBladesPolicy(learnedSkillLevel(ctx, source))?.bossDamageBasisPoints ?? 0;
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

function targetKind(target: Entity): 'player' | 'monster' {
  return target.kind === 'player' || target.ownerId != null ? 'player' : 'monster';
}

function chanceLands(ctx: Pick<SimContext, 'rng'>, chanceBasisPoints: number): boolean {
  if (chanceBasisPoints >= 10_000) return true;
  return chanceBasisPoints > 0 && Math.floor(ctx.rng.next() * 10_000) < chanceBasisPoints;
}

function applyBashDebilitations(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  durationMs: number,
): boolean {
  if (durationMs <= 0) return false;
  const common = {
    durationSeconds: durationMs / 1_000,
    sourceId: source.id,
  };
  const chaos = replaceEffect(ctx, source, target, {
    ...common,
    effectId: 'mir4_native_buff_10020',
    kind: 'physical-attack-reduction',
    magnitude: 0.25,
    name: 'Chaos',
  });
  const chill = replaceEffect(ctx, source, target, {
    ...common,
    effectId: 'mir4_native_buff_20020',
    kind: 'native-status-boost',
    nativeStatusId: 45,
    magnitude: -25,
    name: 'Chill',
  });
  return chaos || chill;
}

export interface Mir4NativePiercingBladesSpecialResult {
  readonly applied: boolean;
  readonly stunned: boolean;
  readonly bashTriggered: boolean;
  readonly bashDebilitationsApplied: boolean;
}

/** Apply one landed 310302 contact's rank effects from the extracted special/passive chain. */
export function applyMir4NativePiercingBladesSpecialContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  _sourceImpactIndex: number,
  requestedSkillLevel: number,
): Mir4NativePiercingBladesSpecialResult {
  const empty = {
    applied: false,
    stunned: false,
    bashTriggered: false,
    bashDebilitationsApplied: false,
  } as const;
  const policy = mir4NativePiercingBladesPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    target.dead ||
    attackId !== SPECIAL_ATTACK_ID ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }

  const bashTriggered = mir4NativeBashResolution(
    ctx,
    source,
    target,
    SKILL_ID,
    policy.skillLevel,
  ).triggered;
  const kind = targetKind(target);
  let stunned = false;
  if (policy.stun) {
    const baseChance =
      kind === 'player'
        ? policy.stun.playerChanceBasisPoints
        : policy.stun.monsterChanceBasisPoints;
    const chance = mir4ControlChanceFromStatuses(
      baseChance,
      'stun',
      source.mir4?.statusValues,
      target.mir4?.statusValues,
      kind,
      mir4NativeStatusBonus(target, 49),
    );
    if (chanceLands(ctx, chance)) {
      const durationMs = mir4ControlDurationMs(
        policy.stun.durationMs,
        'stun',
        source.mir4?.statusValues,
        target.mir4?.statusValues,
        kind,
        mir4NativeStatusBonus(target, 49),
      );
      stunned = applyMir4Effect(ctx, target, {
        effectId: `mir4_native_buff_${policy.skillLevel >= 10 ? 10525 : policy.skillLevel >= 8 ? 10523 : 10522}`,
        kind: 'stun',
        durationSeconds: durationMs / 1_000,
        magnitude: 0,
        name: 'Piercing Blades: Stun',
        sourceId: source.id,
      }).ok;
    }
  }

  let vulnerabilityApplied = false;
  if (policy.skillDamageReductionLoss) {
    const magnitude =
      kind === 'player'
        ? policy.skillDamageReductionLoss.playerBasisPoints
        : policy.skillDamageReductionLoss.monsterBasisPoints;
    vulnerabilityApplied = replaceEffect(ctx, source, target, {
      effectId: 'mir4_native_buff_30502_45',
      kind: 'native-status-boost',
      durationSeconds: policy.skillDamageReductionLoss.durationMs / 1_000,
      magnitude: -magnitude / 100,
      nativeStatusId: 45,
      name: 'Piercing Blades: Skill DMG Reduction',
      sourceId: source.id,
    });
  }
  const bashDebilitationsApplied =
    bashTriggered && applyBashDebilitations(ctx, source, target, policy.bashDebilitationDurationMs);
  return {
    applied: stunned || vulnerabilityApplied || bashDebilitationsApplied,
    stunned,
    bashTriggered,
    bashDebilitationsApplied,
  };
}
