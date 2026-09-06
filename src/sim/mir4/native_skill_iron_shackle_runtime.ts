import { mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import {
  mir4NativeIronShacklePersistentBonuses,
  mir4NativeRuntimeIronShacklePolicy,
} from './native_skill_iron_shackle';

const IRON_SHACKLE_SKILL_ID = 1201;

export interface Mir4NativeIronShackleImpactResult {
  readonly damageAmplificationApplied: boolean;
  readonly finalStunApplied: boolean;
}

function ironShackleSkillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  const authored = ctx.players.get(source.id)?.mir4SkillLevels?.[IRON_SHACKLE_SKILL_ID] ?? 1;
  return Math.max(1, Math.min(10, Math.trunc(authored)));
}

/** Persistent SKILL_SPECIAL_ABILITY passives owned by a learned Iron Shackle rank. */
export function mir4NativeIronShacklePersistentCombatBonuses(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
) {
  return mir4NativeIronShacklePersistentBonuses(ironShackleSkillLevel(ctx, source));
}

/** Apply the two row-bound milestone effects after their authored damage contact lands. */
export function applyMir4NativeIronShackleImpactEffects(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  attackId: number,
  skillLevel: number,
  rollBasisPoints: number,
): Mir4NativeIronShackleImpactResult {
  let damageAmplificationApplied = false;
  let finalStunApplied = false;
  if (
    skillId !== IRON_SHACKLE_SKILL_ID ||
    source.dead ||
    target.dead ||
    !ctx.isHostileTo(source, target)
  ) {
    return { damageAmplificationApplied, finalStunApplied };
  }

  const policy = mir4NativeRuntimeIronShacklePolicy(skillLevel);
  const name = mir4SkillById(IRON_SHACKLE_SKILL_ID)?.displayName ?? 'Iron Shackle';
  if (policy.damageAmplification?.sourceAttackId === attackId) {
    damageAmplificationApplied = applyMir4Effect(ctx, target, {
      effectId: `mir4_${IRON_SHACKLE_SKILL_ID}_buff_${policy.damageAmplification.buffId}`,
      kind: 'damage-amplification',
      durationSeconds: policy.damageAmplification.durationMs / 1_000,
      magnitude: policy.damageAmplification.magnitudeBasisPoints / 10_000,
      name,
      sourceId: source.id,
    }).ok;
  }
  if (
    policy.finalStun?.sourceAttackId === attackId &&
    Math.trunc(rollBasisPoints) < policy.finalStun.chanceBasisPoints
  ) {
    finalStunApplied = applyMir4Effect(ctx, target, {
      effectId: `mir4_${IRON_SHACKLE_SKILL_ID}_buff_${policy.finalStun.buffId}`,
      kind: 'stun',
      durationSeconds: policy.finalStun.durationMs / 1_000,
      magnitude: 0,
      name,
      sourceId: source.id,
    }).ok;
  }
  return { damageAmplificationApplied, finalStunApplied };
}
