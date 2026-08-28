// Aeldrune's four-step combat potion ladder. The item ids deliberately reuse
// assets already shipped by the runtime, while price, level and percentage
// recovery are owned by this profile-specific table.

export type Mir4PotionKind = 'hp' | 'mp';

export interface Mir4PotionRule {
  readonly itemId: string;
  readonly kind: Mir4PotionKind;
  readonly tier: 1 | 2 | 3 | 4;
  readonly requiredLevel: number;
  readonly priceCopper: number;
  readonly restoreBps: number;
}

export const MIR4_POTION_RULES: readonly Mir4PotionRule[] = Object.freeze([
  {
    itemId: 'minor_healing_potion',
    kind: 'hp',
    tier: 1,
    requiredLevel: 1,
    priceCopper: 4,
    restoreBps: 500,
  },
  {
    itemId: 'lesser_healing_potion',
    kind: 'hp',
    tier: 2,
    requiredLevel: 40,
    priceCopper: 20,
    restoreBps: 1_000,
  },
  {
    itemId: 'healing_potion',
    kind: 'hp',
    tier: 3,
    requiredLevel: 90,
    priceCopper: 100,
    restoreBps: 1_800,
  },
  {
    itemId: 'sunpetal_healing_draught',
    kind: 'hp',
    tier: 4,
    requiredLevel: 150,
    priceCopper: 500,
    restoreBps: 3_000,
  },
  {
    itemId: 'minor_mana_potion',
    kind: 'mp',
    tier: 1,
    requiredLevel: 1,
    priceCopper: 4,
    restoreBps: 500,
  },
  {
    itemId: 'lesser_mana_potion',
    kind: 'mp',
    tier: 2,
    requiredLevel: 40,
    priceCopper: 20,
    restoreBps: 1_000,
  },
  {
    itemId: 'mana_potion',
    kind: 'mp',
    tier: 3,
    requiredLevel: 90,
    priceCopper: 100,
    restoreBps: 1_800,
  },
  {
    itemId: 'sunpetal_mana_draught',
    kind: 'mp',
    tier: 4,
    requiredLevel: 150,
    priceCopper: 500,
    restoreBps: 3_000,
  },
]);

const BY_ITEM_ID = new Map(MIR4_POTION_RULES.map((rule) => [rule.itemId, rule]));

export function mir4PotionRule(itemId: string): Mir4PotionRule | null {
  return BY_ITEM_ID.get(itemId) ?? null;
}

/** Four campaign bands: M01, M05, M10 and M15 introduce the next tier. */
export function mir4PotionStockForMap(sequence: number): string[] {
  const maxTier = sequence >= 15 ? 4 : sequence >= 10 ? 3 : sequence >= 5 ? 2 : 1;
  return MIR4_POTION_RULES.filter((rule) => rule.tier <= maxTier)
    .sort((left, right) => left.tier - right.tier || (left.kind === 'hp' ? -1 : 1))
    .map((rule) => rule.itemId);
}
