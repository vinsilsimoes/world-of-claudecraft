// The Phase 2 slice world: Vila do Vau (m01) as a declarative WorldContent.
// Semantics follow the m01 design contract (safe hub in the south, hunting
// grounds north and west of the village, level band 1-2) but the geometry is
// authored fresh for the 3D procedural world: the TMX tiles are design
// reference only (port plan, section "Standing decisions"). Names are the
// source project's PT-BR product names; the English i18n source is authored
// when the profile surfaces them to the client UI.
//
// Selection: the client boundary (src/game/offline_sim_options.ts) injects
// this world when the profile is mir4-gameplay-port, which also routes it
// through setActiveWorldContent (the ctor invariant: cfg.world AND the module
// global must agree or spawns and geometry fork). The server-side selection
// lands with the online half of part 2.

import type { WorldContent } from '../../types';

export const MIR4_VILA_DO_VAU_ZONE_ID = 'mir4_vila_do_vau';

export const MIR4_SLICE_WORLD: WorldContent = {
  zones: [
    {
      id: MIR4_VILA_DO_VAU_ZONE_ID,
      name: 'Vila do Vau',
      zMin: -40,
      // Leave a real playfield apron north of the tutorial clearings. The
      // physical custom-world ridge starts inside zMax, so ending at 24 put
      // the wolf camp and its manual-control test position on the cliff face.
      zMax: 48,
      levelRange: [1, 2],
      biome: 'vale',
      hub: { x: 0, z: -12, radius: 14, name: 'Vila do Vau' },
      graveyard: { x: 3, z: -8 },
      lakes: [],
      pois: [
        { x: 0, z: -12, label: 'Vau Dourado' },
        { x: 14, z: 6, label: 'Clareira dos Filhotes' },
      ],
      welcome: 'Bem-vindo a Vila do Vau.',
    },
  ],
  camps: [
    // "Clareira dos Filhotes": the tutorial hunting band east of the ford.
    { mobId: 'mir4_forest_wolf', center: { x: 14, z: 6 }, radius: 8, count: 5 },
    // The west clearing's smaller pack.
    { mobId: 'mir4_forest_wolf', center: { x: -18, z: 2 }, radius: 8, count: 4 },
  ],
  npcs: {
    mir4_tarek_duas_pontes: {
      id: 'mir4_tarek_duas_pontes',
      name: 'Tarek Duas-Pontes',
      title: 'Tarek Duas-Pontes',
      pos: { x: 1.5, z: -10 },
      facing: 0,
      color: 0x4f7f9f,
      questIds: [],
      greeting: 'Os lobos contornam a água que sangra luz negra. Veja você mesmo nas clareiras.',
    },
  },
  groundObjects: [],
  roads: [
    [
      { x: 0, z: -16 },
      { x: 0, z: 0 },
      { x: 10, z: 4 },
      { x: 14, z: 6 },
    ],
  ],
  props: {
    buildings: [],
    wells: [],
    stalls: [],
    mines: [],
    docks: [],
    tents: [],
    marshReeds: [],
    crates: [],
    campfires: [[1, -11]],
    mudHuts: [],
    ruinRings: [],
    fences: [],
    graveyards: [],
  },
  playerStart: { x: 0, z: -12 },
};
