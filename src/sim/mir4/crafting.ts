// The mir4 material crafting (Phase 4.4): the authorial equipment-material
// recipes (solar-scroll: 1 Pedra do Sol + 5000 cobre; lunar-seal: 5 Pedras da
// Lua), ported verbatim. Craft is atomic: materials and copper are consumed
// only when every requirement is met, deterministic (no rng), and rides the
// PlayerMeta wallet. The four native ITEM_MAKE recipes are Phase 5 inventory
// surface (their materials are useIds we do not host yet).

import type { SimContext } from '../sim_context';
import { creditMir4ArcTutorialReceipt } from './arc_receipts';
import type { Mir4Materials } from './equipment';
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
});

export type Mir4CraftResult =
  | { ok: true; output: keyof Mir4Materials; count: number }
  | { ok: false; code: 'unknown-recipe' | 'no-materials' | 'no-copper' };

/** Craft one recipe: atomic consume of materials + copper, credit the output. */
export function mir4Craft(ctx: SimContext, pid: number, recipeId: string): Mir4CraftResult {
  const meta = ctx.players.get(pid);
  if (!meta) return { ok: false, code: 'unknown-recipe' };
  const recipe = MIR4_CRAFT_RECIPES[recipeId];
  if (!recipe) return { ok: false, code: 'unknown-recipe' };
  const wallet = meta.mir4Materials ?? {
    sunStone: 0,
    moonStone: 0,
    solarScroll: 0,
    lunarSeal: 0,
    dawnTear: 0,
    solarWard: 0,
  };
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
