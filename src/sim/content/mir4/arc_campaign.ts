// Canonical runtime projection of the imported MIR4 campaign. The generated
// quests_arc.ts file remains an immutable source-evidence snapshot; this module
// assigns one physical identity to every NPC appearance in the authored 3D
// world and rewrites all runtime quest references through that identity.

import {
  type Mir4ArcQuest,
  type Mir4ArcQuestStage,
  MIR4_QUESTS_ARC as SOURCE_QUESTS_ARC,
  MIR4_QUESTS_CITYPROFESSION as SOURCE_QUESTS_CITYPROFESSION,
  MIR4_QUESTS_MAIN as SOURCE_QUESTS_MAIN,
  MIR4_QUESTS_REPEATABLE as SOURCE_QUESTS_REPEATABLE,
  MIR4_QUESTS_SIDE as SOURCE_QUESTS_SIDE,
} from './quests_arc';
import { MIR4_WORLD_ARC_BY_MAP } from './world_arc';

export type { Mir4ArcQuest, Mir4ArcQuestStage } from './quests_arc';

export interface Mir4ArcNpcIdentity {
  /** Globally unique campaign id used by quest stages. */
  id: string;
  /** Globally unique player-visible name. */
  name: string;
  mapId: string;
  /** Immutable id in the imported source evidence. */
  sourceNpcId: string;
}

interface LocalNpcAlias {
  id: string;
  name: string;
}

// A repeated source id represented several different physical people across
// maps. Preserve the first established character and give every later local
// contact a distinct authored identity. This removes clone NPCs without using
// or deriving any 2D presentation asset.
const LOCAL_NPC_ALIASES: Readonly<Record<string, LocalNpcAlias>> = {
  'm03-bosque-do-vale:cacadora-lume': {
    id: 'cacadora-lume',
    name: 'Caçadora Lume',
  },
  'm02-trilha-dos-juncos:tarek-duas-pontes': {
    id: 'darian-passojunco',
    name: 'Darian Passojunco',
  },
  'm03-bosque-do-vale:maela-do-vau': {
    id: 'selene-folhavera',
    name: 'Selene Folhavera',
  },

  'm02-trilha-dos-juncos:ilyra-da-centelha': {
    id: 'neris-da-centelha',
    name: 'Neris da Centelha',
  },
  'm03-bosque-do-vale:ilyra-da-centelha': {
    id: 'elara-da-centelha',
    name: 'Elara da Centelha',
  },
  'm04-ruinas-da-encosta:ilyra-da-centelha': {
    id: 'aurenna-da-centelha',
    name: 'Aurenna da Centelha',
  },
  'm05-clareira-da-fenda:ilyra-da-centelha': {
    id: 'calia-da-centelha',
    name: 'Calia da Centelha',
  },
  'm06-criptas-de-pedra-vela:ilyra-da-centelha': {
    id: 'vela-da-centelha',
    name: 'Vela da Centelha',
  },
  'm07-galerias-do-ossario:ilyra-da-centelha': {
    id: 'ossia-da-centelha',
    name: 'Ossia da Centelha',
  },
  'm08-fortaleza-de-brumapedra:ilyra-da-centelha': {
    id: 'iria-da-centelha',
    name: 'Iria da Centelha',
  },
  'm12-porto-dos-juncos:ilyra-da-centelha': {
    id: 'serea-da-centelha',
    name: 'Serea da Centelha',
  },
  'm14-necropole-de-akhet:ilyra-da-centelha': {
    id: 'khepra-da-centelha',
    name: 'Khepra da Centelha',
  },
  'm16-forja-do-sol-partido:ilyra-da-centelha': {
    id: 'rubia-da-centelha',
    name: 'Rúbia da Centelha',
  },
  'm17-tundra-dos-uivos:ilyra-da-centelha': {
    id: 'yrla-da-centelha',
    name: 'Yrla da Centelha',
  },
  'm19-veu-da-noite:ilyra-da-centelha': {
    id: 'noxa-da-centelha',
    name: 'Noxa da Centelha',
  },
  'm20-bastilha-do-eclipse:ilyra-da-centelha': {
    id: 'auriel-da-centelha',
    name: 'Auriel da Centelha',
  },

  'm02-trilha-dos-juncos:orin-sete-marcas': {
    id: 'bram-sete-marcas',
    name: 'Bram Sete Marcas',
  },
  'm03-bosque-do-vale:orin-sete-marcas': {
    id: 'eron-sete-marcas',
    name: 'Eron Sete Marcas',
  },
  'm04-ruinas-da-encosta:orin-sete-marcas': {
    id: 'doran-sete-marcas',
    name: 'Doran Sete Marcas',
  },
  'm04-ruinas-da-encosta:capita-maela': {
    id: 'capita-maela',
    name: 'Capitã Maela',
  },
  'm05-clareira-da-fenda:orin-sete-marcas': {
    id: 'calen-sete-marcas',
    name: 'Calen Sete Marcas',
  },
  'm08-fortaleza-de-brumapedra:orin-sete-marcas': {
    id: 'brum-sete-marcas',
    name: 'Brum Sete Marcas',
  },
  'm19-veu-da-noite:orin-sete-marcas': {
    id: 'nox-sete-marcas',
    name: 'Nox Sete Marcas',
  },
  'm20-bastilha-do-eclipse:orin-sete-marcas': {
    id: 'solan-sete-marcas',
    name: 'Solan Sete Marcas',
  },

  'm18-passo-do-jarl:edda-aurora': {
    id: 'astrid-aurora',
    name: 'Astrid Aurora',
  },
  'm19-veu-da-noite:edda-aurora': {
    id: 'sigrid-aurora',
    name: 'Sigrid Aurora',
  },
  'm20-bastilha-do-eclipse:edda-aurora': {
    id: 'alva-aurora',
    name: 'Alva Aurora',
  },
  'm14-necropole-de-akhet:namar-de-akhet': {
    id: 'khemet-de-akhet',
    name: 'Khemet de Akhet',
  },
  'm15-caldeira-de-cinerita:namar-de-akhet': {
    id: 'azar-de-akhet',
    name: 'Azar de Akhet',
  },
  'm10-charcos-do-rei-bog:sera-lumen': { id: 'nima-lumen', name: 'Nima Lumen' },
  'm11-mangue-das-sanguessugas:sera-lumen': {
    id: 'ada-lumen',
    name: 'Ada Lumen',
  },
  'm20-bastilha-do-eclipse:capita-maela': {
    id: 'capita-helena',
    name: 'Capitã Helena',
  },
  'm18-passo-do-jarl:ferreira-yrsa': {
    id: 'ferreira-svala',
    name: 'Ferreira Svala',
  },
  'm16-forja-do-sol-partido:kael-cinerita': {
    id: 'darek-cinerita',
    name: 'Darek Cinerita',
  },
};

const LOWERCASE_NAME_PARTS = new Set(['a', 'da', 'das', 'de', 'do', 'dos', 'e']);

function sourceNpcName(sourceNpcId: string): string {
  return sourceNpcId
    .split('-')
    .map((part, index) =>
      index > 0 && LOWERCASE_NAME_PARTS.has(part)
        ? part
        : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`,
    )
    .join(' ');
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function npcSourceRefs(quest: Readonly<Mir4ArcQuest>): string[] {
  const refs = [quest.giverNpcId, quest.turnInNpcId];
  for (const stage of quest.stages) {
    if (stage.kind !== 'talk' && stage.kind !== 'deliver') continue;
    if (Array.isArray(stage.target)) refs.push(...stage.target);
    else if (typeof stage.target === 'string') refs.push(stage.target);
  }
  return refs.filter((value) => value.length > 0);
}

const SOURCE_NPCS_BY_MAP = new Map<string, Set<string>>();
for (const quest of SOURCE_QUESTS_ARC) {
  let ids = SOURCE_NPCS_BY_MAP.get(quest.mapId);
  if (!ids) {
    ids = new Set();
    SOURCE_NPCS_BY_MAP.set(quest.mapId, ids);
  }
  for (const id of npcSourceRefs(quest)) ids.add(id);
}

export const MIR4_ARC_NPC_IDENTITIES: readonly Mir4ArcNpcIdentity[] = [
  ...SOURCE_NPCS_BY_MAP.entries(),
]
  .flatMap(([mapId, sourceIds]) =>
    [...sourceIds].map((sourceNpcId): Mir4ArcNpcIdentity => {
      const alias = LOCAL_NPC_ALIASES[`${mapId}:${sourceNpcId}`];
      const localId = alias?.id ?? sourceNpcId;
      return {
        id: `${mapId}-${localId}`,
        name: alias?.name ?? sourceNpcName(sourceNpcId),
        mapId,
        sourceNpcId,
      };
    }),
  )
  .sort(
    (left, right) =>
      (MIR4_WORLD_ARC_BY_MAP.get(left.mapId)?.sequence ?? 0) -
        (MIR4_WORLD_ARC_BY_MAP.get(right.mapId)?.sequence ?? 0) || left.id.localeCompare(right.id),
  );

const NPC_BY_ID = new Map(MIR4_ARC_NPC_IDENTITIES.map((npc) => [npc.id, npc] as const));
const NPC_BY_SOURCE = new Map(
  MIR4_ARC_NPC_IDENTITIES.map((npc) => [`${npc.mapId}:${npc.sourceNpcId}`, npc] as const),
);

export function mir4ArcNpcIdentity(id: string): Mir4ArcNpcIdentity | null {
  return NPC_BY_ID.get(id) ?? null;
}

export function mir4ArcNpcIdentityForSource(
  mapId: string,
  sourceNpcId: string,
): Mir4ArcNpcIdentity | null {
  return NPC_BY_SOURCE.get(`${mapId}:${sourceNpcId}`) ?? null;
}

export function mir4ArcNpcTemplateId(npcId: string): string {
  return `mir4_${npcId.replace(/-/g, '_')}`;
}

const ACCENT_PATTERN: Readonly<Record<string, string>> = {
  a: '[aàáâãäå]',
  c: '[cç]',
  e: '[eèéêë]',
  i: '[iìíîï]',
  n: '[nñ]',
  o: '[oòóôõö]',
  u: '[uùúûü]',
  y: '[yýÿ]',
};

function npcNamePattern(sourceNpcId: string): string {
  return sourceNpcId
    .split('-')
    .map((part) =>
      [...part]
        .map(
          (character) =>
            ACCENT_PATTERN[character] ?? character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        )
        .join(''),
    )
    .join('[\\s-]+');
}

function rewriteNpcText(mapId: string, value: string | undefined): string | undefined {
  if (!value) return value;
  let rewritten = value;
  for (const sourceNpcId of SOURCE_NPCS_BY_MAP.get(mapId) ?? []) {
    const identity = mir4ArcNpcIdentityForSource(mapId, sourceNpcId);
    if (!identity) continue;
    const pattern = npcNamePattern(sourceNpcId);
    rewritten = rewritten.replace(new RegExp(pattern, 'giu'), identity.name);
  }
  return rewritten;
}

function rewriteNpcTarget(mapId: string, target: string): string {
  return mir4ArcNpcIdentityForSource(mapId, target)?.id ?? target;
}

const TUTORIAL_STAGE_OVERRIDES: Readonly<
  Record<string, Readonly<Pick<Mir4ArcQuestStage, 'lesson' | 'text'>>>
> = {
  'M01-Q03': {
    lesson: 'equipar o item inicial recuperado',
    text: 'Abra as Bolsas, selecione a arma inicial recuperada e equipe-a no slot de arma.',
  },
  'M01-Q04': {
    lesson: 'coleta e primeiro craft de material',
    text: 'Use a Pedra do Sol e o cobre recebidos para fabricar um Pergaminho Solar na aba Criação.',
  },
  'M02-Q01': {
    lesson: 'teleporte seguro e retorno entre mapas',
    text: 'Saia de combate e atravesse o arco de retorno para a Vila do Vau; o tracker guiará a volta pelo mesmo portal.',
  },
};

function canonicalStage(
  questId: string,
  mapId: string,
  stage: Readonly<Mir4ArcQuestStage>,
): Mir4ArcQuestStage {
  const npcStage = stage.kind === 'talk' || stage.kind === 'deliver';
  const target = npcStage
    ? Array.isArray(stage.target)
      ? stage.target.map((value) => rewriteNpcTarget(mapId, value))
      : typeof stage.target === 'string'
        ? rewriteNpcTarget(mapId, stage.target)
        : stage.target
    : stage.target;
  return {
    ...stage,
    ...(stage.kind === 'system-tutorial' ? TUTORIAL_STAGE_OVERRIDES[questId] : {}),
    ...(target === undefined ? {} : { target }),
    ...(stage.text ? { text: rewriteNpcText(mapId, stage.text) } : {}),
  };
}

function canonicalQuest(source: Readonly<Mir4ArcQuest>): Mir4ArcQuest {
  const sourceIds = SOURCE_NPCS_BY_MAP.get(source.mapId) ?? new Set<string>();
  const appendAcceptGrants = (
    items: readonly Record<string, unknown>[],
    currencies: readonly Record<string, unknown>[] = [],
    guarantees: readonly Record<string, unknown>[] = [],
  ): Readonly<Record<string, unknown>> => ({
    ...source.onAcceptGrants,
    items: [
      ...(Array.isArray(source.onAcceptGrants.items) ? source.onAcceptGrants.items : []),
      ...items,
    ],
    currencies: [
      ...(Array.isArray(source.onAcceptGrants.currencies) ? source.onAcceptGrants.currencies : []),
      ...currencies,
    ],
    guarantees: [
      ...(Array.isArray(source.onAcceptGrants.guarantees) ? source.onAcceptGrants.guarantees : []),
      ...guarantees,
    ],
  });
  const tutorialMaterialGrant = (suffix: string) =>
    appendAcceptGrants(
      [
        {
          itemId: 990100001,
          quantity: 1,
          binding: 'character',
          grantId: `tutorial-${suffix}-sun-stone`,
        },
      ],
      [{ moneyId: 2, quantity: 5_000, grantId: `tutorial-${suffix}-copper` }],
    );
  const guidedEnhancementGrant = (targetLevel: number) => {
    const grants = tutorialMaterialGrant(source.questId.toLowerCase());
    return {
      ...grants,
      guarantees: [
        ...(Array.isArray(grants.guarantees) ? grants.guarantees : []),
        { guaranteeId: `tutorial-guided-plus-${targetLevel}`, uses: 1 },
      ],
    };
  };
  let onAcceptGrants = source.onAcceptGrants;
  if (source.questId === 'M01-Q04') {
    // The generated route refers to a 2D-era adaptive weapon bundle. The 3D
    // runtime supplies only native material-crafting inputs instead.
    onAcceptGrants = {
      ...source.onAcceptGrants,
      items: [
        {
          itemId: 990100001,
          quantity: 1,
          binding: 'character',
          grantId: 'tutorial-m01-q04-sun-stone',
        },
      ],
      currencies: [{ moneyId: 2, quantity: 5_000, grantId: 'tutorial-m01-q04-copper' }],
    };
  } else if (source.questId === 'M10-Q03') {
    onAcceptGrants = appendAcceptGrants([
      {
        itemId: 'bound-spirit-replica',
        quantity: 4,
        binding: 'character',
        grantId: 'tutorial-m10-q03-bound-spirit-replicas',
      },
    ]);
  } else if (source.questId === 'M13-Q03') {
    onAcceptGrants = tutorialMaterialGrant('m13-q03');
  } else {
    const enhancementTarget = new Map<string, number>([
      ['M11-Q05', 7],
      ['M15-Q05', 8],
      ['M17-Q06', 9],
      ['M19-Q06', 10],
    ]).get(source.questId);
    if (enhancementTarget) onAcceptGrants = guidedEnhancementGrant(enhancementTarget);
  }
  return {
    ...source,
    title: rewriteNpcText(source.mapId, source.title) ?? source.title,
    giverNpcId: source.giverNpcId
      ? (mir4ArcNpcIdentityForSource(source.mapId, source.giverNpcId)?.id ?? source.giverNpcId)
      : '',
    turnInNpcId: source.turnInNpcId
      ? (mir4ArcNpcIdentityForSource(source.mapId, source.turnInNpcId)?.id ?? source.turnInNpcId)
      : '',
    purpose: rewriteNpcText(source.mapId, source.purpose ?? undefined) ?? null,
    onAcceptGrants,
    stages: source.stages.map((stage) => canonicalStage(source.questId, source.mapId, stage)),
    dialogue: source.dialogue.map((line) => {
      if (typeof line === 'string') return rewriteNpcText(source.mapId, line) ?? line;
      const speakerSourceId = slug(line.speaker);
      const speaker = sourceIds.has(speakerSourceId)
        ? (mir4ArcNpcIdentityForSource(source.mapId, speakerSourceId)?.name ?? line.speaker)
        : line.speaker;
      return {
        ...line,
        speaker,
        text: rewriteNpcText(source.mapId, line.text) ?? line.text,
      };
    }),
  };
}

function canonicalGroup(source: readonly Mir4ArcQuest[]): readonly Mir4ArcQuest[] {
  return source.map(canonicalQuest);
}

export const MIR4_QUESTS_MAIN = canonicalGroup(SOURCE_QUESTS_MAIN);
export const MIR4_QUESTS_SIDE = canonicalGroup(SOURCE_QUESTS_SIDE);
export const MIR4_QUESTS_REPEATABLE = canonicalGroup(SOURCE_QUESTS_REPEATABLE);
export const MIR4_QUESTS_CITYPROFESSION = canonicalGroup(SOURCE_QUESTS_CITYPROFESSION);
export const MIR4_QUESTS_ARC: readonly Mir4ArcQuest[] = [
  ...MIR4_QUESTS_MAIN,
  ...MIR4_QUESTS_SIDE,
  ...MIR4_QUESTS_REPEATABLE,
  ...MIR4_QUESTS_CITYPROFESSION,
];

const QUEST_BY_ID = new Map(MIR4_QUESTS_ARC.map((quest) => [quest.questId, quest] as const));

export function mir4ArcQuest(questId: string): Mir4ArcQuest | null {
  return QUEST_BY_ID.get(questId) ?? null;
}
