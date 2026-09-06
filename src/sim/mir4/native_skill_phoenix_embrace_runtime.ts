import { mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { mir4NativeRuntimePhoenixEmbracePolicy } from './native_skill_phoenix_embrace';
import { mir4PartyPulseTargets } from './party_support';

const SKILL_ID = 2204;

function replaceNativeStatus(
  ctx: SimContext,
  target: Entity,
  source: Entity,
  statusId: number,
  magnitude: number,
  durationSeconds: number,
  effectId: string,
  name: string,
): boolean {
  if (magnitude <= 0) return false;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds,
    magnitude,
    nativeStatusId: statusId,
    name,
    sourceId: source.id,
  }).ok;
}

/** Apply the actor-area party buff and the rank milestone self-buffs at 850 ms. */
export function applyMir4NativePhoenixEmbrace(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeRuntimePhoenixEmbracePolicy(requestedSkillLevel);
  const name = mir4SkillById(SKILL_ID)?.displayName ?? null;
  if (!policy || !name || source.dead) return false;

  let applied = false;
  for (const target of mir4PartyPulseTargets(ctx, source, {
    radiusYards: policy.radiusYards,
    heightYards: policy.heightYards,
    maxTargets: policy.targetCap,
  })) {
    applied =
      replaceNativeStatus(
        ctx,
        target,
        source,
        22,
        policy.spellAttackFlat,
        policy.durationMs / 1_000,
        `mir4_native_buff_${policy.buffId}_22`,
        name,
      ) || applied;
  }

  const milestoneDurationSeconds = 16;
  if (policy.cooldownReductionBasisPoints > 0) {
    replaceNativeStatus(
      ctx,
      source,
      source,
      95,
      policy.cooldownReductionBasisPoints,
      milestoneDurationSeconds,
      'mir4_native_buff_phoenix_cooldown_95',
      name,
    );
  }
  if (policy.mpPotionEfficiencyBasisPoints > 0) {
    replaceNativeStatus(
      ctx,
      source,
      source,
      147,
      policy.mpPotionEfficiencyBasisPoints,
      milestoneDurationSeconds,
      'mir4_native_buff_phoenix_mp_potion_147',
      name,
    );
  }
  return applied;
}

/** Rank-8/10 Skill DMG passive; independent of the 60-second active buff. */
export function mir4NativePhoenixEmbracePersistentSkillDamageBonusBps(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): number {
  const skillLevel = ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
  return mir4NativeRuntimePhoenixEmbracePolicy(skillLevel)?.persistentSkillDamageBasisPoints ?? 0;
}
