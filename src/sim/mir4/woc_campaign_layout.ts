// Narrative transplant from the 20 MIR4 campaign chapters into the original
// Aeldrune overworld. These are authored story placements, not a
// procedural map generator: every chapter names one WoC biome and six physical
// gameplay anchors selected to match its theme and progression role.

export interface Mir4WocChapterLayout {
  mapId: string;
  targetZoneId: string;
  hub: { x: number; z: number };
  sites: readonly { x: number; z: number }[];
  objectiveAnchors?: readonly {
    questId: string;
    stageIndex: number;
    points: readonly { x: number; z: number }[];
  }[];
}

export const MIR4_WOC_CHAPTER_LAYOUTS: readonly Mir4WocChapterLayout[] = Object.freeze([
  {
    mapId: 'm01-vila-do-vau',
    targetZoneId: 'eastbrook_vale',
    hub: { x: 0, z: -3 },
    sites: [
      { x: -61, z: 3 },
      { x: -85, z: -65 },
      { x: 75, z: -77 },
      { x: 65, z: -1 },
      { x: -3, z: 69 },
      { x: 79, z: 79 },
    ],
    // Authored in the Aeldrune quest editor. The collection points are spread
    // across readable search areas instead of respawning on a single spot.
    objectiveAnchors: [
      { questId: 'M01-Q01', stageIndex: 1, points: [{ x: -49.42, z: 55.74 }] },
      {
        questId: 'M01-Q01',
        stageIndex: 2,
        points: [
          { x: -22.59, z: 36.26 },
          { x: -47.97, z: 15.95 },
          { x: -79.63, z: -0.71 },
        ],
      },
      { questId: 'M01-Q01', stageIndex: 4, points: [{ x: -12.27, z: 6.17 }] },
      {
        questId: 'M01-Q02',
        stageIndex: 2,
        points: [
          { x: -103.09, z: -51.43 },
          { x: -88.63, z: -96.57 },
          { x: -110.82, z: -79.1 },
        ],
      },
      { questId: 'M01-Q02', stageIndex: 3, points: [{ x: -85.87, z: -65.56 }] },
      {
        questId: 'M01-Q02',
        stageIndex: 4,
        points: [
          { x: -69.57, z: -53.97 },
          { x: -91.66, z: -52.84 },
          { x: -79.44, z: -78.07 },
          { x: -63.91, z: -78.92 },
          { x: -79.93, z: -35.06 },
          { x: -104.98, z: -70.73 },
        ],
      },
    ],
  },
  {
    mapId: 'm02-trilha-dos-juncos',
    targetZoneId: 'willowfen',
    hub: { x: -360, z: 362 },
    sites: [
      { x: -380, z: 208 },
      { x: -444, z: 308 },
      { x: -286, z: 292 },
      { x: -430, z: 466 },
      { x: -320, z: 496 },
      { x: -360, z: 550 },
    ],
  },
  {
    mapId: 'm03-bosque-do-vale',
    targetZoneId: 'evergarden',
    hub: { x: 320, z: 810 },
    sites: [
      { x: 410, z: 732 },
      { x: 360, z: 875 },
      { x: 263, z: 889 },
      { x: 360, z: 946 },
      { x: 360, z: 1016 },
      { x: 412, z: 1112 },
    ],
    // Three readable wolf signs lead out of the Great Maze and along the
    // North Watch road. The middle sign remains inside the pack's danger
    // envelope, so collection still requires deliberate combat intervention.
    objectiveAnchors: [
      {
        questId: 'M03-Q06',
        stageIndex: 2,
        points: [
          { x: 387, z: 1098 },
          { x: 420, z: 1104 },
          { x: 440, z: 1110 },
        ],
      },
      { questId: 'M03-Q06', stageIndex: 3, points: [{ x: 418, z: 1124 }] },
      { questId: 'M03-Q06', stageIndex: 4, points: [{ x: 440, z: 1110 }] },
    ],
  },
  {
    mapId: 'm04-ruinas-da-encosta',
    targetZoneId: 'thornpeak_heights',
    hub: { x: 0, z: 660 },
    sites: [
      { x: -51, z: 589 },
      { x: 85, z: 615.5 },
      { x: -91, z: 699 },
      { x: -131, z: 739 },
      { x: 109, z: 759 },
      { x: 55, z: 819 },
    ],
    // The final strengthening materials stay on the windward rampart edge.
    // One guard patrols the first node, but neither point sits in the later
    // level 38-39 crypt pack centered at 109,759.
    objectiveAnchors: [
      {
        questId: 'M04-S01',
        stageIndex: 1,
        points: [
          { x: -2.16, z: 541.04 },
          { x: 1.04, z: 541.84 },
          { x: 2.4, z: 538.8 },
          { x: 89.48, z: 708.76 },
          { x: 92.52, z: 709.8 },
          { x: 91.32, z: 710.36 },
          { x: -166, z: 735 },
          { x: -151, z: 765 },
        ],
      },
    ],
  },
  {
    mapId: 'm05-clareira-da-fenda',
    targetZoneId: 'veiled_hollow',
    hub: { x: -45, z: 1033.5 },
    sites: [
      { x: -141, z: 951 },
      { x: -119, z: 987 },
      { x: 29, z: 955 },
      { x: 105, z: 983 },
      { x: 125, z: 1085 },
      { x: 0, z: 1100 },
    ],
  },
  {
    mapId: 'm06-criptas-de-pedra-vela',
    targetZoneId: 'wraithwood',
    hub: { x: 360, z: 1430 },
    sites: [
      { x: 390, z: 1292 },
      { x: 320, z: 1360 },
      { x: 420, z: 1380 },
      { x: 280, z: 1484 },
      { x: 440, z: 1530 },
      { x: 340, z: 1510 },
    ],
  },
  {
    mapId: 'm07-galerias-do-ossario',
    targetZoneId: 'nightbloom',
    hub: { x: -360, z: 1650 },
    sites: [
      // Keep the opening Ossuary investigation in the northern barrow road.
      // The southern Gloamfield is reserved for M19; sharing that footprint
      // placed level-140 monsters on top of M07 clues and side-quest gathers.
      { x: -360, z: 1636 },
      { x: -380, z: 1620 },
      { x: -380, z: 1700 },
      { x: -320, z: 1720 },
      { x: -330, z: 1740 },
      { x: -348, z: 1816 },
    ],
  },
  {
    mapId: 'm08-fortaleza-de-brumapedra',
    targetZoneId: 'galecrest',
    hub: { x: 420, z: 360 },
    sites: [
      { x: 200, z: 440 },
      { x: 280, z: 320 },
      { x: 498, z: 308 },
      { x: 455, z: 535 },
      { x: 340, z: 645 },
      { x: 378, z: 598 },
    ],
  },
  {
    mapId: 'm09-pantano-das-lanternas',
    targetZoneId: 'mirefen_marsh',
    hub: { x: -1, z: 299 },
    sites: [
      { x: -41, z: 229 },
      { x: 79, z: 315 },
      { x: -90, z: 280 },
      { x: 0, z: 350 },
      { x: -80, z: 360 },
      { x: 80, z: 360 },
    ],
  },
  {
    mapId: 'm10-charcos-do-rei-bog',
    targetZoneId: 'willowfen',
    hub: { x: -320, z: 496 },
    sites: [
      { x: -430, z: 466 },
      { x: -360, z: 520 },
      { x: -300, z: 540 },
      { x: -440, z: 580 },
      { x: -350, z: 620 },
      { x: -250, z: 650 },
    ],
  },
  {
    mapId: 'm11-mangue-das-sanguessugas',
    targetZoneId: 'palmreach',
    hub: { x: -300, z: 820 },
    sites: [
      { x: -420, z: 732 },
      { x: -460, z: 890 },
      { x: -360, z: 980 },
      { x: -400, z: 1080 },
      { x: -256, z: 1090 },
      { x: -300, z: 1150 },
    ],
  },
  {
    mapId: 'm12-porto-dos-juncos',
    targetZoneId: 'farshore_isle',
    hub: { x: 305, z: 70 },
    sites: [
      { x: 250, z: 14 },
      { x: 375, z: -5 },
      { x: 402, z: -72 },
      { x: 434, z: 58 },
      { x: 330, z: 120 },
      { x: 480, z: 120 },
    ],
  },
  {
    mapId: 'm13-dunas-de-vidro',
    targetZoneId: 'amberfall',
    hub: { x: -360, z: 2072 },
    sites: [
      { x: -350, z: 1848 },
      { x: -432, z: 1992 },
      { x: -290, z: 1960 },
      { x: -360, z: 2072 },
      { x: -430, z: 2100 },
      { x: -300, z: 2100 },
    ],
  },
  {
    mapId: 'm14-necropole-de-akhet',
    targetZoneId: 'wraithwood',
    hub: { x: 300, z: 1620 },
    sites: [
      { x: 440, z: 1530 },
      { x: 300, z: 1620 },
      { x: 380, z: 1680 },
      { x: 460, z: 1700 },
      { x: 300, z: 1750 },
      { x: 430, z: 1780 },
    ],
  },
  {
    mapId: 'm15-caldeira-de-cinerita',
    targetZoneId: 'drakelands',
    hub: { x: 404, z: 1900 },
    sites: [
      { x: 360, z: 1940 },
      { x: 406, z: 2032 },
      { x: 330, z: 2100 },
      { x: 460, z: 2140 },
      { x: 270, z: 2180 },
      { x: 500, z: 2180 },
    ],
  },
  {
    mapId: 'm16-forja-do-sol-partido',
    targetZoneId: 'drakelands',
    hub: { x: 390, z: 2320 },
    sites: [
      { x: 270, z: 2270 },
      { x: 390, z: 2320 },
      { x: 480, z: 2260 },
      { x: 300, z: 2350 },
      { x: 450, z: 2380 },
      { x: 360, z: 2400 },
    ],
  },
  {
    mapId: 'm17-tundra-dos-uivos',
    targetZoneId: 'frostveil',
    hub: { x: -30, z: 1560 },
    sites: [
      { x: -10, z: 1495 },
      { x: 60, z: 1640 },
      { x: -100, z: 1600 },
      { x: 100, z: 1600 },
      { x: -90, z: 1680 },
      { x: 30, z: 1700 },
    ],
    // Yrsa's salvage lies along the walkable west-rim switchback. The generic
    // projection placed the first node on Glacier Tarn's steep south lip; a
    // swimmer could see it but could not climb within interaction range.
    objectiveAnchors: [
      {
        questId: 'M17-S01',
        stageIndex: 1,
        points: [
          { x: 28, z: 1662 },
          { x: 30, z: 1670 },
          { x: 34, z: 1680 },
          { x: 38, z: 1690 },
          { x: 40, z: 1700 },
          { x: 36, z: 1710 },
          { x: 32, z: 1720 },
          { x: 30, z: 1730 },
        ],
      },
      {
        questId: 'M17-S01',
        stageIndex: 2,
        points: [{ x: 30, z: 1730 }],
      },
      // Edda prepares the aurora camp before the player is sent back into
      // Glacier Tarn for the defense. The generic projection landed these
      // supplies on the steep lake lip, about eleven yards below the closest
      // standable road, so the interaction could never begin.
      {
        questId: 'M17-S03',
        stageIndex: 1,
        points: [{ x: 36, z: 1710 }],
      },
    ],
  },
  {
    mapId: 'm18-passo-do-jarl',
    targetZoneId: 'frostveil',
    hub: { x: 30, z: 1740 },
    sites: [
      { x: 30, z: 1740 },
      { x: -90, z: 1760 },
      { x: 100, z: 1810 },
      { x: -120, z: 1850 },
      { x: 0, z: 1900 },
      { x: 120, z: 1920 },
    ],
  },
  {
    mapId: 'm19-veu-da-noite',
    targetZoneId: 'nightbloom',
    hub: { x: -370, z: 1420 },
    sites: [
      { x: -390, z: 1292 },
      { x: -290, z: 1380 },
      { x: -444, z: 1496 },
      { x: -420, z: 1400 },
      { x: -300, z: 1450 },
      { x: -400, z: 1500 },
    ],
  },
  {
    mapId: 'm20-bastilha-do-eclipse',
    targetZoneId: 'veiled_hollow',
    hub: { x: -71, z: 1155 },
    sites: [
      { x: -100, z: 1100 },
      { x: 0, z: 1100 },
      { x: -71, z: 1155 },
      { x: -10, z: 1172 },
      { x: 38, z: 1170 },
      { x: 100, z: 1200 },
    ],
  },
]);
