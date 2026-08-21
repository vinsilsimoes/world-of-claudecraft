// The mir4 auto battle core (Phase 2 slice tail): server-sim-side automation
// that owns target acquisition, pursuit, the rotation tail (a ready kit skill,
// else the basic filler), and anchor return, per the source project's
// admission model (the sim decides; the client only toggles). Locomotion uses
// the shared moveToward entry (mob/pet path) so the client's per-frame
// moveInput writes can never clobber the pursuit, and every
// offensive action reuses castMir4Skill/mir4BasicAttack's own gates (mp,
// cooldown, GCD, range, target life), so automation can never bypass an
// admission rule. Draws rng only through those casts. Classic profiles never
// run this system (the tick phase is profile-gated in sim.ts).

import { mir4SkillsForClass } from '../content/mir4';
import { castMir4Skill, mir4BasicAttack, mir4Ultimate, mir4UsePotion } from '../mir4/combat';
import { mir4HardControlled } from '../mir4/effects';
import { mir4SkillManaCost } from '../mir4/math';
import { markMir4WireDirty } from '../mir4/wire_revision';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { DT, dist2d, RUN_SPEED } from '../types';

/**
 * Default target-acquisition radius from the ANCHOR (source: anchor, not
 * player). Tripled from the source's 12yd per product direction; a future UI
 * setting lets each player tune their own radius on the state field below.
 */
export const MIR4_AUTO_BATTLE_ACQUIRE_YARDS = 36;
/** How close to the anchor the bot must stand before it stops walking home. */
export const MIR4_AUTO_BATTLE_ANCHOR_TOLERANCE_YARDS = 2;
/** Source passive MP regen (fraction of max pool per second). */
export const MIR4_MP_REGEN_COMBAT = 0.0025;
export const MIR4_MP_REGEN_REST = 0.005;

export interface Mir4AutoBattleState {
  mode: 'off' | 'battle';
  anchorX: number;
  anchorZ: number;
  acquireRadiusYards: number;
  /** Manual intervention pauses the bot; it resumes (re-anchored) when the player's hands leave the keys. */
  suspended: boolean;
}

export function setMir4AutoBattleMode(
  ctx: SimContext,
  pid: number,
  mode: 'off' | 'battle',
  acquireRadiusYards = MIR4_AUTO_BATTLE_ACQUIRE_YARDS,
): void {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return;
  p.autoAttack = mode === 'battle';
  if (mode === 'battle') {
    meta.autoBattle = {
      mode,
      anchorX: p.pos.x,
      anchorZ: p.pos.z,
      acquireRadiusYards,
      suspended: false,
    };
    markMir4WireDirty(meta);
  } else if (meta.autoBattle) {
    if (meta.autoBattle.mode === 'off') return;
    meta.autoBattle.mode = 'off';
    markMir4WireDirty(meta);
  }
}

function livingMobAt(ctx: SimContext, id: number | null | undefined): Entity | null {
  if (id === null || id === undefined) return null;
  const e = ctx.entities.get(id);
  return e && e.kind === 'mob' && !e.dead ? e : null;
}

function faceTowards(p: Entity, x: number, z: number): void {
  p.facing = Math.atan2(x - p.pos.x, z - p.pos.z);
}

function acquireTarget(ctx: SimContext, p: Entity, st: Mir4AutoBattleState): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const e of ctx.entities.values()) {
    if (e.kind !== 'mob' || e.dead) continue;
    const d = dist2d({ x: st.anchorX, y: 0, z: st.anchorZ } as Entity['pos'], e.pos);
    const fromPlayer = dist2d(p.pos, e.pos);
    if (d > st.acquireRadiusYards || fromPlayer >= bestD) continue;
    best = e;
    bestD = fromPlayer;
  }
  return best;
}

/**
 * MP upkeep at the source project's passive-regeneration rates
 * (mir4-passive-regeneration-v1): 0.25%/s in combat, 0.50%/s resting, of the
 * max pool. Runs for every living mana player under the mir4 profile.
 */
export function updateMir4ResourceRegen(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const p = ctx.entities.get(meta.entityId);
    if (!p || p.dead || p.resourceType !== 'mana') continue;
    const rate = p.inCombat ? MIR4_MP_REGEN_COMBAT : MIR4_MP_REGEN_REST;
    p.resource = Math.min(p.maxResource, p.resource + rate * DT * p.maxResource);
  }
}

/** The per-tick phase: one decision per automated player, in roster order. */
export function updateMir4AutoBattle(ctx: SimContext): void {
  updateMir4ResourceRegen(ctx);
  for (const meta of ctx.players.values()) {
    const st = meta.autoBattle;
    if (st?.mode !== 'battle') continue;
    const p = ctx.entities.get(meta.entityId);
    if (!p || p.dead) continue;

    // Manual override: any player-driven movement input suspends the bot (the
    // player is steering). The moment the hands leave the keys it RESUMES,
    // re-anchored where the player stands. Bot locomotion uses moveToward,
    // never moveInput, so only a human hand sets these flags.
    const inp = meta.moveInput;
    if (
      inp.forward ||
      inp.back ||
      inp.strafeLeft ||
      inp.strafeRight ||
      inp.turnLeft ||
      inp.turnRight
    ) {
      if (!st.suspended) {
        st.suspended = true;
        markMir4WireDirty(meta);
      }
      continue;
    }
    if (st.suspended) {
      st.suspended = false;
      st.anchorX = p.pos.x;
      st.anchorZ = p.pos.z;
      markMir4WireDirty(meta);
    }

    let target = livingMobAt(ctx, p.targetId);
    if (
      target &&
      dist2d({ x: st.anchorX, y: 0, z: st.anchorZ } as Entity['pos'], target.pos) >
        st.acquireRadiusYards
    ) {
      target = null; // outside the anchor: drop it, exactly like the source
    }
    if (!target) {
      target = acquireTarget(ctx, p, st);
      p.targetId = target ? target.id : null;
    }

    if (!target) {
      // No prey: walk home and stand guard. moveToward (the shared mob/pet
      // movement entry) instead of meta.moveInput: the browser client
      // overwrites moveInput from the keyboard every frame, which would
      // clobber an input-driven pursuit between ticks.
      const home = dist2d(p.pos, { x: st.anchorX, y: p.pos.y, z: st.anchorZ } as Entity['pos']);
      if (home > MIR4_AUTO_BATTLE_ANCHOR_TOLERANCE_YARDS) {
        ctx.moveToward(p, { x: st.anchorX, y: p.pos.y, z: st.anchorZ }, RUN_SPEED);
      }
      continue;
    }

    const rangeYards = 4; // warrior band; per-class bands arrive with Phase 3 kits
    if (dist2d(p.pos, target.pos) > rangeYards) {
      ctx.moveToward(p, target.pos, RUN_SPEED);
      continue;
    }
    faceTowards(p, target.pos.x, target.pos.z);

    // Auto-potion (source defaults): HP first at <=50%, then MP at <=35%.
    if (p.hp / p.maxHp <= 0.5) {
      if (mir4UsePotion(ctx, p.id, 'hp')) continue;
    } else if (p.maxResource > 0 && p.resource / p.maxResource <= 0.35) {
      if (mir4UsePotion(ctx, p.id, 'mp')) continue;
    }

    // The ultimate first when the gauge is full (the source's selection
    // order), then the rotation cascade, else the basic filler.
    if ((p.mir4UltGauge ?? 0) >= 100) {
      mir4Ultimate(ctx, p.id, target.id);
    }
    const pick = pickRotationSkill(ctx, p, target, st);
    if (pick) {
      const result = castMir4Skill(ctx, p.id, pick.skillId, target.id);
      if (result.ok || result.reason === 'on-gcd') {
        if (result.ok) continue; // cast committed; basic filler not needed
      }
    }
    mir4BasicAttack(ctx, p.id, target.id);
  }
}

/**
 * The source's rotation cascade (mir4-auto-hunt-rotation-v1):
 * survival-utility (HP<=45%) -> aoe (nearby >= max(3, minTargets)) -> debuff
 * (effect still missing on the target) -> execution (target HP <= threshold)
 * -> single-target. Warrior adds the client's setup/payoff ordering: against
 * a hard-controlled target the payoff skills come first.
 */
function pickRotationSkill(
  ctx: SimContext,
  p: Entity,
  target: Entity,
  st: Mir4AutoBattleState,
): { skillId: number } | null {
  const kit = mir4SkillsForClass((p.mir4?.classId ?? 1) as 1 | 2 | 3 | 4 | 5).filter(
    (s) => s.requiresTarget && (s.unlock.kind !== 'level' || p.level >= s.unlock.level),
  );
  const hpPercent = (p.hp / p.maxHp) * 100;
  const targetHpPercent = (target.hp / target.maxHp) * 100;
  let nearby = 0;
  for (const e of ctx.entities.values()) {
    if (e.kind !== 'mob' || e.dead) continue;
    if (
      dist2d({ x: st.anchorX, y: 0, z: st.anchorZ } as Entity['pos'], e.pos) <=
      st.acquireRadiusYards
    ) {
      nearby++;
    }
  }
  const controlled = mir4HardControlled(target);
  const order = orderKit(kit, p.mir4?.classId ?? 1, controlled);

  const wants = (roles: readonly string[], role: string) => roles.includes(role);
  for (const phase of [
    'survival-utility',
    'aoe',
    'debuff',
    'execution',
    'single-target',
  ] as const) {
    for (const skill of order) {
      // Availability admission (the source checks it per candidate): a skill
      // on cooldown or short of MP is never recommended, or the cascade would
      // stall on its top pick forever.
      if (p.cooldowns.has(String(skill.skillId))) continue;
      const cost = mir4SkillManaCost(
        p.mir4?.manaCostStat ?? 0,
        skill.skillCost,
        skill.skillCostType,
      );
      if (p.resource < cost) continue;
      const roles = skill.roles;
      if (phase === 'survival-utility' && !(wants(roles, phase) && hpPercent <= 45)) continue;
      if (phase === 'aoe' && !(wants(roles, phase) && nearby >= Math.max(3, skill.minTargets ?? 3)))
        continue;
      if (phase === 'debuff' && !(wants(roles, phase) && (skill.effect?.effect ?? '') !== ''))
        continue;
      if (phase === 'execution' && !(wants(roles, phase) && targetHpPercent <= 30)) {
        continue;
      }
      if (phase === 'single-target' && !wants(roles, phase)) continue;
      // CC admission: a skill whose effect is already active on the target
      // is skipped (the engine would refuse it anyway).
      const effectName = skill.effect?.effect;
      if (
        effectName &&
        target.mir4Effects?.active.some((f) => f.effectId === `mir4_${skill.skillId}_${effectName}`)
      ) {
        continue;
      }
      return { skillId: skill.skillId };
    }
  }
  return null;
}

/** Warrior setup/payoff flip; every other class keeps catalog order. */
function orderKit<T extends { skillId: number }>(
  kit: readonly T[],
  classId: number,
  targetControlled: boolean,
): T[] {
  if (classId !== 1) return [...kit];
  const rank = targetControlled
    ? { 1104: 0, 1401: 1, 1102: 2, 1304: 3 } // payoff: burst the controlled target
    : { 1102: 0, 1304: 1, 1104: 2, 1401: 3 }; // setup: control first
  return [...kit].sort(
    (a, b) =>
      (rank[a.skillId as 1102 | 1104 | 1304 | 1401] ?? 9) -
      (rank[b.skillId as 1102 | 1104 | 1304 | 1401] ?? 9),
  );
}
