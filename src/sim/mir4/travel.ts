// MIR4 travel data adapted to the existing positional portal runtime. The
// source contributes only the ordered map links; entrances, landings and all
// geometry are authored against the procedural 3D bands in this repository.

import { mir4ArcBands } from '../content/mir4/arc_world';
import { MIR4_WORLD_ARC } from '../content/mir4/world_arc';
import type { PortalDef } from '../types';

const PORTAL_OFFSET = 10;
const LANDING_OFFSET = 4;
const MIR4_PORTAL_RADIUS = 3;

function buildMir4ArcPortals(): readonly PortalDef[] {
  const bands = mir4ArcBands();
  const portals: PortalDef[] = [];
  for (let index = 0; index < bands.length - 1; index++) {
    const from = bands[index]!;
    const to = bands[index + 1]!;
    const fromMap = MIR4_WORLD_ARC[index]!;
    const toMap = MIR4_WORLD_ARC[index + 1]!;
    if (!fromMap.portalTo.includes(toMap.mapId)) continue;
    const boundary = from.zMax;
    portals.push({
      id: `mir4_${fromMap.mapId}_to_${toMap.mapId}`,
      a: {
        x: from.portalOut.x,
        z: boundary - PORTAL_OFFSET,
        landing: {
          x: from.portalOut.x,
          z: boundary - PORTAL_OFFSET - LANDING_OFFSET,
          facing: Math.PI,
        },
      },
      b: {
        x: to.hub.x,
        z: boundary + PORTAL_OFFSET,
        landing: { x: to.hub.x, z: boundary + PORTAL_OFFSET + LANDING_OFFSET, facing: 0 },
      },
      radius: MIR4_PORTAL_RADIUS,
      enterText: `Travelled to ${toMap.name}.`,
      leaveText: `Returned to ${fromMap.name}.`,
    });
  }
  return Object.freeze(portals.map((portal) => Object.freeze(portal)));
}

export const MIR4_ARC_PORTALS = buildMir4ArcPortals();
