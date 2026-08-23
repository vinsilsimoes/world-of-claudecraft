// Bosque do Vale is a production-authored ancient forest valley. The refuge,
// forest routes, waterways, ruins, dens and guardian grounds share one layout
// so every quest reads as a consequence of the same wounded ecosystem.

import type { BiomePaint, HeightStamp, ZonePropsDef } from '../../types';

type Point = { x: number; z: number };
type MissionSiteId =
  | 'erased-mark-ruins'
  | 'wounded-herb-garden'
  | 'broken-bell'
  | 'feather-watch-den'
  | 'four-totems'
  | 'howling-gorge';
type PoiPurpose = 'service' | 'quest' | 'exploration';
type PoiOccupants = 'villagers' | 'spirits' | 'imps' | 'undead' | 'wildlife' | 'guardians';
type PoiArchitecture =
  | 'forest-refuge'
  | 'ancient-forest-ruins'
  | 'corrupted-herb-grove'
  | 'ruined-bell-sanctuary'
  | 'natural-den'
  | 'navigation-totems'
  | 'root-amphitheater'
  | 'natural-cave'
  | 'root-bridge'
  | 'beacon-overlook';
type DecorOrigin = 'settlement' | 'natural' | 'ancient' | 'corruption' | 'guardian';
type DecorProp = NonNullable<ZonePropsDef['decorProps']>[number];
type ArtDistrictId = 'refuge-canopy' | 'twilight-wilds' | 'cold-gorge';

export interface Mir4M03MissionSite {
  id: MissionSiteId;
  questId: `M03-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  label: string;
  pos: Point;
  dangerTier: 0 | 1 | 2 | 3;
  levelRange: readonly [number, number];
  gameplay: string;
}

export interface Mir4M03PointOfInterest {
  id: string;
  label: string;
  pos: Point;
  radius: number;
  purpose: PoiPurpose;
  occupants: PoiOccupants;
  architecture: PoiArchitecture;
  biomeFeature: string;
  narrativeRole: string;
  gameplayRole: string;
}

export interface Mir4M03CampPlan {
  questId: `M03-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  mobId: string;
  center: Point;
  radius: number;
  count: number;
  levelRange: readonly [number, number];
}

export interface Mir4M03ObjectiveAnchorPlan {
  questId: `M03-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  stageIndex: number;
  points: readonly Point[];
}

export interface Mir4M03DecorPlacement extends DecorProp {
  poiId: string;
  origin: DecorOrigin;
}

export interface Mir4M03ArtDistrict {
  id: ArtDistrictId;
  label: string;
  presentationBiome: 'vale' | 'dusk' | 'haunt';
  poiIds: readonly string[];
  visualLanguage: string;
  ecologyRule: string;
}

interface Mir4M03NpcPlacement {
  id: string;
  name: string;
  title: string;
  pos: Point;
  facing: number;
  greeting: string;
  campaign: boolean;
}

export interface Mir4M03WorldBlueprint {
  mapId: 'm03-bosque-do-vale';
  authoringStatus: 'production-authored';
  fantasy: string;
  progressionPromise: string;
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  hub: Point;
  hubRadius: number;
  graveyard: Point;
  portalIn: Point;
  portalOut: Point;
  missionSites: readonly Mir4M03MissionSite[];
  pointsOfInterest: readonly Mir4M03PointOfInterest[];
  artDistricts: readonly Mir4M03ArtDistrict[];
  biomePaint: BiomePaint;
  roads: readonly (readonly Point[])[];
  litRoads: readonly (readonly Point[])[];
  dryCrossings: readonly { x: number; z: number; radius: number }[];
  camps: readonly Mir4M03CampPlan[];
  objectiveAnchors: readonly Mir4M03ObjectiveAnchorPlan[];
  lakes: readonly { x: number; z: number; radius: number }[];
  terrainEdits: readonly HeightStamp[];
  ruinRings: readonly {
    x: number;
    z: number;
    ringR: number;
    columns: number;
  }[];
  decorPlacements: readonly Mir4M03DecorPlacement[];
  npcPlacements: readonly Mir4M03NpcPlacement[];
  noticeboard: Point;
}

const MISSION_SITES: readonly Mir4M03MissionSite[] = [
  {
    id: 'erased-mark-ruins',
    questId: 'M03-Q01',
    label: 'Ruínas da Marca Apagada',
    pos: { x: 3750, z: 110 },
    dangerTier: 0,
    levelRange: [21, 22],
    gameplay:
      'Three separate ruin fragments establish a real investigation circuit before the central evidence reconstruction.',
  },
  {
    id: 'wounded-herb-garden',
    questId: 'M03-Q02',
    label: 'Jardim das Ervas Feridas',
    pos: { x: 3785, z: 320 },
    dangerTier: 1,
    levelRange: [23, 24],
    gameplay:
      'Corrupted plants cluster around inverted markers while hostile gatherers pressure every collection route.',
  },
  {
    id: 'broken-bell',
    questId: 'M03-Q03',
    label: 'Campanário Partido',
    pos: { x: 3900, z: 10 },
    dangerTier: 1,
    levelRange: [25, 25],
    gameplay:
      'Three ward points surround an exposed bell clearing that becomes a positional three-wave defense.',
  },
  {
    id: 'feather-watch-den',
    questId: 'M03-Q04',
    label: 'Covil da Vigia de Plumas',
    pos: { x: 4010, z: 340 },
    dangerTier: 2,
    levelRange: [26, 27],
    gameplay:
      'Tracks lead around a natural den and through three mounted checkpoints before the guardian appears.',
  },
  {
    id: 'four-totems',
    questId: 'M03-Q05',
    label: 'Encruzilhada dos Quatro Totens',
    pos: { x: 4070, z: 180 },
    dangerTier: 2,
    levelRange: [28, 29],
    gameplay:
      'Four visible navigation stones define separate approach lanes and a central defense position.',
  },
  {
    id: 'howling-gorge',
    questId: 'M03-Q06',
    label: 'Garganta do Uivo',
    pos: { x: 4180, z: 35 },
    dangerTier: 3,
    levelRange: [30, 30],
    gameplay:
      'Three root wards protect a cliff amphitheater where the Matriarch controls the exit toward Vau Dourado.',
  },
];

const POINTS_OF_INTEREST: readonly Mir4M03PointOfInterest[] = [
  {
    id: 'm03-poi-abrigo-silvas',
    label: 'Abrigo das Silvas',
    pos: { x: 3625, z: 215 },
    radius: 70,
    purpose: 'service',
    occupants: 'villagers',
    architecture: 'forest-refuge',
    biomeFeature:
      'A sheltered terrace between two old root ridges stays dry above the forest streams.',
    narrativeRole:
      'The refuge exists because its residents listen to the forest instead of clearing it.',
    gameplayRole: 'Dialogue, contracts, crafting, mount preparation and safe recovery.',
  },
  {
    id: 'm03-poi-ruinas-marca',
    label: 'Ruínas da Marca Apagada',
    pos: { x: 3750, z: 110 },
    radius: 42,
    purpose: 'quest',
    occupants: 'spirits',
    architecture: 'ancient-forest-ruins',
    biomeFeature:
      'Broken stones emerge from a moss shelf where roots have preserved erased carvings.',
    narrativeRole: 'The missing Aurora mark proves the silence was made, not born in the vale.',
    gameplayRole: 'Three clue inspections, enchantment lesson and evidence reconstruction.',
  },
  {
    id: 'm03-poi-jardim-ferido',
    label: 'Jardim das Ervas Feridas',
    pos: { x: 3785, z: 320 },
    radius: 48,
    purpose: 'quest',
    occupants: 'imps',
    architecture: 'corrupted-herb-grove',
    biomeFeature: 'Luminous herbs fade only within the shadow of inverted navigation stones.',
    narrativeRole: 'The infection maps the same broken route encoded by the bell and totems.',
    gameplayRole: 'Source identification, hostile collection and field treatment.',
  },
  {
    id: 'm03-poi-campanario-partido',
    label: 'Campanário Partido',
    pos: { x: 3900, z: 10 },
    radius: 52,
    purpose: 'quest',
    occupants: 'undead',
    architecture: 'ruined-bell-sanctuary',
    biomeFeature: 'A high clearing holds the broken bell above three root-bound resonance stones.',
    narrativeRole: 'The bell still points toward Vau Dourado when its three anchors agree.',
    gameplayRole: 'Ordered preparation, mount unlock and mobile three-wave defense.',
  },
  {
    id: 'm03-poi-covil-vigia',
    label: 'Covil da Vigia de Plumas',
    pos: { x: 4010, z: 340 },
    radius: 58,
    purpose: 'quest',
    occupants: 'wildlife',
    architecture: 'natural-den',
    biomeFeature: 'A cave mouth, fallen roots and feathered nests occupy a quiet southern ridge.',
    narrativeRole:
      'The trapped cubs explain the guardian aggression without turning the den into a settlement.',
    gameplayRole: 'Tracking, selective hunt, mounted traversal and guardian resolution.',
  },
  {
    id: 'm03-poi-quatro-totens',
    label: 'Encruzilhada dos Quatro Totens',
    pos: { x: 4070, z: 180 },
    radius: 54,
    purpose: 'quest',
    occupants: 'guardians',
    architecture: 'navigation-totems',
    biomeFeature:
      'Four old waystones face the cardinal paths around a naturally open root junction.',
    narrativeRole: 'Their alignment reveals a navigation key rather than a sacrificial altar.',
    gameplayRole: 'Multi-direction preparation and a defense with pressure from four lanes.',
  },
  {
    id: 'm03-poi-garganta-uivo',
    label: 'Garganta do Uivo',
    pos: { x: 4180, z: 35 },
    radius: 62,
    purpose: 'quest',
    occupants: 'guardians',
    architecture: 'root-amphitheater',
    biomeFeature:
      'Stone shoulders and enormous roots form a natural arena above the eastern gorge.',
    narrativeRole:
      'The Matriarch guards a lens torn from the Farol da Raiz and blocks the next road.',
    gameplayRole: 'Ward removal, boss confrontation and the physical exit to M04.',
  },
  {
    id: 'm03-poi-gruta-orvalho',
    label: 'Gruta do Orvalho Azul',
    pos: { x: 3920, z: 330 },
    radius: 30,
    purpose: 'exploration',
    occupants: 'wildlife',
    architecture: 'natural-cave',
    biomeFeature: 'Blue fungi mark a shallow cave where water filters through the southern ridge.',
    narrativeRole: 'The cave shows that healthy water still survives beyond the corrupted garden.',
    gameplayRole: 'Optional shortcut, material pocket and shelter from patrols.',
  },
  {
    id: 'm03-poi-ponte-raiz',
    label: 'Ponte da Raiz Fendida',
    pos: { x: 3980, z: 100 },
    radius: 30,
    purpose: 'exploration',
    occupants: 'spirits',
    architecture: 'root-bridge',
    biomeFeature: 'A maintained plank crossing rests on a root split by the bell shock.',
    narrativeRole:
      'The crossing joins the high bell route to the Matriarch gorge without a straight road.',
    gameplayRole: 'Risky northern shortcut and a readable stream crossing.',
  },
  {
    id: 'm03-poi-mirante-farol',
    label: 'Mirante do Farol da Raiz',
    pos: { x: 4050, z: 60 },
    radius: 32,
    purpose: 'exploration',
    occupants: 'spirits',
    architecture: 'beacon-overlook',
    biomeFeature: 'An elevated ruin sees the bell, the four totems and the eastern gorge at once.',
    narrativeRole: 'Its sight lines make the hidden navigation network physically understandable.',
    gameplayRole: 'Vista, lore cache and alternate approach to the final valley.',
  },
];

const ART_DISTRICTS: readonly Mir4M03ArtDistrict[] = [
  {
    id: 'refuge-canopy',
    label: 'Orla Verde do Abrigo',
    presentationBiome: 'vale',
    poiIds: ['m03-poi-abrigo-silvas'],
    visualLanguage:
      'One timber shelter, a spring well, warm firelight and broad living oaks identify a temporary hunter refuge without turning the western forest into a town.',
    ecologyRule:
      'The shelter is the only intact recent building. Mission contacts occupy separate observation posts along the old forest paths.',
  },
  {
    id: 'twilight-wilds',
    label: 'Mata do Crepúsculo Antigo',
    presentationBiome: 'dusk',
    poiIds: [
      'm03-poi-ruinas-marca',
      'm03-poi-jardim-ferido',
      'm03-poi-campanario-partido',
      'm03-poi-covil-vigia',
      'm03-poi-gruta-orvalho',
      'm03-poi-ponte-raiz',
    ],
    visualLanguage:
      'Violet soil, luminous fungi, amethyst traces, broken shrines and a mixed living-dead canopy make the central forest ancient rather than pastoral.',
    ecologyRule:
      'Ruins may be root-bound, but dens, streams and caves remain natural spaces without recent human construction.',
  },
  {
    id: 'cold-gorge',
    label: 'Garganta Fria dos Guardiões',
    presentationBiome: 'haunt',
    poiIds: ['m03-poi-quatro-totens', 'm03-poi-garganta-uivo', 'm03-poi-mirante-farol'],
    visualLanguage:
      'Dead crowns, exposed roots, cold stone shoulders and sparse supernatural light make the eastern ascent visibly more hostile.',
    ecologyRule:
      'Only ancient navigation works and guardian-made barriers occupy the final high ground; settlement dressing stops at the refuge.',
  },
];

const M03_PRESENTATION_PAINT: BiomePaint = (() => {
  const cell = 12;
  const originX = 3536;
  const originZ = -180;
  const cols = Math.ceil((4260 - originX) / cell);
  const rows = Math.ceil((430 - originZ) / cell);
  const coldGorge = [
    { x: 3990, z: -110 },
    { x: 4260, z: -110 },
    { x: 4260, z: 300 },
    { x: 4150, z: 285 },
    { x: 4060, z: 245 },
    { x: 4015, z: 165 },
  ] as const;
  const inPolygon = (x: number, z: number): boolean => {
    let inside = false;
    for (let i = 0, j = coldGorge.length - 1; i < coldGorge.length; j = i++) {
      const a = coldGorge[i]!;
      const b = coldGorge[j]!;
      if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
        inside = !inside;
      }
    }
    return inside;
  };
  const ids = Array.from({ length: cols * rows }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = originX + (col + 0.5) * cell;
    const z = originZ + (row + 0.5) * cell;
    const refuge = ((x - 3625) / 108) ** 2 + ((z - 215) / 116) ** 2 <= 1;
    if (refuge) return 0;
    if (inPolygon(x, z)) return 13;
    return 255;
  });
  return { cell, cols, rows, originX, originZ, ids, affectsTerrain: false };
})();

const M03_LOCAL_BLUEPRINT: Mir4M03WorldBlueprint = {
  mapId: 'm03-bosque-do-vale',
  authoringStatus: 'production-authored',
  fantasy:
    'An ancient forest valley whose broken bell, wounded herbs, dens and navigation stones all react to one stolen beacon lens.',
  progressionPromise:
    'The player investigates before fighting, learns enchantment and mounts, chooses looping routes, survives two positional defenses and breaks a warded boss arena.',
  bounds: { xMin: 3536, xMax: 4260, zMin: -180, zMax: 430 },
  hub: { x: 3625, z: 215 },
  hubRadius: 70,
  graveyard: { x: 3578, z: 180 },
  portalIn: { x: 3565, z: 220 },
  portalOut: { x: 4230, z: 35 },
  missionSites: MISSION_SITES,
  pointsOfInterest: POINTS_OF_INTEREST,
  artDistricts: ART_DISTRICTS,
  biomePaint: M03_PRESENTATION_PAINT,
  roads: [
    [
      { x: 3565, z: 220 },
      { x: 3590, z: 218 },
      { x: 3625, z: 215 },
    ],
    [
      { x: 3625, z: 215 },
      { x: 3688, z: 164 },
      { x: 3750, z: 110 },
    ],
    [
      { x: 3625, z: 215 },
      { x: 3680, z: 270 },
      { x: 3730, z: 305 },
      { x: 3785, z: 320 },
    ],
    [
      { x: 3750, z: 110 },
      { x: 3810, z: 210 },
      { x: 3785, z: 320 },
    ],
    [
      { x: 3750, z: 110 },
      { x: 3820, z: 65 },
      { x: 3900, z: 10 },
    ],
    [
      { x: 3785, z: 320 },
      { x: 3920, z: 330 },
      { x: 4010, z: 340 },
    ],
    [
      { x: 3900, z: 10 },
      { x: 4000, z: 55 },
      { x: 3980, z: 100 },
      { x: 4030, z: 65 },
      { x: 4050, z: 60 },
      { x: 4070, z: 180 },
    ],
    [
      { x: 4010, z: 340 },
      { x: 4015, z: 250 },
      { x: 4070, z: 180 },
    ],
    [
      { x: 3900, z: 10 },
      { x: 4000, z: 55 },
      { x: 3980, z: 100 },
      { x: 4030, z: 65 },
      { x: 4100, z: 70 },
      { x: 4180, z: 35 },
    ],
    [
      { x: 4070, z: 180 },
      { x: 4130, z: 120 },
      { x: 4180, z: 35 },
    ],
    [
      { x: 4180, z: 35 },
      { x: 4230, z: 35 },
    ],
  ],
  litRoads: [
    [
      { x: 3565, z: 220 },
      { x: 3590, z: 218 },
      { x: 3625, z: 215 },
      { x: 3660, z: 204 },
    ],
    [
      { x: 3595, z: 245 },
      { x: 3625, z: 215 },
      { x: 3655, z: 190 },
    ],
  ],
  dryCrossings: [
    { x: 3980, z: 100, radius: 28 },
    { x: 4015, z: 250, radius: 28 },
  ],
  camps: [
    {
      questId: 'M03-Q01',
      mobId: 'forest_wolf',
      center: { x: 3750, z: 110 },
      radius: 32,
      count: 9,
      levelRange: [21, 22],
    },
    {
      questId: 'M03-Q02',
      mobId: 'thorn_imp',
      center: { x: 3785, z: 320 },
      radius: 36,
      count: 10,
      levelRange: [23, 24],
    },
    {
      questId: 'M03-Q03',
      mobId: 'moss_skeleton',
      center: { x: 3900, z: 10 },
      radius: 38,
      count: 10,
      levelRange: [25, 25],
    },
    {
      questId: 'M03-Q04',
      mobId: 'owlbear_cub',
      center: { x: 4010, z: 340 },
      radius: 42,
      count: 11,
      levelRange: [26, 27],
    },
    {
      questId: 'M03-Q05',
      mobId: 'briar_guard',
      center: { x: 4070, z: 180 },
      radius: 42,
      count: 11,
      levelRange: [28, 29],
    },
    {
      questId: 'M03-Q06',
      mobId: 'dire_wolf',
      center: { x: 4180, z: 35 },
      radius: 44,
      count: 12,
      levelRange: [30, 30],
    },
  ],
  objectiveAnchors: [
    {
      questId: 'M03-Q01',
      stageIndex: 2,
      points: [
        { x: 3730, z: 100 },
        { x: 3765, z: 90 },
        { x: 3770, z: 130 },
      ],
    },
    { questId: 'M03-Q01', stageIndex: 4, points: [{ x: 3750, z: 110 }] },
    {
      questId: 'M03-Q02',
      stageIndex: 2,
      points: [
        { x: 3765, z: 300 },
        { x: 3790, z: 335 },
        { x: 3810, z: 305 },
      ],
    },
    {
      questId: 'M03-Q03',
      stageIndex: 2,
      points: [
        { x: 3875, z: 20 },
        { x: 3905, z: -15 },
        { x: 3925, z: 25 },
      ],
    },
    { questId: 'M03-Q03', stageIndex: 4, points: [{ x: 3900, z: 10 }] },
    {
      questId: 'M03-Q04',
      stageIndex: 2,
      points: [
        { x: 3978, z: 315 },
        { x: 4005, z: 360 },
        { x: 4040, z: 330 },
      ],
    },
    {
      questId: 'M03-Q04',
      stageIndex: 4,
      points: [
        { x: 3970, z: 320 },
        { x: 4010, z: 340 },
        { x: 4050, z: 315 },
      ],
    },
    { questId: 'M03-Q04', stageIndex: 5, points: [{ x: 4040, z: 360 }] },
    {
      questId: 'M03-Q05',
      stageIndex: 2,
      points: [
        { x: 4045, z: 160 },
        { x: 4095, z: 155 },
        { x: 4070, z: 215 },
      ],
    },
    { questId: 'M03-Q05', stageIndex: 3, points: [{ x: 4070, z: 180 }] },
    {
      questId: 'M03-Q06',
      stageIndex: 2,
      points: [
        { x: 4150, z: 10 },
        { x: 4160, z: 65 },
        { x: 4210, z: 45 },
      ],
    },
    { questId: 'M03-Q06', stageIndex: 3, points: [{ x: 4180, z: 35 }] },
    { questId: 'M03-Q06', stageIndex: 4, points: [{ x: 4190, z: 70 }] },
  ],
  lakes: [
    { x: 3960, z: 83, radius: 17 },
    { x: 4000, z: 117, radius: 17 },
    { x: 3995, z: 228, radius: 17 },
    { x: 4035, z: 272, radius: 17 },
    { x: 3850, z: 360, radius: 22 },
    { x: 4120, z: 260, radius: 20 },
    { x: 3700, z: 355, radius: 18 },
  ],
  terrainEdits: [
    { x: 3625, z: 215, radius: 86, delta: 6, falloff: 'smooth' },
    { x: 3750, z: 110, radius: 55, delta: 7, falloff: 'smooth' },
    { x: 3785, z: 320, radius: 62, delta: 4, falloff: 'smooth' },
    { x: 3900, z: 10, radius: 64, delta: 12, falloff: 'smooth' },
    { x: 3920, z: 330, radius: 46, delta: 8, falloff: 'smooth' },
    { x: 4010, z: 340, radius: 70, delta: 10, falloff: 'smooth' },
    { x: 4070, z: 180, radius: 68, delta: 11, falloff: 'smooth' },
    { x: 4050, z: 60, radius: 45, delta: 16, falloff: 'smooth' },
    // The final arena is a real east-west gorge: a lowered combat floor
    // between two steep, visible root ridges. The west forks and east portal
    // remain open, so terrain -- not an invisible collider -- defines it.
    { x: 4180, z: 35, radius: 56, delta: 2, falloff: 'smooth' },
    { x: 4160, z: -45, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4176, z: -45, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4192, z: -45, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4208, z: -45, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4224, z: -45, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4240, z: -45, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4160, z: 106, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4176, z: 106, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4192, z: 106, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4208, z: 106, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4224, z: 106, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4240, z: 106, radius: 18, delta: 32, falloff: 'smooth' },
    { x: 4140, z: 360, radius: 70, delta: 14, falloff: 'smooth' },
    { x: 3820, z: -105, radius: 85, delta: 18, falloff: 'smooth' },
  ],
  ruinRings: [
    { x: 3750, z: 110, ringR: 16, columns: 9 },
    { x: 3900, z: 10, ringR: 15, columns: 8 },
  ],
  decorPlacements: [
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'settlement',
      key: 'kmedHomeA',
      x: 3655,
      z: 180,
      rot: -0.5,
      hw: 4.5,
      hd: 4.5,
      h: 8,
    },
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'settlement',
      key: 'well',
      x: 3628,
      z: 220,
      r: 1.5,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'ancient',
      key: 'columnBroken',
      x: 3730,
      z: 100,
      rot: 0.4,
      r: 0.6,
      h: 2.1,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'ancient',
      key: 'statueHead',
      x: 3765,
      z: 90,
      rot: -0.8,
      r: 1.05,
      h: 2.3,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'ancient',
      key: 'statueBlock',
      x: 3770,
      z: 130,
      rot: 1.1,
      r: 0.6,
      h: 0.85,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'ancient',
      key: 'stagShrine',
      x: 3750,
      z: 110,
      rot: Math.PI,
      scale: 1.15,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'oakTree',
      x: 3710,
      z: 78,
      rot: 0.5,
      scale: 1.8,
      r: 1.1,
      h: 12,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'oakTree',
      x: 3788,
      z: 72,
      rot: -0.5,
      scale: 1.7,
      r: 1,
      h: 11,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'oakTree',
      x: 3790,
      z: 150,
      rot: 1.5,
      scale: 2,
      r: 1.2,
      h: 13,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'corruption',
      key: 'stagShrine',
      x: 3765,
      z: 300,
      rot: Math.PI,
      scale: 1.2,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'corruption',
      key: 'stagShrine',
      x: 3790,
      z: 335,
      rot: 0.5,
      scale: 1.2,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'corruption',
      key: 'stagShrine',
      x: 3810,
      z: 305,
      rot: -0.7,
      scale: 1.2,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'natural',
      key: 'mushroomGlowCluster',
      x: 3750,
      z: 338,
      scale: 1.7,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'natural',
      key: 'flowerGlow',
      x: 3778,
      z: 290,
      scale: 1.8,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'natural',
      key: 'flowerGlow',
      x: 3820,
      z: 330,
      scale: 1.8,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'natural',
      key: 'shrubFlowering',
      x: 3805,
      z: 350,
      rot: 0.7,
      scale: 2,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'ancient',
      key: 'marshBellGallows',
      x: 3900,
      z: 10,
      rot: 0.2,
      scale: 2.8,
      r: 2.5,
      h: 7,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'ancient',
      key: 'marshCorpseCandle',
      x: 3875,
      z: 20,
      rot: 0.3,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'ancient',
      key: 'marshCorpseCandle',
      x: 3905,
      z: -15,
      rot: -0.2,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'ancient',
      key: 'marshCorpseCandle',
      x: 3925,
      z: 25,
      rot: 0.8,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'ancient',
      key: 'column',
      x: 3860,
      z: -8,
      rot: 0.3,
      r: 0.6,
      h: 3.75,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'ancient',
      key: 'columnBroken',
      x: 3940,
      z: 5,
      rot: -0.5,
      r: 0.6,
      h: 2.1,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'crystalMoundCave',
      x: 4040,
      z: 360,
      // Face the mouth toward the southwest tracking approach.
      rot: -2.16,
      scale: 1.2,
      h: 10,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4032,
      z: 359,
      rot: 1.1,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4038,
      z: 351,
      rot: -0.7,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    // The crystal mound is presentation-only, so these visible WoC boulders
    // form its physical shell. The southwest arc between the two rocks above
    // remains the sole traversable mouth.
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4042.3,
      z: 352.4,
      rot: 0.2,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4045.9,
      z: 354.5,
      rot: -1.1,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4047.8,
      z: 358.2,
      rot: 0.7,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4047.7,
      z: 362.3,
      rot: -0.4,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4045.5,
      z: 365.9,
      rot: 1.4,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4041.8,
      z: 367.8,
      rot: -0.9,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4037.7,
      z: 367.7,
      rot: 0.45,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4034.1,
      z: 365.5,
      rot: -1.35,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'rockLargeD',
      x: 4032.2,
      z: 361.8,
      rot: 0.95,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'marshRootWall',
      x: 3980,
      z: 372,
      rot: 0.4,
      scale: 3.5,
      r: 4.5,
      h: 5,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'marshRootWall',
      x: 4055,
      z: 320,
      rot: -0.8,
      scale: 3.2,
      r: 4.5,
      h: 5,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'oakTree',
      x: 3970,
      z: 300,
      rot: 0.3,
      scale: 2.1,
      r: 1.2,
      h: 14,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'oakTree',
      x: 4060,
      z: 385,
      rot: -0.7,
      scale: 2.2,
      r: 1.3,
      h: 14,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'mushroomGiantPurple',
      x: 4018,
      z: 375,
      rot: 0.5,
      scale: 1.4,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4045,
      z: 160,
      rot: Math.PI / 2,
      scale: 1.35,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4095,
      z: 155,
      rot: -Math.PI / 2,
      scale: 1.35,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4070,
      z: 215,
      rot: Math.PI,
      scale: 1.35,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4070,
      z: 180,
      rot: 0,
      scale: 1.55,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'natural',
      key: 'marshRootWall',
      x: 4028,
      z: 205,
      rot: 0.7,
      scale: 3,
      r: 4.5,
      h: 5,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4110,
      z: 205,
      rot: -0.4,
      scale: 2.1,
      r: 1.2,
      h: 8.4,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'guardian',
      key: 'marshRootWall',
      x: 4140,
      z: 0,
      rot: 0.5,
      scale: 4.2,
      r: 5,
      h: 6,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'guardian',
      key: 'marshRootWall',
      x: 4160,
      z: 82,
      rot: -0.7,
      scale: 4.2,
      r: 5,
      h: 6,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'guardian',
      key: 'marshRootWall',
      x: 4215,
      z: 75,
      rot: 1.8,
      scale: 4.2,
      r: 5,
      h: 6,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'guardian',
      key: 'marshRootWall',
      x: 4215,
      z: -5,
      rot: -1.8,
      scale: 4.2,
      r: 5,
      h: 6,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4150,
      z: 10,
      rot: 0.2,
      scale: 1.2,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4160,
      z: 65,
      rot: -0.5,
      scale: 1.2,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4210,
      z: 45,
      rot: 0.8,
      scale: 1.2,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4140,
      z: 98,
      rot: 0.4,
      scale: 2.3,
      r: 1.3,
      h: 9.2,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4220,
      z: -15,
      rot: -0.4,
      scale: 2.2,
      r: 1.3,
      h: 8.8,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'crystalMoundCave',
      x: 3920,
      z: 350,
      // The exploration approach comes from due south; the asset front is +z.
      rot: Math.PI,
      scale: 1.05,
      h: 10,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3914,
      z: 344,
      rot: 0.8,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3926,
      z: 344,
      rot: -0.9,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    // A second visible compound shell closes the sides and back while the
    // south-facing gap between the two rocks above remains fully walkable.
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3927.7,
      z: 347.9,
      rot: 1.2,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3927.7,
      z: 352.1,
      rot: -0.6,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3925.7,
      z: 355.7,
      rot: 0.35,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3922.1,
      z: 357.7,
      rot: -1.45,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3917.9,
      z: 357.7,
      rot: 0.8,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3914.3,
      z: 355.7,
      rot: -0.2,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3912.3,
      z: 352.1,
      rot: 1.55,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'rockLargeD',
      x: 3912.3,
      z: 347.9,
      rot: -0.85,
      scale: 4.1,
      r: 2.2,
      h: 2.4,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'mushroomGlowCluster',
      x: 3905,
      z: 325,
      scale: 2,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'flowerGlow',
      x: 3940,
      z: 330,
      scale: 1.8,
    },
    {
      poiId: 'm03-poi-ponte-raiz',
      origin: 'ancient',
      key: 'marshPlankBridge',
      x: 3980,
      z: 100,
      rot: 0.75,
    },
    {
      poiId: 'm03-poi-ponte-raiz',
      origin: 'natural',
      key: 'marshRootWall',
      x: 3955,
      z: 120,
      rot: -0.6,
      scale: 3,
      r: 4.5,
      h: 5,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'ancient',
      key: 'marshPlankBridge',
      x: 4015,
      z: 250,
      rot: 1.5,
    },
    {
      poiId: 'm03-poi-mirante-farol',
      origin: 'ancient',
      key: 'column',
      x: 4035,
      z: 58,
      rot: 0.2,
      r: 0.6,
      h: 3.75,
    },
    {
      poiId: 'm03-poi-mirante-farol',
      origin: 'ancient',
      key: 'columnBroken',
      x: 4065,
      z: 50,
      rot: -0.6,
      r: 0.6,
      h: 2.1,
    },
    {
      poiId: 'm03-poi-mirante-farol',
      origin: 'ancient',
      key: 'stagShrine',
      x: 4050,
      z: 70,
      rot: Math.PI,
      scale: 1.4,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-mirante-farol',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4080,
      z: 35,
      rot: 0.7,
      scale: 2,
      r: 1.2,
      h: 8,
    },
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'natural',
      key: 'oakTree',
      x: 3565,
      z: 155,
      rot: 0.6,
      scale: 2.4,
      r: 1.4,
      h: 15,
    },
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'natural',
      key: 'oakTree',
      x: 3548,
      z: 260,
      rot: -1.1,
      scale: 2.2,
      r: 1.3,
      h: 14,
    },
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'natural',
      key: 'oakTree',
      x: 3690,
      z: 150,
      rot: 1.4,
      scale: 2.3,
      r: 1.3,
      h: 15,
    },
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'natural',
      key: 'oakTree',
      x: 3700,
      z: 285,
      rot: -0.4,
      scale: 2.5,
      r: 1.4,
      h: 16,
    },
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'natural',
      key: 'oakTree',
      x: 3610,
      z: 310,
      rot: 0.8,
      scale: 2.3,
      r: 1.3,
      h: 15,
    },
    {
      poiId: 'm03-poi-abrigo-silvas',
      origin: 'natural',
      key: 'oakTree',
      x: 3665,
      z: 315,
      rot: -0.7,
      scale: 2.4,
      r: 1.4,
      h: 15,
    },
    // Hand-authored canopy clusters close each encounter silhouette without
    // turning the roads into invisible mazes. These are intentionally placed,
    // not scattered: each cluster frames one quest landscape or exploration
    // route and leaves the authored road loops readable from ground level.
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'oakTree',
      x: 3695,
      z: 70,
      rot: 0.2,
      scale: 2.2,
      r: 1.3,
      h: 14,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'oakTree',
      x: 3710,
      z: 155,
      rot: -0.6,
      scale: 2.4,
      r: 1.4,
      h: 15,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 3795,
      z: 75,
      rot: 1.1,
      scale: 2.1,
      r: 1.2,
      h: 8.4,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 3810,
      z: 155,
      rot: -1.3,
      scale: 2.3,
      r: 1.3,
      h: 9.2,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'natural',
      key: 'oakTree',
      x: 3725,
      z: 365,
      rot: 0.8,
      scale: 2.3,
      r: 1.3,
      h: 15,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 3825,
      z: 380,
      rot: -0.4,
      scale: 2.2,
      r: 1.3,
      h: 8.8,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'natural',
      key: 'oakTree',
      x: 3845,
      z: 290,
      rot: 1.5,
      scale: 2.1,
      r: 1.2,
      h: 14,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 3840,
      z: -45,
      rot: -0.9,
      scale: 2.3,
      r: 1.3,
      h: 9.2,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 3950,
      z: -35,
      rot: 0.5,
      scale: 2.2,
      r: 1.3,
      h: 8.8,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'oakTree',
      x: 3960,
      z: 390,
      rot: 1.2,
      scale: 2.5,
      r: 1.4,
      h: 16,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4085,
      z: 380,
      rot: -1.1,
      scale: 2.2,
      r: 1.3,
      h: 8.8,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4020,
      z: 125,
      rot: 0.4,
      scale: 2.2,
      r: 1.3,
      h: 8.8,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4120,
      z: 245,
      rot: -0.7,
      scale: 2.3,
      r: 1.3,
      h: 9.2,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4120,
      z: -35,
      rot: 1.3,
      scale: 2.4,
      r: 1.4,
      h: 9.6,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 4235,
      z: 95,
      rot: -0.2,
      scale: 2.3,
      r: 1.3,
      h: 9.2,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'oakTree',
      x: 3880,
      z: 400,
      rot: 0.9,
      scale: 2.3,
      r: 1.3,
      h: 15,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'natural',
      key: 'mushroomGlowCluster',
      x: 3690,
      z: 92,
      scale: 1.5,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'corruption',
      key: 'mushroomGlowCluster',
      x: 3835,
      z: 345,
      scale: 1.8,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'natural',
      key: 'mushroomGlowCluster',
      x: 3940,
      z: -5,
      scale: 1.5,
    },
    {
      poiId: 'm03-poi-covil-vigia',
      origin: 'natural',
      key: 'mushroomGiantPurple',
      x: 4070,
      z: 365,
      rot: 0.8,
      scale: 1.3,
    },
    {
      poiId: 'm03-poi-ruinas-marca',
      origin: 'ancient',
      key: 'crystalAmethystCluster',
      x: 3722,
      z: 142,
      rot: 0.7,
      scale: 0.55,
      r: 1.35,
      h: 3.3,
    },
    {
      poiId: 'm03-poi-jardim-ferido',
      origin: 'corruption',
      key: 'crystalAmethystCluster',
      x: 3815,
      z: 370,
      rot: -0.6,
      scale: 0.7,
      r: 1.7,
      h: 4.2,
    },
    {
      poiId: 'm03-poi-campanario-partido',
      origin: 'ancient',
      key: 'crystalAmethystCluster',
      x: 3860,
      z: 42,
      rot: 1.4,
      scale: 0.6,
      r: 1.45,
      h: 3.6,
    },
    {
      poiId: 'm03-poi-gruta-orvalho',
      origin: 'natural',
      key: 'crystalAmethystCluster',
      x: 3888,
      z: 370,
      rot: -1.1,
      scale: 0.75,
      r: 1.8,
      h: 4.5,
    },
    {
      poiId: 'm03-poi-quatro-totens',
      origin: 'ancient',
      key: 'crystalAmethystCluster',
      x: 4112,
      z: 136,
      rot: 2.1,
      scale: 0.65,
      r: 1.6,
      h: 3.9,
    },
    {
      poiId: 'm03-poi-garganta-uivo',
      origin: 'guardian',
      key: 'starHeartCrystal',
      x: 4218,
      z: -28,
      rot: -0.8,
      scale: 0.8,
      r: 1.75,
      h: 4.8,
    },
  ],
  npcPlacements: [
    {
      id: 'm03-bosque-do-vale-cacadora-lume',
      name: 'Caçadora Lume',
      title: 'Batedora do Vale',
      pos: { x: 3615, z: 210 },
      facing: 0.8,
      greeting: 'O bosque ficou mudo, mas as pegadas continuam contando a verdade.',
      campaign: true,
    },
    {
      id: 'm03-bosque-do-vale-selene-folhavera',
      name: 'Selene Folhavera',
      title: 'Curadora das Silvas',
      pos: { x: 3738, z: 295 },
      facing: -0.7,
      greeting: 'Uma erva doente revela mais sobre a água do que sobre a própria folha.',
      campaign: true,
    },
    {
      id: 'm03-bosque-do-vale-elara-da-centelha',
      name: 'Elara da Centelha',
      title: 'Sineira da Rede',
      pos: { x: 3820, z: 65 },
      facing: 0.2,
      greeting: 'O sino não perdeu a voz. Alguém mudou aquilo que ele chama.',
      campaign: true,
    },
    {
      id: 'm03-bosque-do-vale-eron-sete-marcas',
      name: 'Eron Sete Marcas',
      title: 'Leitor dos Totens',
      pos: { x: 4030, z: 65 },
      facing: -0.3,
      greeting: 'Quatro pedras apontam uma estrada quando você deixa de tratá-las como altares.',
      campaign: true,
    },
    {
      id: 'm03-bosque-do-vale-iria-musgoazul',
      name: 'Iria Musgoazul',
      title: 'Herbalista',
      pos: { x: 3730, z: 275 },
      facing: -1.1,
      greeting: 'Traga folhas sadias e feridas. A diferença entre elas é o nosso mapa.',
      campaign: false,
    },
    {
      id: 'm03-bosque-do-vale-tomas-raizbaixa',
      name: 'Tomás Raizbaixa',
      title: 'Guardião do Abrigo',
      pos: { x: 3580, z: 205 },
      facing: Math.PI / 2,
      greeting: 'As encostas são nossas muralhas. Os arcos apenas mostram onde a trilha começa.',
      campaign: false,
    },
    {
      id: 'm03-bosque-do-vale-lina-das-selas',
      name: 'Lina das Selas',
      title: 'Tratadora de Montarias',
      pos: { x: 3668, z: 212 },
      facing: -Math.PI / 2,
      greeting: 'Uma montaria sente raízes instáveis antes de você. Não ignore quando ela hesitar.',
      campaign: false,
    },
    {
      id: 'm03-bosque-do-vale-orla-pedralume',
      name: 'Orla Pedralume',
      title: 'Encantadora',
      pos: { x: 3690, z: 165 },
      facing: Math.PI,
      greeting: 'O Selo Lunar guarda a escolha. O item só muda depois que você aceita o resultado.',
      campaign: false,
    },
    {
      id: 'm03-bosque-do-vale-breno-folhasol',
      name: 'Breno Folhassol',
      title: 'Provedor do Vale',
      pos: { x: 3598, z: 250 },
      facing: 0.4,
      greeting: 'Temos corda, sal e alimento. Para coragem, procure quem voltou da garganta.',
      campaign: false,
    },
  ],
  noticeboard: { x: 3638, z: 244 },
};

// The campaign scaffold still reserves the old eastern province for M05 to
// M08. Keep this whole authored valley beyond that temporary grid so no frozen
// map can leak camps or props into M03 while preserving the designed topology.
const M03_WORLD_OFFSET_X = 800;
const shiftPoint = (point: Readonly<Point>): Point => ({
  x: point.x + M03_WORLD_OFFSET_X,
  z: point.z,
});

export const M03_BOSQUE_DO_VALE_BLUEPRINT: Mir4M03WorldBlueprint = {
  ...M03_LOCAL_BLUEPRINT,
  bounds: {
    ...M03_LOCAL_BLUEPRINT.bounds,
    xMin: M03_LOCAL_BLUEPRINT.bounds.xMin + M03_WORLD_OFFSET_X,
    xMax: M03_LOCAL_BLUEPRINT.bounds.xMax + M03_WORLD_OFFSET_X,
  },
  hub: shiftPoint(M03_LOCAL_BLUEPRINT.hub),
  graveyard: shiftPoint(M03_LOCAL_BLUEPRINT.graveyard),
  portalIn: shiftPoint(M03_LOCAL_BLUEPRINT.portalIn),
  portalOut: shiftPoint(M03_LOCAL_BLUEPRINT.portalOut),
  missionSites: M03_LOCAL_BLUEPRINT.missionSites.map((site) => ({
    ...site,
    pos: shiftPoint(site.pos),
  })),
  pointsOfInterest: M03_LOCAL_BLUEPRINT.pointsOfInterest.map((poi) => ({
    ...poi,
    pos: shiftPoint(poi.pos),
  })),
  biomePaint: {
    ...M03_LOCAL_BLUEPRINT.biomePaint,
    originX: M03_LOCAL_BLUEPRINT.biomePaint.originX + M03_WORLD_OFFSET_X,
    ids: [...M03_LOCAL_BLUEPRINT.biomePaint.ids],
  },
  roads: M03_LOCAL_BLUEPRINT.roads.map((road) => road.map(shiftPoint)),
  litRoads: M03_LOCAL_BLUEPRINT.litRoads.map((road) => road.map(shiftPoint)),
  dryCrossings: M03_LOCAL_BLUEPRINT.dryCrossings.map((crossing) => ({
    ...crossing,
    x: crossing.x + M03_WORLD_OFFSET_X,
  })),
  camps: M03_LOCAL_BLUEPRINT.camps.map((camp) => ({
    ...camp,
    center: shiftPoint(camp.center),
  })),
  objectiveAnchors: M03_LOCAL_BLUEPRINT.objectiveAnchors.map((plan) => ({
    ...plan,
    points: plan.points.map(shiftPoint),
  })),
  lakes: M03_LOCAL_BLUEPRINT.lakes.map((lake) => ({
    ...lake,
    x: lake.x + M03_WORLD_OFFSET_X,
  })),
  terrainEdits: M03_LOCAL_BLUEPRINT.terrainEdits.map((edit) => ({
    ...edit,
    x: edit.x + M03_WORLD_OFFSET_X,
  })),
  ruinRings: M03_LOCAL_BLUEPRINT.ruinRings.map((ring) => ({
    ...ring,
    x: ring.x + M03_WORLD_OFFSET_X,
  })),
  decorPlacements: M03_LOCAL_BLUEPRINT.decorPlacements.map((placement) => ({
    ...placement,
    x: placement.x + M03_WORLD_OFFSET_X,
  })),
  npcPlacements: M03_LOCAL_BLUEPRINT.npcPlacements.map((npc) => ({
    ...npc,
    pos: shiftPoint(npc.pos),
  })),
  noticeboard: shiftPoint(M03_LOCAL_BLUEPRINT.noticeboard),
};
