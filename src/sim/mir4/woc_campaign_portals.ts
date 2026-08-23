// MIR4's two portal lessons transplanted onto the original WoC geography.
// These use an existing WoC arch asset and the shared reciprocal portal
// runtime; they are tutorial infrastructure, not shortcuts for Auto Journey.

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
      x: -55,
      z: 330,
      landing: Object.freeze({ x: -48, z: 335, facing: 0.95 }),
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

export const MIR4_WOC_TUTORIAL_PORTAL_ARCHES: readonly NonNullable<
  ZonePropsDef['decorProps']
>[number][] = Object.freeze(
  MIR4_WOC_TUTORIAL_PORTALS.flatMap((portal) => [
    Object.freeze({ key: 'gardenArch', x: portal.a.x, z: portal.a.z, rot: 0, scale: 2.8 }),
    Object.freeze({ key: 'gardenArch', x: portal.b.x, z: portal.b.z, rot: 0, scale: 2.8 }),
  ]),
);

export function isMir4WocTutorialPortal(portal: Readonly<Pick<PortalDef, 'id'>>): boolean {
  return portal.id.startsWith('mir4_woc_tutorial_');
}
