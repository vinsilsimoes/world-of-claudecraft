// MIR4 quest objects reuse WoC's existing non-spell gather-cast lane. The
// public cast fields drive the shipped cast bar, movement and incoming damage
// use the original cancellation rules, and this prefix keeps normal profession
// nodes isolated from campaign evidence.

import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { GATHER_CAST_ID } from '../types';

export const MIR4_QUEST_OBJECTIVE_CAST_ID = GATHER_CAST_ID;
export const MIR4_QUEST_OBJECTIVE_CAST_SECONDS = 5;
export const MIR4_QUEST_INTERACTION_CAST_SECONDS = 2;
export const MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX = 'mir4-quest-object:';
export const MIR4_ENERGY_CAST_NODE_PREFIX = 'mir4-energy-site:';

const MIR4_FRAGILE_COLLECTION_STAGE_KINDS = new Set([
  'collect-quest-wallet',
  'gather-resource-patches',
  'inspect-clues',
  'track-signs',
]);

export function mir4QuestObjectiveCastSeconds(stageKind: string): number {
  return MIR4_FRAGILE_COLLECTION_STAGE_KINDS.has(stageKind)
    ? MIR4_QUEST_OBJECTIVE_CAST_SECONDS
    : MIR4_QUEST_INTERACTION_CAST_SECONDS;
}

export function mir4QuestObjectiveCastNodeId(entityId: number): string {
  return `${MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX}${entityId}`;
}

export function mir4QuestObjectiveEntityIdFromCast(nodeId: string): number | null {
  if (!nodeId.startsWith(MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX)) return null;
  const value = Number(nodeId.slice(MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX.length));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function entityIdFromPrefixedCast(nodeId: string, prefix: string): number | null {
  if (!nodeId.startsWith(prefix)) return null;
  const value = Number(nodeId.slice(prefix.length));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function mir4EnergySiteEntityIdFromCast(nodeId: string): number | null {
  return entityIdFromPrefixedCast(nodeId, MIR4_ENERGY_CAST_NODE_PREFIX);
}

export function mir4FragileGatherEntityIdFromCast(nodeId: string): number | null {
  return mir4QuestObjectiveEntityIdFromCast(nodeId) ?? mir4EnergySiteEntityIdFromCast(nodeId);
}

/** Starts one fragile MIR4 world interaction on WoC's existing gather lane. */
export function startMir4FragileGatherCast(
  ctx: SimContext,
  player: Entity,
  castSeconds: number,
  castNodeId: string,
): void {
  ctx.breakStealth(player);
  if (player.sitting) ctx.standUp(player);
  if (player.mountKey !== '') ctx.forceDismount(player);
  if (player.mountCastKey !== '') {
    player.mountCastRemaining = 0;
    player.mountCastKey = '';
  }
  player.castingAbility = MIR4_QUEST_OBJECTIVE_CAST_ID;
  player.castTotal = castSeconds;
  player.castRemaining = castSeconds;
  player.castTargetId = null;
  player.channeling = false;
  player.gatherCastNodeId = castNodeId;
  player.gatherCastToolRarity = '';
  player.gatherCastEffectConfirmed = false;
  player.queuedCastAbility = null;
  player.queuedCastAim = null;
  ctx.emit({
    type: 'castStart',
    entityId: player.id,
    ability: MIR4_QUEST_OBJECTIVE_CAST_ID,
    time: castSeconds,
  });
}

/** A deliberate combat command takes control away from Auto Mission in the
 * same command tick. Energy meditation follows the same rule while ordinary
 * profession gathering remains untouched. */
export function cancelMir4QuestObjectiveCastForCombat(ctx: SimContext, player: Entity): boolean {
  if (
    player.castingAbility !== MIR4_QUEST_OBJECTIVE_CAST_ID ||
    mir4FragileGatherEntityIdFromCast(player.gatherCastNodeId) === null
  ) {
    return false;
  }
  ctx.cancelCast(player);
  return true;
}
