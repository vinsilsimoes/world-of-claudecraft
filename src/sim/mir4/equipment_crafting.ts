import { MIR4_EQUIPMENT_CATALOG } from '../content/mir4/equipment_catalog';
import {
  MIR4_ITEM_PROGRESSION_RANKS,
  type Mir4EquipmentMetal,
} from '../content/mir4/item_progression';
import type { SimContext } from '../sim_context';
import {
  MIR4_EMPTY_MATERIALS,
  type Mir4EquipmentInstanceState,
  mir4EquipItem,
  mir4OwnsEquipmentItem,
} from './equipment';
import { markMir4WireDirty } from './wire_revision';

export interface Mir4EquipmentCraftRecipe {
  readonly recipeId: string;
  readonly itemId: number;
  readonly previousItemId: number | null;
  readonly metal: Mir4EquipmentMetal;
  readonly metalCount: 50;
  readonly darksteelCost: number;
}

function recipeFor(itemId: number): Mir4EquipmentCraftRecipe {
  const item = MIR4_EQUIPMENT_CATALOG.find((candidate) => candidate.itemId === itemId);
  const rank = item
    ? MIR4_ITEM_PROGRESSION_RANKS.find((candidate) => candidate.catalogRank === item.catalogRank)
    : undefined;
  if (!item || !rank) throw new Error(`Missing MIR4 equipment crafting rank for ${itemId}`);
  const previousItemId =
    rank.previousItemsByClass[item.classId].find(
      (candidate) => candidate.equipSlot === item.equipSlot,
    )?.itemId ?? null;
  return Object.freeze({
    recipeId: `equipment-${item.itemId}`,
    itemId: item.itemId,
    previousItemId,
    metal: rank.metal,
    metalCount: rank.metalCount,
    darksteelCost: rank.darksteelCost,
  });
}

export const MIR4_EQUIPMENT_CRAFT_RECIPES: Readonly<Record<string, Mir4EquipmentCraftRecipe>> =
  Object.freeze(
    Object.fromEntries(
      MIR4_EQUIPMENT_CATALOG.map((item) => {
        const recipe = recipeFor(item.itemId);
        return [recipe.recipeId, recipe];
      }),
    ),
  );

export type Mir4EquipmentCraftResult =
  | { ok: true; itemId: number; consumedItemId: number | null }
  | {
      ok: false;
      code:
        | 'unknown-recipe'
        | 'wrong-class'
        | 'already-owned'
        | 'preview-pending'
        | 'no-previous-item'
        | 'no-materials'
        | 'no-darksteel';
    };

function copyInvestment(
  source: Mir4EquipmentInstanceState | undefined,
  itemId: number,
): Mir4EquipmentInstanceState {
  return {
    itemId,
    enhancement: source?.enhancement ?? 0,
    ...(source?.affixes
      ? {
          affixes: {
            ...(source.affixes.enchantment
              ? {
                  enchantment: source.affixes.enchantment.map((affix) => [...affix] as const),
                }
              : {}),
            ...(source.affixes.blessing
              ? {
                  blessing: source.affixes.blessing.map((affix) => [...affix] as const),
                }
              : {}),
          },
        }
      : {}),
  };
}

function consumeLogicalEquipment(items: Record<string, number> | undefined, itemId: number): void {
  if (!items) return;
  const key = String(itemId);
  const count = Math.max(0, Math.floor(items[key] ?? 0));
  if (count <= 1) delete items[key];
  else items[key] = count - 1;
}

/** Atomically forge one class item, consuming the same-slot predecessor above Common. */
export function mir4CraftEquipment(
  ctx: SimContext,
  pid: number,
  recipeId: string,
): Mir4EquipmentCraftResult {
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  const recipe = MIR4_EQUIPMENT_CRAFT_RECIPES[recipeId];
  const item = recipe
    ? MIR4_EQUIPMENT_CATALOG.find((candidate) => candidate.itemId === recipe.itemId)
    : undefined;
  if (!meta || !player || !recipe || !item) return { ok: false, code: 'unknown-recipe' };
  if (item.classId !== player.mir4?.classId) return { ok: false, code: 'wrong-class' };
  if (mir4OwnsEquipmentItem(meta, item.itemId)) return { ok: false, code: 'already-owned' };
  if (recipe.previousItemId !== null && !mir4OwnsEquipmentItem(meta, recipe.previousItemId)) {
    return { ok: false, code: 'no-previous-item' };
  }
  const previousInstance =
    recipe.previousItemId === null
      ? undefined
      : meta.mir4EquipmentInstances?.[recipe.previousItemId];
  if (previousInstance?.pendingRoll) return { ok: false, code: 'preview-pending' };
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...meta.mir4Materials };
  if (wallet[recipe.metal] < recipe.metalCount) return { ok: false, code: 'no-materials' };
  const currencies = meta.mir4Currencies ?? { darksteel: 0, energy: 0 };
  if (currencies.darksteel < recipe.darksteelCost) return { ok: false, code: 'no-darksteel' };

  const previousWasEquipped =
    recipe.previousItemId !== null &&
    meta.mir4Equipment?.[item.equipSlot] === recipe.previousItemId;
  wallet[recipe.metal] -= recipe.metalCount;
  meta.mir4Materials = wallet;
  meta.mir4Currencies = {
    ...currencies,
    darksteel: currencies.darksteel - recipe.darksteelCost,
  };
  meta.mir4EquipmentInstances = {
    ...meta.mir4EquipmentInstances,
    [item.itemId]: copyInvestment(previousInstance, item.itemId),
  };
  if (previousWasEquipped) mir4EquipItem(ctx, pid, item.itemId);
  if (recipe.previousItemId !== null) {
    delete meta.mir4EquipmentInstances[recipe.previousItemId];
    consumeLogicalEquipment(meta.mir4ArcRewards?.items, recipe.previousItemId);
  }
  markMir4WireDirty(meta);
  return {
    ok: true,
    itemId: item.itemId,
    consumedItemId: recipe.previousItemId,
  };
}

export function mir4NextEquipmentCraftRecipes(
  classId: number,
  ownedItemIds: ReadonlySet<number>,
): readonly Mir4EquipmentCraftRecipe[] {
  const recipes: Mir4EquipmentCraftRecipe[] = [];
  for (let slot = 1; slot <= 8; slot += 1) {
    const highestOwned = MIR4_EQUIPMENT_CATALOG.filter(
      (item) =>
        item.classId === classId && item.equipSlot === slot && ownedItemIds.has(item.itemId),
    ).sort((left, right) => right.catalogRank - left.catalogRank)[0];
    const nextRank = (highestOwned?.catalogRank ?? 0) + 1;
    const next = MIR4_EQUIPMENT_CATALOG.find(
      (item) =>
        item.classId === classId && item.equipSlot === slot && item.catalogRank === nextRank,
    );
    if (!next) continue;
    const recipe = MIR4_EQUIPMENT_CRAFT_RECIPES[`equipment-${next.itemId}`];
    if (recipe) recipes.push(recipe);
  }
  return recipes;
}
