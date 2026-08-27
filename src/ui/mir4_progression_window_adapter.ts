// Profile adapter for the existing #crafting-window. The window chrome,
// recipe rows, focus trap and WoC equipment visuals stay shared; only the
// authoritative provider and verbs change under mir4-gameplay-port.

import { audio } from '../game/audio';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { Mir4LayerKind } from '../sim/mir4/affixes';
import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { esc } from './esc';
import { captureFocusKey, restoreFirstEnabled } from './focus_restore';
import { formatNumber, type TranslationKey, t } from './i18n';
import {
  mir4EquipmentDisplayName,
  mir4EquipmentTooltipHtml,
  mir4EquipmentVisualItem,
  mir4StatusLabel,
} from './mir4_equipment_window_adapter';
import { mir4MaterialName } from './mir4_material_i18n';
import {
  buildMir4ProgressionView,
  type Mir4CraftingCategory,
  type Mir4EquipmentCraftingCategory,
  type Mir4ProgressionItemView,
  type Mir4ProgressionTab,
} from './mir4_progression_view';
import { mir4QuestTitle } from './mir4_quest_i18n';
import type { PainterHostPresentation } from './painter_host';
import { svgIcon } from './ui_icons';

const TAB_KEYS: Readonly<Record<Mir4ProgressionTab, TranslationKey>> = {
  refinement: 'hudChrome.mir4.progression.refinement',
  enchantment: 'hudChrome.mir4.progression.enchantment',
  blessing: 'hudChrome.mir4.progression.blessing',
  crafting: 'hudChrome.mir4.progression.crafting',
};
const TABS = Object.keys(TAB_KEYS) as Mir4ProgressionTab[];
const CRAFTING_CATEGORY_KEYS: Readonly<Record<Mir4CraftingCategory, TranslationKey>> = {
  equipment: 'hudChrome.mir4.progression.craftingCategoryEquipment',
  metals: 'hudChrome.mir4.progression.craftingCategoryMetals',
  tomes: 'hudChrome.mir4.progression.craftingCategoryTomes',
  consumables: 'hudChrome.mir4.progression.craftingCategoryConsumables',
  enhancement: 'hudChrome.mir4.progression.craftingCategoryEnhancement',
};
const CRAFTING_CATEGORIES = Object.keys(CRAFTING_CATEGORY_KEYS) as Mir4CraftingCategory[];
const EQUIPMENT_CRAFTING_CATEGORY_KEYS: Readonly<
  Record<Mir4EquipmentCraftingCategory, TranslationKey>
> = {
  weapons: 'hudChrome.mir4.progression.equipmentCategoryWeapons',
  armor: 'hudChrome.mir4.progression.equipmentCategoryArmor',
  legwear: 'hudChrome.mir4.progression.equipmentCategoryLegwear',
  shields: 'hudChrome.mir4.progression.equipmentCategoryShields',
  accessories: 'hudChrome.mir4.progression.equipmentCategoryAccessories',
};
const EQUIPMENT_CRAFTING_CATEGORIES = Object.keys(
  EQUIPMENT_CRAFTING_CATEGORY_KEYS,
) as Mir4EquipmentCraftingCategory[];
const fmt = (value: number) => formatNumber(value, { maximumFractionDigits: 0 });

function bindRovingTabs(
  buttons: readonly HTMLButtonElement[],
  activate: (button: HTMLButtonElement) => void,
): void {
  const selectedIndex = Math.max(
    0,
    buttons.findIndex((button) => button.getAttribute('aria-selected') === 'true'),
  );
  for (const [index, button] of buttons.entries()) {
    button.tabIndex = index === selectedIndex ? 0 : -1;
    button.addEventListener('click', () => activate(button));
    button.addEventListener('keydown', (event) => {
      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % buttons.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + buttons.length) % buttons.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = buttons.length - 1;
      }
      if (nextIndex === null) return;
      event.preventDefault();
      const nextButton = buttons[nextIndex];
      if (nextButton) activate(nextButton);
    });
  }
}

export interface Mir4ProgressionWindowDeps extends PainterHostPresentation {
  root: HTMLElement;
  world: IWorld;
  close(): void;
  hideTooltip(): void;
  afterMutation(): void;
  announce(text: string): void;
}

function operation(deps: Mir4ProgressionWindowDeps, act: () => void): void {
  act();
  audio.click();
  deps.hideTooltip();
  deps.announce(t('hudChrome.mir4.progression.requestSent'));
  deps.afterMutation();
}

function effectsHtml(effects: readonly (readonly [number, number])[]): string {
  if (effects.length === 0)
    return `<div class="tt-sub">${esc(t('hudChrome.mir4.progression.noCurrentEffects'))}</div>`;
  return effects
    .map(([statusId, value]) =>
      statusId === 0
        ? `<div class="tt-sub">${esc(t('hudChrome.mir4.progression.inactiveEffect'))}: +${esc(fmt(value))}</div>`
        : `<div>${esc(mir4StatusLabel(statusId))}: <b>+${esc(fmt(value))}</b></div>`,
    )
    .join('');
}

function itemHeader(deps: Mir4ProgressionWindowDeps, view: Mir4ProgressionItemView): string {
  const visual = mir4EquipmentVisualItem(view.item);
  const name = mir4EquipmentDisplayName(view.item);
  return `<div class="vendor-item">${visual ? `<span class="crafting-recipe-socket">${deps.itemIcon(visual)}</span>` : ''}<span class="vi-name"><span class="crafting-recipe-name">${esc(name)}${view.item.enhancement > 0 ? ` +${esc(fmt(view.item.enhancement))}` : ''}</span>${view.equipped ? `<span class="vi-sub crafting-reagent-line">${esc(t('hudChrome.mir4.progression.equipped'))}</span>` : ''}</span></div>`;
}

function detailsHtml(lines: readonly string[]): string {
  return `<div class="vendor-item"><span class="vi-name">${lines.map((line) => `<span class="vi-sub crafting-reagent-line">${line}</span>`).join('')}</span></div>`;
}

function enhancementAttributesHtml(view: Mir4ProgressionItemView): string {
  if (view.enhancementAttributes.length === 0) return '';
  return `<div class="mir4-enhancement-preview"><b>${esc(t('hudChrome.mir4.progression.attributePreview'))}</b>${view.enhancementAttributes
    .map(
      (attribute) =>
        `<span class="mir4-enhancement-attribute"><span>${esc(mir4StatusLabel(attribute.statusId))}</span><span>${esc(fmt(attribute.current))} <i aria-hidden="true">${svgIcon('next')}</i> <b>${esc(fmt(attribute.next))}</b><small>+${esc(fmt(attribute.delta))}</small></span></span>`,
    )
    .join('')}</div>`;
}

function refinementRow(
  deps: Mir4ProgressionWindowDeps,
  view: Mir4ProgressionItemView,
): HTMLElement {
  const row = deps.root.ownerDocument.createElement('div');
  row.className = 'vendor-item crafting-recipe-item';
  const chance = formatNumber(view.successBps / 1000, {
    maximumFractionDigits: 1,
  });
  const hasScroll = (deps.world.mir4PlayerState()?.mir4Materials?.solarScroll ?? 0) > 0;
  const canEnhance = view.nextEnhancement !== null && hasScroll;
  const risk = view.destroysOnFailure
    ? `${t('hudChrome.mir4.progression.destructiveFailure')} ${t(view.wardAvailable ? 'hudChrome.mir4.progression.wardProtection' : 'hudChrome.mir4.progression.noWardProtection')}`
    : t('hudChrome.mir4.progression.safeFailure');
  const details = [
    esc(
      t('hudChrome.mir4.progression.enhancementLevel', {
        level: fmt(view.item.enhancement),
        max: fmt(view.maxEnhancement),
      }),
    ),
    ...(view.nextEnhancement === null
      ? [esc(t('hudChrome.mir4.progression.maxEnhancement'))]
      : [
          esc(t('hudChrome.mir4.progression.successChance', { chance })),
          esc(risk),
          esc(t('hudChrome.mir4.progression.enhanceCost')),
        ]),
  ];
  row.innerHTML = `${itemHeader(deps, view)}${detailsHtml(details)}${enhancementAttributesHtml(view)}<button type="button" class="vendor-item crafting-recipe-btn" data-enhance="${view.item.itemId}" data-focus-key="enhance:${view.item.itemId}"${canEnhance ? '' : ' disabled'}><span class="vi-price crafting-craft-chip">${esc(t('hudChrome.mir4.progression.enhance'))}</span></button>`;
  deps.attachTooltip(row, () => mir4EquipmentTooltipHtml(view.item));
  row
    .querySelector<HTMLButtonElement>('[data-enhance]')
    ?.addEventListener('click', () =>
      operation(deps, () => deps.world.mir4EnhanceItem(view.item.itemId)),
    );
  return row;
}

function layerRow(
  deps: Mir4ProgressionWindowDeps,
  view: Mir4ProgressionItemView,
  layer: Mir4LayerKind,
): HTMLElement {
  const row = deps.root.ownerDocument.createElement('div');
  row.className = 'vendor-item crafting-recipe-item';
  const current = layer === 'enchantment' ? view.enchantment : view.blessing;
  const material = layer === 'enchantment' ? 'lunarSeal' : 'dawnTear';
  const pending = view.pending;
  const pendingThisLayer = pending?.layer === layer ? pending : null;
  const blockedByOther = pending !== null && pending.layer !== layer;
  const otherLayer = blockedByOther ? pending.layer : layer;
  const canRoll =
    (layer === 'enchantment' ? view.enchantable : view.blessable) &&
    pending === null &&
    (deps.world.mir4PlayerState()?.mir4Materials?.[material] ?? 0) > 0;
  const supported = layer === 'enchantment' ? view.enchantable : view.blessable;
  const rollReason = supported
    ? t(
        layer === 'enchantment'
          ? 'hudChrome.mir4.progression.rollCostEnchantment'
          : 'hudChrome.mir4.progression.rollCostBlessing',
      )
    : t('hudChrome.mir4.progression.layerUnsupported', {
        layer: t(TAB_KEYS[layer]),
      });
  const action = pendingThisLayer
    ? `<div class="crafting-reagents"><b>${esc(t('hudChrome.mir4.progression.preview'))}</b>${effectsHtml(pendingThisLayer.affixes)}</div><div class="crafting-actions"><button type="button" class="crafting-qty-btn" data-resolve="accept" data-focus-key="resolve:${layer}:${view.item.itemId}:accept">${esc(t('hudChrome.mir4.progression.acceptPreview'))}</button><button type="button" class="crafting-qty-btn" data-resolve="keep" data-focus-key="resolve:${layer}:${view.item.itemId}:keep">${esc(t('hudChrome.mir4.progression.keepCurrent'))}</button></div>`
    : `${detailsHtml([blockedByOther ? esc(t('hudChrome.mir4.progression.pendingOtherLayer', { layer: t(TAB_KEYS[otherLayer]) })) : esc(rollReason)])}<button type="button" class="vendor-item crafting-recipe-btn" data-roll="${view.item.itemId}" data-focus-key="roll:${layer}:${view.item.itemId}" aria-label="${esc(`${t('hudChrome.mir4.progression.roll')}. ${rollReason}`)}"${canRoll ? '' : ' disabled'}><span class="vi-price crafting-craft-chip">${esc(t('hudChrome.mir4.progression.roll'))}</span></button>`;
  row.innerHTML = `${itemHeader(deps, view)}<div class="crafting-reagents"><b>${esc(t('hudChrome.mir4.progression.currentEffects'))}</b>${effectsHtml(current)}</div>${action}`;
  deps.attachTooltip(row, () => mir4EquipmentTooltipHtml(view.item));
  row
    .querySelector<HTMLButtonElement>('[data-roll]')
    ?.addEventListener('click', () =>
      operation(deps, () => deps.world.mir4RollItemLayer(view.item.itemId, layer)),
    );
  for (const button of row.querySelectorAll<HTMLButtonElement>('[data-resolve]')) {
    button.addEventListener('click', () => {
      if (!pendingThisLayer) return;
      operation(deps, () =>
        deps.world.mir4ResolveItemLayer(
          view.item.itemId,
          layer,
          pendingThisLayer.rollId,
          button.dataset.resolve === 'accept',
        ),
      );
    });
  }
  return row;
}

export function paintMir4ProgressionWindow(deps: Mir4ProgressionWindowDeps): boolean {
  if (deps.world.cfg?.gameProfile !== MIR4_GAME_PROFILE) return false;
  const state = deps.world.mir4PlayerState();
  const root = deps.root;
  root.style.display = 'flex';
  markDialogRoot(root, { label: t('hudChrome.mir4.progression.title') });
  const selected = TABS.includes(root.dataset.mir4ProgressionTab as Mir4ProgressionTab)
    ? (root.dataset.mir4ProgressionTab as Mir4ProgressionTab)
    : 'refinement';
  const craftingCategory = CRAFTING_CATEGORIES.includes(
    root.dataset.mir4CraftingCategory as Mir4CraftingCategory,
  )
    ? (root.dataset.mir4CraftingCategory as Mir4CraftingCategory)
    : 'equipment';
  const equipmentCraftingCategory = EQUIPMENT_CRAFTING_CATEGORIES.includes(
    root.dataset.mir4EquipmentCraftingCategory as Mir4EquipmentCraftingCategory,
  )
    ? (root.dataset.mir4EquipmentCraftingCategory as Mir4EquipmentCraftingCategory)
    : 'weapons';
  const signature = JSON.stringify([
    selected,
    craftingCategory,
    equipmentCraftingCategory,
    deps.world.copper,
    t('hudChrome.mir4.progression.title'),
    state?.mir4Equipment,
    state?.mir4EquipmentInstances,
    state?.mir4Materials,
    state?.mir4Currencies,
    state?.mir4ArcQuests,
    state?.mir4ArcRewards?.items,
    deps.world.player?.mir4?.statusValues,
  ]);
  if (root.dataset.mir4ProgressionSignature === signature) return true;
  root.dataset.mir4CraftingCategory = craftingCategory;
  root.dataset.mir4EquipmentCraftingCategory = equipmentCraftingCategory;
  root.dataset.mir4ProgressionSignature = signature;
  const focusKey = captureFocusKey(root);
  const previousScrollTop = root.querySelector('.crafting-body')?.scrollTop ?? 0;
  const previousTabsScrollLeft = root.querySelector('.crafting-primary-tabs')?.scrollLeft ?? 0;
  const previousCategoryTabsScrollLeft =
    root.querySelector('.crafting-category-tabs')?.scrollLeft ?? 0;
  const previousEquipmentTabsScrollLeft =
    root.querySelector('.crafting-equipment-category-tabs')?.scrollLeft ?? 0;
  root.innerHTML = `<div class="panel-title"><span>${esc(t('hudChrome.mir4.progression.title'))}</span><button type="button" class="x-btn" data-close data-focus-key="close" aria-label="${esc(t('itemUi.bags.close'))}">${svgIcon('close')}</button></div><div class="crafting-tabs crafting-primary-tabs" role="tablist">${TABS.map((tab) => `<button type="button" class="crafting-tab${tab === selected ? ' sel' : ''}" data-tab="${tab}" data-focus-key="tab:${tab}" role="tab" aria-selected="${tab === selected}">${esc(t(TAB_KEYS[tab]))}</button>`).join('')}</div><div class="crafting-body"></div>`;
  root.querySelector('[data-close]')?.addEventListener('click', deps.close);
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
    button.addEventListener('click', () => {
      root.dataset.mir4ProgressionTab = button.dataset.tab;
      paintMir4ProgressionWindow(deps);
      root.querySelector<HTMLButtonElement>(`[data-tab="${button.dataset.tab}"]`)?.focus();
    });
  }
  const body = root.querySelector<HTMLElement>('.crafting-body');
  if (!body) return true;
  const restoreInteractionState = (): void => {
    body.scrollTop = previousScrollTop;
    const tabs = root.querySelector<HTMLElement>('.crafting-primary-tabs');
    if (tabs) tabs.scrollLeft = previousTabsScrollLeft;
    const categoryTabs = root.querySelector<HTMLElement>('.crafting-category-tabs');
    if (categoryTabs) categoryTabs.scrollLeft = previousCategoryTabsScrollLeft;
    const equipmentTabs = root.querySelector<HTMLElement>('.crafting-equipment-category-tabs');
    if (equipmentTabs) equipmentTabs.scrollLeft = previousEquipmentTabsScrollLeft;
    if (focusKey === null) return;
    const keyed = [...root.querySelectorAll<HTMLElement>('[data-focus-key]')];
    restoreFirstEnabled([
      keyed.find((node) => node.dataset.focusKey === focusKey),
      root.querySelector<HTMLElement>(`[data-tab="${selected}"]`),
      root.querySelector<HTMLElement>('[data-close]'),
    ]);
  };
  if (!state) {
    body.innerHTML = `<div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`;
    restoreInteractionState();
    return true;
  }
  const view = buildMir4ProgressionView(
    state,
    deps.world.copper,
    deps.world.player?.mir4?.statusValues,
  );
  if (selected === 'crafting') {
    const categoryCounts: Readonly<Record<Mir4CraftingCategory, number>> = {
      equipment: view.equipmentRecipes.length,
      metals: view.recipes.filter((recipe) => recipe.category === 'metals').length,
      tomes: view.recipes.filter((recipe) => recipe.category === 'tomes').length,
      consumables: view.recipes.filter((recipe) => recipe.category === 'consumables').length,
      enhancement: view.recipes.filter((recipe) => recipe.category === 'enhancement').length,
    };
    body.insertAdjacentHTML(
      'beforeend',
      `<div class="crafting-tabs crafting-category-tabs" role="tablist" aria-label="${esc(t('hudChrome.mir4.progression.craftingCategoryAria'))}">${CRAFTING_CATEGORIES.map((category) => `<button type="button" id="mir4-craft-category-${category}" class="crafting-tab crafting-category-tab${category === craftingCategory ? ' sel' : ''}" data-craft-category="${category}" data-focus-key="craft-category:${category}" role="tab" aria-selected="${category === craftingCategory}" aria-controls="mir4-crafting-category-panel"><span>${esc(t(CRAFTING_CATEGORY_KEYS[category]))}</span><span class="crafting-tab-count">${esc(fmt(categoryCounts[category]))}</span></button>`).join('')}</div>`,
    );
    bindRovingTabs(
      [...body.querySelectorAll<HTMLButtonElement>('[data-craft-category]')],
      (button) => {
        body.scrollTop = 0;
        root.dataset.mir4CraftingCategory = button.dataset.craftCategory;
        paintMir4ProgressionWindow(deps);
        root
          .querySelector<HTMLButtonElement>(
            `[data-craft-category="${button.dataset.craftCategory}"]`,
          )
          ?.focus();
      },
    );
    const categoryPanel = root.ownerDocument.createElement('div');
    categoryPanel.id = 'mir4-crafting-category-panel';
    categoryPanel.className = 'crafting-category-panel';
    categoryPanel.setAttribute('role', 'tabpanel');
    categoryPanel.setAttribute('aria-labelledby', `mir4-craft-category-${craftingCategory}`);
    body.appendChild(categoryPanel);
    if (craftingCategory === 'equipment') {
      const equipmentCategoryCounts = Object.fromEntries(
        EQUIPMENT_CRAFTING_CATEGORIES.map((category) => [
          category,
          view.equipmentRecipes.filter((recipe) => recipe.category === category).length,
        ]),
      ) as Record<Mir4EquipmentCraftingCategory, number>;
      categoryPanel.insertAdjacentHTML(
        'beforeend',
        `<div class="crafting-tabs crafting-equipment-category-tabs" role="tablist" aria-label="${esc(t('hudChrome.mir4.progression.equipmentCategoryAria'))}">${EQUIPMENT_CRAFTING_CATEGORIES.map((category) => `<button type="button" id="mir4-equipment-craft-category-${category}" class="crafting-tab crafting-equipment-category-tab${category === equipmentCraftingCategory ? ' sel' : ''}" data-equipment-craft-category="${category}" data-focus-key="equipment-craft-category:${category}" role="tab" aria-selected="${category === equipmentCraftingCategory}" aria-controls="mir4-crafting-results"><span>${esc(t(EQUIPMENT_CRAFTING_CATEGORY_KEYS[category]))}</span><span class="crafting-tab-count">${esc(fmt(equipmentCategoryCounts[category]))}</span></button>`).join('')}</div>`,
      );
      bindRovingTabs(
        [...categoryPanel.querySelectorAll<HTMLButtonElement>('[data-equipment-craft-category]')],
        (button) => {
          body.scrollTop = 0;
          root.dataset.mir4EquipmentCraftingCategory = button.dataset.equipmentCraftCategory;
          paintMir4ProgressionWindow(deps);
          root
            .querySelector<HTMLButtonElement>(
              `[data-equipment-craft-category="${button.dataset.equipmentCraftCategory}"]`,
            )
            ?.focus();
        },
      );
    }
    const results = root.ownerDocument.createElement('div');
    results.id = 'mir4-crafting-results';
    results.className = 'crafting-category-results';
    results.setAttribute('role', 'tabpanel');
    results.setAttribute(
      'aria-labelledby',
      craftingCategory === 'equipment'
        ? `mir4-equipment-craft-category-${equipmentCraftingCategory}`
        : `mir4-craft-category-${craftingCategory}`,
    );
    categoryPanel.appendChild(results);
    if (view.campaignProfession) {
      const campaign = view.campaignProfession;
      const row = root.ownerDocument.createElement('div');
      row.className = 'vendor-item crafting-recipe-item';
      row.innerHTML = `<div class="vendor-item"><span class="vi-name"><span class="crafting-recipe-name">${esc(t('hudChrome.mir4.progression.campaignProfession'))}</span><span class="vi-sub crafting-reagent-line">${esc(mir4QuestTitle(campaign.questId))}</span><span class="vi-sub crafting-reagent-line">${esc(t('hudChrome.mir4.progression.campaignProfessionProgress', { current: fmt(campaign.current), goal: fmt(campaign.goal) }))}</span><span class="vi-sub crafting-reagent-line">${esc(t('hudChrome.mir4.progression.campaignProfessionMaterials', { held: fmt(campaign.materialHeld), needed: fmt(campaign.materialNeeded) }))}</span><span class="vi-sub crafting-reagent-line">${esc(t('hudChrome.mir4.progression.campaignProfessionHint'))}</span></span></div><button type="button" class="vendor-item crafting-recipe-btn" data-campaign-profession data-focus-key="campaign-profession"${campaign.affordable ? '' : ' disabled'}><span class="vi-price crafting-craft-chip">${esc(t(`hudChrome.mir4.progression.${campaign.kind === 'craft-receipt' ? 'campaignCraft' : campaign.kind === 'refine-receipt' ? 'campaignRefine' : 'campaignSalvage'}` as TranslationKey))}</span></button>`;
      row
        .querySelector<HTMLButtonElement>('[data-campaign-profession]')
        ?.addEventListener('click', () =>
          operation(deps, () => deps.world.mir4CampaignProfession()),
        );
      results.appendChild(row);
    }
    results.insertAdjacentHTML(
      'beforeend',
      `<div class="bag-section-header">${esc(t(craftingCategory === 'equipment' ? EQUIPMENT_CRAFTING_CATEGORY_KEYS[equipmentCraftingCategory] : CRAFTING_CATEGORY_KEYS[craftingCategory]))}</div>`,
    );
    const equipmentCategoryRecipes =
      craftingCategory === 'equipment'
        ? view.equipmentRecipes.filter((recipe) => recipe.category === equipmentCraftingCategory)
        : [];
    for (const recipe of equipmentCategoryRecipes) {
      const row = root.ownerDocument.createElement('div');
      row.className = 'vendor-item crafting-recipe-item';
      const visual = mir4EquipmentVisualItem(recipe.item);
      const outputName = mir4EquipmentDisplayName(recipe.item);
      const previousName = recipe.previousItem
        ? mir4EquipmentDisplayName(recipe.previousItem)
        : t('hudChrome.mir4.progression.noPreviousItem');
      const costs = [
        t('hudChrome.mir4.progression.previousItemCost', {
          item: previousName,
        }),
        t('hudChrome.mir4.progression.materialCost', {
          held: fmt(recipe.metal.held),
          needed: fmt(recipe.metal.needed),
          material: mir4MaterialName(recipe.metal.key),
        }),
        t('hudChrome.mir4.progression.darksteelCost', {
          held: fmt(recipe.darksteelHeld),
          needed: fmt(recipe.darksteelCost),
        }),
      ];
      const creates = t('hudChrome.mir4.progression.createsEquipment', {
        item: outputName,
      });
      row.innerHTML = `<div class="vendor-item">${visual ? `<span class="crafting-recipe-socket">${deps.itemIcon(visual)}</span>` : ''}<span class="vi-name"><span class="crafting-recipe-name">${esc(creates)}</span>${costs.map((cost) => `<span class="vi-sub crafting-reagent-line">${esc(cost)}</span>`).join('')}</span></div><button type="button" class="vendor-item crafting-recipe-btn" data-recipe="${esc(recipe.recipeId)}" data-focus-key="recipe:${esc(recipe.recipeId)}" aria-label="${esc(t('hudChrome.mir4.progression.createEquipmentAria', { item: outputName }))}"${recipe.affordable ? '' : ' disabled'}><span class="vi-price crafting-craft-chip">${esc(t('hudChrome.mir4.progression.create'))}</span></button>`;
      const preview = row.querySelector<HTMLElement>(':scope > .vendor-item');
      if (preview) {
        preview.tabIndex = 0;
        preview.dataset.focusKey = `recipe-info:${recipe.recipeId}`;
        preview.setAttribute('aria-label', outputName);
        const tooltipHtml = mir4EquipmentTooltipHtml(recipe.item);
        const description = root.ownerDocument.createElement('span');
        description.id = `mir4-crafting-description-${recipe.recipeId}`;
        description.className = 'sr-only';
        description.innerHTML = tooltipHtml;
        preview.setAttribute('aria-describedby', description.id);
        row.appendChild(description);
        deps.attachTooltip(preview, () => tooltipHtml);
      }
      row
        .querySelector<HTMLButtonElement>('[data-recipe]')
        ?.addEventListener('click', () =>
          operation(deps, () => deps.world.mir4CraftMaterial(recipe.recipeId)),
        );
      results.appendChild(row);
    }
    const categoryRecipes =
      craftingCategory === 'equipment'
        ? []
        : view.recipes.filter((recipe) => recipe.category === craftingCategory);
    for (const recipe of categoryRecipes) {
      const row = root.ownerDocument.createElement('div');
      row.className = 'vendor-item crafting-recipe-item';
      const output = mir4MaterialName(recipe.output);
      const costs = recipe.materials.map((cost) =>
        t('hudChrome.mir4.progression.materialCost', {
          held: fmt(cost.held),
          needed: fmt(cost.needed),
          material: mir4MaterialName(cost.key),
        }),
      );
      if (recipe.copperCost > 0)
        costs.push(
          t('hudChrome.mir4.progression.copperCost', {
            amount: fmt(recipe.copperCost),
          }),
        );
      const creates = t('hudChrome.mir4.progression.creates', {
        count: fmt(recipe.outputCount),
        material: output,
      });
      row.innerHTML = `<div class="vendor-item"><span class="vi-name"><span class="crafting-recipe-name">${esc(creates)}</span>${costs.map((cost) => `<span class="vi-sub crafting-reagent-line">${esc(cost)}</span>`).join('')}</span></div><button type="button" class="vendor-item crafting-recipe-btn" data-recipe="${esc(recipe.recipeId)}" data-focus-key="recipe:${esc(recipe.recipeId)}" aria-label="${esc(`${t('hudChrome.mir4.progression.create')}: ${creates}`)}"${recipe.affordable ? '' : ' disabled'}><span class="vi-price crafting-craft-chip">${esc(t('hudChrome.mir4.progression.create'))}</span></button>`;
      row
        .querySelector<HTMLButtonElement>('[data-recipe]')
        ?.addEventListener('click', () =>
          operation(deps, () => deps.world.mir4CraftMaterial(recipe.recipeId)),
        );
      results.appendChild(row);
    }
    if (
      (craftingCategory === 'equipment' && equipmentCategoryRecipes.length === 0) ||
      (craftingCategory !== 'equipment' && categoryRecipes.length === 0)
    ) {
      results.insertAdjacentHTML(
        'beforeend',
        `<div class="empty-state">${esc(t('hudChrome.mir4.progression.noCategoryRecipes'))}</div>`,
      );
    }
    restoreInteractionState();
    return true;
  }
  body.insertAdjacentHTML(
    'beforeend',
    `<div class="bag-section-header">${esc(t('hudChrome.mir4.progression.ownedEquipment'))}</div>`,
  );
  if (view.items.length === 0) {
    body.insertAdjacentHTML(
      'beforeend',
      `<div class="empty-state">${esc(t('hudChrome.mir4.progression.noEquipment'))}</div>`,
    );
  }
  for (const item of view.items) {
    body.appendChild(
      selected === 'refinement' ? refinementRow(deps, item) : layerRow(deps, item, selected),
    );
  }
  restoreInteractionState();
  return true;
}
