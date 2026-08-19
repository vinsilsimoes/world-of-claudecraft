// The mir4 effect/CC engine (phase 3.1): admission with effectId dedup and
// the source's 750ms post-expiry hard-control immunity, per-tick decay, and
// the multiplier read-outs the combat math consumes. Ported from the source
// project's mir4-crowd-control-policy-v1.js (CC_TYPES/HARD_CC_TYPES,
// evaluateCrowdControl's fail-closed order) and
// mir4-regional-skill-runtime-v1.js controlState (defense-break/burn raise
// damage taken, slow cuts movement, blind cuts the victim's attack output).
// Hard control ALSO mirrors into a classic 'stun' aura and slow into a
// classic 'slow' aura so the shared mob AI, render, and client react without
// knowing the profile; the mir4 bag stays the owner of the semantics.

import type { SimContext } from '../sim_context';
import type { Entity, Mir4ActiveEffect, Mir4EffectKind, Mir4TargetEffects } from '../types';
import { DT, dist2d } from '../types';

/** The source's CONTROL_IMMUNITY_TAIL: 750ms after a hard control expires. */
export const MIR4_CONTROL_IMMUNITY_TAIL_SECONDS = 0.75;

const HARD_CC: ReadonlySet<Mir4EffectKind> = new Set([
  'stun',
  'knockdown',
  'dazed',
  'root',
  'freeze',
]);

export type Mir4EffectAdmission =
  | { ok: true }
  | { ok: false; code: 'MIR4_CC_TARGET_INVALID' | 'MIR4_CC_ALREADY_ACTIVE' | 'MIR4_CC_IMMUNE' };

function bagOf(e: Entity): Mir4TargetEffects {
  if (!e.mir4Effects) e.mir4Effects = { active: [], controlImmuneUntil: 0 };
  return e.mir4Effects;
}

/** The source's evaluateCrowdControl order, as a pure predicate. */
export function mir4EffectAdmits(
  target: Entity,
  effectId: string,
  kind: Mir4EffectKind,
  now: number,
): Mir4EffectAdmission {
  if (target.dead) return { ok: false, code: 'MIR4_CC_TARGET_INVALID' };
  const bag = target.mir4Effects;
  if (bag?.active.some((f) => f.effectId === effectId && f.remaining > 0)) {
    return { ok: false, code: 'MIR4_CC_ALREADY_ACTIVE' };
  }
  if (HARD_CC.has(kind) && bag !== undefined && bag.controlImmuneUntil > now) {
    return { ok: false, code: 'MIR4_CC_IMMUNE' };
  }
  return { ok: true };
}

/**
 * Admit + land an effect: pushes the bag entry, arms the immunity tail for
 * hard control, and mirrors stun-like/slow effects into the classic aura
 * machinery (shared AI/render reactions). No-op returning the refusal code
 * when admission fails; never throws.
 */
export function applyMir4Effect(
  ctx: SimContext,
  target: Entity,
  spec: {
    effectId: string;
    kind: Mir4EffectKind;
    durationSeconds: number;
    magnitude?: number;
    name: string;
    sourceId: number;
  },
): Mir4EffectAdmission {
  if (spec.durationSeconds <= 0) return { ok: false, code: 'MIR4_CC_TARGET_INVALID' };
  const admission = mir4EffectAdmits(target, spec.effectId, spec.kind, ctx.time);
  if (!admission.ok) return admission;

  const bag = bagOf(target);
  const entry: Mir4ActiveEffect = {
    effectId: spec.effectId,
    kind: spec.kind,
    remaining: spec.durationSeconds,
    duration: spec.durationSeconds,
    magnitude: spec.magnitude ?? 0,
    sourceId: spec.sourceId,
  };
  bag.active.push(entry);
  if (HARD_CC.has(spec.kind)) {
    bag.controlImmuneUntil = Math.max(
      bag.controlImmuneUntil,
      ctx.time + spec.durationSeconds + MIR4_CONTROL_IMMUNITY_TAIL_SECONDS,
    );
  }

  // Classic mirror: hard control rides the shared stun aura (movement AND
  // attack frozen for the classic AI), slow rides the shared slow aura.
  if (HARD_CC.has(spec.kind) && !target.ccImmune) {
    ctx.applyAura(target, {
      id: spec.effectId,
      name: spec.name,
      kind: 'stun',
      remaining: spec.durationSeconds,
      duration: spec.durationSeconds,
      value: 0,
      sourceId: spec.sourceId,
      school: 'physical',
    });
  } else if (spec.kind === 'slow') {
    ctx.applyAura(target, {
      id: spec.effectId,
      name: spec.name,
      kind: 'slow',
      remaining: spec.durationSeconds,
      duration: spec.durationSeconds,
      value: spec.magnitude ?? 0,
      sourceId: spec.sourceId,
      school: 'physical',
    });
  }
  return { ok: true };
}

/** Per-tick decay of every carried mir4 effect (one field check per entity). */
export function updateMir4Effects(ctx: SimContext): void {
  for (const e of ctx.entities.values()) {
    const bag = e.mir4Effects;
    if (!bag || bag.active.length === 0) continue;
    let changed = false;
    for (const f of bag.active) f.remaining -= DT;
    const kept = bag.active.filter((f) => f.remaining > 0);
    if (kept.length !== bag.active.length) changed = true;
    bag.active = kept;
    if (changed && kept.length === 0 && bag.controlImmuneUntil <= ctx.time) {
      e.mir4Effects = undefined;
    }
  }
}

/** Sum of the damage-taken magnitudes (defense-break + burn), 0 when clean. */
export function mir4DamageTakenAddend(target: Entity): number {
  let sum = 0;
  for (const f of target.mir4Effects?.active ?? []) {
    if (f.kind === 'defense-break' || f.kind === 'burn') sum += f.magnitude;
  }
  return sum;
}

/** Hard-controlled (movement/attack frozen) right now. */
export function mir4HardControlled(target: Entity): boolean {
  for (const f of target.mir4Effects?.active ?? []) {
    if (HARD_CC.has(f.kind)) return true;
  }
  return false;
}

/** The victim's outgoing attack multiplier (blind); 1 when clean. */
export function mir4AttackMultiplier(target: Entity): number {
  let mult = 1;
  for (const f of target.mir4Effects?.active ?? []) {
    if (f.kind === 'blind') mult *= 1 - f.magnitude;
  }
  return mult;
}

/** Movement multiplier: hard control = 0, else the slow product. */
export function mir4MovementMultiplier(target: Entity): number {
  if (mir4HardControlled(target)) return 0;
  let mult = 1;
  for (const f of target.mir4Effects?.active ?? []) {
    if (f.kind === 'slow') mult *= 1 - f.magnitude;
  }
  return mult;
}

/**
 * The AoE secondary set: up to `maxTargets` OTHER living mobs within
 * `radiusYards` of the primary target, nearest first (stable by id), exactly
 * how the combat module consumes the execution contract's area profile.
 */
export function mir4AoESecondaryTargets(
  ctx: SimContext,
  primary: Entity,
  radiusYards: number,
  maxTargets: number,
): Entity[] {
  const found: { e: Entity; d: number }[] = [];
  for (const e of ctx.entities.values()) {
    if (e === primary || e.kind !== 'mob' || e.dead) continue;
    const d = dist2d(primary.pos, e.pos);
    if (d <= radiusYards) found.push({ e, d });
  }
  found.sort((a, b) => (a.d === b.d ? a.e.id - b.e.id : a.d - b.d));
  return found.slice(0, maxTargets).map((f) => f.e);
}

/**
 * The execution contract's secondary damage bps:
 * min(base, floor(base * softCap / count)) with the count clamped at the cap
 * by target selection, so in practice the full base lands on every secondary.
 */
export function mir4SecondaryBps(baseBps: number, softCap: number, count: number): number {
  if (count <= 0) return baseBps;
  return Math.min(baseBps, Math.floor((baseBps * softCap) / count));
}

/** Maps the source EFFECT_PROFILES effect strings to engine kinds. */
export function mir4EffectKindOf(effect: string): Mir4EffectKind | null {
  switch (effect) {
    case 'stun':
    case 'knockdown':
    case 'dazed':
    case 'root':
    case 'freeze':
    case 'slow':
    case 'blind':
    case 'defense-break':
    case 'burn':
      return effect;
    default:
      return null;
  }
}
