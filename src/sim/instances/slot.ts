import type { InstanceSlot } from '../sim';

/** Fresh, unclaimed native dungeon slot. All session-owned collections get
 *  unique identities so claims can mutate independently. */
export function newDungeonInstanceSlot(dungeonId: string, slot: number): InstanceSlot {
  return {
    dungeonId,
    difficulty: 'normal',
    slot,
    partyKey: null,
    mobIds: [],
    objectIds: [],
    exitId: null,
    bossExitId: null,
    emptyFor: 0,
    resetAvailableAt: 0,
    clearedBy: new Set(),
    enteredBy: new Set(),
    scriptedReturnPositions: new Map(),
    combatExitMemory: new Map(),
  };
}
