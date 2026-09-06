import { isRiftPos, RIFT_REGION_HALF_X, RIFT_REGION_HALF_Z, riftInstanceOrigin } from '../data';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import { generateRiftFloor, riftLiftAt } from './rift_gen';
import type { RiftFloorPlan, RiftInstance } from './types';

interface ActiveRiftPosition {
  instance: RiftInstance;
  floor: RiftFloorPlan;
  origin: { x: number; z: number };
}

function activeRiftAt(ctx: SimContext, x: number, z: number): ActiveRiftPosition | null {
  if (!isRiftPos(x)) return null;
  for (const instance of ctx.riftInstances) {
    if (instance.partyKey === null) continue;
    const origin = riftInstanceOrigin(instance.slot, instance.floorIndex);
    if (
      Math.abs(x - origin.x) > RIFT_REGION_HALF_X ||
      Math.abs(z - origin.z) > RIFT_REGION_HALF_Z
    ) {
      continue;
    }
    return {
      instance,
      floor: generateRiftFloor(
        instance.seed,
        instance.baseLevel,
        instance.floorIndex,
        instance.upgrade,
      ),
      origin,
    };
  }
  return null;
}

/** Raised-tier lift at one authoritative player position. Kept outside
 * runs.ts so movement consumers can query the pure height field without
 * importing the Rift lifecycle (which itself owns MIR4 displacement hooks). */
export function riftPlayerLiftAt(ctx: SimContext, x: number, z: number): number {
  const active = activeRiftAt(ctx, x, z);
  return active ? riftLiftAt(active.floor, x - active.origin.x, z - active.origin.z) : 0;
}

/** Apply the same closed-portcullis rule as the Rift trigger phase. The gate
 * is runtime state rather than a static collider, so authored skill motion
 * must consult it explicitly instead of slipping through after that phase. */
export function constrainRiftPlayerPosition(
  ctx: SimContext,
  x: number,
  z: number,
): { x: number; z: number } {
  const active = activeRiftAt(ctx, x, z);
  const gate = active?.floor.gate;
  if (!active || !gate || active.instance.gateOpen) return { x, z };
  const localX = x - active.origin.x;
  const localZ = z - active.origin.z;
  const southFace = gate.z - gate.hd - PLAYER_BODY_RADIUS;
  if (Math.abs(localX - gate.x) >= gate.hw || localZ <= southFace) return { x, z };
  return { x, z: active.origin.z + southFace - 0.05 };
}
