import { mir4SkillById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect, mir4Invincible, mir4NativeStatusBonus } from './effects';
import { mir4NativeRuntimeBerserkPolicy } from './native_skill_berserk';

const SKILL_ID = 1101;

export function mir4NativeBerserkInvincible(source: Entity): boolean {
  return mir4Invincible(source);
}

export function mir4NativeBerserkSkillDamageBonusBps(source: Entity): number {
  return mir4NativeStatusBonus(source, 44);
}

/** Apply one source-owned BUFF row when its native router timestamp matures. */
export function applyMir4NativeBerserkSourceBuff(
  ctx: SimContext,
  source: Entity,
  attackId: number,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeRuntimeBerserkPolicy(requestedSkillLevel);
  const row = policy?.rows.find((candidate) => candidate.attackId === attackId);
  const name = mir4SkillById(SKILL_ID)?.displayName ?? null;
  if (!row || !name || source.dead) return false;
  if (row.buff.kind === 'invincible') {
    return applyMir4Effect(ctx, source, {
      effectId: `mir4_native_buff_${row.buff.buffId}`,
      kind: 'invincible',
      durationSeconds: row.buff.durationMs / 1_000,
      magnitude: 0,
      name,
      sourceId: source.id,
    }).ok;
  }
  return applyMir4Effect(ctx, source, {
    effectId: `mir4_native_buff_${row.buff.buffId}_${row.buff.statusId}`,
    kind: 'native-status-boost',
    durationSeconds: row.buff.durationMs / 1_000,
    magnitude: row.buff.magnitudeBasisPoints,
    nativeStatusId: row.buff.statusId,
    name,
    sourceId: source.id,
  }).ok;
}
