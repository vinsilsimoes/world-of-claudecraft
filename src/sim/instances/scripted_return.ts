// Pure lookup for engine-only dungeon claims entered from dynamic world
// anchors. Kept outside dungeons.ts so persistence and spirit release can read
// the return point without creating a dungeons <-> spirit runtime cycle.

import { DUNGEONS, instanceOrigin } from '../data';
import type { InstanceSlot } from '../sim';
import type { Vec3 } from '../types';

export interface ScriptedInstanceReturn {
  x: number;
  z: number;
  facing: number;
}

export function scriptedInstanceReturnAt(
  instances: readonly InstanceSlot[],
  pos: Vec3,
  pid: number,
): ScriptedInstanceReturn | null {
  for (const inst of instances) {
    const dungeon = DUNGEONS[inst.dungeonId];
    if (inst.partyKey === null || !dungeon?.internalOnly) continue;
    const destination = inst.scriptedReturnPositions.get(pid);
    if (!destination) continue;
    const origin = instanceOrigin(dungeon.index, inst.slot);
    if (Math.abs(pos.x - origin.x) < 120 && Math.abs(pos.z - origin.z) < 250) {
      return destination;
    }
  }
  return null;
}
