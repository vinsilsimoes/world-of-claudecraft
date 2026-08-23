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

import { isVeilboundMarchActive } from '../combat/paladin_veilbound_state';
import type { SimContext } from '../sim_context';
import type { Entity, Mir4ActiveEffect, Mir4EffectKind, Mir4TargetEffects } from '../types';
import { DT } from '../types';

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
    const until = ctx.time + spec.durationSeconds + MIR4_CONTROL_IMMUNITY_TAIL_SECONDS;
    bag.controlImmuneUntil = Math.max(bag.controlImmuneUntil, until);
    if (!bag.controlImmunityByEffectId) bag.controlImmunityByEffectId = {};
    bag.controlImmunityByEffectId[spec.effectId] = { sourceId: spec.sourceId, until };
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
      // Classic movement reads slow aura values as the remaining speed
      // multiplier, while MIR4 stores magnitude as the reduction fraction.
      value: 1 - (spec.magnitude ?? 0),
      sourceId: spec.sourceId,
      school: 'physical',
    });
  }
  return { ok: true };
}

/** Per-tick decay of every carried mir4 effect (one field check per entity). */
export function updateMir4Effects(ctx: SimContext): void {
  for (const e of ctx.entities.values()) {
    if (e.mir4Shield) {
      e.mir4Shield.remaining -= DT;
      if (e.mir4Shield.remaining <= 0) e.mir4Shield = undefined;
    }
    const bag = e.mir4Effects;
    if (!bag) continue;
    attributeLegacyActiveControlImmunity(bag, ctx.time);
    reconcileMir4ControlImmunity(bag, ctx.time);
    if (bag.active.length === 0) {
      if (bag.controlImmuneUntil <= ctx.time) e.mir4Effects = undefined;
      continue;
    }
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

function reconcileMir4ControlImmunity(bag: Mir4TargetEffects, now: number): void {
  const attributed = bag.controlImmunityByEffectId;
  if (!attributed) return;
  let latest = 0;
  for (const [effectId, immunity] of Object.entries(attributed)) {
    if (immunity.until <= now) {
      delete attributed[effectId];
      continue;
    }
    latest = Math.max(latest, immunity.until);
  }
  bag.controlImmuneUntil = latest;
  if (Object.keys(attributed).length === 0) bag.controlImmunityByEffectId = undefined;
}

function attributeLegacyActiveControlImmunity(bag: Mir4TargetEffects, now: number): void {
  if (bag.controlImmunityByEffectId !== undefined) return;
  const activeHardControl = bag.active.filter((effect) => HARD_CC.has(effect.kind));
  if (activeHardControl.length === 0) return;
  const authoritativeUntil = bag.controlImmuneUntil;
  bag.controlImmunityByEffectId = {};
  for (const effect of activeHardControl) {
    bag.controlImmunityByEffectId[effect.effectId] = {
      sourceId: effect.sourceId,
      until:
        authoritativeUntil > now
          ? authoritativeUntil
          : now + effect.remaining + MIR4_CONTROL_IMMUNITY_TAIL_SECONDS,
    };
  }
  reconcileMir4ControlImmunity(bag, now);
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
 * Replace the classic strongest-only interpretation of MIR4 slow mirrors with
 * the profile's multiplicative slow product, while retaining every unrelated
 * classic slow and speed modifier already folded into the shared multiplier.
 */
export function mir4MovementMultiplierFromShared(target: Entity, sharedMultiplier: number): number {
  if (
    isVeilboundMarchActive(target) ||
    target.auras.some((aura) => aura.kind === 'slow_immunity')
  ) {
    return sharedMultiplier;
  }
  const mir4Slows = (target.mir4Effects?.active ?? []).filter((effect) => effect.kind === 'slow');
  if (mir4Slows.length === 0) return sharedMultiplier;

  const mir4SlowIds = new Set(mir4Slows.map((effect) => effect.effectId));
  let strongestSharedSlow = 1;
  let strongestNonMir4Slow = 1;
  for (const aura of target.auras) {
    if (aura.kind !== 'slow') continue;
    strongestSharedSlow = Math.min(strongestSharedSlow, aura.value);
    if (!mir4SlowIds.has(aura.id)) {
      strongestNonMir4Slow = Math.min(strongestNonMir4Slow, aura.value);
    }
  }
  const mir4Product = mir4MovementMultiplier(target);
  return (
    sharedMultiplier *
    ((strongestNonMir4Slow * mir4Product) / Math.max(Number.EPSILON, strongestSharedSlow))
  );
}

/** Strip session combat effects attributed to one PvP controller. */
export function clearMir4EffectsFromController(
  ctx: SimContext,
  target: Entity | undefined,
  controllerPid: number,
  controlled: ReadonlySet<number> | undefined,
): void {
  const bag = target?.mir4Effects;
  if (!target || !bag) return;
  attributeLegacyActiveControlImmunity(bag, ctx.time);
  // A runtime-only bag from before source attribution may already be in its
  // tail-only phase. No source evidence survives there, so duel teardown
  // explicitly drops that ambiguous scalar rather than handing the loser back
  // blocked by control that the classic mirror has already removed.
  const clearUnattributedLegacyTail =
    bag.controlImmunityByEffectId === undefined && bag.controlImmuneUntil > ctx.time;
  const ownedByController = (sourceId: number): boolean => {
    const source = ctx.entities.get(sourceId);
    const byController = source
      ? ctx.pvpController(source)?.id === controllerPid
      : sourceId === controllerPid;
    return byController || controlled?.has(sourceId) === true;
  };
  const kept = bag.active.filter((effect) => {
    return !ownedByController(effect.sourceId);
  });
  const removedActive = kept.length !== bag.active.length;
  let removedImmunity = false;
  for (const [effectId, immunity] of Object.entries(bag.controlImmunityByEffectId ?? {})) {
    if (ownedByController(immunity.sourceId)) {
      if (bag.controlImmunityByEffectId) delete bag.controlImmunityByEffectId[effectId];
      removedImmunity = true;
    }
  }
  if (!removedActive && !removedImmunity && !clearUnattributedLegacyTail) return;
  if (clearUnattributedLegacyTail) bag.controlImmuneUntil = ctx.time;
  else reconcileMir4ControlImmunity(bag, ctx.time);
  if (kept.length === 0) {
    if (bag.controlImmuneUntil <= ctx.time) target.mir4Effects = undefined;
    else bag.active = kept;
    return;
  }
  bag.active = kept;
}

/**
 * A deterministic visible enemy collection around an AoE center. Both monsters and
 * hostile players are valid combat entities; NPCs/objects, friendlies, the
 * attacker, covered entities, and an optional primary are excluded before the
 * distance/id ordering so rejected rows consume no combat RNG.
 */
export function mir4AoEHostileTargets(
  ctx: SimContext,
  attacker: Entity,
  center: Entity,
  radiusYards: number,
  maxTargets: number,
  excludeId?: number,
): Entity[] {
  const found: { e: Entity; d: number }[] = [];
  const radiusSq = radiusYards * radiusYards;
  for (const e of ctx.entities.values()) {
    if (
      e.id === attacker.id ||
      e.id === excludeId ||
      (e.kind !== 'mob' && e.kind !== 'player') ||
      e.dead
    ) {
      continue;
    }
    const dx = e.pos.x - center.pos.x;
    const dz = e.pos.z - center.pos.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq > radiusSq) continue;
    if (!ctx.isHostileTo(attacker, e) || !ctx.hasLineOfSight(attacker, e)) continue;
    found.push({ e, d: Math.sqrt(distanceSq) });
  }
  found.sort((a, b) => (a.d === b.d ? a.e.id - b.e.id : a.d - b.d));
  return found.slice(0, maxTargets).map((f) => f.e);
}

/** Target-centered AoE fan-out, excluding the already-resolved primary. */
export function mir4AoESecondaryTargets(
  ctx: SimContext,
  attacker: Entity,
  primary: Entity,
  radiusYards: number,
  maxTargets: number,
): Entity[] {
  return mir4AoEHostileTargets(ctx, attacker, primary, radiusYards, maxTargets, primary.id);
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
