// Pure provider for the existing Crafting window under mir4-gameplay-port.
// It projects refinement, roll previews and material recipes without owning
// DOM, transport, or client-side gameplay state.

import { mir4ArcQuest } from '../sim/content/mir4/arc_campaign';
import { mir4EquipmentDefinition } from '../sim/content/mir4/items';
import { mir4ArcStageGoal, mir4QuestCurrentStage } from '../sim/mir4/arc_quests';
import { MIR4_CRAFT_RECIPES } from '../sim/mir4/crafting';
import {
  MIR4_EMPTY_MATERIALS,
  MIR4_ENHANCEMENT_SUCCESS_BPS,
  type Mir4EquipmentInstanceState,
  type Mir4Materials,
} from '../sim/mir4/equipment';
import { mir4NextEquipmentCraftRecipes } from '../sim/mir4/equipment_crafting';
import { mir4ModifiedEnhancementChance } from '../sim/mir4/status_effects';
import type { Mir4StatusRecord } from '../sim/mir4/status_values';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';
import { buildMir4EquipmentItemView, type Mir4PaperdollItemView } from './mir4_character_view';

export type Mir4ProgressionTab = 'refinement' | 'enchantment' | 'blessing' | 'crafting';
export type Mir4CraftingCategory = 'equipment' | 'metals' | 'tomes' | 'consumables' | 'enhancement';
export type Mir4EquipmentCraftingCategory =
  | 'weapons'
  | 'armor'
  | 'legwear'
  | 'shields'
  | 'accessories';

export interface Mir4ProgressionItemView {
  item: Mir4PaperdollItemView;
  enhancementAttributes: readonly Mir4EnhancementAttributeView[];
  equipped: boolean;
  maxEnhancement: number;
  nextEnhancement: number | null;
  successBps: number;
  destroysOnFailure: boolean;
  wardAvailable: boolean;
  enchantable: boolean;
  blessable: boolean;
  enchantment: readonly (readonly [number, number])[];
  blessing: readonly (readonly [number, number])[];
  pending: NonNullable<Mir4EquipmentInstanceState['pendingRoll']> | null;
}

export interface Mir4EnhancementAttributeView {
  statusId: number;
  current: number;
  next: number;
  delta: number;
}

export interface Mir4CraftRecipeView {
  recipeId: string;
  category: Exclude<Mir4CraftingCategory, 'equipment'>;
  output: keyof Mir4Materials;
  outputCount: number;
  materials: readonly Readonly<{
    key: keyof Mir4Materials;
    needed: number;
    held: number;
  }>[];
  copperCost: number;
  affordable: boolean;
}

const METAL_OUTPUTS = new Set<keyof Mir4Materials>([
  'metalUncommon',
  'metalRare',
  'metalEpic',
  'metalLegendary',
  'metalMythic',
]);
const TOME_OUTPUTS = new Set<keyof Mir4Materials>([
  'knowledgeTomeCommon',
  'knowledgeTomeRare',
  'knowledgeTomeEpic',
  'knowledgeTomeLegendary',
]);

function craftRecipeCategory(
  output: keyof Mir4Materials,
): Exclude<Mir4CraftingCategory, 'equipment'> {
  if (METAL_OUTPUTS.has(output)) return 'metals';
  if (TOME_OUTPUTS.has(output)) return 'tomes';
  if (output.includes('Pill')) return 'consumables';
  return 'enhancement';
}

export interface Mir4EquipmentCraftRecipeView {
  recipeId: string;
  category: Mir4EquipmentCraftingCategory;
  item: Mir4PaperdollItemView;
  previousItem: Mir4PaperdollItemView | null;
  metal: Readonly<{ key: keyof Mir4Materials; needed: number; held: number }>;
  darksteelCost: number;
  darksteelHeld: number;
  affordable: boolean;
}

function equipmentCraftingCategory(slotId: number): Mir4EquipmentCraftingCategory {
  if (slotId === 1) return 'weapons';
  if (slotId === 4) return 'shields';
  if (slotId === 8) return 'legwear';
  if (slotId === 2 || slotId === 3) return 'accessories';
  return 'armor';
}

export interface Mir4ProgressionView {
  items: readonly Mir4ProgressionItemView[];
  recipes: readonly Mir4CraftRecipeView[];
  equipmentRecipes: readonly Mir4EquipmentCraftRecipeView[];
  wallet: Readonly<Mir4Materials>;
  campaignProfession: Mir4CampaignProfessionView | null;
}

export interface Mir4CampaignProfessionView {
  questId: string;
  kind: 'craft-receipt' | 'refine-receipt' | 'salvage-receipt';
  target: string;
  current: number;
  goal: number;
  materialHeld: number;
  materialNeeded: number;
  affordable: boolean;
}

export function buildMir4ProgressionView(
  state: Readonly<Mir4PlayerUiState>,
  copper: number,
  statuses?: Mir4StatusRecord,
): Mir4ProgressionView {
  const wallet = state.mir4Materials ?? MIR4_EMPTY_MATERIALS;
  const equipped = new Set(Object.values(state.mir4Equipment ?? {}));
  const items = Object.values(state.mir4EquipmentInstances ?? {})
    .filter((instance) => !instance.destroyed)
    .map((instance): Mir4ProgressionItemView | null => {
      const def = mir4EquipmentDefinition(instance.itemId);
      if (!def) return null;
      const nextEnhancement =
        instance.enhancement < def.maxEnhancementLevel ? instance.enhancement + 1 : null;
      const item = buildMir4EquipmentItemView(def, instance);
      const nextItem =
        nextEnhancement === null
          ? null
          : buildMir4EquipmentItemView(def, {
              ...instance,
              enhancement: nextEnhancement,
            });
      const nextAttributes = new Map(
        (nextItem?.runtimeAttributes ?? item.runtimeAttributes).map((attribute) => [
          attribute.statusId,
          attribute.value,
        ]),
      );
      const enhancementAttributes = item.runtimeAttributes
        .map((attribute): Mir4EnhancementAttributeView => {
          const next = nextAttributes.get(attribute.statusId) ?? attribute.value;
          return {
            statusId: attribute.statusId,
            current: attribute.value,
            next,
            delta: next - attribute.value,
          };
        })
        .filter((attribute) => attribute.delta > 0);
      return {
        item,
        enhancementAttributes,
        equipped: equipped.has(instance.itemId),
        maxEnhancement: def.maxEnhancementLevel,
        nextEnhancement,
        successBps:
          nextEnhancement === null
            ? 0
            : mir4ModifiedEnhancementChance(
                MIR4_ENHANCEMENT_SUCCESS_BPS[nextEnhancement] ?? 100_000,
                def.equipSlot,
                statuses,
              ),
        destroysOnFailure: nextEnhancement !== null && nextEnhancement > 5,
        wardAvailable: wallet.solarWard > 0,
        enchantable: def.enchantable,
        blessable: def.blessable,
        enchantment: instance.affixes?.enchantment ?? [],
        blessing: instance.affixes?.blessing ?? [],
        pending: instance.pendingRoll ?? null,
      };
    })
    .filter((item): item is Mir4ProgressionItemView => item !== null)
    .sort(
      (left, right) => left.item.slotId - right.item.slotId || left.item.itemId - right.item.itemId,
    );
  const recipes = Object.values(MIR4_CRAFT_RECIPES).map((recipe): Mir4CraftRecipeView => {
    const materials = Object.entries(recipe.materials).map(([key, needed]) => ({
      key: key as keyof Mir4Materials,
      needed: needed ?? 0,
      held: wallet[key as keyof Mir4Materials],
    }));
    return {
      recipeId: recipe.recipeId,
      category: craftRecipeCategory(recipe.output),
      output: recipe.output,
      outputCount: recipe.outputCount,
      materials,
      copperCost: recipe.copperCost,
      affordable:
        copper >= recipe.copperCost && materials.every((cost) => cost.held >= cost.needed),
    };
  });
  const rewardItems = state.mir4ArcRewards?.items ?? {};
  const ownedItemIds = new Set<number>(
    Object.values(state.mir4EquipmentInstances ?? {})
      .filter((instance) => !instance.destroyed)
      .map((instance) => instance.itemId),
  );
  for (const [itemId, count] of Object.entries(rewardItems)) {
    const numeric = Number(itemId);
    if (Number.isSafeInteger(numeric) && count > 0 && mir4EquipmentDefinition(numeric)) {
      ownedItemIds.add(numeric);
    }
  }
  const darksteelHeld = state.mir4Currencies?.darksteel ?? 0;
  const equipmentRecipes = mir4NextEquipmentCraftRecipes(state.classId, ownedItemIds).flatMap(
    (recipe): Mir4EquipmentCraftRecipeView[] => {
      const def = mir4EquipmentDefinition(recipe.itemId);
      const previousDef =
        recipe.previousItemId === null ? null : mir4EquipmentDefinition(recipe.previousItemId);
      if (!def || (recipe.previousItemId !== null && !previousDef)) return [];
      const previousInstance =
        recipe.previousItemId === null
          ? undefined
          : state.mir4EquipmentInstances?.[recipe.previousItemId];
      const held = wallet[recipe.metal];
      return [
        {
          recipeId: recipe.recipeId,
          category: equipmentCraftingCategory(def.equipSlot),
          item: buildMir4EquipmentItemView(def, previousInstance),
          previousItem: previousDef
            ? buildMir4EquipmentItemView(previousDef, previousInstance)
            : null,
          metal: { key: recipe.metal, needed: recipe.metalCount, held },
          darksteelCost: recipe.darksteelCost,
          darksteelHeld,
          affordable:
            held >= recipe.metalCount &&
            darksteelHeld >= recipe.darksteelCost &&
            (recipe.previousItemId === null || ownedItemIds.has(recipe.previousItemId)),
        },
      ];
    },
  );
  const logicalItems = state.mir4ArcRewards?.items ?? {};
  let campaignProfession: Mir4CampaignProfessionView | null = null;
  for (const progress of Object.values(state.mir4ArcQuests ?? {})) {
    const stage = mir4QuestCurrentStage(progress);
    if (
      !stage ||
      (stage.kind !== 'craft-receipt' &&
        stage.kind !== 'refine-receipt' &&
        stage.kind !== 'salvage-receipt')
    ) {
      continue;
    }
    const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
    const quest = mir4ArcQuest(progress.questId);
    if (typeof target !== 'string' || !quest) continue;
    const cityRank = target.match(/^city-infrastructure-r(\d+)$/)?.[1];
    const sourceId = cityRank ? `refined-regional-r${cityRank}` : target;
    const usesRegional = stage.kind !== 'salvage-receipt' && !cityRank;
    const materialHeld = usesRegional
      ? Object.entries(logicalItems)
          .filter(([itemId]) => itemId.startsWith('material-'))
          .reduce((sum, [, count]) => sum + count, 0)
      : (logicalItems[sourceId] ?? 0);
    const materialNeeded =
      stage.kind === 'salvage-receipt' ? 1 : stage.kind === 'refine-receipt' || cityRank ? 2 : 4;
    campaignProfession = {
      questId: progress.questId,
      kind: stage.kind,
      target,
      current: progress.stageProgress,
      goal: mir4ArcStageGoal(stage),
      materialHeld,
      materialNeeded,
      affordable: materialHeld >= materialNeeded,
    };
    break;
  }
  return { items, recipes, equipmentRecipes, wallet, campaignProfession };
}
