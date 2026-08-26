// MIR4's two portal lessons transplanted onto the original WoC geography.
// These use an existing WoC arch asset and the shared reciprocal portal
// runtime. Auto Journey may use the matching link for a direct chapter
// transition, avoiding unrelated high-level regions between adjacent quests.

import type { PortalDef, ZonePropsDef } from '../types';

export const MIR4_WOC_TUTORIAL_PORTALS: readonly PortalDef[] = Object.freeze([
  Object.freeze({
    id: 'mir4_woc_tutorial_m02_waypoint',
    a: Object.freeze({
      x: -400,
      z: 250,
      landing: Object.freeze({ x: -393, z: 255, facing: 0.95 }),
    }),
    b: Object.freeze({
      x: 35,
      z: 90,
      landing: Object.freeze({ x: 42, z: 95, facing: 0.95 }),
    }),
    radius: 2,
    enterText: 'Travelled to Vila do Vau.',
    leaveText: 'Returned to Trilha dos Juncos.',
  }),
  Object.freeze({
    id: 'mir4_woc_tutorial_m09_waypoint',
    a: Object.freeze({
      // Keep the lesson beside the Palafita das Luzes clearing. The former
      // (-55, 330) site sat across a narrow prop collider from the last clue,
      // so a player following the tutorial arrow could be held in place even
      // though the arch looked only a few yards away.
      x: -13,
      z: 330,
      landing: Object.freeze({ x: -13, z: 337, facing: 0 }),
    }),
    b: Object.freeze({
      x: 90,
      z: -90,
      landing: Object.freeze({ x: 83, z: -83, facing: -0.79 }),
    }),
    radius: 2,
    enterText: 'Travelled to Vila do Vau.',
    leaveText: 'Returned to Pântano das Lanternas.',
  }),
]);

// The original WoC terrain is not ordered by MIR4 chapter. Consecutive MIR4
// chapters therefore use visible reciprocal waypoints only where walking the
// native road would cross later-chapter danger or an impassable escarpment.
// The ordinary roads on either side remain the authority for the local leg.
export const MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS: readonly PortalDef[] = Object.freeze([
  Object.freeze({
    // Willowfen's east road continues through Mirefen, which hosts the M09
    // grind ecology. A level-16 character leaving M02 used to be pinned there
    // by level-80 packs before it could reach the consecutive M03 chapter.
    id: 'mir4_woc_m02_m03_garden_waypoint',
    a: Object.freeze({
      x: -230,
      z: 434,
      landing: Object.freeze({ x: -236, z: 434, facing: -Math.PI / 2 }),
    }),
    b: Object.freeze({
      x: 374,
      z: 776,
      landing: Object.freeze({ x: 368, z: 782, facing: -Math.PI / 4 }),
    }),
    radius: 2,
    enterText: 'The Fenway opens onto the Garden road.',
    leaveText: 'The Garden road returns you to the Fenway.',
  }),
  Object.freeze({
    id: 'mir4_woc_m06_m07_veil_waypoint',
    a: Object.freeze({
      x: 244,
      z: 1512,
      landing: Object.freeze({ x: 250, z: 1512, facing: Math.PI / 2 }),
    }),
    b: Object.freeze({
      x: -360,
      z: 1568,
      landing: Object.freeze({ x: -360, z: 1576, facing: 0 }),
    }),
    radius: 2,
    enterText: 'The Veil opens onto the Ossuary road.',
    leaveText: 'The Veil returns you to the Candle-Stone road.',
  }),
  Object.freeze({
    // M08 lives across the WoC grid in Galecrest. Walking there from the
    // northern Ossuary crosses Mirefen's M09 ecology before M08 can begin.
    id: 'mir4_woc_m07_m08_gale_waypoint',
    a: Object.freeze({
      // A side spur by the final turn-in, not the north road to M07-Q06. The
      // old site at (-348, 1780) teleported players before Q06 completed.
      x: -400,
      z: 1630,
      landing: Object.freeze({ x: -394, z: 1630, facing: Math.PI / 2 }),
    }),
    b: Object.freeze({
      // Keep the return arch on the south side spur below Galecrest. The old
      // (390, 362) endpoint sat directly on the road from Captain Brum to the
      // first M08 objective: Auto Journey walked back through it and bounced
      // between M07 and M08 forever after accepting the chapter.
      x: 408,
      z: 338,
      landing: Object.freeze({ x: 408, z: 346, facing: 0 }),
    }),
    radius: 2,
    enterText: 'The Ossuary wind opens onto the Galecrest road.',
    leaveText: 'The Galecrest road returns you to the Ossuary wind.',
  }),
  Object.freeze({
    // Farshore and Amberfall sit at opposite ends of the WoC world. The
    // unassisted road crosses several later chapters and turned M13-Q01 into
    // an accidental level-130 grind before the giver was ever reached.
    id: 'mir4_woc_m12_m13_dune_waypoint',
    a: Object.freeze({
      // North side spur: safely reachable after M12-Q06, but 48+ yards from
      // every M12 story route so earlier objectives cannot trigger it.
      x: 330,
      z: 110,
      landing: Object.freeze({ x: 324, z: 104, facing: -Math.PI / 4 }),
    }),
    b: Object.freeze({
      // A quiet Amberfall shoulder outside all six M13 story routes.
      x: -320,
      z: 2120,
      landing: Object.freeze({ x: -326, z: 2114, facing: -Math.PI / 4 }),
    }),
    radius: 2,
    enterText: 'The Farshore tide opens onto the Amberfall dunes.',
    leaveText: 'The Amberfall wind returns you to Farshore.',
  }),
  Object.freeze({
    // The native Amberfall-Wraithwood road bends through late-game ecology.
    // A level-120 M13 graduate gained nine levels before accepting M14-Q02.
    id: 'mir4_woc_m13_m14_akhet_waypoint',
    a: Object.freeze({
      x: -400,
      z: 2160,
      landing: Object.freeze({ x: -400, z: 2152, facing: Math.PI }),
    }),
    b: Object.freeze({
      x: 260,
      z: 1600,
      landing: Object.freeze({ x: 268, z: 1602, facing: Math.PI / 2 }),
    }),
    radius: 2,
    enterText: 'The Amberfall seal opens at the gates of Akhet.',
    leaveText: 'The Akhet gate returns you to Amberfall.',
  }),
]);

export const MIR4_WOC_TUTORIAL_PORTAL_ARCHES: readonly NonNullable<
  ZonePropsDef['decorProps']
>[number][] = Object.freeze(
  MIR4_WOC_TUTORIAL_PORTALS.flatMap((portal) => [
    Object.freeze({ key: 'gardenArch', x: portal.a.x, z: portal.a.z, rot: 0, scale: 2.8 }),
    Object.freeze({ key: 'gardenArch', x: portal.b.x, z: portal.b.z, rot: 0, scale: 2.8 }),
  ]),
);

export const MIR4_WOC_CAMPAIGN_TRANSIT_PORTAL_ARCHES: readonly NonNullable<
  ZonePropsDef['decorProps']
>[number][] = Object.freeze(
  MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS.flatMap((portal) => [
    Object.freeze({ key: 'gardenArch', x: portal.a.x, z: portal.a.z, rot: 0, scale: 2.8 }),
    Object.freeze({ key: 'gardenArch', x: portal.b.x, z: portal.b.z, rot: 0, scale: 2.8 }),
  ]),
);

export function isMir4WocTutorialPortal(portal: Readonly<Pick<PortalDef, 'id'>>): boolean {
  return portal.id.startsWith('mir4_woc_tutorial_');
}

export function isMir4WocCampaignTransitPortal(portal: Readonly<Pick<PortalDef, 'id'>>): boolean {
  return (
    portal.id.startsWith('mir4_woc_m02_m03_') ||
    portal.id.startsWith('mir4_woc_m06_m07_') ||
    portal.id.startsWith('mir4_woc_m07_m08_') ||
    portal.id.startsWith('mir4_woc_m12_m13_') ||
    portal.id.startsWith('mir4_woc_m13_m14_')
  );
}
