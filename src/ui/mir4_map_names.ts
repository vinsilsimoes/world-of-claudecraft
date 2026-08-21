import type { TranslationKey } from './i18n';

interface Mir4ZonePresentation {
  nameKey: TranslationKey;
  act: number;
}

const MIR4_ZONE_PRESENTATION: Readonly<Record<string, Mir4ZonePresentation>> = {
  'mir4_m01-vila-do-vau': { nameKey: 'hudChrome.mir4.maps.m01', act: 1 },
  'mir4_m02-trilha-dos-juncos': { nameKey: 'hudChrome.mir4.maps.m02', act: 1 },
  'mir4_m03-bosque-do-vale': { nameKey: 'hudChrome.mir4.maps.m03', act: 1 },
  'mir4_m04-ruinas-da-encosta': { nameKey: 'hudChrome.mir4.maps.m04', act: 1 },
  'mir4_m05-clareira-da-fenda': { nameKey: 'hudChrome.mir4.maps.m05', act: 2 },
  'mir4_m06-criptas-de-pedra-vela': { nameKey: 'hudChrome.mir4.maps.m06', act: 2 },
  'mir4_m07-galerias-do-ossario': { nameKey: 'hudChrome.mir4.maps.m07', act: 2 },
  'mir4_m08-fortaleza-de-brumapedra': { nameKey: 'hudChrome.mir4.maps.m08', act: 2 },
  'mir4_m09-pantano-das-lanternas': { nameKey: 'hudChrome.mir4.maps.m09', act: 3 },
  'mir4_m10-charcos-do-rei-bog': { nameKey: 'hudChrome.mir4.maps.m10', act: 3 },
  'mir4_m11-mangue-das-sanguessugas': { nameKey: 'hudChrome.mir4.maps.m11', act: 3 },
  'mir4_m12-porto-dos-juncos': { nameKey: 'hudChrome.mir4.maps.m12', act: 3 },
  'mir4_m13-dunas-de-vidro': { nameKey: 'hudChrome.mir4.maps.m13', act: 4 },
  'mir4_m14-necropole-de-akhet': { nameKey: 'hudChrome.mir4.maps.m14', act: 4 },
  'mir4_m15-caldeira-de-cinerita': { nameKey: 'hudChrome.mir4.maps.m15', act: 4 },
  'mir4_m16-forja-do-sol-partido': { nameKey: 'hudChrome.mir4.maps.m16', act: 4 },
  'mir4_m17-tundra-dos-uivos': { nameKey: 'hudChrome.mir4.maps.m17', act: 5 },
  'mir4_m18-passo-do-jarl': { nameKey: 'hudChrome.mir4.maps.m18', act: 5 },
  'mir4_m19-veu-da-noite': { nameKey: 'hudChrome.mir4.maps.m19', act: 5 },
  'mir4_m20-bastilha-do-eclipse': { nameKey: 'hudChrome.mir4.maps.m20', act: 5 },
};

export function mir4ZoneNameKey(zoneId: string): TranslationKey | null {
  return MIR4_ZONE_PRESENTATION[zoneId]?.nameKey ?? null;
}

export function mir4ZoneAct(zoneId: string): number | null {
  return MIR4_ZONE_PRESENTATION[zoneId]?.act ?? null;
}
