import { describe, expect, it } from 'vitest';
import { newDungeonInstanceSlot } from '../src/sim/instances/slot';

describe('newDungeonInstanceSlot', () => {
  it('creates independent empty session collections for each slot', () => {
    const first = newDungeonInstanceSlot('campaign_trial_room', 0);
    const second = newDungeonInstanceSlot('campaign_trial_room', 1);

    first.enteredBy.add(7);
    first.scriptedReturnPositions.set(7, { x: 4, z: 9, facing: 1 });

    expect(first).toMatchObject({ dungeonId: 'campaign_trial_room', slot: 0, partyKey: null });
    expect(second).toMatchObject({ dungeonId: 'campaign_trial_room', slot: 1, partyKey: null });
    expect(second.enteredBy.size).toBe(0);
    expect(second.scriptedReturnPositions.size).toBe(0);
  });
});
