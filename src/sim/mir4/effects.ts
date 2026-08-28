// The mir4 effect/CC engine (phase 3.1): admission with effectId dedup and
// the source's 750ms post-expiry hard-control immunity, per-tick decay, and
// the multiplier read-outs the combat math consumes. Ported from the source
// project's mir4-crowd-control-policy-v1.js (CC_TYPES/HARD_CC_TYPES,
// evaluateCrowdControl's fail-closed order) and
// mir4-regional-skill-runtime-v1.js controlState (defense-break lowers defense,
// slow/root cut movement, blind cuts the victim's attack output).
// Hard control ALSO mirrors into a classic 'stun' aura and slow into a
// classic 'slow' aura so the shared mob AI, render, and client react without
// knowing the profile; the mir4 bag stays the owner of the semantics.

import { isVeilboundMarchActive } from '../combat/paladin_veilbound_state';
import type { SimContext } from '../sim_context';
import type { Aura, Entity, Mir4ActiveEffect, Mir4EffectKind, Mir4TargetEffects } from '../types';
import { CAST_COMPLETE_EPS, DT } from '../types';

/** The source's CONTROL_IMMUNITY_TAIL: 750ms after a hard control expires. */
export const MIR4_CONTROL_IMMUNITY_TAIL_SECONDS = 0.75;
/** A hard-control application inside this window lands at reduced duration. */
export const MIR4_HARD_CONTROL_REAPPLY_WINDOW_SECONDS = 6;
/** Repeated hard control retains 70% of its authored duration. */
export const MIR4_HARD_CONTROL_REAPPLY_MULTIPLIER = 0.7;
/** Rolling window used to detect excessive hard-control uptime. */
export const MIR4_HARD_CONTROL_BUDGET_WINDOW_SECONDS = 8;
/** Applied hard-control duration that triggers the extended immunity tail. */
export const MIR4_HARD_CONTROL_BUDGET_SECONDS = 3;
/** Immunity after the rolling hard-control budget is exhausted. */
export const MIR4_HARD_CONTROL_BUDGET_IMMUNITY_SECONDS = 2.5;
/** Burn ticks once per second and never critically strikes. */
export const MIR4_BURN_TICK_SECONDS = 1;

const HARD_CC: ReadonlySet<Mir4EffectKind> = new Set(['stun', 'knockdown', 'dazed', 'freeze']);
const CC_IMMUNE_EFFECTS: ReadonlySet<Mir4EffectKind> = new Set([...HARD_CC, 'root']);

export type Mir4EffectAdmission =
  | { ok: true }
  | { ok: false; code: 'MIR4_CC_TARGET_INVALID' | 'MIR4_CC_ALREADY_ACTIVE' | 'MIR4_CC_IMMUNE' };

function bagOf(e: Entity): Mir4TargetEffects {
  if (!e.mir4Effects) e.mir4Effects = { active: [], controlImmuneUntil: 0 };
  return e.mir4Effects;
}

/** Authored burn magnitude is the fraction of the source's current Spell Power per tick. */
export function mir4BurnDamagePerTick(source: Entity, magnitude: number): number {
  return Math.max(1, Math.floor(Math.max(0, source.spellPower) * Math.max(0, magnitude)));
}

function pruneHardControlHistory(bag: Mir4TargetEffects, now: number): void {
  if (!bag.hardControlHistory) return;
  bag.hardControlHistory = bag.hardControlHistory.filter(
    (entry) => now - entry.appliedAt < MIR4_HARD_CONTROL_BUDGET_WINDOW_SECONDS,
  );
  if (bag.hardControlHistory.length === 0) bag.hardControlHistory = undefined;
}

function canDiscardBag(bag: Mir4TargetEffects, now: number): boolean {
  return (
    bag.active.length === 0 &&
    bag.controlImmuneUntil <= now &&
    (bag.hardControlHistory?.length ?? 0) === 0
  );
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
  if (bag?.active.some((f) => f.effectId === effectId && f.remaining > CAST_COMPLETE_EPS)) {
    return { ok: false, code: 'MIR4_CC_ALREADY_ACTIVE' };
  }
  if (target.ccImmune && CC_IMMUNE_EFFECTS.has(kind)) {
    return { ok: false, code: 'MIR4_CC_IMMUNE' };
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

  let durationSeconds = spec.durationSeconds;
  let hardControlTailSeconds = MIR4_CONTROL_IMMUNITY_TAIL_SECONDS;
  if (HARD_CC.has(spec.kind)) {
    const recentHardControl = target.mir4Effects?.hardControlHistory?.some(
      (entry) => ctx.time - entry.appliedAt < MIR4_HARD_CONTROL_REAPPLY_WINDOW_SECONDS,
    );
    if (recentHardControl) {
      durationSeconds *= MIR4_HARD_CONTROL_REAPPLY_MULTIPLIER;
    }
  }

  // Ask the shared runtime to admit the mirror before mutating the MIR4 bag.
  // This single gate includes template/entity immunity, slow immunity, Ice
  // Block/stasis, Veilbound March and encounter-specific control rules.
  let classicMirror: Aura | undefined;
  if (HARD_CC.has(spec.kind)) {
    classicMirror = {
      id: spec.effectId,
      name: spec.name,
      kind: 'stun',
      remaining: durationSeconds,
      duration: durationSeconds,
      value: 0,
      sourceId: spec.sourceId,
      school: 'physical',
    };
  } else if (spec.kind === 'root' || spec.kind === 'slow' || spec.kind === 'silence') {
    classicMirror = {
      id: spec.effectId,
      name: spec.name,
      kind: spec.kind,
      remaining: durationSeconds,
      duration: durationSeconds,
      value: spec.kind === 'slow' ? 1 - (spec.magnitude ?? 0) : 0,
      sourceId: spec.sourceId,
      school: spec.kind === 'silence' ? 'shadow' : 'physical',
    };
  }
  if (classicMirror) {
    let admitted: boolean;
    if (ctx.tryApplyAura) {
      admitted = ctx.tryApplyAura(target, classicMirror);
    } else {
      ctx.applyAura(target, classicMirror);
      admitted = target.auras.includes(classicMirror);
    }
    if (!admitted) return { ok: false, code: 'MIR4_CC_IMMUNE' };
  }

  const bag = bagOf(target);
  pruneHardControlHistory(bag, ctx.time);
  if (HARD_CC.has(spec.kind)) {
    if (!bag.hardControlHistory) bag.hardControlHistory = [];
    bag.hardControlHistory.push({
      effectId: spec.effectId,
      sourceId: spec.sourceId,
      appliedAt: ctx.time,
      duration: durationSeconds,
    });
    const rollingDuration = bag.hardControlHistory.reduce(
      (total, entry) => total + entry.duration,
      0,
    );
    if (rollingDuration >= MIR4_HARD_CONTROL_BUDGET_SECONDS) {
      hardControlTailSeconds = MIR4_HARD_CONTROL_BUDGET_IMMUNITY_SECONDS;
    }
  }
  const entry: Mir4ActiveEffect = {
    effectId: spec.effectId,
    kind: spec.kind,
    remaining: durationSeconds,
    duration: durationSeconds,
    magnitude: spec.magnitude ?? 0,
    sourceId: spec.sourceId,
  };
  bag.active.push(entry);
  if (HARD_CC.has(spec.kind)) {
    const until = ctx.time + durationSeconds + hardControlTailSeconds;
    bag.controlImmuneUntil = Math.max(bag.controlImmuneUntil, until);
    if (!bag.controlImmunityByEffectId) bag.controlImmunityByEffectId = {};
    bag.controlImmunityByEffectId[spec.effectId] = { sourceId: spec.sourceId, until };
  }

  if (spec.kind === 'burn') {
    const source = ctx.entities.get(spec.sourceId);
    const ticks = Math.floor(durationSeconds / MIR4_BURN_TICK_SECONDS);
    if (source && ticks > 0) {
      // Snapshot the authored Spell Power coefficient, but resolve every tick
      // through MIR4 combat at contact time so defense, reductions,
      // penetration and contextual PvP rules remain authoritative.
      entry.tickRemaining = MIR4_BURN_TICK_SECONDS;
      entry.ticksRemaining = ticks;
      entry.periodicRawDamage = mir4BurnDamagePerTick(source, spec.magnitude ?? 0);
      entry.name = spec.name;
      entry.channel = 'magic';
    }
  }
  return { ok: true };
}

/** Per-tick decay of every carried mir4 effect (one field check per entity). */
export function updateMir4Effects(ctx: SimContext): void {
  for (const e of ctx.entities.values()) {
    if (e.dead) {
      e.mir4Shield = undefined;
      e.mir4Effects = undefined;
      continue;
    }
    if (e.mir4Shield) {
      e.mir4Shield.remaining -= DT;
      if (e.mir4Shield.remaining <= 0) e.mir4Shield = undefined;
    }
    const bag = e.mir4Effects;
    if (!bag) continue;
    pruneHardControlHistory(bag, ctx.time);
    attributeLegacyActiveControlImmunity(bag, ctx.time);
    reconcileMir4ControlImmunity(bag, ctx.time);
    if (bag.active.length === 0) {
      if (canDiscardBag(bag, ctx.time)) e.mir4Effects = undefined;
      continue;
    }
    let changed = false;
    for (const f of bag.active) {
      f.remaining -= DT;
      if (
        f.kind !== 'burn' ||
        f.tickRemaining === undefined ||
        f.ticksRemaining === undefined ||
        f.periodicRawDamage === undefined
      ) {
        continue;
      }
      f.tickRemaining -= DT;
      while (f.tickRemaining <= 1e-9 && f.ticksRemaining > 0) {
        const source = ctx.entities.get(f.sourceId);
        if (source && !source.dead) {
          if (!source.mir4PendingImpacts) source.mir4PendingImpacts = [];
          source.mir4PendingImpacts.push({
            dueAt: ctx.time,
            sourceId: source.id,
            targetId: e.id,
            rawDamage: f.periodicRawDamage,
            channel: f.channel ?? 'magic',
            attackKind: 'skill',
            name: f.name ?? 'Burn',
            gaugeGain: 0,
            spiritProcEligible: false,
            forceHit: true,
            forceCritical: false,
            periodic: true,
          });
        }
        f.ticksRemaining -= 1;
        f.tickRemaining += MIR4_BURN_TICK_SECONDS;
      }
    }
    const kept = bag.active.filter((f) => f.remaining > CAST_COMPLETE_EPS);
    if (kept.length !== bag.active.length) changed = true;
    bag.active = kept;
    if (changed && canDiscardBag(bag, ctx.time)) {
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

/** Compatibility read-out. Aeldrune has no generic damage-taken addend yet. */
export function mir4DamageTakenAddend(target: Entity): number {
  void target;
  return 0;
}

/** Defense Break reduces actual Physical and Magic Defense, never all damage taken. */
export function mir4DefenseMultiplier(target: Entity): number {
  let multiplier = 1;
  for (const effect of target.mir4Effects?.active ?? []) {
    if (effect.remaining <= CAST_COMPLETE_EPS) continue;
    if (effect.kind === 'defense-break') multiplier *= 1 - effect.magnitude;
  }
  return Math.max(0.2, Math.min(1, multiplier));
}

/** Hard-controlled (movement/attack frozen) right now. */
export function mir4HardControlled(target: Entity): boolean {
  for (const f of target.mir4Effects?.active ?? []) {
    if (f.remaining <= CAST_COMPLETE_EPS) continue;
    if (HARD_CC.has(f.kind)) return true;
  }
  return false;
}

/** Root prevents displacement but does not block attacks or MIR4 abilities. */
export function mir4Rooted(target: Entity): boolean {
  return (target.mir4Effects?.active ?? []).some(
    (effect) => effect.kind === 'root' && effect.remaining > CAST_COMPLETE_EPS,
  );
}

/** Silence blocks MIR4 skills and ultimates while preserving basic attacks. */
export function mir4Silenced(target: Entity): boolean {
  return (
    (target.mir4Effects?.active ?? []).some(
      (effect) => effect.kind === 'silence' && effect.remaining > CAST_COMPLETE_EPS,
    ) || target.auras.some((aura) => aura.kind === 'silence')
  );
}

/** The victim's outgoing attack multiplier (blind); 1 when clean. */
export function mir4AttackMultiplier(target: Entity): number {
  let mult = 1;
  for (const f of target.mir4Effects?.active ?? []) {
    if (f.remaining <= CAST_COMPLETE_EPS) continue;
    if (f.kind === 'blind') mult *= 1 - f.magnitude;
  }
  return mult;
}

/** Movement multiplier: hard control = 0, else the slow product. */
export function mir4MovementMultiplier(target: Entity): number {
  if (mir4HardControlled(target) || mir4Rooted(target)) return 0;
  let mult = 1;
  for (const f of target.mir4Effects?.active ?? []) {
    if (f.remaining <= CAST_COMPLETE_EPS) continue;
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
  if (mir4HardControlled(target) || mir4Rooted(target)) return 0;
  if (
    isVeilboundMarchActive(target) ||
    target.auras.some((aura) => aura.kind === 'slow_immunity')
  ) {
    return sharedMultiplier;
  }
  const mir4Slows = (target.mir4Effects?.active ?? []).filter(
    (effect) => effect.kind === 'slow' && effect.remaining > CAST_COMPLETE_EPS,
  );
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
  const keptHistory = (bag.hardControlHistory ?? []).filter(
    (entry) => !ownedByController(entry.sourceId),
  );
  const removedHistory = keptHistory.length !== (bag.hardControlHistory?.length ?? 0);
  let removedImmunity = false;
  for (const [effectId, immunity] of Object.entries(bag.controlImmunityByEffectId ?? {})) {
    if (ownedByController(immunity.sourceId)) {
      if (bag.controlImmunityByEffectId) delete bag.controlImmunityByEffectId[effectId];
      removedImmunity = true;
    }
  }
  if (!removedActive && !removedHistory && !removedImmunity && !clearUnattributedLegacyTail) return;
  bag.hardControlHistory = keptHistory.length > 0 ? keptHistory : undefined;
  if (clearUnattributedLegacyTail) bag.controlImmuneUntil = ctx.time;
  else reconcileMir4ControlImmunity(bag, ctx.time);
  if (kept.length === 0) {
    if (canDiscardBag(bag, ctx.time)) target.mir4Effects = undefined;
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
    case 'silence':
    case 'blind':
    case 'defense-break':
    case 'burn':
      return effect;
    default:
      return null;
  }
}
