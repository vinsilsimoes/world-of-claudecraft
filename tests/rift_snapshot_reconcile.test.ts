import { describe, expect, it } from 'vitest';
import { riftPresentationClearFromSelfSnapshot } from '../src/net/rift_snapshot_reconcile';
import { RIFT_BAND_X_MIN, RIFT_X_MIN } from '../src/sim/data';
import type { RiftFloorView } from '../src/world_api';
import { bareClient } from './helpers/bare_client';

const ACTIVE_FLOOR: RiftFloorView = {
  eventId: 'rift-event',
  instanceId: 41,
  seed: 8128,
  baseLevel: 30,
  floorIndex: 1,
  floorCount: 4,
  origin: { x: RIFT_X_MIN, z: -1250 },
  contentId: 'rift-content',
  contentHash: 'rift-hash',
  upgrade: null,
  name: 'Test Rift',
  themeName: 'Test Theme',
  tier: 'A',
};

function selfWire(id: number, x: number) {
  return {
    id,
    k: 'player',
    tid: 'warrior',
    nm: 'Snapshot Runner',
    lv: 30,
    x,
    y: 0,
    z: 0,
    f: 0,
    hp: 100,
    mhp: 100,
  };
}

describe('authoritative self snapshot Rift reconciliation', () => {
  it('produces one complete presentation clear only for an active floor outside the Rift band', () => {
    expect(riftPresentationClearFromSelfSnapshot(RIFT_X_MIN, ACTIVE_FLOOR)).toBeNull();
    expect(riftPresentationClearFromSelfSnapshot(RIFT_BAND_X_MIN - 1, null)).toBeNull();
    expect(riftPresentationClearFromSelfSnapshot(RIFT_BAND_X_MIN - 1, ACTIVE_FLOOR)).toEqual({
      riftFloor: null,
      riftEventExpiresAtMs: null,
      activeBossDeathZones: [],
    });
  });

  it('clears a stale floor, event timer, and death zones after the server places self outside', () => {
    const playerId = 71;
    const client = bareClient(playerId, {
      riftFloor: ACTIVE_FLOOR,
      riftEventExpiresAtMs: Date.now() + 30_000,
      activeBossDeathZones: [
        {
          x: RIFT_X_MIN,
          z: -1250,
          radius: 8,
          expiresAtMs: performance.now() + 5_000,
          totalSecs: 5,
        },
      ],
    });

    (client as unknown as { applySnapshot(snapshot: unknown): void }).applySnapshot({
      t: 'snap',
      ents: [],
      self: selfWire(playerId, RIFT_BAND_X_MIN - 1),
    });

    expect(client.riftFloor).toBeNull();
    expect(client.riftEventMsRemaining()).toBeNull();
    expect(client.riftBossDeathZones()).toEqual([]);
  });
});
