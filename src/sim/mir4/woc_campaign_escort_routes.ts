// Authored escort paths on the original Aeldrune terrain. These points follow
// visible WoC roads and are separate from the imported MIR4 map projection so
// campaign escortees never take a generic straight line through water.

export interface Mir4WocEscortObjectiveAnchor {
  questId: string;
  stageIndex: number;
  points: readonly { x: number; z: number }[];
}

const CAMINHO_SEGURO_ROUTE: readonly Mir4WocEscortObjectiveAnchor[] = Object.freeze([
  Object.freeze({ questId: 'M02-Q02', stageIndex: 1, points: [{ x: -398, z: 292 }] }),
  Object.freeze({
    questId: 'M02-Q02',
    stageIndex: 2,
    points: Object.freeze([
      { x: -390, z: 300 },
      { x: -360, z: 324 },
      { x: -360, z: 362 },
    ]),
  }),
  Object.freeze({ questId: 'M02-Q02', stageIndex: 3, points: [{ x: -360, z: 362 }] }),
  Object.freeze({ questId: 'M02-Q02', stageIndex: 4, points: [{ x: -360, z: 362 }] }),
]);

const ROUTES_BY_MAP: Readonly<Record<string, readonly Mir4WocEscortObjectiveAnchor[]>> = {
  'm02-trilha-dos-juncos': CAMINHO_SEGURO_ROUTE,
};

export function mir4WocEscortObjectiveAnchors(
  mapId: string,
): readonly Mir4WocEscortObjectiveAnchor[] {
  return ROUTES_BY_MAP[mapId] ?? [];
}
