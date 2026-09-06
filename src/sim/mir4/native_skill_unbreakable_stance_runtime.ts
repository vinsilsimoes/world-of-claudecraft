import { mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { mir4NativeRuntimeUnbreakableStancePolicy } from './native_skill_unbreakable_stance';

const SKILL_ID = 1502;

function skillLevel(ctx: Pick<SimContext, 'players'>, source: Entity): number {
  const authored = ctx.players.get(source.id)?.mir4SkillLevels?.[SKILL_ID] ?? 1;
  return Math.max(1, Math.min(10, Math.trunc(authored)));
}

export function mir4NativeUnbreakableStancePersistentCombatBonuses(
  ctx: Pick<SimContext, 'players'>,
  source: Entity,
): { readonly allDamageReductionBasisPoints: number } {
  const policy = mir4NativeRuntimeUnbreakableStancePolicy(skillLevel(ctx, source));
  return Object.freeze({
    allDamageReductionBasisPoints: policy?.persistentAllDamageReductionBasisPoints ?? 0,
  });
}

/** Apply source-side status buffs, including the rank-8 stunned-cast branch. */
export function applyMir4NativeUnbreakableStanceBuffs(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
  startedWhileStunned: boolean,
): boolean {
  return applyBuffPhase(ctx, source, requestedSkillLevel, [
    'always',
    ...(startedWhileStunned ? (['while-stunned'] as const) : []),
  ]);
}

export function applyMir4NativeUnbreakableStanceAlwaysBuffs(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  return applyBuffPhase(ctx, source, requestedSkillLevel, ['always']);
}

export function applyMir4NativeUnbreakableStanceStunnedBuffs(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  return applyBuffPhase(ctx, source, requestedSkillLevel, ['while-stunned']);
}

function applyBuffPhase(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
  phases: readonly ('always' | 'while-stunned')[],
): boolean {
  const policy = mir4NativeRuntimeUnbreakableStancePolicy(requestedSkillLevel);
  const name = mir4SkillById(SKILL_ID)?.displayName ?? null;
  if (!policy || !name || source.dead) return false;
  const buffs = [
    ...(phases.includes('always') ? policy.always : []),
    ...(phases.includes('while-stunned') ? policy.whileStunned : []),
  ];
  if (buffs.length === 0) return phases.length > 0;
  for (const buff of buffs) {
    for (const status of buff.statuses) {
      const result = applyMir4Effect(ctx, source, {
        effectId: `mir4_native_buff_${buff.buffId}_${status.statusId}`,
        kind: 'native-status-boost',
        durationSeconds: buff.durationMs / 1_000,
        magnitude: status.magnitude,
        nativeStatusId: status.statusId,
        name,
        sourceId: source.id,
      });
      if (!result.ok) return false;
    }
  }
  return true;
}
