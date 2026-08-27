import { describe, expect, it } from 'vitest';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4ProgressionView } from '../src/ui/mir4_progression_view';

describe('MIR4 progression view', () => {
  it('projects existing equipment, refinement risk, pending rolls and recipe affordability', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Equipment: { 1: 991010101 },
      mir4EquipmentInstances: {
        991010101: {
          itemId: 991010101,
          enhancement: 5,
          affixes: { enchantment: [[20, 7]] },
          pendingRoll: {
            rollId: 'r1',
            layer: 'blessing',
            affixes: [
              [24, 8],
              [26, 8],
              [31, 3],
            ],
          },
        },
      },
      mir4Materials: {
        ...MIR4_EMPTY_MATERIALS,
        sunStone: 1,
        moonStone: 4,
        solarScroll: 2,
        lunarSeal: 1,
        dawnTear: 1,
        solarWard: 1,
      },
    };
    const view = buildMir4ProgressionView(state, 5_000, { 110: 1_000 });
    expect(view.items[0]).toMatchObject({
      equipped: true,
      nextEnhancement: 6,
      successBps: 55_000,
      destroysOnFailure: true,
      wardAvailable: true,
      enchantable: true,
      blessable: true,
      pending: { rollId: 'r1', layer: 'blessing' },
    });
    expect(view.items[0]?.enhancementAttributes).toEqual([
      { statusId: 20, current: 27, next: 28, delta: 1 },
    ]);
    expect(view.items[0]?.enchantment).toEqual([[20, 7]]);
    expect(view.recipes.find((recipe) => recipe.recipeId === 'solar-scroll')?.affordable).toBe(
      true,
    );
    expect(view.recipes.find((recipe) => recipe.recipeId === 'lunar-seal')?.affordable).toBe(false);
    expect(view.campaignProfession).toBeNull();
  });

  it('shows no next-level stat preview for an item already at its enhancement cap', () => {
    const view = buildMir4ProgressionView(
      {
        classId: 1,
        ultimateGauge: 0,
        mir4EquipmentInstances: {
          991010101: { itemId: 991010101, enhancement: 15 },
        },
      },
      0,
    );

    expect(view.items[0]).toMatchObject({
      nextEnhancement: null,
      successBps: 0,
      destroysOnFailure: false,
      enhancementAttributes: [],
    });
  });

  it('classifies every generic crafting recipe into its player-facing category', () => {
    const view = buildMir4ProgressionView(
      { classId: 1, ultimateGauge: 0, mir4Materials: { ...MIR4_EMPTY_MATERIALS } },
      0,
    );
    const categories = Object.fromEntries(
      view.recipes.map((recipe) => [recipe.recipeId, recipe.category]),
    );

    for (const recipeId of [
      'metal-uncommon',
      'metal-rare',
      'metal-epic',
      'metal-legendary',
      'metal-mythic',
    ]) {
      expect(categories[recipeId]).toBe('metals');
    }
    for (const recipeId of [
      'knowledge-tome-common',
      'knowledge-tome-rare',
      'knowledge-tome-epic',
      'knowledge-tome-legendary',
    ]) {
      expect(categories[recipeId]).toBe('tomes');
    }
    for (const recipeId of [
      'greater-yang-pill',
      'greater-yin-pill',
      'lesser-yang-pill',
      'lesser-yin-pill',
      'greater-yang-pill-rare',
      'greater-yang-pill-epic',
      'greater-yang-pill-legendary',
      'greater-yin-pill-rare',
      'greater-yin-pill-epic',
      'greater-yin-pill-legendary',
      'lesser-yang-pill-rare',
      'lesser-yang-pill-epic',
      'lesser-yang-pill-legendary',
      'lesser-yin-pill-rare',
      'lesser-yin-pill-epic',
      'lesser-yin-pill-legendary',
    ]) {
      expect(categories[recipeId]).toBe('consumables');
    }
    for (const recipeId of ['solar-scroll', 'lunar-seal']) {
      expect(categories[recipeId]).toBe('enhancement');
    }
  });

  it('projects an active campaign profession order from authoritative logical materials', () => {
    const view = buildMir4ProgressionView(
      {
        classId: 1,
        ultimateGauge: 0,
        mir4ArcQuests: {
          'M01-S01': { questId: 'M01-S01', stageIndex: 2, stageProgress: 0, state: 'active' },
        },
        mir4ArcRewards: {
          items: { 'material-pele-jovem': 3, 'material-couro-grosso': 1 },
        },
      },
      0,
    );

    expect(view.campaignProfession).toEqual({
      questId: 'M01-S01',
      kind: 'craft-receipt',
      target: 'component-r02-01',
      current: 0,
      goal: 1,
      materialHeld: 4,
      materialNeeded: 4,
      affordable: true,
    });
  });
});
