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
// Sara is an authored M01 service NPC promoted into the main route below.
// Keep her in the same canonical identity table as every quest contact so
// Auto Mission, dialogue and physical placement resolve one unique person.
SOURCE_NPCS_BY_MAP.get('m01-vila-do-vau')?.add('sara-das-ervas');

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

const PLAYER_FACING_MISSION_LABELS: readonly (readonly [string, string])[] = [
  ['final-boss-and-city', 'derrotar o comandante final e proteger a cidade'],
  ['public-event-defend', 'defender as pessoas durante o ataque'],
  ['collect-and-activate', 'coletar os componentes e ativar o mecanismo'],
  ['defend-and-activate', 'defender o local e ativar o mecanismo'],
  ['activate-and-defend', 'ativar o mecanismo e defender o local'],
  ['elite-and-activate', 'derrotar o inimigo de elite e ativar o mecanismo'],
  ['explore-and-hunt', 'seguir os rastros e caçar as criaturas'],
  ['interrupt-ritual', 'interromper o ritual'],
  ['escort-entity', 'escoltar a patrulha'],
  ['inspect-clues', 'examinar as pistas'],
  ['survive-zone', 'sobreviver à área tomada pelos inimigos'],
  ['open-passage', 'abrir a passagem'],
  ['clear-access', 'eliminar os inimigos que bloqueiam o acesso'],
  ['boss/cidade', 'derrotar o comandante inimigo e proteger a cidade'],
  ['elite/defesa', 'derrotar o inimigo de elite e defender o local'],
  ['investigate', 'investigar os sinais'],
  ['collect', 'coletar os materiais'],
  ['escort', 'escoltar o grupo'],
  ['hunt', 'caçar as criaturas'],
  ['boss', 'derrotar o comandante inimigo'],
  ['elite', 'derrotar o inimigo de elite'],
];

function rewritePlayerFacingMissionText(value: string): string {
  let rewritten = value;
  for (const [label, playerText] of PLAYER_FACING_MISSION_LABELS) {
    rewritten = rewritten.replaceAll(`‘${label}’`, `‘${playerText}’`);
  }
  return rewritten
    .replace(/precisa executar ‘([^’]+)’/giu, 'precisa de ajuda para $1')
    .replace(/A ordem diz ‘([^’]+)’/giu, 'O objetivo imediato é $1')
    .replace(/anchor seguro/giu, 'ponto seguro')
    .replace(/polígono hostil/giu, 'área controlada pelos inimigos')
    .replace(/mother_of_leeches/giu, 'Mãe das Sanguessugas')
    .replace(/\bboss\b/giu, 'chefe')
    .replace(/\btracker\b/giu, 'rastreador')
    .replace(/\blandmark\b/giu, 'ponto de interesse')
    .replace(/\breceipt\b/giu, 'comprovante')
    .replace(/\bguardian\b/giu, 'guardião')
    .replace(/\bwaypoint\b/giu, 'ponto de viagem')
    .replace(/\bpuzzle\b/giu, 'enigma');
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
  return rewritePlayerFacingMissionText(rewritten);
}

function rewriteNpcTarget(mapId: string, target: string): string {
  return mir4ArcNpcIdentityForSource(mapId, target)?.id ?? target;
}

const QUEST_MISSION_TEXT_OVERRIDES: Readonly<Record<string, readonly [string, string]>> = {
  // The imported purpose says escort, but the authored stages investigate the
  // vanished patrol's trail and confront its pursuers; no escort exists here.
  'M17-Q05': ['escoltar a patrulha', 'seguir a trilha da patrulha e confrontar seus perseguidores'],
};

function rewriteQuestMissionText(questId: string, value: string): string {
  const override = QUEST_MISSION_TEXT_OVERRIDES[questId];
  return override ? value.replaceAll(override[0], override[1]) : value;
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

const QUEST_STAGE_OVERRIDES: Readonly<
  Record<string, Readonly<Record<number, Readonly<Partial<Mir4ArcQuestStage>>>>>
> = {
  'M02-Q02': {
    1: {
      text: 'Encontre Ivo Juncofirme na margem seca da Estrada dos Lírios.',
    },
    2: {
      text: 'Fale com Ivo Juncofirme para iniciar. Acompanhe-o pela estrada seca e derrote os saqueadores nos três pontos de emboscada.',
    },
    3: {
      text: 'Ivo chegou ao Posto das Duas Pontes. Derrote o Capitão da Ponte que bloqueia a passagem final.',
    },
    4: {
      text: 'Examine as ordens do Capitão: os saqueadores conheciam cada parada da patrulha.',
    },
  },
};

function canonicalStage(
  questId: string,
  mapId: string,
  stage: Readonly<Mir4ArcQuestStage>,
  stageIndex: number,
): Mir4ArcQuestStage {
  const baseStage =
    questId === 'M01-Q02' && stageIndex === 0
      ? {
          ...stage,
          target: 'sara-das-ervas',
          text: 'Fale com Sara das Ervas para conhecer poções, artigos gerais e equipamentos iniciais da sua classe.',
        }
      : stage;
  const effectiveStage = {
    ...baseStage,
    ...QUEST_STAGE_OVERRIDES[questId]?.[stageIndex],
  };
  const npcStage = effectiveStage.kind === 'talk' || effectiveStage.kind === 'deliver';
  const target = npcStage
    ? Array.isArray(effectiveStage.target)
      ? effectiveStage.target.map((value) => rewriteNpcTarget(mapId, value))
      : typeof effectiveStage.target === 'string'
        ? rewriteNpcTarget(mapId, effectiveStage.target)
        : effectiveStage.target
    : effectiveStage.target;
  return {
    ...effectiveStage,
    ...(effectiveStage.kind === 'system-tutorial' ? TUTORIAL_STAGE_OVERRIDES[questId] : {}),
    ...(target === undefined ? {} : { target }),
    ...(effectiveStage.text ? { text: rewriteNpcText(mapId, effectiveStage.text) } : {}),
  };
}

type Mir4ArcDialogue = Mir4ArcQuest['dialogue'];

const MAIN_DIALOGUE_OVERRIDES: Readonly<Record<string, Mir4ArcDialogue>> = {
  'M02-Q02': [
    {
      beat: 'accept',
      speaker: 'Darian Passojunco',
      text: 'Ivo Juncofirme encontrou marcas de sabotagem na estrada dos Lírios. Encontre-o na margem seca e conduza-o até o Posto das Duas Pontes; os saqueadores conhecem cada parada da patrulha.',
    },
    {
      beat: 'reveal',
      speaker: 'Neris da Centelha',
      text: 'As ordens do capitão marcam os três pontos da emboscada. Alguém que conhece as rotas do Farol entregou o caminho aos saqueadores.',
    },
    {
      beat: 'complete',
      speaker: 'Darian Passojunco',
      text: 'Ivo chegou vivo e trouxe a prova. Agora sabemos que os incêndios escondem uma operação maior, guiada por alguém de dentro das rotas do Farol.',
    },
  ],
};

function sentenceCase(value: string): string {
  const trimmed = value.trim().replace(/[.]+$/u, '');
  return trimmed.length > 0 ? `${trimmed.slice(0, 1).toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

interface FormulaicNarrativeParts {
  objective: string;
  context: string;
  evidence: string;
  goal: string;
}

function formulaicNarrativeParts(
  purpose: string | null,
  dialogue: Mir4ArcDialogue,
): FormulaicNarrativeParts | null {
  if (!purpose || dialogue.length !== 3 || dialogue.some((line) => typeof line === 'string'))
    return null;
  const [accept, reveal, complete] = dialogue;
  if (
    !accept ||
    typeof accept === 'string' ||
    !reveal ||
    typeof reveal === 'string' ||
    !complete ||
    typeof complete === 'string'
  )
    return null;
  const objective = /^O objetivo imediato é (.+?), mas uma vitória cega/iu.exec(accept.text)?.[1];
  const context = / porque (.+?)\. Esta missão/iu.exec(purpose)?.[1];
  const revealParts =
    /^Os sinais convergem: (.+?)\. Isso muda nossa leitura do caminho para (.+?)\.$/iu.exec(
      reveal.text,
    );
  const completionEvidence = /^Registramos que (.+?)\. Agora podemos/iu.exec(complete.text)?.[1];
  if (!objective || !context || !revealParts?.[1] || !revealParts[2] || !completionEvidence)
    return null;
  if (revealParts[1].localeCompare(completionEvidence, 'pt-BR', { sensitivity: 'base' }) !== 0)
    return null;
  return {
    objective,
    context,
    evidence: revealParts[1],
    goal: revealParts[2],
  };
}

function rewriteFormulaicMainDialogue(
  order: number | null,
  purpose: string | null,
  dialogue: Mir4ArcDialogue,
): Mir4ArcDialogue {
  const parts = formulaicNarrativeParts(purpose, dialogue);
  if (!parts) return dialogue;
  const [accept, reveal, complete] = dialogue;
  if (
    !accept ||
    typeof accept === 'string' ||
    !reveal ||
    typeof reveal === 'string' ||
    !complete ||
    typeof complete === 'string'
  )
    return dialogue;
  const context = sentenceCase(parts.context);
  const evidence = sentenceCase(parts.evidence);
  const objective = parts.objective.replace(/[.]+$/u, '');
  const goal = parts.goal.replace(/[.]+$/u, '');
  const variants = [
    {
      accept: `${context}. Precisamos ${objective}, mas não transforme os sinais em cinzas antes de entendê-los. Volte com uma prova.`,
      reveal: `${evidence}. Não é o que esperávamos, porém finalmente temos uma direção: ${goal}.`,
      complete: `Guarde este registro. Se alguém contestar nossa descoberta, a prova falará por nós. Agora precisamos ${goal}.`,
    },
    {
      accept: `${context}. Há algo deliberado por trás disso. Vá ${objective} e procure o detalhe que o inimigo tentou esconder.`,
      reveal: `${evidence}. Isso explica os relatos desencontrados e muda o próximo passo: precisamos ${goal}.`,
      complete: `Então era isso que estava diante de nós. Avise os outros; com essa descoberta, podemos ${goal}.`,
    },
    {
      accept: `${context}. Antes que a trilha esfrie, precisamos ${objective}. Traga fatos, não rumores.`,
      reveal: `${evidence}. Cada vestígio confirma a mesma história. Se agirmos depressa, ainda podemos ${goal}.`,
      complete: `Você trouxe a peça que faltava. Vou preservar a prova enquanto você segue adiante para ${goal}.`,
    },
    {
      accept: `${context}. Força sem resposta apenas alimentará o medo. Precisamos ${objective} e descobrir quem se beneficia desse caos.`,
      reveal: `${evidence}. A ameaça tem método, não apenas fome. Nosso caminho agora é ${goal}.`,
      complete: `A verdade é pior que o boato, mas ao menos pode ser enfrentada. Reúna o que precisa e vá ${goal}.`,
    },
    {
      accept: `${context}. O tempo está contra nós. Precisamos ${objective}; observe o campo antes que os responsáveis apaguem as marcas.`,
      reveal: `${evidence}. Esta prova liga o ataque ao que vimos antes. Ela também mostra como podemos ${goal}.`,
      complete: `Não deixe esta informação morrer aqui. Leve-a adiante e use-a para ${goal}.`,
    },
    {
      accept: `${context}. Chegamos ao ponto em que hesitar também custa vidas. Precisamos ${objective}, sem perder de vista o motivo desta luta.`,
      reveal: `${evidence}. Agora a escolha está clara: para impedir que tudo se repita, precisamos ${goal}.`,
      complete: `Está decidido. O que você descobriu encerra esta dúvida e abre o caminho para ${goal}.`,
    },
  ];
  const variant = variants[Math.max(0, ((order ?? 1) - 1) % variants.length)]!;
  return [
    { ...accept, text: variant.accept },
    { ...reveal, text: variant.reveal },
    { ...complete, text: variant.complete },
  ];
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
        {
          itemId: 'copper_mining_pick',
          quantity: 1,
          binding: 'character',
          grantId: 'tutorial-m01-q04-mining-pick',
        },
        {
          itemId: 'gathering_sickle',
          quantity: 1,
          binding: 'character',
          grantId: 'tutorial-m01-q04-gathering-sickle',
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
  const rewrittenPurpose = rewriteNpcText(source.mapId, source.purpose ?? undefined);
  const purpose = rewrittenPurpose
    ? rewriteQuestMissionText(source.questId, rewrittenPurpose)
    : null;
  const dialogue = source.dialogue.map((line) => {
    if (typeof line === 'string') return rewriteNpcText(source.mapId, line) ?? line;
    const speakerSourceId = slug(line.speaker);
    const speaker = sourceIds.has(speakerSourceId)
      ? (mir4ArcNpcIdentityForSource(source.mapId, speakerSourceId)?.name ?? line.speaker)
      : line.speaker;
    const canonicalLine = {
      ...line,
      speaker,
      text: rewriteQuestMissionText(
        source.questId,
        rewriteNpcText(source.mapId, line.text) ?? line.text,
      ),
    };
    return source.questId === 'M01-Q02' && line.beat === 'reveal'
      ? {
          ...canonicalLine,
          speaker: 'Sara das Ervas',
          text: 'Aqui você encontra poções de vida e mana, alimento para a estrada e equipamento básico próprio para sua classe. Abra a loja, compare os itens e mantenha poções no atalho antes de seguir para os currais.',
        }
      : canonicalLine;
  });
  const canonicalDialogue =
    source.group === 'main'
      ? rewriteFormulaicMainDialogue(source.order, purpose, dialogue)
      : dialogue;
  return {
    ...source,
    title: rewriteNpcText(source.mapId, source.title) ?? source.title,
    giverNpcId: source.giverNpcId
      ? (mir4ArcNpcIdentityForSource(source.mapId, source.giverNpcId)?.id ?? source.giverNpcId)
      : '',
    turnInNpcId: source.turnInNpcId
      ? (mir4ArcNpcIdentityForSource(source.mapId, source.turnInNpcId)?.id ?? source.turnInNpcId)
      : '',
    purpose,
    onAcceptGrants,
    stages: source.stages.map((stage, stageIndex) =>
      canonicalStage(source.questId, source.mapId, stage, stageIndex),
    ),
    dialogue: MAIN_DIALOGUE_OVERRIDES[source.questId] ?? canonicalDialogue,
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
