import { mir4NativeSkillActionById } from '../content/mir4';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4ActiveEffect, SimEvent } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { mir4NativeControlImmune } from './native_control_immunity';
import { mir4NativeGeneratedMechanicalRow } from './native_skill_generated_contract';

const RUNTIME_HIT_REACTION_ROWS = new Map<number, ReadonlyMap<number, number>>([
  [
    1102,
    new Map([
      [110202, 200],
      [110203, 200],
      [110204, 200],
    ]),
  ],
  [
    1501,
    new Map([
      [150101, 100],
      [150103, 100],
      [150105, 100],
    ]),
  ],
  [
    1302,
    new Map([
      [130202, 100],
      [130203, 100],
    ]),
  ],
  [1601, new Map([[160103, 200]])],
  [1201, new Map([[120103, 200]])],
  [1502, new Map([[150202, 200]])],
  [3506, new Map([[350602, 300]])],
  [4106, new Map([[410602, 200]])],
]);
const HIT_REACTION_EFFECT_ID = 'mir4_native_hit_reaction';

export interface Mir4NativeRuntimeHitReaction {
  readonly durationMs: number;
  readonly stance: 'hit-01';
}

/**
 * Runtime allowlist for rows whose native hit-state consumer has been proven.
 * Catalog data for every class remains evidence-only until that skill reaches
 * this same homologation gate.
 */
export function mir4NativeRuntimeHitReaction(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeHitReaction | null {
  const generatedRow = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  const expectedDurationMs =
    RUNTIME_HIT_REACTION_ROWS.get(skillId)?.get(attackId) ??
    (generatedRow?.reaction.kind === 'hit' &&
    generatedRow.reaction.stance === 'hit-01' &&
    generatedRow.reaction.probabilityPercent === 100
      ? generatedRow.reaction.durationMs
      : undefined);
  if (expectedDurationMs === undefined) return null;
  const row =
    generatedRow ??
    mir4NativeSkillActionById(skillId)?.rows.find((candidate) => candidate.attackId === attackId);
  if (
    row?.reaction.kind !== 'hit' ||
    row.reaction.stance !== 'hit-01' ||
    row.reaction.durationMs !== expectedDurationMs ||
    row.reaction.probabilityPercent !== 100
  ) {
    return null;
  }
  return Object.freeze({ durationMs: row.reaction.durationMs, stance: row.reaction.stance });
}

function activeHitReaction(target: Entity): Mir4ActiveEffect | undefined {
  return target.mir4Effects?.active.find(
    (effect) =>
      effect.effectId === HIT_REACTION_EFFECT_ID &&
      effect.kind === 'hit-react' &&
      effect.remaining > CAST_COMPLETE_EPS,
  );
}

export function mir4HitReacting(target: Entity): boolean {
  return activeHitReaction(target) !== undefined;
}

/** Refresh the one native crowd-type-1 timer without hard-CC DR or immunity tails. */
export function refreshMir4NativeHitReactionState(
  target: Entity,
  durationSeconds: number,
  sourceId: number,
): boolean {
  if (target.dead || mir4NativeControlImmune(target) || durationSeconds <= 0) return false;
  const bag = target.mir4Effects ?? { active: [], controlImmuneUntil: 0 };
  target.mir4Effects = bag;
  const existing = bag.active.find(
    (effect) => effect.effectId === HIT_REACTION_EFFECT_ID && effect.kind === 'hit-react',
  );
  if (existing) {
    existing.remaining = durationSeconds;
    existing.duration = durationSeconds;
    existing.sourceId = sourceId;
  } else {
    bag.active.push({
      effectId: HIT_REACTION_EFFECT_ID,
      kind: 'hit-react',
      remaining: durationSeconds,
      duration: durationSeconds,
      magnitude: 0,
      sourceId,
    });
  }
  return true;
}

/** Client mirror: apply only a reaction event addressed to this entity. */
export function mirrorMir4NativeHitReactionEvent(
  target: Entity,
  event: Extract<SimEvent, { type: 'mir4HitReaction' }>,
): boolean {
  if (
    event.targetId !== target.id ||
    (event.stance !== 'hit-01' && event.stance !== 'hit-02' && event.stance !== 'stun-01')
  ) {
    return false;
  }
  return refreshMir4NativeHitReactionState(target, event.durationMs / 1_000, event.sourceId);
}

/** Age the session-only client mirror without touching unrelated MIR4 effects. */
export function decayMir4NativeHitReactionState(target: Entity, elapsedSeconds: number): void {
  const bag = target.mir4Effects;
  if (!bag || elapsedSeconds <= 0) return;
  for (const effect of bag.active) {
    if (effect.effectId !== HIT_REACTION_EFFECT_ID || effect.kind !== 'hit-react') continue;
    effect.remaining -= elapsedSeconds;
  }
  bag.active = bag.active.filter(
    (effect) =>
      effect.effectId !== HIT_REACTION_EFFECT_ID ||
      effect.kind !== 'hit-react' ||
      effect.remaining > CAST_COMPLETE_EPS,
  );
  if (
    bag.active.length === 0 &&
    bag.controlImmuneUntil <= 0 &&
    (bag.hardControlHistory?.length ?? 0) === 0
  ) {
    target.mir4Effects = undefined;
  }
}

export function applyMir4NativeHitReaction(
  ctx: Pick<SimContext, 'emit'>,
  target: Entity,
  spec: {
    sourceId: number;
    skillId: number;
    attackId: number;
    durationMs: number;
    stance: 'hit-01';
  },
): boolean {
  if (!refreshMir4NativeHitReactionState(target, spec.durationMs / 1_000, spec.sourceId)) {
    return false;
  }
  ctx.emit({
    type: 'mir4HitReaction',
    sourceId: spec.sourceId,
    targetId: target.id,
    skillId: spec.skillId,
    attackId: spec.attackId,
    durationMs: spec.durationMs,
    stance: spec.stance,
  });
  return true;
}
