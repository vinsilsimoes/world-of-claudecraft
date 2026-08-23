// Trilha dos Juncos is a production-authored wetland circuit. Water, raised
// settlements, bridges, quest sites and danger escalation share one layout so
// the marsh reads as a lived place instead of scattered swamp decoration.

import type { HeightStamp, ZonePropsDef } from '../../types';

type Point = { x: number; z: number };
type MissionSiteId =
  | 'three-flames-reeds'
  | 'scout-crossing'
  | 'four-voices-islands'
  | 'sunken-depot'
  | 'three-tide-shelters'
  | 'guardian-root';
type PoiPurpose = 'service' | 'quest' | 'exploration' | 'transition';
type PoiOccupants = 'villagers' | 'imps' | 'raiders' | 'spirits' | 'wildlife' | 'guardians';
type PoiArchitecture =
  | 'raised-marsh-settlement'
  | 'natural-wetland'
  | 'bridge-defense'
  | 'ancient-wetland'
  | 'emergency-shelters'
  | 'root-sanctuary';
type DecorOrigin = 'settlement' | 'natural' | 'raider' | 'ancient' | 'rescue' | 'guardian';
type DecorProp = NonNullable<ZonePropsDef['decorProps']>[number];

export interface Mir4M02MissionSite {
  id: MissionSiteId;
  questId: `M02-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  label: string;
  pos: Point;
  dangerTier: 0 | 1 | 2 | 3;
  levelRange: readonly [number, number];
  gameplay: string;
}

export interface Mir4M02PointOfInterest {
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

export interface Mir4M02CampPlan {
  questId: `M02-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  mobId: string;
  center: Point;
  radius: number;
  count: number;
  levelRange: readonly [number, number];
}

export interface Mir4M02ObjectiveAnchorPlan {
  questId: `M02-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  stageIndex: number;
  points: readonly Point[];
}

export interface Mir4M02DecorPlacement extends DecorProp {
  poiId: string;
  origin: DecorOrigin;
}

interface Mir4M02NpcPlacement {
  id: string;
  name: string;
  title: string;
  pos: Point;
  facing: number;
  greeting: string;
  campaign: boolean;
}

export interface Mir4M02WorldBlueprint {
  mapId: 'm02-trilha-dos-juncos';
  authoringStatus: 'production-authored';
  fantasy: string;
  progressionPromise: string;
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  hub: Point;
  hubRadius: number;
  graveyard: Point;
  portalIn: Point;
  portalOut: Point;
  missionSites: readonly Mir4M02MissionSite[];
  pointsOfInterest: readonly Mir4M02PointOfInterest[];
  roads: readonly (readonly Point[])[];
  litRoads: readonly (readonly Point[])[];
  dryCrossings: readonly { x: number; z: number; radius: number }[];
  camps: readonly Mir4M02CampPlan[];
  objectiveAnchors: readonly Mir4M02ObjectiveAnchorPlan[];
  lakes: readonly { x: number; z: number; radius: number }[];
  terrainEdits: readonly HeightStamp[];
  decorPlacements: readonly Mir4M02DecorPlacement[];
  npcPlacements: readonly Mir4M02NpcPlacement[];
  noticeboard: Point;
}

const MISSION_SITES: readonly Mir4M02MissionSite[] = [
  {
    id: 'three-flames-reeds',
    questId: 'M02-Q01',
    label: 'Juncal das Três Chamas',
    pos: { x: 3200, z: -62 },
    dangerTier: 0,
    levelRange: [11, 12],
    gameplay:
      'Three visible sluice markers sit in separate reed pockets, so their runic order must be read before activation.',
  },
  {
    id: 'scout-crossing',
    questId: 'M02-Q02',
    label: 'Passagem dos Batedores',
    pos: { x: 2995, z: 5 },
    dangerTier: 1,
    levelRange: [13, 14],
    gameplay:
      'The escort chooses between two defended banks and must cross both exposed bridge approaches.',
  },
  {
    id: 'four-voices-islands',
    questId: 'M02-Q03',
    label: 'Ilhas das Quatro Vozes',
    pos: { x: 3310, z: 60 },
    dangerTier: 1,
    levelRange: [15, 15],
    gameplay:
      'Four dry memory shelves surround a ritual focus while drowned patrols control the shallow approaches.',
  },
  {
    id: 'sunken-depot',
    questId: 'M02-Q04',
    label: 'Entreposto Afundado',
    pos: { x: 2915, z: 90 },
    dangerTier: 2,
    levelRange: [16, 17],
    gameplay:
      'A capsized supply run left loose cargo in an animal feeding ground without placing an implausible settlement there.',
  },
  {
    id: 'three-tide-shelters',
    questId: 'M02-Q05',
    label: 'Três Abrigos da Maré',
    pos: { x: 3150, z: 175 },
    dangerTier: 2,
    levelRange: [18, 19],
    gameplay:
      'Three separated emergency shelters force movement during the survival event instead of rewarding a stationary kill pile.',
  },
  {
    id: 'guardian-root',
    questId: 'M02-Q06',
    label: 'Raiz do Guardião',
    pos: { x: 3375, z: 205 },
    dangerTier: 3,
    levelRange: [20, 20],
    gameplay:
      'A root-walled sanctuary exposes three wards on the perimeter before the guardian arena opens.',
  },
];

const POINTS_OF_INTEREST: readonly Mir4M02PointOfInterest[] = [
  {
    id: 'm02-poi-posto-duas-pontes',
    label: 'Posto das Duas Pontes',
    pos: { x: 3080, z: -90 },
    radius: 58,
    purpose: 'service',
    occupants: 'villagers',
    architecture: 'raised-marsh-settlement',
    biomeFeature: 'A timber post on the one broad natural levee above the seasonal waterline.',
    narrativeRole:
      'The post survives by maintaining two crossings rather than controlling the whole marsh.',
    gameplayRole: 'Dialogue, contracts, crafting, spirit preparation and safe recovery.',
  },
  {
    id: 'm02-poi-juncal-tres-chamas',
    label: 'Juncal das Três Chamas',
    pos: { x: 3200, z: -62 },
    radius: 34,
    purpose: 'quest',
    occupants: 'imps',
    architecture: 'natural-wetland',
    biomeFeature: 'Scorched reed pockets separated by wet hummocks and soot-black channels.',
    narrativeRole: 'The three burns reveal the first rune of the Veil when read in sequence.',
    gameplayRole: 'Clue inspection, ordered interaction and mobile guardian pressure.',
  },
  {
    id: 'm02-poi-passagem-batedores',
    label: 'Passagem dos Batedores',
    pos: { x: 3040, z: 25 },
    radius: 38,
    purpose: 'quest',
    occupants: 'raiders',
    architecture: 'bridge-defense',
    biomeFeature: 'A narrow west bank where two plank crossings meet a raised scout path.',
    narrativeRole: 'Captured route markers prove the raiders know the Farol network.',
    gameplayRole: 'Escort start, two route choices and the first bridge ambush.',
  },
  {
    id: 'm02-poi-cais-lodo-claro',
    label: 'Cais do Lodo Claro',
    pos: { x: 2900, z: -22 },
    radius: 24,
    purpose: 'exploration',
    occupants: 'villagers',
    architecture: 'raised-marsh-settlement',
    biomeFeature: 'A small maintained landing on the western inlet.',
    narrativeRole: 'It explains how people and cargo reach the post when the roads flood.',
    gameplayRole: 'Optional landmark, fishing supply cache and safe western shortcut.',
  },
  {
    id: 'm02-poi-ilhas-quatro-vozes',
    label: 'Ilhas das Quatro Vozes',
    pos: { x: 3310, z: 60 },
    radius: 46,
    purpose: 'quest',
    occupants: 'spirits',
    architecture: 'ancient-wetland',
    biomeFeature: 'Four moss shelves remain dry around a drowned shrine fragment.',
    narrativeRole: 'Each memory names Neris and recognizes the Centelha.',
    gameplayRole: 'Evidence circuit, spirit-system rite and reconstruction choice.',
  },
  {
    id: 'm02-poi-farol-velho',
    label: 'Farol Velho do Juncal',
    pos: { x: 3240, z: 130 },
    radius: 30,
    purpose: 'exploration',
    occupants: 'guardians',
    architecture: 'ancient-wetland',
    biomeFeature: 'A broken stone-and-root beacon on the highest knoll in the marsh.',
    narrativeRole: 'Its sight line connects the memory islands to the final guardian root.',
    gameplayRole: 'Waypoint, vista, elite pocket and risky cross-marsh shortcut.',
  },
  {
    id: 'm02-poi-entreposto-afundado',
    label: 'Entreposto Afundado',
    pos: { x: 2915, z: 90 },
    radius: 36,
    purpose: 'quest',
    occupants: 'wildlife',
    architecture: 'natural-wetland',
    biomeFeature: 'A natural feeding bank littered by cargo from one capsized supply boat.',
    narrativeRole: 'Consecrated salt in the provisions can stabilize a newly summoned spirit.',
    gameplayRole: 'Source inspection, guaranteed quest drops and active-spirit recovery.',
  },
  {
    id: 'm02-poi-atalho-folha-seca',
    label: 'Atalho da Folha Seca',
    pos: { x: 3040, z: 100 },
    radius: 24,
    purpose: 'exploration',
    occupants: 'wildlife',
    architecture: 'natural-wetland',
    biomeFeature: 'A seasonal ridge hidden behind tall reeds and willow roots.',
    narrativeRole: 'The civilian map preserves a route the Veil is erasing.',
    gameplayRole: 'Discoverable shortcut connecting the west bank to the tide shelters.',
  },
  {
    id: 'm02-poi-abrigos-mare',
    label: 'Três Abrigos da Maré',
    pos: { x: 3150, z: 175 },
    radius: 48,
    purpose: 'quest',
    occupants: 'villagers',
    architecture: 'emergency-shelters',
    biomeFeature: 'Three rescue hummocks surround a basin that floods during the enemy surge.',
    narrativeRole: 'The shelters prove locals adapted to the marsh rather than conquering it.',
    gameplayRole: 'Three-beacon preparation followed by a moving survival encounter.',
  },
  {
    id: 'm02-poi-raiz-guardiao',
    label: 'Raiz do Guardião',
    pos: { x: 3375, z: 205 },
    radius: 52,
    purpose: 'quest',
    occupants: 'guardians',
    architecture: 'root-sanctuary',
    biomeFeature: 'Massive roots form a dry amphitheater above the northeast bog.',
    narrativeRole: 'The guardian was rooted here to halt the Conclave advance.',
    gameplayRole: 'Three ward breaks, guardian confrontation and exit to the Vale.',
  },
];

export const M02_TRILHA_DOS_JUNCOS_BLUEPRINT: Mir4M02WorldBlueprint = {
  mapId: 'm02-trilha-dos-juncos',
  authoringStatus: 'production-authored',
  fantasy:
    'A wetland road network kept alive by raised walkways while fire, tide and drowned memories reveal a buried beacon.',
  progressionPromise:
    'The player moves from readable interactions to escorted crossings, evidence islands, wildlife recovery, a mobile survival event and a warded guardian.',
  bounds: { xMin: 2840, xMax: 3480, zMin: -160, zMax: 280 },
  hub: { x: 3080, z: -90 },
  hubRadius: 58,
  graveyard: { x: 3048, z: -126 },
  portalIn: { x: 2890, z: -100 },
  portalOut: { x: 3440, z: 225 },
  missionSites: MISSION_SITES,
  pointsOfInterest: POINTS_OF_INTEREST,
  roads: [
    [
      { x: 2890, z: -100 },
      { x: 2970, z: -103 },
      { x: 3030, z: -96 },
      { x: 3080, z: -90 },
    ],
    [
      { x: 3080, z: -90 },
      { x: 3145, z: -88 },
      { x: 3200, z: -62 },
    ],
    [
      { x: 3080, z: -90 },
      { x: 3050, z: -55 },
      { x: 3010, z: -30 },
      { x: 2995, z: 5 },
    ],
    [
      { x: 2995, z: 5 },
      { x: 3040, z: 25 },
      { x: 3090, z: 30 },
      { x: 3160, z: 0 },
      { x: 3200, z: -62 },
    ],
    [
      { x: 3200, z: -62 },
      { x: 3185, z: 0 },
      { x: 3200, z: 58 },
      { x: 3248, z: 58 },
      { x: 3310, z: 60 },
    ],
    [
      { x: 3310, z: 60 },
      { x: 3275, z: 100 },
      { x: 3240, z: 130 },
      { x: 3195, z: 155 },
      { x: 3150, z: 175 },
    ],
    [
      { x: 2995, z: 5 },
      { x: 2950, z: 45 },
      { x: 2915, z: 90 },
    ],
    [
      { x: 2915, z: 90 },
      { x: 2970, z: 115 },
      { x: 3040, z: 100 },
      { x: 3090, z: 135 },
      { x: 3150, z: 175 },
    ],
    [
      { x: 3150, z: 175 },
      { x: 3250, z: 190 },
      { x: 3375, z: 205 },
      { x: 3440, z: 225 },
    ],
  ],
  litRoads: [
    [
      { x: 2890, z: -100 },
      { x: 2970, z: -103 },
      { x: 3030, z: -96 },
      { x: 3080, z: -90 },
      { x: 3140, z: -88 },
    ],
    [
      { x: 3045, z: -120 },
      { x: 3080, z: -90 },
      { x: 3118, z: -56 },
    ],
  ],
  dryCrossings: [
    { x: 3040, z: 25, radius: 30 },
    { x: 3248, z: 58, radius: 30 },
  ],
  camps: [
    {
      questId: 'M02-Q01',
      mobId: 'thorn_imp',
      center: { x: 3200, z: -62 },
      radius: 27,
      count: 8,
      levelRange: [11, 12],
    },
    {
      questId: 'M02-Q02',
      mobId: 'bandit_cutthroat',
      center: { x: 2995, z: 5 },
      radius: 30,
      count: 8,
      levelRange: [13, 14],
    },
    {
      questId: 'M02-Q03',
      mobId: 'moss_skeleton',
      center: { x: 3310, z: 60 },
      radius: 32,
      count: 8,
      levelRange: [15, 15],
    },
    {
      questId: 'M02-Q04',
      mobId: 'rabid_boar',
      center: { x: 2915, z: 90 },
      radius: 30,
      count: 9,
      levelRange: [16, 17],
    },
    {
      questId: 'M02-Q05',
      mobId: 'owlbear_cub',
      center: { x: 3150, z: 175 },
      radius: 38,
      count: 10,
      levelRange: [18, 19],
    },
    {
      questId: 'M02-Q06',
      mobId: 'briar_guard',
      center: { x: 3375, z: 205 },
      radius: 34,
      count: 9,
      levelRange: [20, 20],
    },
  ],
  // Quest interaction geometry is authored against visible landmarks. The
  // runtime consumes these exact points before its generic fallback, so an
  // objective never completes at an unrelated hash position in the camp.
  objectiveAnchors: [
    {
      questId: 'M02-Q01',
      stageIndex: 2,
      points: [
        { x: 3177, z: -69 },
        { x: 3170, z: -40 },
        { x: 3226, z: -78 },
      ],
    },
    {
      questId: 'M02-Q01',
      stageIndex: 4,
      points: [
        { x: 3177, z: -69 },
        { x: 3170, z: -40 },
        { x: 3226, z: -78 },
      ],
    },
    {
      questId: 'M02-Q02',
      stageIndex: 2,
      points: [
        { x: 2995, z: 5 },
        { x: 3040, z: 25 },
        { x: 3248, z: 58 },
      ],
    },
    {
      questId: 'M02-Q03',
      stageIndex: 2,
      points: [
        { x: 3290, z: 38 },
        { x: 3275, z: 80 },
        { x: 3294, z: 84 },
      ],
    },
    { questId: 'M02-Q03', stageIndex: 4, points: [{ x: 3328, z: 94 }] },
    {
      questId: 'M02-Q04',
      stageIndex: 2,
      points: [
        { x: 2940, z: 72 },
        { x: 2938, z: 101 },
        { x: 2892, z: 88 },
      ],
    },
    {
      questId: 'M02-Q05',
      stageIndex: 2,
      points: [
        { x: 3110, z: 190 },
        { x: 3175, z: 202 },
        { x: 3130, z: 202 },
      ],
    },
    {
      questId: 'M02-Q06',
      stageIndex: 2,
      points: [
        { x: 3340, z: 212 },
        { x: 3395, z: 174 },
        { x: 3410, z: 225 },
      ],
    },
    { questId: 'M02-Q06', stageIndex: 3, points: [{ x: 3375, z: 205 }] },
    { questId: 'M02-Q06', stageIndex: 4, points: [{ x: 3372, z: 230 }] },
  ],
  lakes: [
    { x: 3040, z: 49, radius: 18 },
    { x: 3040, z: 1, radius: 18 },
    { x: 3248, z: 35, radius: 14 },
    { x: 3248, z: 81, radius: 14 },
    { x: 3360, z: 60, radius: 25 },
    { x: 3310, z: 0, radius: 26 },
    { x: 2890, z: 190, radius: 30 },
    { x: 3060, z: 215, radius: 26 },
    { x: 3150, z: 75, radius: 26 },
    { x: 3280, z: -90, radius: 26 },
    { x: 3380, z: 120, radius: 28 },
    { x: 3420, z: 140, radius: 22 },
    { x: 2880, z: -12, radius: 16 },
    { x: 2880, z: 88, radius: 16 },
  ],
  terrainEdits: [
    { x: 3080, z: -90, radius: 78, delta: 8, falloff: 'smooth' },
    { x: 2940, z: -100, radius: 58, delta: 4, falloff: 'smooth' },
    { x: 3200, z: -62, radius: 45, delta: 3, falloff: 'smooth' },
    { x: 2995, z: 5, radius: 48, delta: 4, falloff: 'smooth' },
    { x: 3310, z: 60, radius: 48, delta: 5, falloff: 'smooth' },
    { x: 2915, z: 90, radius: 44, delta: 3, falloff: 'smooth' },
    { x: 3150, z: 175, radius: 58, delta: 5, falloff: 'smooth' },
    { x: 3240, z: 130, radius: 38, delta: 9, falloff: 'smooth' },
    { x: 3375, z: 205, radius: 62, delta: 11, falloff: 'smooth' },
  ],
  decorPlacements: [
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeWardenGatehouse',
      x: 3058,
      z: -128,
      rot: Math.PI / 2,
      hw: 3.9,
      hd: 3.5,
      h: 10.5,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeCrookedReedInn',
      x: 3098,
      z: -112,
      rot: 0.2,
      hw: 4.5,
      hd: 4,
      h: 8.8,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeMoonwortApothecary',
      x: 3122,
      z: -72,
      rot: -1.2,
      hw: 3.5,
      hd: 3,
      h: 7.2,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeScoutLodge',
      x: 3064,
      z: -48,
      rot: 2.9,
      hw: 4,
      hd: 3.25,
      h: 7.6,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeMirelightCistern',
      x: 3090,
      z: -72,
      rot: 0,
      r: 1.8,
      h: 2,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeProvisionStall',
      x: 3112,
      z: -107,
      rot: -0.5,
      hw: 1.6,
      hd: 0.8,
      h: 2.8,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeMusterBoard',
      x: 3080,
      z: -72,
      rot: 0.6,
      hw: 1.2,
      hd: 0.3,
      h: 2.6,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgeGateArch',
      x: 3028,
      z: -96,
      rot: Math.PI / 2,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgePalisadeWing',
      x: 3038,
      z: -126,
      rot: 0,
      hw: 4,
      hd: 0.375,
      h: 3.2,
    },
    {
      poiId: 'm02-poi-posto-duas-pontes',
      origin: 'settlement',
      key: 'fenbridgePalisadeWing',
      x: 3038,
      z: -64,
      rot: 0,
      hw: 4,
      hd: 0.375,
      h: 3.2,
    },
    {
      poiId: 'm02-poi-cais-lodo-claro',
      origin: 'settlement',
      key: 'fenbridgeBoardwalk',
      x: 2910,
      z: -28,
      rot: Math.PI / 2,
    },
    {
      poiId: 'm02-poi-cais-lodo-claro',
      origin: 'settlement',
      key: 'rowboat',
      x: 2884,
      z: -12,
      rot: 0.7,
      scale: 1.1,
      r: 1.5,
      h: 1.3,
      float: 0.1,
    },
    {
      poiId: 'm02-poi-juncal-tres-chamas',
      origin: 'ancient',
      key: 'marshSluicePost',
      x: 3177,
      z: -69,
      rot: 0.2,
      scale: 1.8,
      r: 1.2,
      h: 4,
    },
    {
      poiId: 'm02-poi-juncal-tres-chamas',
      origin: 'ancient',
      key: 'marshSluicePost',
      x: 3170,
      z: -40,
      rot: -0.5,
      scale: 1.8,
      r: 1.2,
      h: 4,
    },
    {
      poiId: 'm02-poi-juncal-tres-chamas',
      origin: 'ancient',
      key: 'marshSluicePost',
      x: 3226,
      z: -78,
      rot: 0.8,
      scale: 1.8,
      r: 1.2,
      h: 4,
    },
    {
      poiId: 'm02-poi-juncal-tres-chamas',
      origin: 'natural',
      key: 'marshReedCluster',
      x: 3190,
      z: -92,
      rot: 0.4,
      scale: 1.4,
    },
    {
      poiId: 'm02-poi-juncal-tres-chamas',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 3232,
      z: -52,
      rot: -0.8,
      scale: 2,
      r: 1.2,
      h: 8,
    },
    {
      poiId: 'm02-poi-passagem-batedores',
      origin: 'settlement',
      key: 'marshPlankBridge',
      x: 3040,
      z: 25,
      rot: 1.35,
    },
    {
      poiId: 'm02-poi-passagem-batedores',
      origin: 'settlement',
      key: 'fenbridgeBoardwalk',
      x: 3010,
      z: 4,
      rot: 1.1,
    },
    {
      poiId: 'm02-poi-passagem-batedores',
      origin: 'raider',
      key: 'hexrTent',
      x: 2960,
      z: 22,
      rot: 0.9,
      scale: 1.5,
      r: 2.4,
      h: 3,
    },
    {
      poiId: 'm02-poi-passagem-batedores',
      origin: 'raider',
      key: 'hexFlagRed',
      x: 2970,
      z: -2,
      rot: -0.2,
      scale: 3,
    },
    {
      poiId: 'm02-poi-ilhas-quatro-vozes',
      origin: 'ancient',
      key: 'marshPlankBridge',
      x: 3248,
      z: 58,
      rot: 0.75,
    },
    {
      poiId: 'm02-poi-ilhas-quatro-vozes',
      origin: 'ancient',
      key: 'marshShrineFragment',
      x: 3328,
      z: 94,
      rot: Math.PI,
      scale: 3,
      r: 2.4,
      h: 3,
    },
    {
      poiId: 'm02-poi-ilhas-quatro-vozes',
      origin: 'ancient',
      key: 'marshCorpseCandle',
      x: 3290,
      z: 38,
      rot: 0.2,
    },
    {
      poiId: 'm02-poi-ilhas-quatro-vozes',
      origin: 'ancient',
      key: 'marshCorpseCandle',
      x: 3275,
      z: 80,
      rot: -0.3,
    },
    {
      poiId: 'm02-poi-ilhas-quatro-vozes',
      origin: 'ancient',
      key: 'marshCorpseCandle',
      x: 3294,
      z: 84,
      rot: 0.7,
    },
    {
      poiId: 'm02-poi-ilhas-quatro-vozes',
      origin: 'ancient',
      key: 'marshCorpseCandle',
      x: 3335,
      z: 98,
      rot: -0.8,
    },
    {
      poiId: 'm02-poi-farol-velho',
      origin: 'ancient',
      key: 'marshBellGallows',
      x: 3258,
      z: 132,
      rot: 0.4,
      scale: 2.5,
      r: 2.5,
      h: 7,
    },
    {
      poiId: 'm02-poi-farol-velho',
      origin: 'natural',
      key: 'marshDeadTree',
      x: 3265,
      z: 150,
      rot: -0.6,
      scale: 2.25,
      r: 1.2,
      h: 9,
    },
    {
      poiId: 'm02-poi-entreposto-afundado',
      origin: 'natural',
      key: 'rowboat',
      x: 2892,
      z: 88,
      rot: -1.1,
      scale: 1.1,
      r: 1.5,
      h: 1.3,
      float: 0.1,
    },
    {
      poiId: 'm02-poi-entreposto-afundado',
      origin: 'natural',
      key: 'hexCrateOpen',
      x: 2940,
      z: 72,
      rot: 0.5,
      scale: 1.2,
      r: 1.1,
      h: 1.3,
    },
    {
      poiId: 'm02-poi-entreposto-afundado',
      origin: 'natural',
      key: 'hexSack',
      x: 2938,
      z: 101,
      rot: -0.4,
      scale: 1.2,
    },
    {
      poiId: 'm02-poi-atalho-folha-seca',
      origin: 'natural',
      key: 'willowTree',
      x: 3022,
      z: 112,
      rot: 0.8,
      scale: 8.5,
      r: 1.2,
      h: 10,
    },
    {
      poiId: 'm02-poi-atalho-folha-seca',
      origin: 'natural',
      key: 'marshRootWall',
      x: 3054,
      z: 116,
      rot: 1.2,
      scale: 3.3,
      r: 4.5,
      h: 5,
    },
    {
      poiId: 'm02-poi-abrigos-mare',
      origin: 'rescue',
      key: 'tentSmall',
      x: 3110,
      z: 190,
      rot: 0.5,
      scale: 1.1,
      r: 1.7,
      h: 2.5,
    },
    {
      poiId: 'm02-poi-abrigos-mare',
      origin: 'rescue',
      key: 'tentSmall',
      x: 3175,
      z: 202,
      rot: -1.2,
      scale: 1.1,
      r: 1.7,
      h: 2.5,
    },
    {
      poiId: 'm02-poi-abrigos-mare',
      origin: 'rescue',
      key: 'tentSmall',
      x: 3130,
      z: 202,
      rot: 2.4,
      scale: 1.1,
      r: 1.7,
      h: 2.5,
    },
    {
      poiId: 'm02-poi-raiz-guardiao',
      origin: 'guardian',
      key: 'marshRootWall',
      x: 3340,
      z: 212,
      rot: 0.4,
      scale: 4,
      r: 5,
      h: 6,
    },
    {
      poiId: 'm02-poi-raiz-guardiao',
      origin: 'guardian',
      key: 'marshRootWall',
      x: 3395,
      z: 174,
      rot: -0.9,
      scale: 4,
      r: 5,
      h: 6,
    },
    {
      poiId: 'm02-poi-raiz-guardiao',
      origin: 'guardian',
      key: 'marshRootWall',
      x: 3410,
      z: 225,
      rot: 1.8,
      scale: 4,
      r: 5,
      h: 6,
    },
    {
      poiId: 'm02-poi-raiz-guardiao',
      origin: 'ancient',
      key: 'marshShrineFragment',
      x: 3372,
      z: 230,
      rot: 0,
      scale: 3,
      r: 2.4,
      h: 3,
    },
  ],
  npcPlacements: [
    {
      id: 'm02-trilha-dos-juncos-nara-dos-juncos',
      name: 'Nara dos Juncos',
      title: 'Guardadora das Rotas',
      pos: { x: 3088, z: -70 },
      facing: Math.PI,
      greeting: 'O fogo deixou uma ordem nos juncos. Leia antes de tocar nos marcos.',
      campaign: true,
    },
    {
      id: 'm02-trilha-dos-juncos-darian-passojunco',
      name: 'Darian Passojunco',
      title: 'Mestre dos Batedores',
      pos: { x: 3058, z: -64 },
      facing: 0.8,
      greeting: 'Uma ponte segura depende da margem que você ainda não consegue ver.',
      campaign: true,
    },
    {
      id: 'm02-trilha-dos-juncos-neris-da-centelha',
      name: 'Neris da Centelha',
      title: 'Cartografa das Memórias',
      pos: { x: 3115, z: -58 },
      facing: -0.8,
      greeting: 'As ilhas guardam vozes. Não confunda repetição com verdade.',
      campaign: true,
    },
    {
      id: 'm02-trilha-dos-juncos-bram-sete-marcas',
      name: 'Bram Sete Marcas',
      title: 'Artífice do Posto',
      pos: { x: 3070, z: -108 },
      facing: 0.2,
      greeting: 'Sal, corda e metal duram quando o caminho desaparece sob a água.',
      campaign: true,
    },
    {
      id: 'm02-trilha-dos-juncos-falia-barqueira',
      name: 'Falia Barqueira',
      title: 'Barqueira',
      pos: { x: 3040, z: -96 },
      facing: Math.PI / 2,
      greeting: 'A água parece parada, mas muda de direção antes da maré.',
      campaign: false,
    },
    {
      id: 'm02-trilha-dos-juncos-toren-vigia',
      name: 'Toren Vigia',
      title: 'Sentinela da Levada',
      pos: { x: 3052, z: -45 },
      facing: 0,
      greeting: 'As chamas estão a leste. Os saqueadores preferem a margem oeste.',
      campaign: false,
    },
    {
      id: 'm02-trilha-dos-juncos-mira-pescadora',
      name: 'Mira Pescadora',
      title: 'Pescadora',
      pos: { x: 3105, z: -124 },
      facing: -0.3,
      greeting: 'Peixe nenhum chega perto das ilhas quando as vozes despertam.',
      campaign: false,
    },
    {
      id: 'm02-trilha-dos-juncos-jorin-guardaponte',
      name: 'Jorin Guardaponte',
      title: 'Carpinteiro das Pontes',
      pos: { x: 3128, z: -92 },
      facing: -1.2,
      greeting: 'Madeira boa avisa antes de quebrar. Escute a travessia.',
      campaign: false,
    },
    {
      id: 'm02-trilha-dos-juncos-elen-salina',
      name: 'Elen Salina',
      title: 'Provedora de Sal',
      pos: { x: 3130, z: -70 },
      facing: 2.6,
      greeting: 'O sal do entreposto era para alimento. Agora pode salvar um Espírito.',
      campaign: false,
    },
  ],
  noticeboard: { x: 3068, z: -78 },
};
