// Profile adapter for the existing #crafting-window. The window chrome,
// recipe rows, focus trap and WoC equipment visuals stay shared; only the
// authoritative provider and verbs change under mir4-gameplay-port.

import { audio } from '../game/audio';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { Mir4LayerKind } from '../sim/mir4/affixes';
import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { esc } from './esc';
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
  return `<div class="crafting-result">${visual ? deps.itemIcon(visual) : ''}<span><b>${esc(name)}${view.item.enhancement > 0 ? ` +${esc(fmt(view.item.enhancement))}` : ''}</b>${view.equipped ? `<span class="ctx-item-meta">${esc(t('hudChrome.mir4.progression.equipped'))}</span>` : ''}</span></div>`;
}

function refinementRow(
  deps: Mir4ProgressionWindowDeps,
  view: Mir4ProgressionItemView,
): HTMLElement {
  const row = deps.root.ownerDocument.createElement('div');
  row.className = 'crafting-recipe-row';
  const chance = formatNumber(view.successBps / 1000, { maximumFractionDigits: 1 });
  const hasScroll = (deps.world.mir4PlayerState()?.mir4Materials?.solarScroll ?? 0) > 0;
  const canEnhance = view.nextEnhancement !== null && hasScroll;
  const risk = view.destroysOnFailure
    ? `${t('hudChrome.mir4.progression.destructiveFailure')} ${t(view.wardAvailable ? 'hudChrome.mir4.progression.wardProtection' : 'hudChrome.mir4.progression.noWardProtection')}`
    : t('hudChrome.mir4.progression.safeFailure');
  row.innerHTML = `${itemHeader(deps, view)}<div class="crafting-reagents"><span>${esc(t('hudChrome.mir4.progression.enhancementLevel', { level: fmt(view.item.enhancement), max: fmt(view.maxEnhancement) }))}</span>${view.nextEnhancement === null ? `<span>${esc(t('hudChrome.mir4.progression.maxEnhancement'))}</span>` : `<span>${esc(t('hudChrome.mir4.progression.successChance', { chance }))}</span><span>${esc(risk)}</span><span>${esc(t('hudChrome.mir4.progression.enhanceCost'))}</span>`}</div><button type="button" class="craft-btn" data-enhance="${view.item.itemId}"${canEnhance ? '' : ' disabled'}>${esc(t('hudChrome.mir4.progression.enhance'))}</button>`;
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
  row.className = 'crafting-recipe-row';
  const current = layer === 'enchantment' ? view.enchantment : view.blessing;
  const material = layer === 'enchantment' ? 'lunarSeal' : 'dawnTear';
  const pending = view.pending;
  const pendingThisLayer = pending?.layer === layer ? pending : null;
  const blockedByOther = pending !== null && pending.layer !== layer;
  const otherLayer = blockedByOther ? pending.layer : layer;
  const canRoll =
    pending === null && (deps.world.mir4PlayerState()?.mir4Materials?.[material] ?? 0) > 0;
  const action = pendingThisLayer
    ? `<div class="crafting-reagents"><b>${esc(t('hudChrome.mir4.progression.preview'))}</b>${effectsHtml(pendingThisLayer.affixes)}</div><div class="crafting-actions"><button type="button" class="craft-btn" data-resolve="accept">${esc(t('hudChrome.mir4.progression.acceptPreview'))}</button><button type="button" class="craft-btn" data-resolve="keep">${esc(t('hudChrome.mir4.progression.keepCurrent'))}</button></div>`
    : `<div class="crafting-reagents">${blockedByOther ? `<span>${esc(t('hudChrome.mir4.progression.pendingOtherLayer', { layer: t(TAB_KEYS[otherLayer]) }))}</span>` : `<span>${esc(t(layer === 'enchantment' ? 'hudChrome.mir4.progression.rollCostEnchantment' : 'hudChrome.mir4.progression.rollCostBlessing'))}</span>`}</div><button type="button" class="craft-btn" data-roll${canRoll ? '' : ' disabled'}>${esc(t('hudChrome.mir4.progression.roll'))}</button>`;
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
  markDialogRoot(root, { label: t('hudChrome.mir4.progression.title') });
  const selected = TABS.includes(root.dataset.mir4ProgressionTab as Mir4ProgressionTab)
    ? (root.dataset.mir4ProgressionTab as Mir4ProgressionTab)
    : 'refinement';
  root.innerHTML = `<div class="panel-title"><span>${esc(t('hudChrome.mir4.progression.title'))}</span><button type="button" class="x-btn" data-close aria-label="${esc(t('itemUi.bags.close'))}">${svgIcon('close')}</button></div><div class="crafting-tabs" role="tablist">${TABS.map((tab) => `<button type="button" class="crafting-tab${tab === selected ? ' sel' : ''}" data-tab="${tab}" role="tab" aria-selected="${tab === selected}">${esc(t(TAB_KEYS[tab]))}</button>`).join('')}</div><div class="crafting-body"></div>`;
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
  if (!state) {
    body.innerHTML = `<div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`;
    return true;
  }
  const view = buildMir4ProgressionView(state, deps.world.copper);
  if (selected === 'crafting') {
    if (view.campaignProfession) {
      const campaign = view.campaignProfession;
      const row = root.ownerDocument.createElement('div');
      row.className = 'crafting-recipe-row';
      row.innerHTML = `<div class="crafting-result"><b>${esc(t('hudChrome.mir4.progression.campaignProfession'))}</b><span>${esc(mir4QuestTitle(campaign.questId))}</span></div><div class="crafting-reagents"><span>${esc(t('hudChrome.mir4.progression.campaignProfessionProgress', { current: fmt(campaign.current), goal: fmt(campaign.goal) }))}</span><span>${esc(t('hudChrome.mir4.progression.campaignProfessionMaterials', { held: fmt(campaign.materialHeld), needed: fmt(campaign.materialNeeded) }))}</span><span>${esc(t('hudChrome.mir4.progression.campaignProfessionHint'))}</span></div><button type="button" class="craft-btn" data-campaign-profession${campaign.affordable ? '' : ' disabled'}>${esc(t(`hudChrome.mir4.progression.${campaign.kind === 'craft-receipt' ? 'campaignCraft' : campaign.kind === 'refine-receipt' ? 'campaignRefine' : 'campaignSalvage'}` as TranslationKey))}</button>`;
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
      row.className = 'crafting-recipe-row';
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
      row.innerHTML = `<div class="crafting-result"><b>${esc(t('hudChrome.mir4.progression.creates', { count: fmt(recipe.outputCount), material: output }))}</b></div><div class="crafting-reagents">${costs.map((cost) => `<span>${esc(cost)}</span>`).join('')}</div><button type="button" class="craft-btn" data-recipe="${esc(recipe.recipeId)}"${recipe.affordable ? '' : ' disabled'}>${esc(t('hudChrome.mir4.progression.create'))}</button>`;
      row
        .querySelector<HTMLButtonElement>('[data-recipe]')
        ?.addEventListener('click', () =>
          operation(deps, () => deps.world.mir4CraftMaterial(recipe.recipeId)),
        );
      body.appendChild(row);
    }
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
  return true;
}
