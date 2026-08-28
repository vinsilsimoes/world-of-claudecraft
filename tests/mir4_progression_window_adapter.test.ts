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
    mir4Currencies: { darksteel: 0, energy: 0 },
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
    root.querySelector<HTMLButtonElement>('[data-craft-category="enhancement"]')?.click();
    const recipe = root.querySelector<HTMLButtonElement>('[data-recipe="solar-scroll"]');
    expect(recipe?.getAttribute('aria-label')).toContain('Solar Scroll');
    recipe?.click();
    expect(methods.mir4CraftMaterial).toHaveBeenCalledWith('solar-scroll');
  });

  it('renders rollback-safe special affixes as live penetration properties', () => {
    const { state, world } = harness();
    state.mir4EquipmentInstances = {
      991010101: {
        itemId: 991010101,
        enhancement: 0,
        affixes: { enchantment: [[0, 250]] },
      },
      991050101: {
        itemId: 991050101,
        enhancement: 0,
        affixes: { enchantment: [[0, 300]] },
      },
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

    expect(root.textContent).toContain('Defense Penetration: +2.5%');
    expect(root.textContent).toContain('Defense Penetration Protection: +3%');
    expect(root.textContent).not.toContain('Inactive effect');
  });

  it('separates crafting recipes by category and exposes equipment properties on hover', () => {
    const { world } = harness();
    const root = document.createElement('section');
    const attachTooltip = vi.fn();
    paintMir4ProgressionWindow({
      ...presentation,
      attachTooltip,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterMutation: vi.fn(),
      announce: vi.fn(),
    });

    root.querySelector<HTMLButtonElement>('[data-tab="crafting"]')?.click();
    expect(root.querySelectorAll('[data-craft-category]')).toHaveLength(5);
    expect(root.querySelectorAll('[data-equipment-craft-category]')).toHaveLength(5);
    expect(root.querySelector('[data-recipe="equipment-991010102"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="equipment-991020101"]')).toBeNull();
    expect(root.querySelector('[data-recipe="metal-uncommon"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-equipment-craft-category="armor"]')?.click();
    expect(root.querySelector('[data-recipe="equipment-991050101"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="equipment-991010102"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-equipment-craft-category="legwear"]')?.click();
    expect(root.querySelector('[data-recipe="equipment-991080101"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="equipment-991050101"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-equipment-craft-category="shields"]')?.click();
    expect(root.querySelector('[data-recipe="equipment-991040101"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="equipment-991080101"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-equipment-craft-category="accessories"]')?.click();
    expect(root.querySelector('[data-recipe="equipment-991020101"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="equipment-991030101"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="equipment-991010102"]')).toBeNull();
    expect(
      root.querySelector('#mir4-crafting-category-panel')?.getAttribute('aria-labelledby'),
    ).toBe('mir4-craft-category-equipment');
    expect(root.querySelector('#mir4-crafting-results')?.getAttribute('aria-labelledby')).toBe(
      'mir4-equipment-craft-category-accessories',
    );
    expect(root.textContent).toContain('Legwear & Boots');
    expect(root.textContent).toContain('Shields & Talismans');

    const equipmentTooltip = attachTooltip.mock.calls.find(([element]) =>
      element
        .closest('.crafting-recipe-item')
        ?.querySelector('[data-recipe="equipment-991020101"]'),
    )?.[1];
    const equipmentPreview = root
      .querySelector('[data-recipe="equipment-991020101"]')
      ?.closest('.crafting-recipe-item')
      ?.querySelector<HTMLElement>('[data-focus-key="recipe-info:equipment-991020101"]');
    expect(equipmentPreview?.tabIndex).toBe(0);
    const describedBy = equipmentPreview?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(root.querySelector(`#${describedBy}`)?.textContent).toContain('Physical Attack');
    expect(equipmentTooltip).toBeTypeOf('function');
    expect(equipmentTooltip?.()).toContain('Cinder-Sigil Pendant');
    expect(equipmentTooltip?.()).toContain('Crafting rarity');
    expect(equipmentTooltip?.()).toContain('Physical Attack');
    expect(equipmentTooltip?.()).toContain('+5');

    root.querySelector<HTMLButtonElement>('[data-craft-category="metals"]')?.click();
    expect(root.dataset.mir4CraftingCategory).toBe('metals');
    expect(root.querySelectorAll('[data-equipment-craft-category]')).toHaveLength(0);
    expect(root.querySelector('[data-recipe="metal-uncommon"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="equipment-991020101"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-craft-category="tomes"]')?.click();
    expect(root.querySelector('[data-recipe="knowledge-tome-common"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="metal-uncommon"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-craft-category="consumables"]')?.click();
    expect(root.querySelector('[data-recipe="greater-yang-pill"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="knowledge-tome-common"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-craft-category="enhancement"]')?.click();
    expect(root.querySelector('[data-recipe="solar-scroll"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="lunar-seal"]')).not.toBeNull();
    expect(root.querySelector('[data-recipe="greater-yang-pill"]')).toBeNull();
  });

  it('uses roving keyboard navigation for crafting categories', () => {
    const { world } = harness();
    const root = document.createElement('section');
    document.body.appendChild(root);
    paintMir4ProgressionWindow({
      ...presentation,
      attachTooltip: vi.fn(),
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterMutation: vi.fn(),
      announce: vi.fn(),
    });

    root.querySelector<HTMLButtonElement>('[data-tab="crafting"]')?.click();
    const selected = root.querySelector<HTMLButtonElement>('[data-craft-category="equipment"]');
    const otherTabs = [
      ...root.querySelectorAll<HTMLButtonElement>(
        '[data-craft-category]:not([data-craft-category="equipment"])',
      ),
    ];
    expect(selected?.tabIndex).toBe(0);
    expect(otherTabs.every((tab) => tab.tabIndex === -1)).toBe(true);

    selected?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(root.dataset.mir4CraftingCategory).toBe('enhancement');
    root
      .querySelector<HTMLButtonElement>('[data-craft-category="enhancement"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(root.dataset.mir4CraftingCategory).toBe('equipment');
    root
      .querySelector<HTMLButtonElement>('[data-craft-category="equipment"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(root.dataset.mir4CraftingCategory).toBe('enhancement');
    root
      .querySelector<HTMLButtonElement>('[data-craft-category="enhancement"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(root.dataset.mir4CraftingCategory).toBe('equipment');

    const weaponTab = root.querySelector<HTMLButtonElement>(
      '[data-equipment-craft-category="weapons"]',
    );
    weaponTab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(root.dataset.mir4EquipmentCraftingCategory).toBe('accessories');
    root
      .querySelector<HTMLButtonElement>('[data-equipment-craft-category="accessories"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(root.dataset.mir4EquipmentCraftingCategory).toBe('weapons');
    root
      .querySelector<HTMLButtonElement>('[data-equipment-craft-category="weapons"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(root.dataset.mir4EquipmentCraftingCategory).toBe('accessories');
    root
      .querySelector<HTMLButtonElement>('[data-equipment-craft-category="accessories"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(root.dataset.mir4EquipmentCraftingCategory).toBe('weapons');

    const beforeNoop = root.dataset.mir4EquipmentCraftingCategory;
    root
      .querySelector<HTMLButtonElement>('[data-equipment-craft-category="weapons"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(root.dataset.mir4EquipmentCraftingCategory).toBe(beforeNoop);

    root
      .querySelector<HTMLButtonElement>('[data-craft-category="equipment"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(root.dataset.mir4CraftingCategory).toBe('metals');
    expect(root.querySelector<HTMLButtonElement>('[data-craft-category="metals"]')).toBe(
      document.activeElement,
    );
    root.remove();
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

  it('repaints equipment affordability when only Darksteel changes', () => {
    const { state, world, methods } = harness();
    if (!state.mir4Materials || !state.mir4Currencies) return;
    state.mir4Materials.metalCommon = 50;
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
    root.querySelector<HTMLButtonElement>('[data-equipment-craft-category="accessories"]')?.click();
    const before = root.querySelector<HTMLButtonElement>('[data-recipe="equipment-991020101"]');
    expect(before?.disabled).toBe(true);
    expect(before?.getAttribute('aria-label')).toBe('Create Cinder-Sigil Pendant');

    state.mir4Currencies.darksteel = 100;
    paintMir4ProgressionWindow(deps);

    const after = root.querySelector<HTMLButtonElement>('[data-recipe="equipment-991020101"]');
    expect(after).not.toBe(before);
    expect(after?.disabled).toBe(false);
    after?.click();
    expect(methods.mir4CraftMaterial).toHaveBeenCalledWith('equipment-991020101');
  });
});
