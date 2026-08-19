// The mir4 auto battle core (Phase 2 slice tail): server-sim-side automation
// that owns target acquisition, pursuit, the rotation tail (a ready kit skill,
// else the basic filler), and anchor return, per the source project's
// admission model (the sim decides; the client only toggles). Locomotion rides
// the shared player motion kernel through meta.moveInput + facing, and every
// offensive action reuses castMir4Skill/mir4BasicAttack's own gates (mp,
// cooldown, GCD, range, target life), so automation can never bypass an
// admission rule. Draws rng only through those casts. Classic profiles never
// run this system (the tick phase is profile-gated in sim.ts).

import { mir4SkillsForClass } from '../content/mir4';
import { castMir4Skill, mir4BasicAttack } from '../mir4/combat';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { dist2d } from '../types';

/** Target acquisition radius from the ANCHOR (source: anchor, not player). */
export const MIR4_AUTO_BATTLE_ACQUIRE_YARDS = 12;
/** How close to the anchor the bot must stand before it stops walking home. */
export const MIR4_AUTO_BATTLE_ANCHOR_TOLERANCE_YARDS = 2;

export interface Mir4AutoBattleState {
  mode: 'off' | 'battle';
  anchorX: number;
  anchorZ: number;
}

export function setMir4AutoBattleMode(ctx: SimContext, pid: number, mode: 'off' | 'battle'): void {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return;
  if (mode === 'battle') {
    meta.autoBattle = { mode, anchorX: p.pos.x, anchorZ: p.pos.z };
  } else if (meta.autoBattle) {
    meta.autoBattle.mode = 'off';
    meta.moveInput.forward = false;
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
    if (d > MIR4_AUTO_BATTLE_ACQUIRE_YARDS || fromPlayer >= bestD) continue;
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

    let target = livingMobAt(ctx, p.targetId);
    if (
      target &&
      dist2d({ x: st.anchorX, y: 0, z: st.anchorZ } as Entity['pos'], target.pos) >
        MIR4_AUTO_BATTLE_ACQUIRE_YARDS
    ) {
      target = null; // outside the anchor: drop it, exactly like the source
    }
    if (!target) {
      target = acquireTarget(ctx, p, st);
      p.targetId = target ? target.id : null;
    }

    if (!target) {
      // No prey: walk home and stand guard.
      const home = dist2d(p.pos, { x: st.anchorX, y: 0, z: st.anchorZ } as Entity['pos']);
      if (home > MIR4_AUTO_BATTLE_ANCHOR_TOLERANCE_YARDS) {
        faceTowards(p, st.anchorX, st.anchorZ);
        meta.moveInput.forward = true;
      } else {
        meta.moveInput.forward = false;
      }
      continue;
    }

    const rangeYards = 4; // warrior band; per-class bands arrive with Phase 3 kits
    if (dist2d(p.pos, target.pos) > rangeYards) {
      faceTowards(p, target.pos.x, target.pos.z);
      meta.moveInput.forward = true;
      continue;
    }
    meta.moveInput.forward = false;
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
