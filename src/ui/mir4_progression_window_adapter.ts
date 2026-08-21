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
import {
  buildMir4ProgressionView,
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
const MATERIAL_KEYS = {
  sunStone: 'hudChrome.mir4.materials.sunStone',
  moonStone: 'hudChrome.mir4.materials.moonStone',
  solarScroll: 'hudChrome.mir4.materials.solarScroll',
  lunarSeal: 'hudChrome.mir4.materials.lunarSeal',
  dawnTear: 'hudChrome.mir4.materials.dawnTear',
  solarWard: 'hudChrome.mir4.materials.solarWard',
} as const satisfies Readonly<Record<string, TranslationKey>>;
const TABS = Object.keys(TAB_KEYS) as Mir4ProgressionTab[];
const fmt = (value: number) => formatNumber(value, { maximumFractionDigits: 0 });

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

function refinementRow(
  deps: Mir4ProgressionWindowDeps,
  view: Mir4ProgressionItemView,
): HTMLElement {
  const row = deps.root.ownerDocument.createElement('div');
  row.className = 'vendor-item crafting-recipe-item';
  const chance = formatNumber(view.successBps / 1000, { maximumFractionDigits: 1 });
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
  row.innerHTML = `${itemHeader(deps, view)}${detailsHtml(details)}<button type="button" class="vendor-item crafting-recipe-btn" data-enhance="${view.item.itemId}" data-focus-key="enhance:${view.item.itemId}"${canEnhance ? '' : ' disabled'}><span class="vi-price crafting-craft-chip">${esc(t('hudChrome.mir4.progression.enhance'))}</span></button>`;
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
    : t('hudChrome.mir4.progression.layerUnsupported', { layer: t(TAB_KEYS[layer]) });
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
  const signature = JSON.stringify([
    selected,
    deps.world.copper,
    t('hudChrome.mir4.progression.title'),
    state?.mir4Equipment,
    state?.mir4EquipmentInstances,
    state?.mir4Materials,
    state?.mir4ArcQuests,
    state?.mir4ArcRewards?.items,
  ]);
  if (root.dataset.mir4ProgressionSignature === signature) return true;
  root.dataset.mir4ProgressionSignature = signature;
  const focusKey = captureFocusKey(root);
  const previousScrollTop = root.querySelector('.crafting-body')?.scrollTop ?? 0;
  const previousTabsScrollLeft = root.querySelector('.crafting-tabs')?.scrollLeft ?? 0;
  root.innerHTML = `<div class="panel-title"><span>${esc(t('hudChrome.mir4.progression.title'))}</span><button type="button" class="x-btn" data-close data-focus-key="close" aria-label="${esc(t('itemUi.bags.close'))}">${svgIcon('close')}</button></div><div class="crafting-tabs" role="tablist">${TABS.map((tab) => `<button type="button" class="crafting-tab${tab === selected ? ' sel' : ''}" data-tab="${tab}" data-focus-key="tab:${tab}" role="tab" aria-selected="${tab === selected}">${esc(t(TAB_KEYS[tab]))}</button>`).join('')}</div><div class="crafting-body"></div>`;
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
    const tabs = root.querySelector<HTMLElement>('.crafting-tabs');
    if (tabs) tabs.scrollLeft = previousTabsScrollLeft;
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
  const view = buildMir4ProgressionView(state, deps.world.copper);
  if (selected === 'crafting') {
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
      body.appendChild(row);
    }
    body.insertAdjacentHTML(
      'beforeend',
      `<div class="bag-section-header">${esc(t('hudChrome.mir4.progression.materialRecipes'))}</div>`,
    );
    for (const recipe of view.recipes) {
      const row = root.ownerDocument.createElement('div');
      row.className = 'vendor-item crafting-recipe-item';
      const output = t(MATERIAL_KEYS[recipe.output]);
      const costs = recipe.materials.map((cost) =>
        t('hudChrome.mir4.progression.materialCost', {
          held: fmt(cost.held),
          needed: fmt(cost.needed),
          material: t(MATERIAL_KEYS[cost.key]),
        }),
      );
      if (recipe.copperCost > 0)
        costs.push(t('hudChrome.mir4.progression.copperCost', { amount: fmt(recipe.copperCost) }));
      row.innerHTML = `<div class="vendor-item"><span class="vi-name"><span class="crafting-recipe-name">${esc(t('hudChrome.mir4.progression.creates', { count: fmt(recipe.outputCount), material: output }))}</span>${costs.map((cost) => `<span class="vi-sub crafting-reagent-line">${esc(cost)}</span>`).join('')}</span></div><button type="button" class="vendor-item crafting-recipe-btn" data-recipe="${esc(recipe.recipeId)}" data-focus-key="recipe:${esc(recipe.recipeId)}"${recipe.affordable ? '' : ' disabled'}><span class="vi-price crafting-craft-chip">${esc(t('hudChrome.mir4.progression.create'))}</span></button>`;
      row
        .querySelector<HTMLButtonElement>('[data-recipe]')
        ?.addEventListener('click', () =>
          operation(deps, () => deps.world.mir4CraftMaterial(recipe.recipeId)),
        );
      body.appendChild(row);
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
