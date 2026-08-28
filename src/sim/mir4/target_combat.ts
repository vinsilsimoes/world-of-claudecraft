// MIR4 focused target combat: the ordinary Attack command pursues and repeats
// the class basic attack against exactly the entity selected when it was
// armed. It never acquires a replacement. Auto Battle remains an independent
// player tool and may resume its own acquisition only after this focused state
// ends.

import { mir4AutomationActionBlocked, mir4AutomationRunSpeed } from '../auto_battle/admission';
import { mir4AutoBattleActionRange, pickMir4AutoBattleSkill } from '../auto_battle/rotation';
import {
  type Mir4AutoBattlePursuitMemory,
  observeMir4AutoBattlePursuit,
} from '../auto_battle/target_memory';
import { advanceMir4AutomationRoute, type Mir4AutomationRouteState } from '../auto_quest/route';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import type { Entity, MoveInput } from '../types';
import { dist2d } from '../types';
import { drawWeapon } from '../weapon_stow';
import { castMir4Skill, mir4BasicAttack } from './combat';

export interface Mir4TargetCombatState {
  /** Immutable identity captured when Attack was pressed. */
  targetId: number;
  /** The feature that armed this contract. Auto Mission releases only its own
   * focus; player attacks and defensive retaliation remain independent. */
  owner: 'player' | 'journey' | 'retaliation';
  route?: Mir4AutomationRouteState;
  pursuit?: Mir4AutoBattlePursuitMemory;
}

function hasManualMovement(input: MoveInput): boolean {
  return (
    input.forward ||
    input.back ||
    input.strafeLeft ||
    input.strafeRight ||
    input.turnLeft ||
    input.turnRight ||
    input.jump ||
    input.dive ||
    input.surface
  );
}

function livingSelectedHostile(ctx: SimContext, player: Entity, targetId: number): Entity | null {
  const target = ctx.entities.get(targetId);
  return target && !target.dead && ctx.isHostileTo(player, target) ? target : null;
}

function clearMir4TargetCombat(ctx: SimContext, player: Entity): void {
  const meta = ctx.players.get(player.id);
  player.autoAttack = false;
  if (meta) meta.mir4TargetCombat = undefined;
}

/** Arms ordinary combat for the current selection without touching Auto Battle. */
export function startMir4TargetCombat(
  ctx: SimContext,
  pid: number,
  owner: Mir4TargetCombatState['owner'] = 'player',
): boolean {
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead || mir4AutomationActionBlocked(ctx, player)) return false;

  const selectedId = player.targetId;
  const selected = selectedId !== null ? ctx.entities.get(selectedId) : null;
  // A target killed by the action that also tried to arm Attack is a silent
  // no-op. Missing and friendly selections remain useful player errors.
  if (selected?.dead) return false;
  if (selectedId === null || !selected || !ctx.isHostileTo(player, selected)) {
    ctx.error(player.id, 'Invalid attack target.');
    return false;
  }

  if (player.mountKey !== '') ctx.forceDismount(player);
  if (player.sitting) ctx.standUp(player);
  if (player.weaponStowed) drawWeapon(player);
  player.autoAttack = true;
  meta.mir4TargetCombat = { targetId: selectedId, owner };
  meta.lastActiveTick = ctx.tickCount;
  return true;
}

/**
 * Arms MIR4's defensive response against the hostile entity that landed the
 * attack. This is focused target combat, not Auto Battle: it never enables the
 * tool and therefore cannot acquire a second enemy after the aggressor dies.
 * An explicit focused fight already in progress keeps player intent priority.
 */
export function retaliateMir4TargetCombat(
  ctx: SimContext,
  pid: number,
  attackerId: number,
): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  const attacker = ctx.entities.get(attackerId);
  const attackerController = attacker ? ctx.pvpController(attacker) : null;
  const admittedPlayerAggressor =
    !!attackerController &&
    player?.openWorldPvpAggressorId === attackerController.id &&
    (player.openWorldPvpAggressionUntil ?? Number.NEGATIVE_INFINITY) >= ctx.time;
  if (
    !meta ||
    !player ||
    player.dead ||
    player.hp <= 0 ||
    !attacker ||
    attacker.dead ||
    attacker.id === player.id ||
    (!admittedPlayerAggressor && !ctx.isHostileTo(player, attacker))
  ) {
    return false;
  }

  const focused = meta.mir4TargetCombat;
  if (focused) {
    const focusedTarget = livingSelectedHostile(ctx, player, focused.targetId);
    if (player.autoAttack && player.targetId === focused.targetId && focusedTarget) {
      return focused.targetId === attackerId;
    }
    clearMir4TargetCombat(ctx, player);
  }

  if (player.mountKey !== '') ctx.forceDismount(player);
  if (player.sitting) ctx.standUp(player);
  if (player.weaponStowed) drawWeapon(player);
  player.targetId = attackerId;
  player.autoAttack = true;
  meta.mir4TargetCombat = { targetId: attackerId, owner: 'retaliation' };
  return true;
}

/** Gives explicit player input priority without interrupting focused combat
 * that the player or Auto Mission deliberately started. */
export function cancelMir4AutoRetaliation(ctx: SimContext, pid: number): void {
  stopMir4TargetCombat(ctx, pid, 'retaliation');
}

/** Stops ordinary target combat without changing the Auto Battle tool. */
export function stopMir4TargetCombat(
  ctx: SimContext,
  pid: number,
  owner?: Mir4TargetCombatState['owner'],
): void {
  const player = ctx.entities.get(pid);
  if (!player) return;
  const state = ctx.players.get(pid)?.mir4TargetCombat;
  if (owner !== undefined && state?.owner !== owner) return;
  clearMir4TargetCombat(ctx, player);
}

/** One deterministic target-combat decision per armed player. */
export function updateMir4TargetCombat(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const state = meta.mir4TargetCombat;
    if (!state) continue;
    const player = ctx.entities.get(meta.entityId);
    if (!player?.autoAttack) {
      meta.mir4TargetCombat = undefined;
      continue;
    }
    if (
      state.owner === 'retaliation' &&
      (player.openWorldPvpDefenseRights?.get(state.targetId) ?? Number.NEGATIVE_INFINITY) < ctx.time
    ) {
      clearMir4TargetCombat(ctx, player);
      continue;
    }

    // Selection changes, death and hostility changes all terminate this one
    // target contract. None of them can roll combat onto another entity.
    const target = livingSelectedHostile(ctx, player, state.targetId);
    if (player.dead || player.targetId !== state.targetId || !target) {
      clearMir4TargetCombat(ctx, player);
      continue;
    }
    if (state.owner === 'retaliation' && hasManualMovement(meta.moveInput)) {
      clearMir4TargetCombat(ctx, player);
      continue;
    }
    if (mir4AutomationActionBlocked(ctx, player)) continue;

    const area = {
      anchorX: player.pos.x,
      anchorZ: player.pos.z,
      acquireRadiusYards: 30,
    };
    const pick = pickMir4AutoBattleSkill(ctx, player, target, area, meta.mir4DisabledAutoSkills);
    if (pick?.selfUtility) {
      const result = castMir4Skill(ctx, player.id, pick.skillId, target.id);
      if (result.ok) continue;
    }

    const distance = dist2d(player.pos, target.pos);
    // Focused combat mirrors the 2D skill deck but never spends the separate
    // Ultimate control automatically. The false override prevents a full gauge
    // from widening pursuit as though an Ultimate were queued.
    const range = mir4AutoBattleActionRange(player, pick, false);
    const actorCentered = pick?.actorCentered === true;
    const inRange = actorCentered || distance <= range;
    if (inRange && (actorCentered || ctx.hasLineOfSight(player, target))) {
      state.route = undefined;
      state.pursuit = undefined;
      player.facing = Math.atan2(target.pos.x - player.pos.x, target.pos.z - player.pos.z);
      if (pick) {
        const result = castMir4Skill(ctx, player.id, pick.skillId, target.id);
        if (result.ok) continue;
      }
      mir4BasicAttack(ctx, player.id, target.id);
      continue;
    }

    // For player-started and Auto Mission focus, hands on the movement controls
    // own locomotion. Those deliberate attacks stay armed and resume their
    // focused pursuit when the player releases the controls. Defensive
    // retaliation is cleared earlier instead of reaching this branch.
    if (hasManualMovement(meta.moveInput)) continue;

    // Root does not cancel a valid single-target contract. It only pauses
    // pursuit, and therefore must not age stall/route memory while speed is 0.
    const runSpeed = mir4AutomationRunSpeed(ctx, player);
    if (runSpeed <= 0) continue;

    const observed = observeMir4AutoBattlePursuit(state.pursuit, target.id, player.pos, distance);
    state.pursuit = observed.pursuit;
    if (observed.stalled) {
      clearMir4TargetCombat(ctx, player);
      continue;
    }

    const next = advanceMir4AutomationRoute(
      ctx.cfg.seed,
      player.pos,
      target.pos,
      state.route,
      ctx.riftCollisionToken,
    );
    state.route = next.route;
    ctx.moveToward(player, { x: next.waypoint.x, y: player.pos.y, z: next.waypoint.z }, runSpeed);
  }
}
