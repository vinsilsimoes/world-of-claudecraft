// Pure presentation-only selection of existing Aeldrune bodies for the
// MIR4 profile. Dynamic campaign ids cannot be listed in the classic static
// registries, so this resolver classifies their authored identity and returns
// an already-registered VisualDef key. No model is copied or generated here.

import { mir4NativeClassPresentation } from '../../sim/mir4/native_class_presentation';

const NPC_ROLE_RULES: readonly [RegExp, readonly string[]][] = [
  [
    /(ferreir|smith|forj|cinerita|yrsa|svala|darek|carpinteir|carpenter|artesa|artisan|mecanic|mechanic)/,
    ['npc_smith'],
  ],
  [
    /(capita|captain|marshal|warden|jarl|comand|general|guarda|guard|almirante|admiral|rainha|queen|\brei\b|\bking\b|\blord\b)/,
    ['npc_knight'],
  ],
  [/(cronista|chronicler|arquiv|archiv|edda|escriba)/, ['npc_chronicler']],
  [
    /(ilyra|centelha|lumen|oracul|oracle|sacerd|namar|akhet|aurora)/,
    ['npc_mage', 'npc_villager_robed'],
  ],
  [
    /(orin|sete_marcas|scout|batedor|escalador|sten|cacador|hunter|guia|guide|explor|naveg|navigator)/,
    ['npc_scout'],
  ],
  [/(reliqu|monge|monk|irmao|brother|abade|abbot)/, ['npc_reliquary_keeper', 'npc_villager_robed']],
];

const NPC_FALLBACKS = [
  'npc_villager',
  'npc_villager_robed',
  'npc_scout',
  'npc_smith',
  'npc_knight',
  'npc_mage',
  'npc_chronicler',
  'npc_reliquary_keeper',
] as const;

const MOB_RULES: readonly [RegExp, readonly string[]][] = [
  [/(aranh|spider|weaver|teia|web|widow)/, ['mob_spider']],
  [/(lobo|wolf|hound|canin|alcateia|alfa|howler)/, ['mob_wolf', 'greyjaw']],
  [/(javali|boar|porco|tusk|thicket)/, ['mob_boar', 'mob_bear']],
  [/(raposa|fox)/, ['mob_fox']],
  [
    /(cervo|veado|stag|hart|aurelhorn|corca)/,
    ['mob_stag', 'mob_veiled_stag', 'mob_gleamstag', 'mob_aurelhorn'],
  ],
  [/(caranguej|crab|scuttler)/, ['mob_crab']],
  [/(sapo|frog|toad|murloc|mudfin|lama|bog|charco)/, ['mob_murloc', 'mob_glub']],
  [/(cogumelo|mushroom|spore|fung)/, ['mob_glub', 'mob_mushroom_pixie']],
  [/(arvore|tree|treant|raiz|root|bark|madeira)/, ['mob_treant']],
  [/(urso|bear)/, ['mob_bear']],
  [/(yeti|abominavel|neve)/, ['mob_yeti']],
  [/(raptor|lagarto|lizard|reptil|reptile|spearjaw)/, ['mob_raptor', 'mob_spearjaw']],
  [
    /(kobold|goblin|rato|\brat\b|escav|digger|mineir)/,
    ['mob_kobold', 'mob_kobold_digger', 'mob_grix'],
  ],
  [
    /(drag|draco|wyrm|wyvern|serpe|brood)/,
    ['mob_dragonkin', 'mob_dragonkin_broodguard', 'mob_dragonkin_whelp', 'mob_dragonkin_broodlord'],
  ],
  [
    /(esquelet|skeleton|osso|bone|morto|undead|revenant|cripta|crypt|grave|tumba|sepulcr|wight)/,
    ['skel_minion', 'skel_warrior', 'skel_rogue', 'skel_mage', 'skel_necromancer', 'skel_golem'],
  ],
  [
    /(fantasma|ghost|wisp|espectr|spirit|alma|soul|assombr|wraith)/,
    ['mob_ghost', 'mob_glimmerwisp', 'mob_duskwisp', 'delve_skel_wraith'],
  ],
  [/(gelo|ice|frost|aurora|geada)/, ['mob_water_elemental', 'mob_ghost', 'mob_yeti']],
  [
    /(fogo|flame|brasa|ember|cinza|cinder|magma|lava|pyre)/,
    ['mob_emberkin', 'mob_pyre_colossus', 'mob_elemental'],
  ],
  [
    /(element|tempest|storm|raio|lightning|trov|vento|wind)/,
    ['mob_elemental', 'mob_water_elemental', 'mob_glimmerwisp'],
  ],
  [
    /(demon|infernal|abiss|abyss|void|corrupt|sombr|shadow|treva|rift)/,
    ['mob_demonalt', 'mob_demon', 'mob_demon_flying', 'mob_nightkin'],
  ],
  [
    /(golem|construct|guardiao|guardian|sentinela|colosso|idol|totem|ward)/,
    ['skel_golem', 'mob_elemental', 'mob_ogre', 'mob_troll'],
  ],
  [/(orc|ogro|ogre|troll|bruto|brute|gigante|giant)/, ['mob_ogre', 'mob_troll', 'mob_bruiser']],
  [
    /(cult|acolito|acolyte|mago|mage|feitic|caster|bruxa|witch|sacerd|priest|ritual)/,
    [
      'mob_dark_caster',
      'delve_mob_acolyte',
      'mob_wildheart_hexcaller',
      'mob_wildheart_high_priest',
    ],
  ],
  [
    /(arqueir|archer|cacador|hunter|stalker|batedor|scout)/,
    ['mob_wildheart_stalker', 'skel_rogue'],
  ],
  [
    /(soldado|guarda|warrior|lance|capitao|knight|raider|saqueador|bandido)/,
    ['skel_warrior', 'mob_wildheart_ravager', 'mob_bruiser'],
  ],
];

const MOB_FALLBACKS = [
  'mob_wolf',
  'mob_boar',
  'mob_spider',
  'mob_murloc',
  'mob_kobold',
  'mob_troll',
  'mob_ogre',
  'mob_elemental',
  'mob_dragonkin',
  'mob_demonalt',
  'mob_ghost',
  'mob_glub',
  'mob_crab',
  'mob_treant',
  'mob_raptor',
  'mob_bear',
  'skel_minion',
  'skel_warrior',
  'skel_rogue',
  'skel_mage',
  'mob_dark_caster',
  'mob_bruiser',
] as const;

const M01_MOB_VISUALS: Readonly<Record<string, string>> = {
  forest_wolf: 'mob_wolf',
  rabid_boar: 'mob_boar',
  bandit_cutthroat: 'mob_bruiser',
  moss_skeleton: 'skel_warrior',
  briar_guard: 'mob_wildheart_ravager',
  dire_wolf: 'greyjaw',
};

const M04_MOB_VISUALS: Readonly<Record<string, string>> = {
  bandit_cutthroat: 'mob_wildheart_stalker',
  moss_skeleton: 'skel_warrior',
  briar_guard: 'mob_wildheart_ravager',
  dire_wolf: 'greyjaw',
  forest_wolf: 'mob_wolf',
  crypt_rat: 'mob_grix',
  skeleton_spearman: 'skel_warrior',
};

const M04_NAMED_VISUALS: readonly [RegExp, string][] = [
  [/carrasco_da_encosta/, 'mob_bruiser'],
  [/alfa_da_muralha/, 'greyjaw'],
  [/mestre_das_chaves/, 'mob_dark_caster'],
  [/lanceiro_verde/, 'skel_warrior'],
  [/ancient_briar_colossus/, 'mob_treant'],
];

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function select(keys: readonly string[], identity: string): string {
  return keys.at(stableHash(identity) % keys.length) ?? '';
}

export function mir4PlayerVisualKey(classId: number): string {
  return `player_${mir4NativeClassPresentation(classId).visualClass}`;
}

export function mir4NpcVisualKey(templateId: string, name = ''): string | null {
  if (!templateId.startsWith('mir4_')) return null;
  const identity = normalized(name.trim().length > 0 ? name : templateId);
  for (const [pattern, keys] of NPC_ROLE_RULES) {
    if (pattern.test(identity)) return select(keys, identity);
  }
  return select(NPC_FALLBACKS, identity);
}

export function mir4MobVisualKey(templateId: string, name = ''): string | null {
  if (!templateId.startsWith('mir4_')) return null;
  const m01Prefix = 'mir4_m01-vila-do-vau_';
  if (templateId.startsWith(m01Prefix)) {
    const authored = M01_MOB_VISUALS[templateId.slice(m01Prefix.length)];
    if (authored) return authored;
  }
  const identity = normalized(`${name}_${templateId}`);
  const m04Prefix = 'mir4_m04-ruinas-da-encosta_';
  if (templateId.startsWith(m04Prefix)) {
    const authored = M04_MOB_VISUALS[templateId.slice(m04Prefix.length)];
    if (authored) return authored;
  }
  if (identity.includes('m04')) {
    for (const [pattern, visual] of M04_NAMED_VISUALS) {
      if (pattern.test(identity)) return visual;
    }
  }
  if (templateId.startsWith('mir4_escort_ambush_')) {
    return select(['mob_bruiser', 'mob_dark_caster', 'skel_rogue'], identity);
  }
  if (templateId.startsWith('mir4_escort_')) {
    return select(NPC_FALLBACKS, identity);
  }
  for (const [pattern, keys] of MOB_RULES) {
    if (pattern.test(identity)) return select(keys, identity);
  }
  return select(MOB_FALLBACKS, identity);
}
