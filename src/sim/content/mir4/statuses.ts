// Canonical MIR4 status registry reconstructed from the extracted STATUS and
// STRING_TEMPLATE tables. This file is data only: formulas and source
// aggregation live under src/sim/mir4/. IDs remain stable because equipment,
// codex entries and future progression systems refer to the numeric contract.

export type Mir4StatusCategory =
  | 'resource'
  | 'core-combat'
  | 'context-combat'
  | 'advanced-combat'
  | 'progression'
  | 'system'
  | 'control';

export type Mir4StatusValueFormat = 0 | 1 | 2 | 3;

export interface Mir4StatusDefinition {
  readonly id: number;
  readonly key: `mir4-status-${number}`;
  readonly name: string;
  /** Exact ValueFormat column from the extracted STATUS row. */
  readonly valueFormat: Mir4StatusValueFormat;
  readonly category: Mir4StatusCategory;
}

const MIR4_STATUS_NAMES = [
  'HP',
  'HP % Boost',
  'HP REGEN (per 10 sec)',
  'HP % REGEN (per 10 sec)',
  'HP % REGEN (per 10 sec)',
  'MP',
  'MP % Boost',
  'MP REGEN (per 10 sec)',
  'MP % REGEN (per 10 sec)',
  'MP % REGEN (per 10 sec)',
  'Vitality',
  'Vitality % Boost',
  'Vitality REGEN (per 10 sec)',
  'Vitality % REGEN (per 10 sec)',
  'Fury',
  'Fury REGEN Rate',
  'Fury Auto Reduction Rate',
  'HP/MP REGEN',
  'MP Cost Criteria',
  'PHYS ATK',
  'PHYS ATK % Boost',
  'Spell ATK',
  'Spell ATK % Boost',
  'PHYS DEF',
  'PHYS DEF % Boost',
  'Spell DEF',
  'Spell DEF % Boost',
  'Accuracy',
  'EVA',
  'CRIT',
  'CRIT EVA',
  'CRIT ATK DMG Boost',
  'CRIT DMG Reduction',
  'Bash ATK DMG Boost',
  'Bash DMG Reduction',
  'Antidemon Power',
  'Darkness DMG Reduction',
  'PvP ATK DMG Boost',
  'PvP DMG Reduction',
  'Monster ATK DMG Boost',
  'Boss ATK DMG Boost',
  'Monster DMG Reduction',
  'Boss DMG Reduction',
  'Skill ATK DMG Boost',
  'Skill DMG Reduction',
  'All ATK DMG Boost',
  'All DMG Reduction',
  'Stun Success Boost',
  'Stun RES Boost',
  'Debilitation Success Boost',
  'Debilitation RES Boost',
  'Silence Success Boost',
  'Silence RES Boost',
  'Normal ATK Boost',
  'Skill ATK Boost',
  'Skill ATK % Boost',
  'Bash ATK % Boost',
  'PHYS DMG Amplification Rate',
  'Spell DMG Amplification Rate',
  'Accuracy Rate',
  'EVA Rate',
  'CRIT Rate',
  'CRIT EVA Rate',
  'CRIT DMG Rate',
  'CRIT DMG Reduction Rate',
  'PvP DMG Rate',
  'PvP DMG Reduction Rate',
  'Skill DMG Rate',
  'Skill DMG Reduction Rate',
  'Monster DMG Rate',
  'Boss DMG Rate',
  'Monster DMG Reduction Rate',
  'Boss DMG Reduction Rate',
  'All DMG Boost Rate',
  'All DMG Reduction Rate',
  'Movement Spd.',
  'Movement Spd. % Boost',
  'Shock Lv. Boost',
  'Armor Lv. Boost',
  'HP Drain Rate on Attack',
  'MP Drain Rate on Attack',
  'Hunting EXP Boost',
  'Reward EXP Boost',
  'Hunting Copper Gain Boost',
  'Reward Copper Gain Boost',
  'Energy Gain Boost',
  'Darksteel Gain Boost',
  'Drop Chance Boost',
  'Lucky Drop Chance Boost',
  'Fortune Drop Rate Boost',
  'Gathering Boost',
  'Energy Gathering Boost',
  'Mining Boost',
  'Recovery Potion Boost',
  'Skill Cool Reduction',
  'Fury Gain Boost',
  'MP Cost Reduction',
  'Energy Storage Limit Boost',
  'Bag Slot Expansion',
  'Life',
  'Action Point',
  'Darksteel Storage Boost',
  'Unsealed Slot Expansion',
  'Remove Character Level Limit',
  'Received Clan Support Count Boost',
  'Repeatable Mission Count Boost',
  'Cooperation Count Recharge Boost',
  'Unsealing Boost',
  'Clan Supply Boost',
  'Weapon Enhance Success Rate Boost',
  'Armor Enhance Success Rate Boost',
  'Magic Stone Promotion Success Boost',
  'Magic Stone Promotion Cost Reduction',
  'Internal Injury Healing Cost Reduction',
  'EXP Drop Rate Reduction',
  'PK Alignment Drop Amount Rate',
  'Magic Stone Slot Expansion',
  'Market Tax Rate Reduction',
  'Knockdown Success Boost',
  'Knockdown RES Boost',
  'PvP Stun Success Boost',
  'PvP Stun RES Boost',
  'PvP Debilitation Success Boost',
  'PvP Debilitation RES Boost',
  'PvP Silence Success Boost',
  'PvP Silence RES Boost',
  'PvP Knockdown Success Boost',
  'PvP Knockdown RES Boost',
  'Monster Stun Success Boost',
  'Monster Stun RES Boost',
  'Monster Debilitation Success Boost',
  'Monster Debilitation RES Boost',
  'Monster Silence Success Boost',
  'Monster Silence RES Boost',
  'Monster Knockdown Success Boost',
  'Monster Knockdown RES Boost',
  'Bash Success Boost',
  'Bash RES Boost',
  'PvP Bash Success Boost',
  'PvP Bash RES Boost',
  'Monster Bash Boost',
  'Monster Bash Reduction',
  'Normal ATK DMG Boost',
  "Monster's DMG Boost",
  "Monster's DMG Reduction",
  'HP Potion Effect Boost',
  'MP Potion Effect Boost',
  'Skill HP Recovery Amount Boost',
  'Recover MP by % of HP Recovery',
  'Felon DMG Boost',
  'Special Weapon DMG Boost',
  'Kill Target DMG Boost',
  'Stun Duration Boost',
  'Debilitation Duration Boost',
  'Silence Duration Boost',
  'Silence Duration Boost',
  'Life',
  'Number of requests simultaneously in progress',
  'Basic ATK DMG Boost',
  'Basic DMG Reduction',
  'Hunting EXP Boost',
  'Accuracy When Attacking Kill Target',
  'CRIT When Attacking Kill Target',
  'Add Mystical Piece slot',
] as const;

const MIR4_STATUS_VALUE_FORMATS = [
  0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 0, 0, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0, 2, 2, 1, 0, 0, 0,
] as const satisfies readonly Mir4StatusValueFormat[];

function categoryForStatus(id: number): Mir4StatusCategory {
  if (id <= 19) return 'resource';
  if (id <= 33) return 'core-combat';
  if (id <= 53) return 'context-combat';
  if (id <= 81) return 'advanced-combat';
  if (id <= 97) return 'progression';
  if (id <= 118) return 'system';
  if (id <= 142) return 'control';
  if (id <= 155 || (id >= 159 && id <= 163)) return 'advanced-combat';
  return 'system';
}

if (MIR4_STATUS_NAMES.length !== 164 || MIR4_STATUS_VALUE_FORMATS.length !== 164) {
  throw new Error('MIR4 status registry must contain all 164 extracted status rows');
}

export const MIR4_STATUS_REGISTRY: readonly Mir4StatusDefinition[] = Object.freeze(
  MIR4_STATUS_NAMES.map((name, index) => {
    const id = index + 1;
    return Object.freeze({
      id,
      key: `mir4-status-${id}` as const,
      name,
      valueFormat: MIR4_STATUS_VALUE_FORMATS[index],
      category: categoryForStatus(id),
    });
  }),
);

const MIR4_STATUS_BY_ID = new Map(MIR4_STATUS_REGISTRY.map((status) => [status.id, status]));

export function mir4StatusDefinition(statusId: number): Mir4StatusDefinition | null {
  return MIR4_STATUS_BY_ID.get(Math.floor(statusId)) ?? null;
}
