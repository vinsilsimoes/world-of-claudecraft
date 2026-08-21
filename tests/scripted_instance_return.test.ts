import { describe, expect, it } from 'vitest';
import { DUNGEONS, instanceOrigin } from '../src/sim/data';
import { scriptedInstanceReturnAt } from '../src/sim/instances/scripted_return';
import { newDungeonInstanceSlot } from '../src/sim/instances/slot';

describe('scriptedInstanceReturnAt', () => {
  it('resolves only the owning player inside an internal room claim', () => {
    const inst = newDungeonInstanceSlot('campaign_trial_room', 3);
    inst.partyKey = 'mir4-campaign:7:M04-Q05:5';
    inst.scriptedReturnPositions.set(7, { x: 12, z: 645, facing: 1.25 });
    const origin = instanceOrigin(DUNGEONS.campaign_trial_room.index, inst.slot);
    const inside = { x: origin.x, y: 0, z: origin.z + 48 };

    expect(scriptedInstanceReturnAt([inst], inside, 7)).toEqual({
      x: 12,
      z: 645,
      facing: 1.25,
    });
    expect(scriptedInstanceReturnAt([inst], inside, 8)).toBeNull();
    expect(scriptedInstanceReturnAt([inst], { ...inside, z: origin.z + 251 }, 7)).toBeNull();
  });

  it('does not turn an ordinary dungeon claim into a dynamic return path', () => {
    const inst = newDungeonInstanceSlot('hollow_crypt', 0);
    inst.partyKey = 'solo:7';
    inst.scriptedReturnPositions.set(7, { x: 12, z: 645, facing: 0 });
    const origin = instanceOrigin(DUNGEONS.hollow_crypt.index, inst.slot);

    expect(scriptedInstanceReturnAt([inst], { x: origin.x, y: 0, z: origin.z }, 7)).toBeNull();
  });
});
