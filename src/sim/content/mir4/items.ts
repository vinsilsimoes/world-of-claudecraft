// Source-backed logical starter equipment. Only ids, class/slot rules and
// attributes cross the migration boundary; presentation is resolved through
// World of ClaudeCraft's native equipment registry in native_equipment_visuals.ts.

import type { Mir4ClassId } from './classes';
import { type Mir4EquipmentItemDef, mir4EquipmentItem } from './equipment_catalog';

const STARTER_ARMOR_ATTRIBUTES = [
  [24, 12],
  [26, 12],
  [42, 10],
  [32, 10],
] as const;

function starterItem(
  itemId: number,
  key: string,
  name: string,
  classId: Mir4ClassId,
  equipSlot: 1 | 5,
  baseAttributes: readonly (readonly [number, number])[],
  balanceBudget: number,
): Mir4EquipmentItemDef {
  return Object.freeze({
    itemId,
    key,
    name,
    classId,
    equipSlot,
    catalogRank: 1,
    tier: 1,
    grade: 1,
    requiredLevel: 1,
    maxEnhancementLevel: 12,
    enhanceable: true,
    enchantable: false,
    blessable: false,
    baseAttributes,
    balanceBudget,
  });
}

/** Exact CLASS_CREATE starter ids and ITEM_ATTRIBUTE pairs for all five classes. */
export const MIR4_ITEMS: Readonly<Record<number, Mir4EquipmentItemDef>> = Object.freeze({
  200201000: starterItem(
    200201000,
    'starter-weapon-warrior',
    'Arma Inicial do Guerreiro',
    1,
    1,
    [
      [20, 75],
      [28, 5],
      [44, 10],
    ],
    470,
  ),
  301201000: starterItem(
    301201000,
    'starter-armor-warrior',
    'Armadura Inicial do Guerreiro',
    1,
    5,
    STARTER_ARMOR_ATTRIBUTES,
    92,
  ),
  200202000: starterItem(
    200202000,
    'starter-weapon-elementalist',
    'Arma Inicial do Elementalista',
    2,
    1,
    [
      [22, 75],
      [28, 5],
      [44, 10],
    ],
    470,
  ),
  301202000: starterItem(
    301202000,
    'starter-armor-elementalist',
    'Armadura Inicial do Elementalista',
    2,
    5,
    STARTER_ARMOR_ATTRIBUTES,
    92,
  ),
  200203000: starterItem(
    200203000,
    'starter-weapon-taoist',
    'Arma Inicial do Taoista',
    3,
    1,
    [
      [20, 75],
      [22, 75],
      [28, 5],
      [44, 10],
    ],
    470,
  ),
  301203000: starterItem(
    301203000,
    'starter-armor-taoist',
    'Armadura Inicial do Taoista',
    3,
    5,
    STARTER_ARMOR_ATTRIBUTES,
    92,
  ),
  200204000: starterItem(
    200204000,
    'starter-weapon-arbalist',
    'Arma Inicial do Arbalista',
    4,
    1,
    [
      [20, 75],
      [28, 5],
      [44, 10],
    ],
    470,
  ),
  301204000: starterItem(
    301204000,
    'starter-armor-arbalist',
    'Armadura Inicial do Arbalista',
    4,
    5,
    STARTER_ARMOR_ATTRIBUTES,
    92,
  ),
  200205000: starterItem(
    200205000,
    'starter-weapon-lancer',
    'Arma Inicial do Lanceiro',
    5,
    1,
    [
      [20, 75],
      [22, 75],
      [28, 5],
      [44, 10],
    ],
    470,
  ),
  301205000: starterItem(
    301205000,
    'starter-armor-lancer',
    'Armadura Inicial do Lanceiro',
    5,
    5,
    STARTER_ARMOR_ATTRIBUTES,
    92,
  ),
});

export interface Mir4StarterLoadout {
  readonly weapon: number;
  readonly armorTop: number;
}

export const MIR4_STARTER_LOADOUT_BY_CLASS: Readonly<Record<Mir4ClassId, Mir4StarterLoadout>> =
  Object.freeze({
    1: Object.freeze({ weapon: 200201000, armorTop: 301201000 }),
    2: Object.freeze({ weapon: 200202000, armorTop: 301202000 }),
    3: Object.freeze({ weapon: 200203000, armorTop: 301203000 }),
    4: Object.freeze({ weapon: 200204000, armorTop: 301204000 }),
    5: Object.freeze({ weapon: 200205000, armorTop: 301205000 }),
  });

/** Resolve exact starter equipment before the separate 240-item progression catalogue. */
export function mir4EquipmentDefinition(itemId: number): Mir4EquipmentItemDef | null {
  return MIR4_ITEMS[itemId] ?? mir4EquipmentItem(itemId);
}

/** Status ids present on exact starter equipment and consumed by runtime derivation. */
export const MIR4_APPLIED_STATUS_IDS = new Set([20, 22, 24, 26, 28, 32, 42, 44]);
