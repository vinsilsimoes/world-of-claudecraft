import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillActionById } from '../content/mir4/native_skill_actions';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { compileMir4NativeTimedBuff } from './native_timed_buffs';

const SKILL_ID = 1302;
const ATTACK_ID = 130202;
const BUFF_ID = 13021;
const PHYSICAL_ATTACK_CALCULATED_ID = 111;

export interface Mir4NativeLionRoarDebuffSpec {
  readonly skillId: 1302;
  readonly attackId: 130202;
  readonly buffId: 13021;
  readonly effectId: 'mir4_native_buff_13021';
  readonly kind: 'physical-attack-flat-reduction';
  readonly durationMs: number;
  /** Exact positive magnitude of the native calculated-holder subtraction. */
  readonly magnitude: number;
  readonly probabilityBasisPoints: 10_000;
}

/** Exact SKILL_ATTACK row guard for Lion's Roar's direct ATK Drop BUFF. */
export function mir4NativeLionRoarDebuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    row.attackId === ATTACK_ID &&
    row.nativeBehavior.damageType === 1 &&
    row.nativeBehavior.physicalDamage.coefficient === 11_000 &&
    row.nativeBehavior.physicalDamage.levelUpCoefficient === 270 &&
    row.nativeBehavior.magicDamage.coefficient === 0 &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 500
  );
}

/**
 * Compile the direct 130202 -> BUFF 13021 chain.
 *
 * BUFF index 20 writes calculated-holder ID 111 (physical attack). Its value
 * is flat native attack, not a percentage, so Aeldrune preserves 80 at rank 1
 * instead of turning it into an invented 80% multiplier.
 */
export function mir4NativeRuntimeLionRoarDebuff(
  skillId: number,
  attackId: number,
  skillLevel: number,
): Mir4NativeLionRoarDebuffSpec | null {
  if (skillId !== SKILL_ID || attackId !== ATTACK_ID) return null;
  const action = mir4NativeSkillActionById(skillId);
  const row = action?.rows.find((candidate) => candidate.attackId === attackId);
  const evidence = mir4NativeSkillBuffEvidenceById(BUFF_ID);
  if (!row || !mir4NativeLionRoarDebuffMatchesRow(row) || !evidence) return null;
  const compiled = compileMir4NativeTimedBuff(evidence.rawRecord, skillLevel);
  if (!compiled.ok || compiled.buff.buffId !== BUFF_ID) return null;
  const physicalAttack = compiled.buff.contributions.find(
    (contribution) => contribution.calculatedId === PHYSICAL_ATTACK_CALCULATED_ID,
  );
  if (!physicalAttack || physicalAttack.value >= 0) return null;
  return Object.freeze({
    skillId: SKILL_ID,
    attackId: ATTACK_ID,
    buffId: BUFF_ID,
    effectId: 'mir4_native_buff_13021',
    kind: 'physical-attack-flat-reduction',
    durationMs: compiled.buff.durationMs,
    magnitude: Math.abs(physicalAttack.value),
    probabilityBasisPoints: 10_000,
  });
}

/** Apply or refresh the direct native BuffId on every landed 130202 target. */
export function applyMir4NativeLionRoarDebuff(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: Mir4NativeLionRoarDebuffSpec,
): boolean {
  const existing = target.mir4Effects?.active.find((effect) => effect.effectId === spec.effectId);
  if (existing) {
    existing.kind = spec.kind;
    existing.duration = spec.durationMs / 1_000;
    existing.remaining = existing.duration;
    existing.magnitude = spec.magnitude;
    existing.sourceId = source.id;
    return true;
  }
  return applyMir4Effect(ctx, target, {
    effectId: spec.effectId,
    kind: spec.kind,
    durationSeconds: spec.durationMs / 1_000,
    magnitude: spec.magnitude,
    name: 'ATK Drop',
    sourceId: source.id,
  }).ok;
}
