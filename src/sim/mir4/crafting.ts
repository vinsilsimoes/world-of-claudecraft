// The mir4 material crafting (Phase 4.4): the authorial equipment-material
// recipes (solar-scroll: 1 Pedra do Sol + 5000 cobre; lunar-seal: 5 Pedras da
// Lua), ported verbatim. Craft is atomic: materials and copper are consumed
// only when every requirement is met, deterministic (no rng), and rides the
// PlayerMeta wallet. The four native ITEM_MAKE recipes are Phase 5 inventory
// surface (their materials are useIds we do not host yet).

import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import { MIR4_EMPTY_MATERIALS, type Mir4Materials } from './equipment';
import {
  MIR4_EQUIPMENT_CRAFT_RECIPES,
  type Mir4EquipmentCraftResult,
  mir4CraftEquipment,
} from './equipment_crafting';
import { markMir4WireDirty } from './wire_revision';

export interface Mir4CraftRecipe {
  recipeId: string;
  label: string;
  output: keyof Mir4Materials;
  outputCount: number;
  /** Material costs keyed by wallet field. */
  materials: Partial<Record<keyof Mir4Materials, number>>;
  copperCost: number;
}

export const MIR4_CRAFT_RECIPES: Readonly<Record<string, Mir4CraftRecipe>> = Object.freeze({
  'metal-uncommon': Object.freeze({
    recipeId: 'metal-uncommon',
    label: 'Uncommon Metal',
    output: 'metalUncommon',
    outputCount: 1,
    materials: { metalCommon: 10 },
    copperCost: 0,
  }),
  'metal-rare': Object.freeze({
    recipeId: 'metal-rare',
    label: 'Rare Metal',
    output: 'metalRare',
    outputCount: 1,
    materials: { metalUncommon: 10 },
    copperCost: 0,
  }),
  'metal-epic': Object.freeze({
    recipeId: 'metal-epic',
    label: 'Epic Metal',
    output: 'metalEpic',
    outputCount: 1,
    materials: { metalRare: 10 },
    copperCost: 0,
  }),
  'metal-legendary': Object.freeze({
    recipeId: 'metal-legendary',
    label: 'Legendary Metal',
    output: 'metalLegendary',
    outputCount: 1,
    materials: { metalEpic: 10 },
    copperCost: 0,
  }),
  'metal-mythic': Object.freeze({
    recipeId: 'metal-mythic',
    label: 'Mythic Metal',
    output: 'metalMythic',
    outputCount: 1,
    materials: { metalLegendary: 10 },
    copperCost: 0,
  }),
  'solar-scroll': Object.freeze({
    recipeId: 'solar-scroll',
    label: 'Pergaminho Solar',
    output: 'solarScroll',
    outputCount: 1,
    materials: { sunStone: 1 },
    copperCost: 5000,
  }),
  'lunar-seal': Object.freeze({
    recipeId: 'lunar-seal',
    label: 'Selo Lunar',
    output: 'lunarSeal',
    outputCount: 1,
    materials: { moonStone: 5 },
    copperCost: 0,
  }),
  'knowledge-tome-common': Object.freeze({
    recipeId: 'knowledge-tome-common',
    label: 'Common Tome of Knowledge',
    output: 'knowledgeTomeCommon',
    outputCount: 1,
    materials: { knowledgeFragment: 5 },
    copperCost: 0,
  }),
  'knowledge-tome-rare': Object.freeze({
    recipeId: 'knowledge-tome-rare',
    label: 'Rare Tome of Knowledge',
    output: 'knowledgeTomeRare',
    outputCount: 1,
    materials: { knowledgeTomeCommon: 10 },
    copperCost: 0,
  }),
  'knowledge-tome-epic': Object.freeze({
    recipeId: 'knowledge-tome-epic',
    label: 'Epic Tome of Knowledge',
    output: 'knowledgeTomeEpic',
    outputCount: 1,
    materials: { knowledgeTomeRare: 10 },
    copperCost: 0,
  }),
  'knowledge-tome-legendary': Object.freeze({
    recipeId: 'knowledge-tome-legendary',
    label: 'Legendary Tome of Knowledge',
    output: 'knowledgeTomeLegendary',
    outputCount: 1,
    materials: { knowledgeTomeEpic: 10 },
    copperCost: 0,
  }),
  'greater-yang-pill': Object.freeze({
    recipeId: 'greater-yang-pill',
    label: 'Greater Yang Pill',
    output: 'greaterYangPill',
    outputCount: 1,
    materials: { solarShard: 1, boundlessShard: 1 },
    copperCost: 300,
  }),
  'greater-yin-pill': Object.freeze({
    recipeId: 'greater-yin-pill',
    label: 'Greater Yin Pill',
    output: 'greaterYinPill',
    outputCount: 1,
    materials: { etherealShard: 1, boundlessShard: 1 },
    copperCost: 300,
  }),
  'lesser-yang-pill': Object.freeze({
    recipeId: 'lesser-yang-pill',
    label: 'Lesser Yang Pill',
    output: 'lesserYangPill',
    outputCount: 1,
    materials: { lunarShard: 1, solarShard: 1 },
    copperCost: 300,
  }),
  'lesser-yin-pill': Object.freeze({
    recipeId: 'lesser-yin-pill',
    label: 'Lesser Yin Pill',
    output: 'lesserYinPill',
    outputCount: 1,
    materials: { etherealShard: 1, lunarShard: 1 },
    copperCost: 300,
  }),
  'greater-yang-pill-rare': Object.freeze({
    recipeId: 'greater-yang-pill-rare',
    label: 'Rare Greater Yang Pill',
    output: 'greaterYangPillRare',
    outputCount: 1,
    materials: { greaterYangPill: 10 },
    copperCost: 0,
  }),
  'greater-yang-pill-epic': Object.freeze({
    recipeId: 'greater-yang-pill-epic',
    label: 'Epic Greater Yang Pill',
    output: 'greaterYangPillEpic',
    outputCount: 1,
    materials: { greaterYangPillRare: 10 },
    copperCost: 0,
  }),
  'greater-yang-pill-legendary': Object.freeze({
    recipeId: 'greater-yang-pill-legendary',
    label: 'Legendary Greater Yang Pill',
    output: 'greaterYangPillLegendary',
    outputCount: 1,
    materials: { greaterYangPillEpic: 10 },
    copperCost: 0,
  }),
  'greater-yin-pill-rare': Object.freeze({
    recipeId: 'greater-yin-pill-rare',
    label: 'Rare Greater Yin Pill',
    output: 'greaterYinPillRare',
    outputCount: 1,
    materials: { greaterYinPill: 10 },
    copperCost: 0,
  }),
  'greater-yin-pill-epic': Object.freeze({
    recipeId: 'greater-yin-pill-epic',
    label: 'Epic Greater Yin Pill',
    output: 'greaterYinPillEpic',
    outputCount: 1,
    materials: { greaterYinPillRare: 10 },
    copperCost: 0,
  }),
  'greater-yin-pill-legendary': Object.freeze({
    recipeId: 'greater-yin-pill-legendary',
    label: 'Legendary Greater Yin Pill',
    output: 'greaterYinPillLegendary',
    outputCount: 1,
    materials: { greaterYinPillEpic: 10 },
    copperCost: 0,
  }),
  'lesser-yang-pill-rare': Object.freeze({
    recipeId: 'lesser-yang-pill-rare',
    label: 'Rare Lesser Yang Pill',
    output: 'lesserYangPillRare',
    outputCount: 1,
    materials: { lesserYangPill: 10 },
    copperCost: 0,
  }),
  'lesser-yang-pill-epic': Object.freeze({
    recipeId: 'lesser-yang-pill-epic',
    label: 'Epic Lesser Yang Pill',
    output: 'lesserYangPillEpic',
    outputCount: 1,
    materials: { lesserYangPillRare: 10 },
    copperCost: 0,
  }),
  'lesser-yang-pill-legendary': Object.freeze({
    recipeId: 'lesser-yang-pill-legendary',
    label: 'Legendary Lesser Yang Pill',
    output: 'lesserYangPillLegendary',
    outputCount: 1,
    materials: { lesserYangPillEpic: 10 },
    copperCost: 0,
  }),
  'lesser-yin-pill-rare': Object.freeze({
    recipeId: 'lesser-yin-pill-rare',
    label: 'Rare Lesser Yin Pill',
    output: 'lesserYinPillRare',
    outputCount: 1,
    materials: { lesserYinPill: 10 },
    copperCost: 0,
  }),
  'lesser-yin-pill-epic': Object.freeze({
    recipeId: 'lesser-yin-pill-epic',
    label: 'Epic Lesser Yin Pill',
    output: 'lesserYinPillEpic',
    outputCount: 1,
    materials: { lesserYinPillRare: 10 },
    copperCost: 0,
  }),
  'lesser-yin-pill-legendary': Object.freeze({
    recipeId: 'lesser-yin-pill-legendary',
    label: 'Legendary Lesser Yin Pill',
    output: 'lesserYinPillLegendary',
    outputCount: 1,
    materials: { lesserYinPillEpic: 10 },
    copperCost: 0,
  }),
});

export type Mir4CraftResult =
  | { ok: true; output: keyof Mir4Materials; count: number }
  | { ok: false; code: 'unknown-recipe' | 'no-materials' | 'no-copper' }
  | Mir4EquipmentCraftResult;

/** Craft one recipe: atomic consume of materials + copper, credit the output. */
export function mir4Craft(ctx: SimContext, pid: number, recipeId: string): Mir4CraftResult {
  const meta = ctx.players.get(pid);
  if (!meta) return { ok: false, code: 'unknown-recipe' };
  const recipe = MIR4_CRAFT_RECIPES[recipeId];
  if (!recipe) {
    return MIR4_EQUIPMENT_CRAFT_RECIPES[recipeId]
      ? mir4CraftEquipment(ctx, pid, recipeId)
      : { ok: false, code: 'unknown-recipe' };
  }
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...meta.mir4Materials };
  for (const [key, needed] of Object.entries(recipe.materials)) {
    if (wallet[key as keyof Mir4Materials] < (needed ?? 0)) {
      return { ok: false, code: 'no-materials' };
    }
  }
  if (meta.copper < recipe.copperCost) return { ok: false, code: 'no-copper' };
  for (const [key, needed] of Object.entries(recipe.materials)) {
    wallet[key as keyof Mir4Materials] -= needed ?? 0;
  }
  meta.mir4Materials = wallet;
  meta.copper -= recipe.copperCost;
  wallet[recipe.output] += recipe.outputCount;
  markMir4WireDirty(meta);
  creditMir4ArcTutorialReceipt(meta, { kind: 'craft-item' });
  return { ok: true, output: recipe.output, count: recipe.outputCount };
}
