import { emptyZoneProps, type WorldContent } from '../../types';

/**
 * Tiny development-only stage for visual MIR4 skill homologation. It carries
 * no campaign actors or presentation inventory; the bootstrap adds only the
 * controlled practice formation after the Sim exists.
 */
export const MIR4_SKILL_QA_WORLD: WorldContent = {
  zones: [
    {
      id: 'mir4_skill_qa',
      name: 'MIR4 Skill QA',
      xMin: -24,
      xMax: 24,
      zMin: -24,
      zMax: 24,
      levelRange: [1, 250],
      biome: 'desert',
      hub: { x: 0, z: 0, radius: 10, name: 'MIR4 Skill QA' },
      graveyard: { x: 0, z: -8 },
      lakes: [],
      pois: [],
      welcome: 'MIR4 skill homologation stage ready.',
    },
  ],
  camps: [],
  npcs: {},
  groundObjects: [],
  roads: [],
  travelPortals: [],
  props: emptyZoneProps(),
  playerStart: { x: 0, z: 0 },
  services: {},
  terrainEdits: [{ x: 0, z: 0, radius: 80, delta: 0, falloff: 'flat', mode: 'level' }],
  placements: [],
  blockers: [],
  waterLevel: -100,
  terrainModel: 'content',
  presentationModel: 'content',
};
