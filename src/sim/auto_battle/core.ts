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
import { castMir4Skill, mir4BasicAttack } from '../mir4/combat';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { dist2d, RUN_SPEED } from '../types';

/**
 * Default target-acquisition radius from the ANCHOR (source: anchor, not
 * player). Tripled from the source's 12yd per product direction; a future UI
 * setting lets each player tune their own radius on the state field below.
 */
export const MIR4_AUTO_BATTLE_ACQUIRE_YARDS = 36;
/** How close to the anchor the bot must stand before it stops walking home. */
export const MIR4_AUTO_BATTLE_ANCHOR_TOLERANCE_YARDS = 2;

export interface Mir4AutoBattleState {
  mode: 'off' | 'battle';
  anchorX: number;
  anchorZ: number;
  acquireRadiusYards: number;
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
  if (mode === 'battle') {
    meta.autoBattle = {
      mode,
      anchorX: p.pos.x,
      anchorZ: p.pos.z,
      acquireRadiusYards,
    };
  } else if (meta.autoBattle) {
    meta.autoBattle.mode = 'off';
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

/** The per-tick phase: one decision per automated player, in roster order. */
export function updateMir4AutoBattle(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const st = meta.autoBattle;
    if (!st || st.mode !== 'battle') continue;
    const p = ctx.entities.get(meta.entityId);
    if (!p || p.dead) continue;

    // Manual override: any player-driven movement input takes control back and
    // switches the automation off (the source project's manual-input rule for
    // its journeys). Bot locomotion uses moveToward, never moveInput, so only
    // a human hand sets these flags.
    const inp = meta.moveInput;
    if (
      inp.forward ||
      inp.back ||
      inp.strafeLeft ||
      inp.strafeRight ||
      inp.turnLeft ||
      inp.turnRight
    ) {
      st.mode = 'off';
      continue;
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

    // Rotation tail: first ready kit skill, else the basic filler. The cast
    // functions re-validate every admission rule themselves.
    const kit = mir4SkillsForClass((p.mir4?.classId ?? 1) as 1 | 2 | 3 | 4 | 5);
    for (const skill of kit) {
      if (skill.unlock.kind === 'level' && p.level < skill.unlock.level) continue;
      if (!skill.requiresTarget) continue;
      const result = castMir4Skill(ctx, p.id, skill.skillId, target.id);
      if (result.ok || result.reason === 'on-gcd') break;
    }
    mir4BasicAttack(ctx, p.id, target.id);
  }
}
