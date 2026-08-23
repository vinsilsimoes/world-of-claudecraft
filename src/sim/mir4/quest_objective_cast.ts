// MIR4 quest objects reuse WoC's existing non-spell gather-cast lane. The
// public cast fields drive the shipped cast bar, movement and incoming damage
// use the original cancellation rules, and this prefix keeps normal profession
// nodes isolated from campaign evidence.

import { GATHER_CAST_ID } from '../types';

export const MIR4_QUEST_OBJECTIVE_CAST_ID = GATHER_CAST_ID;
export const MIR4_QUEST_OBJECTIVE_CAST_SECONDS = 5;
export const MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX = 'mir4-quest-object:';

export function mir4QuestObjectiveCastNodeId(entityId: number): string {
  return `${MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX}${entityId}`;
}

export function mir4QuestObjectiveEntityIdFromCast(nodeId: string): number | null {
  if (!nodeId.startsWith(MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX)) return null;
  const value = Number(nodeId.slice(MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX.length));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
