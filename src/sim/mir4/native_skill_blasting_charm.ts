import { mir4SkillById } from '../content/mir4';
import { MIR4_NATIVE_TAOIST_SKILL_ACTIONS } from '../content/mir4/native_skill_actions_taoist';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { applyMir4NativeDarknessStack } from './native_darkness';

const SKILL_ID = 3505 as const;
const CONTACT_ATTACK_ID = 350502 as const;

export interface Mir4NativeBlastingCharmPolicy {
  readonly skillId: 3505;
  readonly skillLevel: number;
  readonly contactAttackId: 350502;
  readonly darkness: Readonly<{
    buffId: 30020;
    silenceResistanceBasisPoints: -250;
    durationMs: number;
  }>;
  readonly physicalDefense: Readonly<{
    buffId: 30505;
    flat: -50;
    durationMs: number;
  }>;
  /** BUFF 30506 is admitted only for monster targets. */
  readonly monsterAllDamageReductionBasisPoints: number;
  /** BUFF 30507 is admitted only for character targets. */
  readonly characterMonsterDamageReductionBasisPoints: number;
  readonly characterPvpDamageReductionBasisPoints: number;
  readonly contextualReductionDurationMs: number;
  readonly controlResistance: Readonly<{
    buffId: 30509;
    debilitationBasisPoints: number;
    silenceBasisPoints: number;
    stunBasisPoints: number;
    durationMs: 30_000;
  }> | null;
}

/**
 * Exact rank graph recovered from the extracted MIR4 tables and user-facing
 * skill strings. Runtime values are never loaded from the external checkout.
 *
 * SKILL_SPECIAL_ABILITY.json sha256
 * 9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db
 * SKILL_PASSIVE.json sha256
 * 533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e
 * BUFF.json sha256
 * 797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b
 * STRING_TEMPLATE.json: 343515, 343525, 343535 and 343545.
 */
const SPECIAL_LEVELS = Object.freeze({
  rank1: Object.freeze({
    darknessPassiveLevel: 4,
    defenseBuffLevel: 1,
    contextualBasisPoints: 0,
    pvpBasisPoints: 0,
    controlBuffLevel: 0,
  }),
  rank5: Object.freeze({
    darknessPassiveLevel: 6,
    defenseBuffLevel: 1,
    contextualBasisPoints: 1_500,
    pvpBasisPoints: 0,
    controlBuffLevel: 0,
  }),
  rank8: Object.freeze({
    darknessPassiveLevel: 8,
    defenseBuffLevel: 2,
    contextualBasisPoints: 2_000,
    pvpBasisPoints: 1_500,
    controlBuffLevel: 1,
  }),
  rank10: Object.freeze({
    darknessPassiveLevel: 11,
    defenseBuffLevel: 4,
    contextualBasisPoints: 3_000,
    pvpBasisPoints: 2_000,
    controlBuffLevel: 2,
  }),
});

function exactNativeBlastingCharmSource(): boolean {
  const action = MIR4_NATIVE_TAOIST_SKILL_ACTIONS.find(
    (candidate) => candidate.skillId === SKILL_ID,
  );
  const projectile = action?.rows[0];
  const explosion = action?.rows[1];
  return (
    action?.cooldownMs === 28_000 &&
    action.skillCostType === 2 &&
    action.skillCost === 4_000 &&
    action.attackAnimationMs === 1_533 &&
    action.endCutAnimationMs === 1_350 &&
    action.requiredClassLevel === 32 &&
    action.targeting === true &&
    action.blockingCheck === 1 &&
    action.nativeBehavior.secondaryDamage.coefficient === 240 &&
    action.nativeBehavior.secondaryDamage.levelUpCoefficient === 5 &&
    projectile?.attackId === 350501 &&
    projectile.nativeBehavior.projectile?.moveType === 1 &&
    projectile.nativeBehavior.projectile.speed === 4_000 &&
    projectile.impactOffsetsMs[0] === 830 &&
    explosion?.attackId === CONTACT_ATTACK_ID &&
    explosion.impactType === 1 &&
    explosion.authorialTargetValue === 5 &&
    explosion.geometry.nativeDistanceMax === 600 &&
    explosion.geometry.nativeHeight === 400 &&
    explosion.impactOffsetsMs[0] === 1_080 &&
    explosion.nativeBehavior.magicDamage.coefficient === 24_000 &&
    explosion.nativeBehavior.magicDamage.levelUpCoefficient === 500
  );
}

export function mir4NativeBlastingCharmPolicy(
  requestedSkillLevel: number,
): Mir4NativeBlastingCharmPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeBlastingCharmSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const tier =
    skillLevel >= 10
      ? SPECIAL_LEVELS.rank10
      : skillLevel >= 8
        ? SPECIAL_LEVELS.rank8
        : skillLevel >= 5
          ? SPECIAL_LEVELS.rank5
          : SPECIAL_LEVELS.rank1;
  const darknessDurationMs = (5 + (tier.darknessPassiveLevel - 1)) * 1_000;
  const contextualDurationMs = (15 + Math.max(0, tier.defenseBuffLevel - 1) * 5) * 1_000;
  const controlLevel = tier.controlBuffLevel;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    contactAttackId: CONTACT_ATTACK_ID,
    darkness: Object.freeze({
      buffId: 30020 as const,
      // BUFF resistance rates use native tenths of a percent; runtime uses bps.
      silenceResistanceBasisPoints: -250 as const,
      durationMs: darknessDurationMs,
    }),
    physicalDefense: Object.freeze({
      buffId: 30505 as const,
      flat: -50 as const,
      durationMs: contextualDurationMs,
    }),
    monsterAllDamageReductionBasisPoints:
      tier.contextualBasisPoints === 0 ? 0 : -tier.contextualBasisPoints,
    characterMonsterDamageReductionBasisPoints:
      tier.contextualBasisPoints === 0 ? 0 : -tier.contextualBasisPoints,
    characterPvpDamageReductionBasisPoints: tier.pvpBasisPoints === 0 ? 0 : -tier.pvpBasisPoints,
    contextualReductionDurationMs: contextualDurationMs,
    controlResistance:
      controlLevel === 0
        ? null
        : Object.freeze({
            buffId: 30509 as const,
            debilitationBasisPoints: -(controlLevel === 2 ? 3_000 : 1_500),
            silenceBasisPoints: -(controlLevel === 2 ? 3_000 : 1_500),
            stunBasisPoints: -(controlLevel === 2 ? 2_000 : 1_000),
            durationMs: 30_000 as const,
          }),
  });
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
  const name = mir4SkillById(SKILL_ID)?.displayName ?? 'Blasting Charm';
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1_000,
    magnitude,
    nativeStatusId: statusId,
    name,
    sourceId: source.id,
  }).ok;
}

/** Apply the selected rank's exact debuff package once to one landed explosion target. */
export function applyMir4NativeBlastingCharmContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  sourceImpactIndex: number,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeBlastingCharmPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    target.dead ||
    attackId !== CONTACT_ATTACK_ID ||
    sourceImpactIndex !== 0 ||
    !ctx.isHostileTo(source, target)
  ) {
    return false;
  }

  const results = [
    applyMir4NativeDarknessStack(
      ctx,
      source,
      target,
      policy.darkness.durationMs,
      'Blasting Charm',
    ) > 0,
    replaceStatus(
      ctx,
      source,
      target,
      policy.physicalDefense.buffId,
      24,
      policy.physicalDefense.durationMs,
      policy.physicalDefense.flat,
    ),
  ];
  const characterTarget = target.kind === 'player' || target.ownerId !== null;
  if (!characterTarget && policy.monsterAllDamageReductionBasisPoints !== 0) {
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        30506,
        47,
        policy.contextualReductionDurationMs,
        policy.monsterAllDamageReductionBasisPoints,
      ),
    );
  }
  if (characterTarget && policy.characterMonsterDamageReductionBasisPoints !== 0) {
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        30507,
        42,
        policy.contextualReductionDurationMs,
        policy.characterMonsterDamageReductionBasisPoints,
      ),
    );
  }
  if (characterTarget && policy.characterPvpDamageReductionBasisPoints !== 0) {
    results.push(
      replaceStatus(
        ctx,
        source,
        target,
        30508,
        39,
        policy.contextualReductionDurationMs,
        policy.characterPvpDamageReductionBasisPoints,
      ),
    );
  }
  if (policy.controlResistance) {
    for (const [statusId, magnitude] of [
      [51, policy.controlResistance.debilitationBasisPoints],
      [53, policy.controlResistance.silenceBasisPoints],
      [49, policy.controlResistance.stunBasisPoints],
    ] as const) {
      results.push(
        replaceStatus(
          ctx,
          source,
          target,
          policy.controlResistance.buffId,
          statusId,
          policy.controlResistance.durationMs,
          magnitude,
        ),
      );
    }
  }
  return results.some(Boolean);
}
