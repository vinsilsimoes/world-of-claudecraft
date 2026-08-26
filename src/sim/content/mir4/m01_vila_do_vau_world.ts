// Vila do Vau is the first production-authored MIR4 map. Its geometry follows
// the local story and encounter flow. Later campaign maps stay out of the
// production world until they receive an equivalent map-specific blueprint.

import type { HeightStamp, ZonePropsDef } from '../../types';

type Point = { x: number; z: number };
type MissionSiteId =
  | 'trail-clearing'
  | 'boar-meadow'
  | 'broken-caravan'
  | 'moss-cemetery'
  | 'seven-marks-bridge'
  | 'alpha-grove';
type PoiPurpose = 'service' | 'quest' | 'exploration' | 'transition';
type PoiOccupants = 'villagers' | 'wildlife' | 'bandits' | 'undead' | 'guardians';
type PoiArchitecture =
  | 'human-settlement'
  | 'natural'
  | 'bandit-salvage'
  | 'ancient-ruin'
  | 'human-defense';
type DecorOrigin = 'human' | 'natural' | 'ancient' | 'guardian';
type DecorProp = NonNullable<ZonePropsDef['decorProps']>[number];

export interface Mir4M01MissionSite {
  id: MissionSiteId;
  questId: `M01-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  label: string;
  pos: Point;
  dangerTier: 0 | 1 | 2 | 3;
  levelRange: readonly [number, number];
  gameplay: string;
}

export interface Mir4M01PointOfInterest {
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

export interface Mir4M01CampPlan {
  questId: `M01-Q0${1 | 2 | 3 | 4 | 5 | 6}`;
  mobId: string;
  center: Point;
  radius: number;
  count: number;
  levelRange: readonly [number, number];
}

export interface Mir4M01DecorPlacement extends DecorProp {
  poiId: string;
  origin: DecorOrigin;
}

interface Mir4M01NpcPlacement {
  id: string;
  name: string;
  title: string;
  pos: Point;
  facing: number;
  greeting: string;
  campaign: boolean;
}

export interface Mir4M01WorldBlueprint {
  mapId: 'm01-vila-do-vau';
  authoringStatus: 'production-authored';
  fantasy: string;
  progressionPromise: string;
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  hub: Point;
  hubRadius: number;
  graveyard: Point;
  portalIn: Point;
  portalOut: Point;
  missionSites: readonly Mir4M01MissionSite[];
  pointsOfInterest: readonly Mir4M01PointOfInterest[];
  roads: readonly (readonly Point[])[];
  litRoads: readonly (readonly Point[])[];
  dryCrossings: readonly { x: number; z: number; radius: number }[];
  camps: readonly Mir4M01CampPlan[];
  lakes: readonly { x: number; z: number; radius: number }[];
  terrainEdits: readonly HeightStamp[];
  buildings: ZonePropsDef['buildings'];
  decorPlacements: readonly Mir4M01DecorPlacement[];
  npcPlacements: readonly Mir4M01NpcPlacement[];
  noticeboard: Point;
}

const MISSION_SITES: readonly Mir4M01MissionSite[] = [
  {
    id: 'trail-clearing',
    questId: 'M01-Q01',
    label: 'Clareira dos Rastros',
    pos: { x: 2605, z: 60 },
    dangerTier: 0,
    levelRange: [1, 2],
    gameplay:
      'A safe observation apron opens into a loose wolf territory around the corrupted ford.',
  },
  {
    id: 'boar-meadow',
    questId: 'M01-Q02',
    label: 'Campos Pisoteados',
    pos: { x: 2710, z: 78 },
    dangerTier: 1,
    levelRange: [3, 4],
    gameplay:
      'Boar groups overlap the grain sources and force the potion tutorial to happen under pressure.',
  },
  {
    id: 'broken-caravan',
    questId: 'M01-Q03',
    label: 'Caravana Quebrada',
    pos: { x: 2495, z: 115 },
    dangerTier: 1,
    levelRange: [5, 5],
    gameplay: 'Bandits hold a broken supply loop with two approaches and recoverable weapon cargo.',
  },
  {
    id: 'moss-cemetery',
    questId: 'M01-Q04',
    label: 'Cemitério sob o Musgo',
    pos: { x: 2498, z: 205 },
    dangerTier: 2,
    levelRange: [6, 7],
    gameplay:
      'Raised graves compress sight lines and make evidence collection compete with undead patrols.',
  },
  {
    id: 'seven-marks-bridge',
    questId: 'M01-Q05',
    label: 'Ponte das Sete Marcas',
    pos: { x: 2620, z: 175 },
    dangerTier: 2,
    levelRange: [8, 9],
    gameplay:
      'Three defense anchors form a triangle around the bridge instead of one stationary kill pile.',
  },
  {
    id: 'alpha-grove',
    questId: 'M01-Q06',
    label: 'Bosque do Alfa',
    pos: { x: 2720, z: 225 },
    dangerTier: 3,
    levelRange: [10, 10],
    gameplay:
      'A broad guardian arena exposes three ward positions before the final elite can be confronted.',
  },
];

const POINTS_OF_INTEREST: readonly Mir4M01PointOfInterest[] = [
  {
    id: 'm01-poi-vila-do-vau',
    label: 'Vila do Vau',
    pos: { x: 2600, z: -10 },
    radius: 46,
    purpose: 'service',
    occupants: 'villagers',
    architecture: 'human-settlement',
    biomeFeature: 'River-valley terrace above the seasonal flood line.',
    narrativeRole: 'The settlement survives because two crossings make it a supply junction.',
    gameplayRole: 'Quest dialogue, repair, crafting, consumables and safe recovery.',
  },
  {
    id: 'm01-poi-clareira-rastros',
    label: 'Clareira dos Rastros',
    pos: { x: 2605, z: 60 },
    radius: 24,
    purpose: 'quest',
    occupants: 'wildlife',
    architecture: 'natural',
    biomeFeature: 'Wet grass, exposed roots and a dry observation shelf beside the ford.',
    narrativeRole: 'Wolf tracks visibly avoid the corrupted water.',
    gameplayRole: 'First navigation, clue interaction and low-risk threat-reading lesson.',
  },
  {
    id: 'm01-poi-campos-pisoteados',
    label: 'Campos Pisoteados',
    pos: { x: 2710, z: 78 },
    radius: 32,
    purpose: 'quest',
    occupants: 'wildlife',
    architecture: 'natural',
    biomeFeature: 'Open meadow churned into mud around scattered tainted grain.',
    narrativeRole: 'The herd exposes the Conclave mark carried in its food.',
    gameplayRole: 'Dense boar pulls, quest drops and the first deliberate potion use.',
  },
  {
    id: 'm01-poi-caravana-quebrada',
    label: 'Caravana Quebrada',
    pos: { x: 2495, z: 115 },
    radius: 30,
    purpose: 'quest',
    occupants: 'bandits',
    architecture: 'bandit-salvage',
    biomeFeature: 'A dry western shelf hidden from the village by a wooded fold.',
    narrativeRole: 'Stolen cargo reveals the map of the five lines of light.',
    gameplayRole: 'Two-entry hostile camp, recoverable weapon and repair tutorial setup.',
  },
  {
    id: 'm01-poi-circulo-cinco-luzes',
    label: 'Círculo das Cinco Luzes',
    pos: { x: 2590, z: 120 },
    radius: 20,
    purpose: 'exploration',
    occupants: 'guardians',
    architecture: 'ancient-ruin',
    biomeFeature: 'A low stone ring on a root-covered knoll.',
    narrativeRole: 'It makes the stolen map legible before the story explains it.',
    gameplayRole: 'Optional landmark and cross-valley shortcut discovery.',
  },
  {
    id: 'm01-poi-cemiterio-musgo',
    label: 'Cemitério sob o Musgo',
    pos: { x: 2498, z: 205 },
    radius: 30,
    purpose: 'quest',
    occupants: 'undead',
    architecture: 'ancient-ruin',
    biomeFeature: 'A shaded ridge where moss hides graves and broken retaining walls.',
    narrativeRole: 'The oldest inscription proves the dead predate the village.',
    gameplayRole: 'Tighter undead patrols, evidence reconstruction and material gathering.',
  },
  {
    id: 'm01-poi-ponte-sete-marcas',
    label: 'Ponte das Sete Marcas',
    pos: { x: 2620, z: 175 },
    radius: 32,
    purpose: 'quest',
    occupants: 'bandits',
    architecture: 'human-defense',
    biomeFeature: 'A raised timber-and-stone crossing between two defended banks.',
    narrativeRole: 'The bridge is the target of the briar assault and the village lifeline.',
    gameplayRole: 'Three-position defense, flanking pressure and manual intervention check.',
  },
  {
    id: 'm01-poi-gruta-raiz',
    label: 'Gruta da Raiz Partida',
    pos: { x: 2580, z: 245 },
    radius: 24,
    purpose: 'exploration',
    occupants: 'guardians',
    architecture: 'natural',
    biomeFeature: 'A root-split rock face below the cemetery ridge.',
    narrativeRole: 'It foreshadows that the Farol da Raiz is physically beneath the valley.',
    gameplayRole: 'Optional elite pocket, crafting materials and a risky shortcut.',
  },
  {
    id: 'm01-poi-bosque-alfa',
    label: 'Bosque do Alfa',
    pos: { x: 2720, z: 225 },
    radius: 34,
    purpose: 'quest',
    occupants: 'guardians',
    architecture: 'natural',
    biomeFeature: 'Ancient oaks form a circular clearing above the eastern bank.',
    narrativeRole: 'The guardian protects a Farol fragment instead of hunting for food.',
    gameplayRole: 'Ward-breaking perimeter followed by the map boss arena.',
  },
  {
    id: 'm01-poi-mirante-duas-pontes',
    label: 'Mirante das Duas Pontes',
    pos: { x: 2740, z: 150 },
    radius: 20,
    purpose: 'exploration',
    occupants: 'villagers',
    architecture: 'human-defense',
    biomeFeature: 'A rocky overlook above the eastern route.',
    narrativeRole: 'It shows both the defended bridge and the road that will lead to the reeds.',
    gameplayRole: 'Waypoint, vista and optional route between the boar fields and bridge.',
  },
];

export const M01_VILA_DO_VAU_BLUEPRINT: Mir4M01WorldBlueprint = {
  mapId: 'm01-vila-do-vau',
  authoringStatus: 'production-authored',
  fantasy: 'A living river valley whose two crossings are being isolated by a buried root beacon.',
  progressionPromise:
    'The player learns navigation and equipment in safe sight of the village, then earns access to denser patrols, a positional defense and a guardian encounter.',
  bounds: { xMin: 2360, xMax: 2820, zMin: -120, zMax: 400 },
  hub: { x: 2600, z: -10 },
  hubRadius: 46,
  graveyard: { x: 2578, z: -35 },
  portalIn: { x: 2600, z: -62 },
  portalOut: { x: 2780, z: 250 },
  missionSites: MISSION_SITES,
  pointsOfInterest: POINTS_OF_INTEREST,
  roads: [
    [
      { x: 2600, z: -62 },
      { x: 2600, z: -10 },
    ],
    [
      { x: 2600, z: -10 },
      { x: 2605, z: 60 },
    ],
    [
      { x: 2605, z: 60 },
      { x: 2640, z: 90 },
      { x: 2710, z: 78 },
    ],
    [
      { x: 2605, z: 60 },
      { x: 2570, z: 92 },
      { x: 2495, z: 115 },
    ],
    [
      { x: 2495, z: 115 },
      { x: 2478, z: 155 },
      { x: 2498, z: 205 },
      { x: 2540, z: 230 },
      { x: 2580, z: 245 },
    ],
    [
      { x: 2605, z: 60 },
      { x: 2595, z: 115 },
      { x: 2620, z: 175 },
    ],
    [
      { x: 2620, z: 175 },
      { x: 2650, z: 195 },
      { x: 2720, z: 225 },
      { x: 2780, z: 250 },
    ],
    [
      { x: 2710, z: 78 },
      { x: 2740, z: 150 },
      { x: 2700, z: 205 },
      { x: 2650, z: 205 },
      { x: 2620, z: 175 },
    ],
    [
      { x: 2495, z: 115 },
      { x: 2555, z: 135 },
      { x: 2590, z: 120 },
      { x: 2595, z: 115 },
    ],
  ],
  // Human lighting stops at the settlement edge. The remaining authored road
  // graph is readable terrain, not an implausible lamp-lined wilderness.
  litRoads: [
    [
      { x: 2600, z: -62 },
      { x: 2600, z: -10 },
      { x: 2604, z: 28 },
    ],
    [
      { x: 2572, z: 10 },
      { x: 2600, z: -10 },
      { x: 2632, z: 12 },
    ],
  ],
  dryCrossings: [{ x: 2620, z: 181, radius: 9 }],
  camps: [
    {
      questId: 'M01-Q01',
      mobId: 'forest_wolf',
      center: { x: 2605, z: 60 },
      radius: 18,
      count: 7,
      levelRange: [1, 2],
    },
    {
      questId: 'M01-Q02',
      mobId: 'rabid_boar',
      center: { x: 2710, z: 78 },
      radius: 26,
      count: 8,
      levelRange: [3, 4],
    },
    {
      questId: 'M01-Q03',
      mobId: 'bandit_cutthroat',
      center: { x: 2495, z: 115 },
      radius: 24,
      count: 8,
      levelRange: [5, 5],
    },
    {
      questId: 'M01-Q04',
      mobId: 'moss_skeleton',
      center: { x: 2498, z: 205 },
      radius: 24,
      count: 8,
      levelRange: [6, 7],
    },
    {
      questId: 'M01-Q05',
      mobId: 'briar_guard',
      center: { x: 2620, z: 175 },
      radius: 22,
      count: 9,
      levelRange: [8, 9],
    },
    {
      questId: 'M01-Q06',
      mobId: 'dire_wolf',
      center: { x: 2720, z: 225 },
      radius: 20,
      count: 8,
      levelRange: [10, 10],
    },
  ],
  // Four pools describe two different crossings. The first pair leaves the
  // old ford dry. The second pair follows the channel perpendicular to the
  // Seven Marks road and leaves only the bridge corridor above water. Water,
  // story and navigation therefore agree without an invisible blocker.
  lakes: [
    { x: 2515, z: 58, radius: 24 },
    { x: 2685, z: 45, radius: 22 },
    { x: 2588, z: 197, radius: 30 },
    { x: 2652, z: 154, radius: 30 },
  ],
  terrainEdits: [
    { x: 2498, z: 205, radius: 38, delta: 9, falloff: 'smooth' },
    { x: 2740, z: 150, radius: 30, delta: 11, falloff: 'smooth' },
    { x: 2720, z: 225, radius: 42, delta: 7, falloff: 'smooth' },
    { x: 2580, z: 245, radius: 28, delta: 5, falloff: 'smooth' },
    { x: 2515, z: 58, radius: 34, delta: -2, falloff: 'smooth' },
    { x: 2685, z: 45, radius: 32, delta: -2, falloff: 'smooth' },
    { x: 2588, z: 197, radius: 38, delta: -2, falloff: 'smooth' },
    { x: 2652, z: 154, radius: 38, delta: -2, falloff: 'smooth' },
  ],
  buildings: [
    { kind: 'inn', x: 2618, z: -4, w: 9, d: 10, rot: -0.55 },
    { kind: 'house', x: 2580, z: -5, w: 8, d: 8, rot: 0.7 },
    { kind: 'house', x: 2590, z: 20, w: 7, d: 7, rot: 2.5 },
    { kind: 'house', x: 2624, z: 19, w: 8, d: 8, rot: -2.4 },
    { kind: 'chapel', x: 2577, z: -27, w: 6, d: 9, rot: 1.1 },
  ],
  decorPlacements: [
    {
      poiId: 'm01-poi-vila-do-vau',
      origin: 'human',
      key: 'hexbTownhall',
      x: 2568,
      z: 14,
      rot: Math.PI,
      scale: 6,
      r: 5,
      h: 11,
    },
    {
      poiId: 'm01-poi-vila-do-vau',
      origin: 'human',
      key: 'hexrBlacksmith',
      x: 2632,
      z: 1,
      rot: -1.2,
      scale: 6,
      r: 4.5,
      h: 9,
    },
    {
      poiId: 'm01-poi-vila-do-vau',
      origin: 'human',
      key: 'gardenArch',
      x: 2600,
      z: -49,
      rot: 0,
      scale: 2,
    },
    {
      poiId: 'm01-poi-vila-do-vau',
      origin: 'natural',
      key: 'oakTree',
      x: 2550,
      z: -10,
      rot: 0.7,
      scale: 1.4,
      r: 0.9,
      h: 10,
    },
    {
      poiId: 'm01-poi-clareira-rastros',
      origin: 'natural',
      key: 'oakTree',
      x: 2578,
      z: 74,
      rot: 2.1,
      scale: 1.35,
      r: 0.8,
      h: 9,
    },
    {
      poiId: 'm01-poi-clareira-rastros',
      origin: 'natural',
      key: 'kcasRocks',
      x: 2628,
      z: 48,
      rot: -0.4,
      scale: 1.2,
    },
    {
      poiId: 'm01-poi-campos-pisoteados',
      origin: 'natural',
      key: 'oakTree',
      x: 2736,
      z: 69,
      rot: -1.1,
      scale: 1.25,
      r: 0.8,
      h: 9,
    },
    {
      poiId: 'm01-poi-campos-pisoteados',
      origin: 'natural',
      key: 'kcasRocks',
      x: 2698,
      z: 103,
      rot: 0.8,
      scale: 1.1,
    },
    {
      poiId: 'm01-poi-caravana-quebrada',
      origin: 'human',
      key: 'cityWagon',
      x: 2475,
      z: 95,
      rot: -0.75,
      scale: 1.5,
      r: 3.2,
      h: 2.5,
    },
    {
      poiId: 'm01-poi-caravana-quebrada',
      origin: 'human',
      key: 'hexWatchtower',
      x: 2469,
      z: 126,
      rot: 0.6,
      scale: 6,
      r: 3,
      h: 8,
    },
    {
      poiId: 'm01-poi-caravana-quebrada',
      origin: 'human',
      key: 'hexFlagRed',
      x: 2518,
      z: 105,
      rot: -0.2,
      scale: 3,
    },
    {
      poiId: 'm01-poi-circulo-cinco-luzes',
      origin: 'ancient',
      key: 'kkPillar',
      x: 2570,
      z: 108,
      rot: 0.3,
      scale: 0.8,
      r: 0.9,
      h: 4,
    },
    {
      poiId: 'm01-poi-circulo-cinco-luzes',
      origin: 'ancient',
      key: 'stagShrine',
      x: 2615,
      z: 145,
      rot: Math.PI,
      r: 2,
      h: 4.2,
    },
    {
      poiId: 'm01-poi-cemiterio-musgo',
      origin: 'ancient',
      key: 'graveCross',
      x: 2482,
      z: 198,
      rot: 0.4,
      scale: 1.2,
    },
    {
      poiId: 'm01-poi-cemiterio-musgo',
      origin: 'ancient',
      key: 'graveRound',
      x: 2515,
      z: 214,
      rot: -0.5,
      scale: 1.1,
    },
    {
      poiId: 'm01-poi-cemiterio-musgo',
      origin: 'ancient',
      key: 'kcasWallBroken',
      x: 2477,
      z: 220,
      rot: 1.2,
      scale: 1.1,
    },
    {
      poiId: 'm01-poi-ponte-sete-marcas',
      origin: 'human',
      key: 'hexBridge',
      x: 2620,
      z: 181,
      rot: 0.4,
      scale: 3,
    },
    {
      poiId: 'm01-poi-ponte-sete-marcas',
      origin: 'human',
      key: 'hexWatchtower',
      x: 2595,
      z: 183,
      rot: 0.3,
      scale: 6.5,
      r: 3,
      h: 8,
    },
    {
      poiId: 'm01-poi-ponte-sete-marcas',
      origin: 'human',
      key: 'hexFlag',
      x: 2645,
      z: 184,
      rot: -0.3,
      scale: 3,
    },
    {
      poiId: 'm01-poi-gruta-raiz',
      origin: 'natural',
      key: 'crystalMoundCave',
      x: 2565,
      z: 257,
      rot: -0.8,
      scale: 1.1,
      r: 4.8,
      h: 10,
    },
    {
      poiId: 'm01-poi-bosque-alfa',
      origin: 'natural',
      key: 'oakTree',
      x: 2685,
      z: 225,
      rot: 0.9,
      scale: 1.5,
      r: 0.9,
      h: 10,
    },
    {
      poiId: 'm01-poi-bosque-alfa',
      origin: 'natural',
      key: 'oakTree',
      x: 2695,
      z: 198,
      rot: 2.2,
      scale: 1.35,
      r: 0.8,
      h: 9,
    },
    {
      poiId: 'm01-poi-bosque-alfa',
      origin: 'natural',
      key: 'oakTree',
      x: 2698,
      z: 250,
      rot: -0.4,
      scale: 1.55,
      r: 0.9,
      h: 10,
    },
    {
      poiId: 'm01-poi-bosque-alfa',
      origin: 'natural',
      key: 'oakTree',
      x: 2720,
      z: 258,
      rot: 1.5,
      scale: 1.45,
      r: 0.9,
      h: 10,
    },
    {
      poiId: 'm01-poi-bosque-alfa',
      origin: 'natural',
      key: 'oakTree',
      x: 2755,
      z: 220,
      rot: -1.7,
      scale: 1.5,
      r: 0.9,
      h: 10,
    },
    {
      poiId: 'm01-poi-bosque-alfa',
      origin: 'natural',
      key: 'oakTree',
      x: 2735,
      z: 195,
      rot: 0.2,
      scale: 1.35,
      r: 0.8,
      h: 9,
    },
    {
      poiId: 'm01-poi-bosque-alfa',
      origin: 'guardian',
      key: 'starHeartCrystal',
      x: 2748,
      z: 212,
      rot: -0.4,
      r: 2.2,
      h: 6,
    },
    {
      poiId: 'm01-poi-mirante-duas-pontes',
      origin: 'human',
      key: 'hexWatchtower',
      x: 2754,
      z: 155,
      rot: -1.1,
      scale: 6.5,
      r: 3,
      h: 8,
    },
  ],
  npcPlacements: [
    {
      id: 'm01-vila-do-vau-tarek-duas-pontes',
      name: 'Tarek Duas Pontes',
      title: 'Batedor da Vila',
      pos: { x: 2591, z: 2 },
      facing: 0.3,
      greeting: 'As trilhas mudaram perto do vau. Observe antes de atacar.',
      campaign: true,
    },
    {
      id: 'm01-vila-do-vau-maela-do-vau',
      name: 'Maela do Vau',
      title: 'Provedora da Vila',
      pos: { x: 2614, z: -3 },
      facing: -0.6,
      greeting: 'A vila precisa de alimento, mas há algo errado com os animais.',
      campaign: true,
    },
    {
      id: 'm01-vila-do-vau-ilyra-da-centelha',
      name: 'Ilyra da Centelha',
      title: 'Cartografa da Rede',
      pos: { x: 2587, z: -17 },
      facing: 1.1,
      greeting: 'Cada marca neste vale pertence a uma história maior.',
      campaign: true,
    },
    {
      id: 'm01-vila-do-vau-orin-sete-marcas',
      name: 'Orin Sete Marcas',
      title: 'Ferreiro da Ponte',
      pos: { x: 2625, z: 8 },
      facing: -1.2,
      greeting: 'Equipamento negligenciado quebra quando a ponte mais precisa de você.',
      campaign: true,
    },
    {
      id: 'm01-vila-do-vau-dalia-do-forno',
      name: 'Dalia do Forno',
      title: 'Padeira',
      pos: { x: 2611, z: 18 },
      facing: Math.PI,
      greeting: 'O cheiro do pão ainda alcança a ponte, mesmo nos dias ruins.',
      campaign: false,
    },
    {
      id: 'm01-vila-do-vau-fero-balseiro',
      name: 'Fero Balseiro',
      title: 'Barqueiro',
      pos: { x: 2570, z: 35 },
      facing: 0.2,
      greeting: 'A corrente mudou desde que a luz negra apareceu nas raízes.',
      campaign: false,
    },
    {
      id: 'm01-vila-do-vau-nilo-vigia',
      name: 'Nilo Vigia',
      title: 'Sentinela',
      pos: { x: 2608, z: 30 },
      facing: 0,
      greeting: 'A estrada leste é aberta, mas não é segura.',
      campaign: false,
    },
    {
      id: 'm01-vila-do-vau-sara-das-ervas',
      name: 'Sara das Ervas',
      title: 'Curandeira',
      pos: { x: 2577, z: -13 },
      facing: 1.4,
      greeting: 'Uma poção usada na hora certa vale mais que uma bolsa cheia.',
      campaign: true,
    },
    {
      id: 'm01-vila-do-vau-bren-campones',
      name: 'Bren Camponês',
      title: 'Lavrador',
      pos: { x: 2637, z: 24 },
      facing: -2.4,
      greeting: 'Os javalis vieram pelo grão, mas alguém marcou os sacos antes deles.',
      campaign: false,
    },
  ],
  noticeboard: { x: 2582, z: 12 },
};
