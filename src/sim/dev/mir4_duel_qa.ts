import { setMir4AutoBattleMode } from '../auto_battle/core';
import { markMir4WireDirty } from '../mir4/wire_revision';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import { duelAccept, duelFor, duelRequest } from '../social/duel';
import type { Entity, Mir4ClassKey } from '../types';

const DUEL_LEVEL = 250;
const DUEL_HALF_SEPARATION_YARDS = 7;
const DUEL_RESTART_DELAY_SECONDS = 2;

export interface Mir4DuelQaSetup {
  readonly warriorId: number;
  readonly elementalistId: number;
}

type AddPlayer = (cls: Mir4ClassKey, name: string, opts: { bot: true }) => number;
type SetPlayerLevel = (level: number, pid: number) => void;

function configureParticipant(
  ctx: SimContext,
  meta: PlayerMeta,
  opponentId: number,
  homeX: number,
  homeZ: number,
): void {
  meta.mir4DuelQa = { opponentId, homeX, homeZ };
  meta.mir4DisabledAutoSkills = [];
  const player = ctx.entities.get(meta.entityId);
  if (!player) return;
  player.devInfiniteResource = true;
  player.pos = ctx.groundPos(homeX, homeZ);
  player.prevPos = { ...player.pos };
  player.targetId = opponentId;
  ctx.rebucket(player);
  setMir4AutoBattleMode(ctx, player.id, 'battle');
  markMir4WireDirty(meta);
}

function resetParticipant(ctx: SimContext, meta: PlayerMeta): Entity | null {
  const state = meta.mir4DuelQa;
  const player = ctx.entities.get(meta.entityId);
  if (!state || !player) return null;
  ctx.cancelCast(player);
  meta.mir4SkillActivation = undefined;
  meta.mir4SkillActivationClaimedThroughTick = undefined;
  meta.mir4SkillAction = undefined;
  player.dead = false;
  player.ghost = false;
  player.hp = player.maxHp;
  player.resource = player.maxResource;
  player.mir4UltGauge = 100;
  player.mir4PendingImpacts = [];
  player.mir4Effects = undefined;
  player.cooldowns.clear();
  player.gcdRemaining = 0;
  player.autoAttack = false;
  player.targetId = state.opponentId;
  player.pos = ctx.groundPos(state.homeX, state.homeZ);
  player.prevPos = { ...player.pos };
  ctx.rebucket(player);
  setMir4AutoBattleMode(ctx, player.id, 'battle');
  markMir4WireDirty(meta);
  return player;
}

function startBout(ctx: SimContext, warriorId: number, elementalistId: number): void {
  const warriorMeta = ctx.players.get(warriorId);
  const elementalistMeta = ctx.players.get(elementalistId);
  if (!warriorMeta || !elementalistMeta) return;
  if (!resetParticipant(ctx, warriorMeta) || !resetParticipant(ctx, elementalistMeta)) return;
  const warriorState = warriorMeta.mir4DuelQa;
  const elementalistState = elementalistMeta.mir4DuelQa;
  if (!warriorState || !elementalistState) return;
  warriorState.restartAt = undefined;
  elementalistState.restartAt = undefined;
  markMir4WireDirty(warriorMeta);
  markMir4WireDirty(elementalistMeta);
  duelRequest(ctx, elementalistId, warriorId);
  duelAccept(ctx, elementalistId);
}

/** Builds the two real MIR4 combatants and arms their first duel. */
export function startMir4DuelQa(
  ctx: SimContext,
  warriorId: number,
  addPlayer: AddPlayer,
  setPlayerLevel: SetPlayerLevel,
): Mir4DuelQaSetup | null {
  if (!ctx.devCommands || ctx.gameProfile !== 'mir4-gameplay-port') return null;
  const warriorMeta = ctx.players.get(warriorId);
  const warrior = ctx.entities.get(warriorId);
  if (!warriorMeta || warrior?.mir4?.classId !== 1) return null;

  const elementalistId = addPlayer('elementalist', 'Elementalist Duel QA', { bot: true });
  const elementalistMeta = ctx.players.get(elementalistId);
  if (!elementalistMeta) return null;
  elementalistMeta.isDevBot = true;
  setPlayerLevel(DUEL_LEVEL, warriorId);
  setPlayerLevel(DUEL_LEVEL, elementalistId);
  configureParticipant(ctx, warriorMeta, elementalistId, -DUEL_HALF_SEPARATION_YARDS, 0);
  configureParticipant(ctx, elementalistMeta, warriorId, DUEL_HALF_SEPARATION_YARDS, 0);
  startBout(ctx, warriorId, elementalistId);
  return { warriorId, elementalistId };
}

/** Restarts completed bouts while leaving ordinary simulations byte-inert. */
export function updateMir4DuelQa(ctx: SimContext): void {
  for (const meta of ctx.players.values()) {
    const state = meta.mir4DuelQa;
    if (!state || meta.entityId > state.opponentId) continue;
    const opponentMeta = ctx.players.get(state.opponentId);
    if (!opponentMeta?.mir4DuelQa) continue;
    if (duelFor(ctx, meta.entityId)) continue;

    if (state.restartAt === undefined) {
      const restartAt = ctx.time + DUEL_RESTART_DELAY_SECONDS;
      state.restartAt = restartAt;
      opponentMeta.mir4DuelQa.restartAt = restartAt;
      markMir4WireDirty(meta);
      markMir4WireDirty(opponentMeta);
      continue;
    }
    if (ctx.time < state.restartAt) continue;
    startBout(ctx, meta.entityId, state.opponentId);
  }
}
