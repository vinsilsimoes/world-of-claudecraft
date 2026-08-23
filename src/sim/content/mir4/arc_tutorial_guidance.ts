// Structured guidance for every campaign stage that teaches a system. The
// destination ids point to existing World of ClaudeCraft HUD launchers; no
// parallel MIR4 window is introduced.

export type Mir4TutorialShortcutAction =
  | 'bags'
  | 'char'
  | 'crafting'
  | 'dfinder'
  | 'map'
  | 'questlog';

export interface Mir4TutorialRequirement {
  kind: 'action' | 'equipment' | 'enhancement' | 'material' | 'party' | 'power';
  id: string;
  quantity: number;
}

export interface Mir4ArcTutorialGuidance {
  questId: string;
  launcherId: string | null;
  shortcutAction: Mir4TutorialShortcutAction | null;
  tab?: 'blessing' | 'crafting' | 'enchantment' | 'refinement';
  steps: readonly string[];
  requirements: readonly Mir4TutorialRequirement[];
}

type GuideInput = Omit<Mir4ArcTutorialGuidance, 'questId'>;

const guide = (questId: string, input: GuideInput): Mir4ArcTutorialGuidance => ({
  questId,
  ...input,
});

const MAP = { launcherId: 'mm-map', shortcutAction: 'map' } as const;
const BAGS = { launcherId: 'mm-bag', shortcutAction: 'bags' } as const;
const CRAFTING = {
  launcherId: 'mm-crafting',
  shortcutAction: 'crafting',
} as const;
const FINDER = { launcherId: 'mm-dfinder', shortcutAction: 'dfinder' } as const;
const QUEST_LOG = {
  launcherId: 'mm-quest',
  shortcutAction: 'questlog',
} as const;
const CHARACTER = { launcherId: 'mm-char', shortcutAction: 'char' } as const;

export const MIR4_ARC_TUTORIAL_GUIDANCE: readonly Mir4ArcTutorialGuidance[] = [
  guide('M01-Q01', {
    ...MAP,
    steps: [
      'Abra o mapa, localize a Vila do Vau e selecione o waypoint descoberto.',
      'Marque a Clareira como destino e clique novamente na missão para iniciar a Auto Missão.',
    ],
    requirements: [{ kind: 'action', id: 'discover-waypoint', quantity: 1 }],
  }),
  guide('M01-Q02', {
    ...BAGS,
    steps: [
      'Abra as Bolsas e localize as 3 Poções Menores recebidas com a missão.',
      'Coloque uma poção no atalho e use-a depois de sofrer dano durante a coleta.',
    ],
    requirements: [{ kind: 'material', id: 'minorHealthPotion', quantity: 3 }],
  }),
  guide('M01-Q03', {
    ...BAGS,
    steps: [
      'Abra as Bolsas e localize a arma inicial disponível para sua classe.',
      'Selecione a arma e use Equipar; confira o aumento de Poder de Combate no painel.',
    ],
    requirements: [{ kind: 'equipment', id: 'starterWeapon', quantity: 1 }],
  }),
  guide('M01-Q04', {
    ...CRAFTING,
    tab: 'crafting',
    steps: [
      'Abra Criação e selecione a aba Criação.',
      'Escolha Pergaminho Solar e use a Pedra do Sol e 5.000 Copper recebidos para fabricar uma unidade.',
    ],
    requirements: [
      { kind: 'material', id: 'sunStone', quantity: 1 },
      { kind: 'material', id: 'solarScroll', quantity: 1 },
    ],
  }),
  guide('M01-Q06', {
    ...CRAFTING,
    tab: 'refinement',
    steps: [
      'Na aba Criação, converta as 2 Pedras do Sol recebidas em 2 Pergaminhos Solares.',
      'Abra a aba Refinamento, selecione a arma equipada e aprimore-a até +2.',
    ],
    requirements: [
      { kind: 'material', id: 'sunStone', quantity: 2 },
      { kind: 'material', id: 'solarScroll', quantity: 2 },
      { kind: 'enhancement', id: 'weapon', quantity: 2 },
    ],
  }),
  guide('M02-Q01', {
    ...MAP,
    steps: [
      'Vá ao arco de retorno na margem oeste do Posto das Duas Pontes e saia de combate.',
      'Atravesse o arco até a Vila do Vau; o tracker indicará o mesmo portal para voltar ao pântano.',
    ],
    requirements: [{ kind: 'action', id: 'portalTravel', quantity: 1 }],
  }),
  guide('M02-Q03', {
    ...QUEST_LOG,
    steps: [
      'Abra o Registro de Missões e acompanhe as quatro memórias do rito.',
      'Conclua as quatro interações; o último registro libera o Bilhete de Espírito.',
    ],
    requirements: [{ kind: 'action', id: 'memoryRite', quantity: 4 }],
  }),
  guide('M02-Q04', {
    ...BAGS,
    steps: [
      'Abra as Bolsas, use o Bilhete de Espírito e confirme o Espírito invocado.',
      'Selecione o Espírito para equipá-lo e conclua a recuperação com ele ativo.',
    ],
    requirements: [{ kind: 'material', id: 'spirit-ticket-dawn', quantity: 1 }],
  }),
  guide('M03-Q01', {
    ...CRAFTING,
    tab: 'enchantment',
    steps: [
      'Na aba Criação, use 5 Pedras da Lua para fabricar 1 Selo Lunar.',
      'Abra Encantamento, selecione um equipamento, role 2 afixos e escolha Aceitar ou Manter.',
    ],
    requirements: [
      { kind: 'material', id: 'moonStone', quantity: 5 },
      { kind: 'material', id: 'lunarSeal', quantity: 1 },
    ],
  }),
  guide('M03-Q03', {
    ...QUEST_LOG,
    steps: [
      'Siga o marcador até o sino do estábulo e interaja para reativá-lo.',
      'Conclua o registro da etapa para receber o primeiro Bilhete de Montaria.',
    ],
    requirements: [{ kind: 'action', id: 'stableBell', quantity: 1 }],
  }),
  guide('M03-Q04', {
    ...BAGS,
    steps: [
      'Abra as Bolsas, use o Bilhete de Montaria e confirme a montaria invocada.',
      'Equipe a montaria e atravesse os três marcos indicados sem desmontar.',
    ],
    requirements: [
      { kind: 'material', id: 'mount-ticket-dawn', quantity: 1 },
      { kind: 'action', id: 'mountedCheckpoint', quantity: 3 },
    ],
  }),
  guide('M04-Q03', {
    ...CRAFTING,
    tab: 'refinement',
    steps: [
      'Fabrique 3 Pergaminhos Solares na aba Criação.',
      'Na aba Refinamento, confira chance e bônus acumulado e leve a arma de +2 até +5.',
    ],
    requirements: [
      { kind: 'material', id: 'solarScroll', quantity: 3 },
      { kind: 'enhancement', id: 'weapon', quantity: 5 },
    ],
  }),
  guide('M04-Q04', {
    ...CRAFTING,
    tab: 'blessing',
    steps: [
      'Abra Bênção e selecione uma peça compatível.',
      'Use a Lágrima da Aurora vinculada, compare os 3 afixos e escolha Aceitar ou Manter.',
    ],
    requirements: [{ kind: 'material', id: 'dawnTear', quantity: 1 }],
  }),
  guide('M04-Q05', {
    ...FINDER,
    steps: [
      'Abra o Localizador de Masmorras e selecione Cripta da Raiz.',
      'Confirme a entrada, ative os três selos e derrote o encontro final.',
    ],
    requirements: [{ kind: 'action', id: 'dungeonSeal', quantity: 3 }],
  }),
  guide('M05-Q02', {
    ...FINDER,
    steps: [
      'Abra o Localizador, forme ou ingresse em um grupo e confirme sua função.',
      'Marque o Porta-Estandarte e conclua a etapa mantendo contribuição no grupo.',
    ],
    requirements: [{ kind: 'party', id: 'partyMember', quantity: 2 }],
  }),
  guide('M07-Q05', {
    ...CRAFTING,
    tab: 'refinement',
    steps: [
      'Fabrique 1 Pergaminho Solar com a Pedra do Sol e o Copper concedidos.',
      'Na aba Refinamento, selecione a arma +5, habilite o Amparo e alcance +6.',
    ],
    requirements: [
      { kind: 'material', id: 'sunStone', quantity: 1 },
      { kind: 'material', id: 'solarScroll', quantity: 1 },
      { kind: 'material', id: 'solarWard', quantity: 1 },
      { kind: 'enhancement', id: 'weapon', quantity: 6 },
    ],
  }),
  guide('M08-Q05', {
    ...FINDER,
    steps: [
      'Abra o Localizador e entre no Palácio Ossuário.',
      'Descubra o nome mortal de Varkos, vincule-o ao alvo e conclua o encontro.',
    ],
    requirements: [{ kind: 'action', id: 'trueNameBinding', quantity: 1 }],
  }),
  guide('M09-Q04', {
    ...MAP,
    steps: [
      'Sincronize as cinco luzes marcadas e saia de combate.',
      'Abra o mapa e use o retorno regional nos dois sentidos para validar a rede.',
    ],
    requirements: [{ kind: 'action', id: 'regionalLight', quantity: 5 }],
  }),
  guide('M10-Q03', {
    ...BAGS,
    steps: [
      'Abra as Bolsas e localize as quatro réplicas de Espírito vinculadas.',
      'Selecione Combinação 4 para 1 e confirme; sucesso consome quatro e falha devolve uma.',
    ],
    requirements: [{ kind: 'material', id: 'boundSpiritReplica', quantity: 4 }],
  }),
  guide('M11-Q05', {
    ...CRAFTING,
    tab: 'refinement',
    steps: [
      'Reúna Pedras do Sol e fabrique Pergaminhos Solares na aba Criação.',
      'Na aba Refinamento, selecione uma peça principal e alcance +7; Amparo é opcional.',
    ],
    requirements: [{ kind: 'enhancement', id: 'mainEquipment', quantity: 7 }],
  }),
  guide('M12-Q05', {
    ...FINDER,
    steps: [
      'Abra o Localizador e entre no Palácio de Lama com o grupo.',
      'Recupere as três provas e mantenha contribuição até o registro individual da conclusão.',
    ],
    requirements: [{ kind: 'action', id: 'palaceEvidence', quantity: 3 }],
  }),
  guide('M13-Q03', {
    ...CRAFTING,
    tab: 'crafting',
    steps: [
      'Abra Criação e refine a resina solar exigida pela receita.',
      'Escolha o slot mais defasado e fabrique uma peça de rank 8 compatível com sua classe.',
    ],
    requirements: [{ kind: 'equipment', id: 'rank8ClassItem', quantity: 1 }],
  }),
  guide('M14-Q05', {
    ...CRAFTING,
    tab: 'blessing',
    steps: [
      'Abra Bênção e compare os afixos da peça com o orçamento desta faixa.',
      'Use uma Lágrima da Aurora se houver melhoria real ou mantenha a peça adequada.',
    ],
    requirements: [{ kind: 'material', id: 'dawnTear', quantity: 1 }],
  }),
  guide('M15-Q05', {
    ...CRAFTING,
    tab: 'refinement',
    steps: [
      'Reúna recursos da Caldeira e mantenha uma arma de reposição pronta.',
      'Abra Refinamento e alcance +8, usando Amparo somente se estiver disponível.',
    ],
    requirements: [{ kind: 'enhancement', id: 'weapon', quantity: 8 }],
  }),
  guide('M16-Q04', {
    ...FINDER,
    steps: [
      'Abra o Localizador e entre no Arsenal Solar com o grupo.',
      'Alterne válvulas, use plataformas seguras e proteja o portador do molde.',
    ],
    requirements: [{ kind: 'action', id: 'solarMold', quantity: 1 }],
  }),
  guide('M17-Q06', {
    ...CRAFTING,
    tab: 'refinement',
    steps: [
      'Conclua contratos da tundra e fabrique os Pergaminhos necessários.',
      'Abra Refinamento, selecione uma peça principal e alcance +9.',
    ],
    requirements: [{ kind: 'enhancement', id: 'mainEquipment', quantity: 9 }],
  }),
  guide('M18-Q03', {
    ...FINDER,
    steps: [
      'Abra o Localizador, confirme sua função e entre na Ponte Transparente.',
      'Execute interrupção, proteção ou dano conforme a função indicada para seu grupo.',
    ],
    requirements: [{ kind: 'party', id: 'roleResponsibility', quantity: 1 }],
  }),
  guide('M19-Q06', {
    ...CRAFTING,
    tab: 'refinement',
    steps: [
      'Prepare recraft e Amparo antes de iniciar a tentativa de alto risco.',
      'Abra Refinamento, selecione uma peça principal e alcance +10 antes de romper o Véu.',
    ],
    requirements: [{ kind: 'enhancement', id: 'mainEquipment', quantity: 10 }],
  }),
  guide('M20-Q05', {
    ...FINDER,
    steps: [
      'Abra o Localizador e entre no Salão dos Nomes com consumíveis e funções confirmadas.',
      'Use interrupções, ativações e leitura de telegraph até concluir o encontro final.',
    ],
    requirements: [{ kind: 'party', id: 'finalDungeonParty', quantity: 1 }],
  }),
  guide('M20-Q06', {
    ...CHARACTER,
    steps: [
      'Abra Personagem e confira Poder de Combate, equipamento, consumíveis e funções do grupo.',
      'Peças +12 são recomendadas, mas a entrada exige somente história e nível.',
    ],
    requirements: [
      { kind: 'power', id: 'finalReadiness', quantity: 1 },
      { kind: 'enhancement', id: 'recommendedEquipment', quantity: 12 },
    ],
  }),
];

const GUIDANCE_BY_QUEST = new Map(
  MIR4_ARC_TUTORIAL_GUIDANCE.map((entry) => [entry.questId, entry] as const),
);

export function mir4ArcTutorialGuidance(questId: string): Mir4ArcTutorialGuidance | null {
  return GUIDANCE_BY_QUEST.get(questId) ?? null;
}
