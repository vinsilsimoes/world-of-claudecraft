// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { paintMir4ProgressionWindow } from '../src/ui/mir4_progression_window_adapter';
import type { IWorld } from '../src/world_api';

function harness() {
  const state: Mir4PlayerUiState = {
    classId: 1,
    ultimateGauge: 0,
    mir4Equipment: { 1: 991010101 },
    mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 5 } },
    mir4Materials: {
      sunStone: 1,
      moonStone: 5,
      solarScroll: 1,
      lunarSeal: 1,
      dawnTear: 1,
      solarWard: 1,
    },
  };
  const methods = {
    mir4EnhanceItem: vi.fn(),
    mir4RollItemLayer: vi.fn(),
    mir4ResolveItemLayer: vi.fn(),
    mir4CraftMaterial: vi.fn(),
    mir4CampaignProfession: vi.fn(),
  };
  const world = {
    cfg: { gameProfile: 'mir4-gameplay-port' },
    copper: 5_000,
    mir4PlayerState: () => state,
    ...methods,
  } as unknown as IWorld;
  return { state, world, methods };
}

const presentation = {
  itemIcon: () => '<img class="item-icon" alt="">',
  moneyHtml: () => '',
  itemTooltip: () => '',
  attachTooltip: vi.fn(),
};

describe('MIR4 existing Crafting-window adapter', () => {
  it('renders refinement risk and routes the authoritative enhance verb', () => {
    const { world, methods } = harness();
    const root = document.createElement('section');
    paintMir4ProgressionWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterMutation: vi.fn(),
      announce: vi.fn(),
    });
    expect(root.textContent).toContain('Equipment Workshop');
    expect(root.textContent).toContain('Failure destroys the equipment above +5.');
    root.querySelector<HTMLButtonElement>('[data-enhance]')?.click();
    expect(methods.mir4EnhanceItem).toHaveBeenCalledWith(991010101);
  });

  it('reuses the tab strip for layer previews and material crafting', () => {
    const { state, world, methods } = harness();
    const root = document.createElement('section');
    const deps = {
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterMutation: vi.fn(),
      announce: vi.fn(),
    };
    paintMir4ProgressionWindow(deps);
    root.querySelector<HTMLButtonElement>('[data-tab="enchantment"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-roll]')?.click();
    expect(methods.mir4RollItemLayer).toHaveBeenCalledWith(991010101, 'enchantment');

    state.mir4EquipmentInstances![991010101]!.pendingRoll = {
      rollId: 'preview-1',
      layer: 'enchantment',
      affixes: [
        [20, 8],
        [28, 3],
      ],
    };
    paintMir4ProgressionWindow(deps);
    root.querySelector<HTMLButtonElement>('[data-resolve="accept"]')?.click();
    expect(methods.mir4ResolveItemLayer).toHaveBeenCalledWith(
      991010101,
      'enchantment',
      'preview-1',
      true,
    );

    root.querySelector<HTMLButtonElement>('[data-tab="crafting"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-recipe="solar-scroll"]')?.click();
    expect(methods.mir4CraftMaterial).toHaveBeenCalledWith('solar-scroll');
  });

  it('uses the same Crafting tab for campaign profession receipts', () => {
    const { state, world, methods } = harness();
    state.mir4ArcQuests = {
      'M01-S01': { questId: 'M01-S01', stageIndex: 2, stageProgress: 0, state: 'active' },
    };
    state.mir4ArcRewards = {
      items: { 'material-pele-jovem': 4 },
    };
    const root = document.createElement('section');
    const deps = {
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterMutation: vi.fn(),
      announce: vi.fn(),
    };
    paintMir4ProgressionWindow(deps);
    root.querySelector<HTMLButtonElement>('[data-tab="crafting"]')?.click();
    expect(root.textContent).toContain('Campaign Profession Order');
    expect(root.textContent).toContain('Eligible materials: 4/4');
    root.querySelector<HTMLButtonElement>('[data-campaign-profession]')?.click();
    expect(methods.mir4CampaignProfession).toHaveBeenCalledOnce();
  });
});
