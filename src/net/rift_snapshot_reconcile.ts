import { isRiftPos } from '../sim/data';

export interface RiftPresentationClear {
  riftFloor: null;
  riftEventExpiresAtMs: null;
  activeBossDeathZones: [];
}

/**
 * Reconcile event-built Rift presentation against the authoritative self pose.
 * A missed exit event must not leave the map, timer, or boss telegraphs attached
 * after the server has already moved the player back to the ordinary world.
 */
export function riftPresentationClearFromSelfSnapshot(
  authoritativeSelfX: number,
  activeRiftFloor: object | null,
): RiftPresentationClear | null {
  if (activeRiftFloor === null || isRiftPos(authoritativeSelfX)) return null;
  return {
    riftFloor: null,
    riftEventExpiresAtMs: null,
    activeBossDeathZones: [],
  };
}
