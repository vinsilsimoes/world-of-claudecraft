// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
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
      ...MIR4_EMPTY_MATERIALS,
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
    expect(root.style.display).toBe('flex');
    expect(root.textContent).toContain('Equipment Workshop');
    expect(root.textContent).toContain('Failure destroys the equipment above +5.');
    expect(root.textContent).toContain('Attribute preview');
    expect(root.querySelectorAll('.mir4-enhancement-attribute')).not.toHaveLength(0);
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

    const progressionItem = state.mir4EquipmentInstances?.[991010101];
    expect(progressionItem).toBeDefined();
    if (!progressionItem) return;
    progressionItem.pendingRoll = {
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
    const recipe = root.querySelector<HTMLButtonElement>('[data-recipe="solar-scroll"]');
    expect(recipe?.getAttribute('aria-label')).toContain('Solar Scroll');
    recipe?.click();
    expect(methods.mir4CraftMaterial).toHaveBeenCalledWith('solar-scroll');
  });

  it('disables layer rolls for starter equipment that does not support them', () => {
    const { state, world, methods } = harness();
    state.mir4EquipmentInstances = {
      ...state.mir4EquipmentInstances,
      200201000: { itemId: 200201000, enhancement: 0 },
    };
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

    root.querySelector<HTMLButtonElement>('[data-tab="enchantment"]')?.click();
    const starter = root.querySelector<HTMLButtonElement>('[data-roll="200201000"]');
    const progression = root.querySelector<HTMLButtonElement>('[data-roll="991010101"]');
    expect(starter?.disabled).toBe(true);
    expect(progression?.disabled).toBe(false);
    expect(starter?.getAttribute('aria-label')).toContain('cannot receive Enchantment effects');
    starter?.click();
    expect(methods.mir4RollItemLayer).not.toHaveBeenCalled();

    root.querySelector<HTMLButtonElement>('[data-tab="blessing"]')?.click();
    const starterBlessing = root.querySelector<HTMLButtonElement>('[data-roll="200201000"]');
    expect(starterBlessing?.disabled).toBe(true);
    expect(starterBlessing?.getAttribute('aria-label')).toContain(
      'cannot receive Blessing effects',
    );
    starterBlessing?.click();
    expect(methods.mir4RollItemLayer).not.toHaveBeenCalled();
  });

  it('elides unchanged slow-band paints and carries focus and scroll across a changed repaint', () => {
    const { state, world } = harness();
    const root = document.createElement('section');
    document.body.appendChild(root);
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
    const body = root.querySelector<HTMLElement>('.crafting-body');
    const roll = root.querySelector<HTMLButtonElement>('[data-roll="991010101"]');
    expect(body).not.toBeNull();
    expect(roll).not.toBeNull();
    if (!body || !roll) return;
    body.scrollTop = 37;
    roll.focus();

    paintMir4ProgressionWindow(deps);
    expect(root.querySelector('[data-roll="991010101"]')).toBe(roll);

    if (state.mir4Materials) state.mir4Materials.lunarSeal = 2;
    paintMir4ProgressionWindow(deps);
    expect(root.querySelector<HTMLElement>('.crafting-body')?.scrollTop).toBe(37);
    expect((document.activeElement as HTMLElement | null)?.dataset.focusKey).toBe(
      'roll:enchantment:991010101',
    );
    root.remove();
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
