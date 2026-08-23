import { describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../src/sim/content/mir4/arc_world';
import { DELVE_LIST, PORTALS, zoneContaining } from '../src/sim/data';
import { mir4ArcPortalsForWorld } from '../src/sim/mir4/travel';
import { buildMir4WocComparisonWorld } from '../src/sim/mir4/woc_comparison_world';
import { LIVE_MAP_ENTITY_DISCLOSURE_RADIUS } from '../src/ui/map_entity_disclosure_core';
import {
  isNearbyLiveRiftZoneMapEntity,
  STABLE_MAP_NAVIGATION_LANDMARKS,
  stableMapNavigationLandmarks,
} from '../src/ui/map_navigation_landmarks_core';

describe('stable map navigation landmarks', () => {
  it('projects both sides of every MIR4 arc portal without classic landmarks', () => {
    const mir4 = stableMapNavigationLandmarks('mir4-gameplay-port');
    expect(mir4).toHaveLength(38);
    expect(mir4.every((site) => site.kind === 'world-passage')).toBe(true);
    expect(mir4[0]).toMatchObject({
      zoneId: 'mir4_m01-vila-do-vau',
      destinationZoneId: 'mir4_m02-trilha-dos-juncos',
      side: 'a',
    });
    expect(mir4[1]).toMatchObject({
      zoneId: 'mir4_m02-trilha-dos-juncos',
      destinationZoneId: 'mir4_m01-vila-do-vau',
      side: 'b',
    });
  });

  it('hides passages whose destination map has not passed admission', () => {
    const admitted = stableMapNavigationLandmarks('mir4-gameplay-port', buildMir4ArcWorld(2));
    expect(admitted).toHaveLength(2);
    expect(admitted.map((landmark) => landmark.zoneId)).toEqual([
      'mir4_m01-vila-do-vau',
      'mir4_m02-trilha-dos-juncos',
    ]);
    expect(
      admitted.some(
        (landmark) =>
          landmark.kind === 'world-passage' && landmark.destinationZoneId.includes('m03-'),
      ),
    ).toBe(false);
  });

  it('publishes projected portal triggers under their WoC zone identities', () => {
    const world = buildMir4WocComparisonWorld(4);
    const portals = mir4ArcPortalsForWorld(world);
    const landmarks = stableMapNavigationLandmarks('mir4-gameplay-port', world);

    expect(landmarks).toHaveLength(portals.length * 2);
    expect(landmarks[0]).toMatchObject({
      zoneId: 'thornpeak_heights',
      destinationZoneId: 'veiled_hollow',
      x: portals[0]?.a.x,
      z: portals[0]?.a.z,
    });
    expect(landmarks[1]).toMatchObject({
      zoneId: 'veiled_hollow',
      destinationZoneId: 'thornpeak_heights',
      x: portals[0]?.b.x,
      z: portals[0]?.b.z,
    });
  });

  it('publishes every authored delve door with its exact zone identity', () => {
    const landmarks = STABLE_MAP_NAVIGATION_LANDMARKS.filter(
      (landmark) => landmark.kind === 'delve-entrance',
    );

    expect(landmarks).toHaveLength(DELVE_LIST.length);
    for (const delve of DELVE_LIST) {
      const zone = zoneContaining(delve.doorPos.x, delve.doorPos.z);
      expect(zone, `delve ${delve.id} door must be in a shipped overworld zone`).not.toBeNull();
      expect(landmarks).toContainEqual({
        kind: 'delve-entrance',
        id: delve.id,
        zoneId: zone?.id,
        x: delve.doorPos.x,
        z: delve.doorPos.z,
      });
    }
  });

  it('publishes both ends of every authored passage with the opposite zone as destination', () => {
    const landmarks = STABLE_MAP_NAVIGATION_LANDMARKS.filter(
      (landmark) => landmark.kind === 'world-passage',
    );

    expect(landmarks).toHaveLength(PORTALS.length * 2);
    for (const portal of PORTALS) {
      const aZone = zoneContaining(portal.a.x, portal.a.z);
      const bZone = zoneContaining(portal.b.x, portal.b.z);
      expect(
        aZone,
        `portal ${portal.id} side a must be in a shipped overworld zone`,
      ).not.toBeNull();
      expect(
        bZone,
        `portal ${portal.id} side b must be in a shipped overworld zone`,
      ).not.toBeNull();
      expect(landmarks).toContainEqual({
        kind: 'world-passage',
        id: portal.id,
        side: 'a',
        zoneId: aZone?.id,
        destinationZoneId: bZone?.id,
        x: portal.a.x,
        z: portal.a.z,
      });
      expect(landmarks).toContainEqual({
        kind: 'world-passage',
        id: portal.id,
        side: 'b',
        zoneId: bZone?.id,
        destinationZoneId: aZone?.id,
        x: portal.b.x,
        z: portal.b.z,
      });
    }
    expect(Object.isFrozen(STABLE_MAP_NAVIGATION_LANDMARKS)).toBe(true);
  });
});

describe('live rift zone-map visibility', () => {
  const player = { x: 5, z: 10 };
  const riftAt = (x: number, z: number) => ({
    kind: 'object',
    templateId: 'rift_portal',
    pos: { x, z },
  });

  it('includes live rifts through the inclusive 80-yard host-fair boundary', () => {
    expect(isNearbyLiveRiftZoneMapEntity(riftAt(player.x + 79.99, player.z), player)).toBe(true);
    expect(
      isNearbyLiveRiftZoneMapEntity(
        riftAt(player.x + LIVE_MAP_ENTITY_DISCLOSURE_RADIUS, player.z),
        player,
      ),
    ).toBe(true);
    expect(
      isNearbyLiveRiftZoneMapEntity(
        riftAt(player.x + LIVE_MAP_ENTITY_DISCLOSURE_RADIUS + 0.01, player.z),
        player,
      ),
    ).toBe(false);
  });

  it('uses planar distance at the negative diagonal boundary', () => {
    const negativePlayer = { x: -200, z: -300 };
    const dx = LIVE_MAP_ENTITY_DISCLOSURE_RADIUS * 0.6;
    const dz = LIVE_MAP_ENTITY_DISCLOSURE_RADIUS * 0.8;

    expect(
      isNearbyLiveRiftZoneMapEntity(
        riftAt(negativePlayer.x - dx, negativePlayer.z - dz),
        negativePlayer,
      ),
    ).toBe(true);
    expect(
      isNearbyLiveRiftZoneMapEntity(
        riftAt(negativePlayer.x - dx, negativePlayer.z - dz - 0.01),
        negativePlayer,
      ),
    ).toBe(false);
  });

  it('rejects non-rift entities before reading their position', () => {
    const ordinaryObject = {
      kind: 'object',
      templateId: 'mailbox',
      get pos(): never {
        throw new Error('non-rift positions must not enter the distance path');
      },
    };
    expect(isNearbyLiveRiftZoneMapEntity(ordinaryObject, player)).toBe(false);
    expect(
      isNearbyLiveRiftZoneMapEntity(
        { kind: 'mob', templateId: 'rift_portal', pos: { x: player.x, z: player.z } },
        player,
      ),
    ).toBe(false);
  });
});
