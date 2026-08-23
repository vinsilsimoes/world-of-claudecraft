// Narrative transplant from the 20 MIR4 campaign chapters into the original
// World of ClaudeCraft overworld. These are authored story placements, not a
// procedural map generator: every chapter names one WoC biome and six physical
// gameplay anchors selected to match its theme and progression role.

export interface Mir4WocChapterLayout {
  mapId: string;
  targetZoneId: string;
  hub: { x: number; z: number };
  sites: readonly { x: number; z: number }[];
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
      { x: -420, z: 1510 },
      { x: -330, z: 1520 },
      { x: -272, z: 1538 },
      { x: -400, z: 1580 },
      { x: -360, z: 1650 },
      { x: -300, z: 1700 },
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
