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

import { advanceMir4AutomationRoute, type Mir4AutomationRouteState } from '../auto_quest/route';
import { castMir4Skill, mir4BasicAttack, mir4Ultimate, mir4UsePotion } from '../mir4/combat';
import { markMir4WireDirty } from '../mir4/wire_revision';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { DT, dist2d } from '../types';
import { mir4AutomationActionBlocked, mir4AutomationRunSpeed } from './admission';
import { mir4AutoBattleActionRange, pickMir4AutoBattleSkill } from './rotation';
import {
  blockMir4AutoBattleTarget,
  type Mir4AutoBattleTargetMemory,
  mir4AutoBattleTargetBlocked,
  observeMir4AutoBattlePursuit,
  pruneMir4AutoBattleTargetBlocks,
} from './target_memory';

/**
 * Default target-acquisition radius from the activation ANCHOR (source:
 * anchor, not the player's moving position). The hunt must stay local: killing
 * one target cannot move the search center and pull the player across a camp.
 * A future UI setting can tune the radius through the state field below.
 */
export const MIR4_AUTO_BATTLE_ACQUIRE_YARDS = 30;
/** How close to the anchor the bot must stand before it stops walking home. */
export const MIR4_AUTO_BATTLE_ANCHOR_TOLERANCE_YARDS = 2;
/** Source passive MP regen (fraction of max pool per second). */
export const MIR4_MP_REGEN_COMBAT = 0.0025;
export const MIR4_MP_REGEN_REST = 0.005;

export interface Mir4AutoBattleState extends Mir4AutoBattleTargetMemory {
  mode: 'off' | 'battle';
  anchorX: number;
  anchorZ: number;
  acquireRadiusYards: number;
  /** Manual intervention pauses the bot; it resumes (re-anchored) when the player's hands leave the keys. */
  suspended: boolean;
  /** Session-only collision-aware route. Persistence projects only authoritative settings. */
  route?: Mir4AutomationRouteState;
}

export function setMir4AutoBattleMode(
  ctx: SimContext,
  pid: number,
  mode: 'off' | 'battle',
  acquireRadiusYards = MIR4_AUTO_BATTLE_ACQUIRE_YARDS,
  source: 'player' | 'journey' = 'player',
): void {
  const meta = ctx.players.get(pid);
  const p = ctx.entities.get(pid);
  if (!meta || !p) return;
  p.autoAttack = mode === 'battle';
  if (mode === 'battle') {
    if (source === 'player' && meta.mir4AutoQuest?.battleOwned) {
      // An explicit off -> on is a player takeover. Journey must not switch
      // that manually re-enabled battle off when its combat stage ends.
      meta.mir4AutoQuest.battleOwned = false;
    }
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

function livingHostileMobAt(
  ctx: SimContext,
  attacker: Entity,
  id: number | null | undefined,
): Entity | null {
  if (id === null || id === undefined) return null;
  const e = ctx.entities.get(id);
  return e && e.kind === 'mob' && !e.dead && ctx.isHostileTo(attacker, e) ? e : null;
}

function faceTowards(p: Entity, x: number, z: number): void {
  p.facing = Math.atan2(x - p.pos.x, z - p.pos.z);
}

function acquireTarget(
  ctx: SimContext,
  p: Entity,
  st: Mir4AutoBattleState,
  anchorX = st.anchorX,
  anchorZ = st.anchorZ,
): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const e of ctx.entities.values()) {
    if (e.kind !== 'mob' || e.dead || !ctx.isHostileTo(p, e)) continue;
    if (mir4AutoBattleTargetBlocked(st, e.id, ctx.time)) continue;
    const d = dist2d({ x: anchorX, y: 0, z: anchorZ } as Entity['pos'], e.pos);
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
    pruneMir4AutoBattleTargetBlocks(st, ctx.time);
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
      st.route = undefined;
      st.pursuit = undefined;
      st.blockedUntilByTargetId = undefined;
      markMir4WireDirty(meta);
    }

    // Every hard-control representation is a total Auto Battle lockout. The
    // classic predicates cover stun, root and incapacitate; the MIR4 bag also
    // protects cc-immune entities that deliberately have no classic mirror.
    if (mir4AutomationActionBlocked(ctx, p)) continue;

    // Auto Journey owns locomotion while it is active. Its moving position is
    // also the battle acquisition anchor, so combat can clear mobs encountered
    // along the route without the old fixed grind anchor pulling the player
    // back after every journey step.
    const journeyActive = meta.mir4AutoQuest !== undefined && !meta.mir4AutoQuest.suspended;
    const effectiveAnchorX = journeyActive ? p.pos.x : st.anchorX;
    const effectiveAnchorZ = journeyActive ? p.pos.z : st.anchorZ;
    let target = livingHostileMobAt(ctx, p, p.targetId);
    if (
      target &&
      (mir4AutoBattleTargetBlocked(st, target.id, ctx.time) ||
        dist2d({ x: effectiveAnchorX, y: 0, z: effectiveAnchorZ } as Entity['pos'], target.pos) >
          st.acquireRadiusYards)
    ) {
      target = null; // outside the anchor: drop it, exactly like the source
    }
    if (!target) {
      target = acquireTarget(ctx, p, st, effectiveAnchorX, effectiveAnchorZ);
      p.targetId = target ? target.id : null;
    }

    if (!target) {
      if (journeyActive) continue;
      st.pursuit = undefined;
      // No prey: walk home and stand guard. moveToward (the shared mob/pet
      // movement entry) instead of meta.moveInput: the browser client
      // overwrites moveInput from the keyboard every frame, which would
      // clobber an input-driven pursuit between ticks.
      const home = dist2d(p.pos, { x: st.anchorX, y: p.pos.y, z: st.anchorZ } as Entity['pos']);
      if (home > MIR4_AUTO_BATTLE_ANCHOR_TOLERANCE_YARDS) {
        moveAutoBattleToward(ctx, p, st, { x: st.anchorX, z: st.anchorZ });
      } else {
        st.route = undefined;
      }
      continue;
    }

    // Auto-potion (source defaults): HP first at <=50%, then MP at <=35%.
    // It is valid while closing distance, so survival never waits for melee.
    if (p.hp / p.maxHp <= 0.5) {
      if (mir4UsePotion(ctx, p.id, 'hp')) continue;
    } else if (p.maxResource > 0 && p.resource / p.maxResource <= 0.35) {
      if (mir4UsePotion(ctx, p.id, 'mp')) continue;
    }

    const area = {
      anchorX: effectiveAnchorX,
      anchorZ: effectiveAnchorZ,
      acquireRadiusYards: st.acquireRadiusYards,
    };
    const pick = pickMir4AutoBattleSkill(ctx, p, target, area);
    if (pick?.selfUtility) {
      const result = castMir4Skill(ctx, p.id, pick.skillId, target.id);
      if (result.ok) continue;
    }

    const rangeYards = mir4AutoBattleActionRange(p, pick);
    const ultimateReady = (p.mir4UltGauge ?? 0) >= 100 && !p.cooldowns.has('mir4_ult');
    const needsTargetLineOfSight = ultimateReady || pick?.actorCentered !== true;
    const actorCenteredReady = pick?.actorCentered === true && !ultimateReady;
    const needsPursuit =
      !actorCenteredReady &&
      (dist2d(p.pos, target.pos) > rangeYards ||
        (needsTargetLineOfSight && !ctx.hasLineOfSight(p, target)));
    if (needsPursuit) {
      // Auto Journey is the sole locomotion owner while active. Auto Battle
      // may attack an enemy already in range, but it must never add a second
      // moveToward step or pull the journey away from its authored route.
      if (journeyActive) continue;
      const observed = observeMir4AutoBattlePursuit(st.pursuit, target.id, p.pos);
      st.pursuit = observed.pursuit;
      if (observed.stalled) {
        blockMir4AutoBattleTarget(st, target.id, ctx.time);
        st.route = undefined;
        p.targetId = null;
        continue;
      }
      moveAutoBattleToward(ctx, p, st, target.pos);
      continue;
    }
    st.route = undefined;
    st.pursuit = undefined;
    faceTowards(p, target.pos.x, target.pos.z);

    // The ultimate first when the gauge is full (the source's selection
    // order), then the rotation cascade, else the basic filler.
    if ((p.mir4UltGauge ?? 0) >= 100) {
      const result = mir4Ultimate(ctx, p.id, target.id);
      if (result.ok) continue;
    }
    if (pick && !pick.selfUtility) {
      const result = castMir4Skill(ctx, p.id, pick.skillId, target.id);
      if (result.ok) continue;
    }
    mir4BasicAttack(ctx, p.id, target.id);
  }
}

function moveAutoBattleToward(
  ctx: SimContext,
  p: Entity,
  st: Mir4AutoBattleState,
  destination: { x: number; z: number },
): void {
  const next = advanceMir4AutomationRoute(
    ctx.cfg.seed,
    p.pos,
    destination,
    st.route,
    ctx.riftCollisionToken,
  );
  st.route = next.route;
  ctx.moveToward(
    p,
    { x: next.waypoint.x, y: p.pos.y, z: next.waypoint.z },
    mir4AutomationRunSpeed(ctx, p),
  );
}
