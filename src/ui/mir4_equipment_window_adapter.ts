// Profile adapter for the existing #char-window and #bags roots. It paints
// authoritative MIR4 stats/effects over Aeldrune equipment visuals;
// no source-project image, model, texture, or parallel window is introduced.

import { audio } from '../game/audio';
import { ITEMS } from '../sim/data';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { EquipSlot, ItemDef, PlayerClass } from '../sim/types';
import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { itemDisplayName } from './entity_i18n';
import { esc } from './esc';
import { captureFocusKey, restoreFirstEnabled } from './focus_restore';
import { formatNumber, type TranslationKey, t } from './i18n';
import { QUALITY_COLOR } from './icons';
import {
  buildMir4CharacterPreview,
  buildMir4CharacterView,
  type Mir4EquipmentSlotId,
  type Mir4PaperdollItemView,
  type Mir4PaperdollSlotView,
  type Mir4PreviewArmorLoadout,
} from './mir4_character_view';
import { mir4MountDisplayName, mir4SpiritDisplayName } from './mir4_collectible_i18n';
import {
  buildMir4InventoryView,
  type Mir4CurrencyKey,
  type Mir4CurrencyView,
  type Mir4MaterialView,
} from './mir4_inventory_view';
import { mir4MaterialName } from './mir4_material_i18n';
import type { PainterHostPresentation } from './painter_host';
import { hydratePortraits, modularLookFor, portraitChipHtml } from './portrait_chip';
import { svgIcon } from './ui_icons';

const SLOT_KEYS: Readonly<Record<Mir4EquipmentSlotId, TranslationKey>> = {
  1: 'hudChrome.mir4.equipmentSlots.weapon',
  2: 'hudChrome.mir4.equipmentSlots.necklace',
  3: 'hudChrome.mir4.equipmentSlots.ring',
  4: 'hudChrome.mir4.equipmentSlots.talisman',
  5: 'hudChrome.mir4.equipmentSlots.chest',
  6: 'hudChrome.mir4.equipmentSlots.helmet',
  7: 'hudChrome.mir4.equipmentSlots.gloves',
  8: 'hudChrome.mir4.equipmentSlots.boots',
};

const STATUS_KEYS: Readonly<Record<number, TranslationKey>> = {
  1: 'hudChrome.mir4.stats.maxHp',
  6: 'hudChrome.mir4.stats.maxMana',
  20: 'hudChrome.mir4.stats.physicalAttack',
  22: 'hudChrome.mir4.stats.magicAttack',
  24: 'hudChrome.mir4.stats.physicalDefense',
  26: 'hudChrome.mir4.stats.magicDefense',
  28: 'hudChrome.mir4.stats.accuracy',
  29: 'hudChrome.mir4.stats.dodge',
  30: 'hudChrome.mir4.stats.critical',
  31: 'hudChrome.mir4.stats.avoidCritical',
  32: 'hudChrome.mir4.stats.criticalOutcome',
  33: 'hudChrome.mir4.stats.criticalDamageReduction',
  38: 'hudChrome.mir4.stats.pvpDamage',
  39: 'hudChrome.mir4.stats.pvpDamageReduction',
  40: 'hudChrome.mir4.stats.monsterDamage',
  41: 'hudChrome.mir4.stats.bossDamage',
  42: 'hudChrome.mir4.stats.monsterDamageReduction',
  43: 'hudChrome.mir4.stats.bossDamageReduction',
  44: 'hudChrome.mir4.stats.skillDamage',
  45: 'hudChrome.mir4.stats.skillDamageReduction',
  46: 'hudChrome.mir4.stats.allDamage',
  47: 'hudChrome.mir4.stats.allDamageReduction',
  48: 'hudChrome.mir4.stats.stunSuccess',
  49: 'hudChrome.mir4.stats.stunResistance',
  82: 'hudChrome.mir4.stats.huntingXp',
  83: 'hudChrome.mir4.stats.rewardXp',
  86: 'hudChrome.mir4.stats.energyGain',
  88: 'hudChrome.mir4.stats.dropChance',
  92: 'hudChrome.mir4.stats.energyGathering',
  94: 'hudChrome.mir4.stats.recoveryPotion',
  95: 'hudChrome.mir4.stats.skillCooldown',
  97: 'hudChrome.mir4.stats.mpCostReduction',
  161: 'hudChrome.mir4.stats.huntingXp',
};

// MIR4 material balances keep their native semantic keys, while the UI uses
// existing Aeldrune reagent art as the visual shell.
const MATERIAL_VISUAL_ITEM_IDS: Readonly<Record<Mir4MaterialView['key'], keyof typeof ITEMS>> = {
  metalCommon: 'copper_ore',
  metalUncommon: 'iron_ore',
  metalRare: 'fine_iron_ore',
  metalEpic: 'thorium_ore',
  metalLegendary: 'fine_thorium_ore',
  metalMythic: 'arcanite_bar',
  sunStone: 'thorium_ore',
  moonStone: 'copper_ore',
  solarScroll: 'arcanite_bar',
  lunarSeal: 'ironbark_log',
  dawnTear: 'silverleaf_herb',
  solarWard: 'goldleaf_herb',
  knowledgeFragment: 'ghostly_essence',
  knowledgeTomeCommon: 'morthen_grimoire',
  knowledgeTomeRare: 'morthen_grimoire',
  knowledgeTomeEpic: 'morthen_grimoire',
  knowledgeTomeLegendary: 'morthen_grimoire',
  herbLeaf: 'silverleaf_herb',
  reishi: 'goldleaf_herb',
  herbRoot: 'sunpetal_herb',
  unihornSlice: 'bone_fragments',
  flowerOil: 'sunpetal_herb',
  centuryFruit: 'goldleaf_herb',
  etherealShard: 'ghostly_essence',
  lunarShard: 'arcane_essence',
  solarShard: 'soul_stone',
  boundlessShard: 'wraithfire_orb',
  greaterYangPill: 'minor_healing_potion',
  greaterYinPill: 'minor_mana_potion',
  lesserYangPill: 'minor_healing_potion',
  lesserYinPill: 'minor_mana_potion',
  noirsoulHerbRare: 'sunpetal_herb',
  noirsoulHerbEpic: 'sunpetal_herb',
  noirsoulHerbLegendary: 'sunpetal_herb',
  unihornRare: 'bone_fragments',
  unihornEpic: 'bone_fragments',
  unihornLegendary: 'bone_fragments',
  flowerOilRare: 'sunpetal_herb',
  flowerOilEpic: 'sunpetal_herb',
  flowerOilLegendary: 'sunpetal_herb',
  centuryFruitRare: 'goldleaf_herb',
  centuryFruitEpic: 'goldleaf_herb',
  centuryFruitLegendary: 'goldleaf_herb',
  greaterYangPillRare: 'minor_healing_potion',
  greaterYangPillEpic: 'minor_healing_potion',
  greaterYangPillLegendary: 'minor_healing_potion',
  greaterYinPillRare: 'minor_mana_potion',
  greaterYinPillEpic: 'minor_mana_potion',
  greaterYinPillLegendary: 'minor_mana_potion',
  lesserYangPillRare: 'minor_healing_potion',
  lesserYangPillEpic: 'minor_healing_potion',
  lesserYangPillLegendary: 'minor_healing_potion',
  lesserYinPillRare: 'minor_mana_potion',
  lesserYinPillEpic: 'minor_mana_potion',
  lesserYinPillLegendary: 'minor_mana_potion',
};

const MATERIAL_QUALITY: Readonly<Record<Mir4MaterialView['key'], NonNullable<ItemDef['quality']>>> =
  {
    metalCommon: 'common',
    metalUncommon: 'uncommon',
    metalRare: 'rare',
    metalEpic: 'epic',
    metalLegendary: 'legendary',
    metalMythic: 'legendary',
    sunStone: 'common',
    moonStone: 'common',
    solarScroll: 'common',
    lunarSeal: 'common',
    dawnTear: 'common',
    solarWard: 'common',
    knowledgeFragment: 'common',
    knowledgeTomeCommon: 'common',
    knowledgeTomeRare: 'rare',
    knowledgeTomeEpic: 'epic',
    knowledgeTomeLegendary: 'legendary',
    herbLeaf: 'common',
    reishi: 'common',
    herbRoot: 'uncommon',
    unihornSlice: 'common',
    flowerOil: 'rare',
    centuryFruit: 'epic',
    etherealShard: 'uncommon',
    lunarShard: 'uncommon',
    solarShard: 'uncommon',
    boundlessShard: 'uncommon',
    greaterYangPill: 'common',
    greaterYinPill: 'common',
    lesserYangPill: 'common',
    lesserYinPill: 'common',
    noirsoulHerbRare: 'rare',
    noirsoulHerbEpic: 'epic',
    noirsoulHerbLegendary: 'legendary',
    unihornRare: 'rare',
    unihornEpic: 'epic',
    unihornLegendary: 'legendary',
    flowerOilRare: 'rare',
    flowerOilEpic: 'epic',
    flowerOilLegendary: 'legendary',
    centuryFruitRare: 'rare',
    centuryFruitEpic: 'epic',
    centuryFruitLegendary: 'legendary',
    greaterYangPillRare: 'rare',
    greaterYangPillEpic: 'epic',
    greaterYangPillLegendary: 'legendary',
    greaterYinPillRare: 'rare',
    greaterYinPillEpic: 'epic',
    greaterYinPillLegendary: 'legendary',
    lesserYangPillRare: 'rare',
    lesserYangPillEpic: 'epic',
    lesserYangPillLegendary: 'legendary',
    lesserYinPillRare: 'rare',
    lesserYinPillEpic: 'epic',
    lesserYinPillLegendary: 'legendary',
  };

const CURRENCY_VISUAL_ITEM_IDS: Readonly<Record<Mir4CurrencyKey, keyof typeof ITEMS>> = {
  energy: 'soul_stone',
  darksteel: 'thorium_ore',
};

const CURRENCY_KEYS: Readonly<Record<Mir4CurrencyKey, TranslationKey>> = {
  energy: 'hudChrome.mir4.currencies.energy',
  darksteel: 'hudChrome.mir4.currencies.darksteel',
};

const LEFT_SLOTS = new Set<Mir4EquipmentSlotId>([6, 2, 5, 7]);
const fmt = (value: number) => formatNumber(value, { maximumFractionDigits: 0 });
const fmtBps = (value: number) =>
  formatNumber(value / 10_000, { style: 'percent', maximumFractionDigits: 2 });
const labelValue = (label: string, value: string): string =>
  t('itemUi.market.filterValueAria', { label, value });

export function mir4StatusLabel(statusId: number): string {
  return t(STATUS_KEYS[statusId] ?? 'hudChrome.mir4.stats.unknown');
}

function mir4StatusValue(statusId: number, value: number): string {
  return (statusId >= 32 && statusId <= 53) || (statusId >= 119 && statusId <= 163)
    ? fmtBps(value)
    : fmt(value);
}

export function mir4EquipmentVisualItem(item: Mir4PaperdollItemView) {
  return ITEMS[item.visualItemId];
}

export function mir4EquipmentDisplayName(item: Mir4PaperdollItemView): string {
  const visual = mir4EquipmentVisualItem(item);
  return visual ? itemDisplayName(visual) : t(SLOT_KEYS[item.slotId]);
}

export function mir4EquipmentTooltipHtml(item: Mir4PaperdollItemView): string {
  const name = mir4EquipmentDisplayName(item);
  const attributes = item.runtimeAttributes
    .map(
      ({ statusId, value }) =>
        `<div>${esc(mir4StatusLabel(statusId))}: <b>+${esc(mir4StatusValue(statusId, value))}</b></div>`,
    )
    .join('');
  const enhancement = item.enhancement > 0 ? ` +${fmt(item.enhancement)}` : '';
  const rarityKey = item.craftingRarity
    ? item.craftingRarity === 'mythic'
      ? 'game.milestone.mythic'
      : (`itemUi.quality.${item.craftingRarity}` as TranslationKey)
    : null;
  const progressionLine = item.craftingRarity
    ? t('hudChrome.mir4.equipmentCraftingRarity', {
        rarity: rarityKey ? t(rarityKey) : item.craftingRarity,
      })
    : t('hudChrome.mir4.equipmentStarter');
  return `<div class="tt-title">${esc(name)}${enhancement}</div><div class="tt-sub">${esc(
    t('hudChrome.mir4.equipmentVisualShell'),
  )}</div><div>${esc(progressionLine)}</div>${attributes}`;
}

function statCellValue(key: TranslationKey, value: string): string {
  const label = t(key);
  return `<span class="stat-cell" tabindex="0" aria-label="${esc(labelValue(label, value))}">${esc(label)} <b>${esc(value)}</b></span>`;
}

function statCell(key: TranslationKey, value: number): string {
  return statCellValue(key, fmt(value));
}

function statsHtml(view: NonNullable<ReturnType<typeof buildMir4CharacterView>>): string {
  const s = view.stats;
  const tiles = [
    statCell('hudChrome.mir4.stats.combatPower', s.combatPower),
    statCell('hudChrome.mir4.stats.maxHp', s.maxHp),
    statCell('hudChrome.mir4.stats.maxMana', s.maxMana),
  ].join('');
  const offense = [
    statCell('hudChrome.mir4.stats.physicalAttack', s.physicalAttack),
    statCell('hudChrome.mir4.stats.magicAttack', s.magicAttack),
    statCell('hudChrome.mir4.stats.accuracy', s.accuracy),
    statCell('hudChrome.mir4.stats.critical', s.critical),
    statCell('hudChrome.mir4.stats.criticalOutcome', s.criticalOutcome),
    statCellValue('hudChrome.mir4.stats.bossDamage', fmtBps(s.bossDamageBps)),
    statCellValue('hudChrome.mir4.stats.skillDamage', fmtBps(s.skillDamageBps)),
    statCellValue('hudChrome.mir4.stats.pvpDamage', fmtBps(s.pvpDamageBps)),
    statCellValue('hudChrome.mir4.stats.monsterDamage', fmtBps(s.monsterDamageBps)),
    statCellValue('hudChrome.mir4.stats.allDamage', fmtBps(s.allDamageBps)),
    statCellValue('hudChrome.mir4.stats.stunSuccess', fmtBps(s.stunSuccessBps)),
  ].join('');
  const defense = [
    statCell('hudChrome.mir4.stats.physicalDefense', s.physicalDefense),
    statCell('hudChrome.mir4.stats.magicDefense', s.magicDefense),
    statCell('hudChrome.mir4.stats.dodge', s.dodge),
    statCell('hudChrome.mir4.stats.avoidCritical', s.avoidCritical),
    statCellValue('hudChrome.mir4.stats.criticalDamageReduction', fmtBps(s.statusValues[33] ?? 0)),
    statCellValue('hudChrome.mir4.stats.pvpDamageReduction', fmtBps(s.pvpDamageReductionBps)),
    statCellValue(
      'hudChrome.mir4.stats.monsterDamageReduction',
      fmtBps(s.monsterDamageReductionBps),
    ),
    statCellValue('hudChrome.mir4.stats.bossDamageReduction', fmtBps(s.bossDamageReductionBps)),
    statCellValue('hudChrome.mir4.stats.skillDamageReduction', fmtBps(s.skillDamageReductionBps)),
    statCellValue('hudChrome.mir4.stats.allDamageReduction', fmtBps(s.allDamageReductionBps)),
    statCellValue('hudChrome.mir4.stats.stunResistance', fmtBps(s.stunResistanceBps)),
  ].join('');
  const utility = [
    statCellValue('hudChrome.mir4.stats.recoveryPotion', fmtBps(s.statusValues[94] ?? 0)),
    statCellValue('hudChrome.mir4.stats.skillCooldown', fmtBps(s.statusValues[95] ?? 0)),
    statCellValue('hudChrome.mir4.stats.mpCostReduction', fmtBps(s.statusValues[97] ?? 0)),
    statCellValue(
      'hudChrome.mir4.stats.huntingXp',
      fmtBps((s.statusValues[82] ?? 0) + (s.statusValues[161] ?? 0)),
    ),
    statCellValue('hudChrome.mir4.stats.rewardXp', fmtBps(s.statusValues[83] ?? 0)),
    statCellValue('hudChrome.mir4.stats.dropChance', fmtBps(s.statusValues[88] ?? 0)),
    statCellValue('hudChrome.mir4.stats.energyGain', fmtBps(s.statusValues[86] ?? 0)),
    statCellValue('hudChrome.mir4.stats.energyGathering', fmtBps(s.statusValues[92] ?? 0)),
  ].join('');
  return `<div class="stat-panels"><div class="stat-panel attrs-tiles">${tiles}</div><div class="stat-panel"><div class="sp-title">${esc(t('hudChrome.charSheet.offense'))}</div>${offense}</div><div class="stat-panel"><div class="sp-title">${esc(t('hudChrome.charSheet.defense'))}</div>${defense}</div><div class="stat-panel"><div class="sp-title">${esc(t('hudChrome.mir4.stats.utility'))}</div>${utility}</div></div>`;
}

interface CharacterPainterDeps extends PainterHostPresentation {
  root: HTMLElement;
  world: IWorld;
  close(): void;
  hideTooltip(): void;
  renderPreview(
    equipmentOverride?: Readonly<Partial<Record<EquipSlot, string | null>>>,
    visualClass?: PlayerClass,
    wornOverride?: Mir4PreviewArmorLoadout,
  ): void;
  afterEquipmentChange(): void;
  restoreFocus(target: HTMLElement | null): void;
  focusedAct: string | null;
  hadFocus: boolean;
}

function paperdollSlot(deps: CharacterPainterDeps, slot: Mir4PaperdollSlotView): HTMLElement {
  const row = deps.root.ownerDocument.createElement('div');
  row.className = 'equip-slot';
  row.id = `mir4-equip-slot-${slot.slotId}`;
  row.tabIndex = -1;
  const label = t(SLOT_KEYS[slot.slotId]);
  const item = slot.item;
  const visual = item ? mir4EquipmentVisualItem(item) : undefined;
  const quality = visual?.quality ?? 'common';
  const color = QUALITY_COLOR[quality] ?? 'var(--color-quality-default)';
  const icon = visual
    ? deps.itemIcon(visual)
    : `<span class="item-icon" aria-hidden="true">${svgIcon('lock')}</span>`;
  const name = item ? mir4EquipmentDisplayName(item) : t('itemUi.equipment.empty');
  const suffix = item?.enhancement ? ` +${fmt(item.enhancement)}` : '';
  row.innerHTML = `${icon}<div><div class="slot-name">${esc(label)}</div><div class="slot-item" style="color:${color}">${esc(name)}${esc(suffix)}</div></div>`;
  if (item) {
    deps.attachTooltip(
      row,
      () =>
        `${mir4EquipmentTooltipHtml(item)}<div class="tt-sub">${esc(t('hudChrome.mir4.unequipHint'))}</div>`,
    );
    const button = deps.root.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'equip-unequip-btn';
    button.dataset.act = `mir4-unequip-${slot.slotId}`;
    button.innerHTML = svgIcon('close');
    button.setAttribute('aria-label', t('hudChrome.mir4.unequipAria', { item: name }));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      deps.world.mir4UnequipSlot(slot.slotId);
      audio.click();
      deps.hideTooltip();
      deps.afterEquipmentChange();
    });
    row.appendChild(button);
    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      button.click();
    });
  }
  return row;
}

export function paintMir4CharacterWindow(deps: CharacterPainterDeps): boolean {
  if (deps.world.cfg?.gameProfile !== MIR4_GAME_PROFILE) return false;
  const state = deps.world.mir4PlayerState();
  const view = buildMir4CharacterView(state, deps.world.player.level);
  const root = deps.root;
  markDialogRoot(root, { labelledBy: 'char-title' });
  if (!view) {
    root.innerHTML = `<div class="panel-title"><span id="char-title">${esc(t('hudChrome.mir4.characterTitle'))}</span><button type="button" class="x-btn" data-close aria-label="${esc(t('hud.options.returnToGame'))}">${svgIcon('close')}</button></div><div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`;
    root.querySelector('[data-close]')?.addEventListener('click', deps.close);
    return true;
  }
  const player = deps.world.player;
  const className = t(`classes.${view.classKey}` as TranslationKey);
  const spiritLine = view.spirit
    ? `<div class="panel-subtitle">${esc(t('hudChrome.mir4.equippedSpiritLine', { spirit: mir4SpiritDisplayName(view.spirit.id), grade: fmt(view.spirit.grade) }))}</div>`
    : `<div class="panel-subtitle">${esc(t('hudChrome.mir4.noEquippedSpirit'))}</div>`;
  const mountLine = view.mount
    ? `<div class="panel-subtitle">${esc(t('hudChrome.mir4.equippedMountLine', { mount: mir4MountDisplayName(view.mount.id), grade: fmt(view.mount.grade) }))}</div>`
    : `<div class="panel-subtitle">${esc(t('hudChrome.mir4.noEquippedMount'))}</div>`;
  root.innerHTML = `<div class="panel-title char-title-portrait">${portraitChipHtml({ cls: deps.world.cfg.playerClass, skin: player.skin ?? 0, name: player.name, variant: 'md', catalog: player.skinCatalog, look: modularLookFor(player) })}<span class="char-title-text" id="char-title">${esc(player.name)} <span class="panel-subtitle">${esc(t('itemUi.equipment.levelClass', { level: fmt(player.level), className }))}</span><span class="panel-subtitle">${esc(t('hudChrome.mir4.combatPowerLine', { value: fmt(view.stats.combatPower) }))}</span>${mountLine}${spiritLine}</span><button type="button" class="x-btn" data-close aria-label="${esc(t('hud.options.returnToGame'))}">${svgIcon('close')}</button></div><div class="paperdoll"><div class="equip-col" id="equip-col-left"></div><div class="char-model-panel"><div id="char-model-preview" class="char-model-preview" role="img" aria-label="${esc(t('hudChrome.character.modelPreview'))}"></div></div><div class="equip-col equip-col-right" id="equip-col-right"></div></div>${statsHtml(view)}`;
  hydratePortraits(root);
  const left = root.querySelector('#equip-col-left');
  const right = root.querySelector('#equip-col-right');
  for (const slot of view.slots)
    (LEFT_SLOTS.has(slot.slotId) ? left : right)?.appendChild(paperdollSlot(deps, slot));
  root.querySelector('[data-close]')?.addEventListener('click', deps.close);
  const preview = buildMir4CharacterPreview(view);
  deps.renderPreview(preview.equipment, preview.visualClass, preview.worn);
  if (deps.hadFocus) {
    const controls = [...root.querySelectorAll<HTMLElement>('[data-act]')];
    deps.restoreFocus(
      controls.find((node) => node.dataset.act === deps.focusedAct) ??
        root.querySelector<HTMLElement>('[data-close]'),
    );
  }
  return true;
}

interface InventoryPainterDeps extends PainterHostPresentation {
  root: HTMLElement;
  world: IWorld;
  close(): void;
  hideTooltip(): void;
  afterEquipmentChange(): void;
}

function materialTooltip(material: Mir4MaterialView): string {
  const name = mir4MaterialName(material.key);
  return `<div class="tt-title">${esc(name)}</div><div>${esc(t('hudChrome.mir4.materialCount', { count: fmt(material.count) }))}</div>`;
}

function currencyName(key: Mir4CurrencyKey): string {
  return t(CURRENCY_KEYS[key]);
}

function currencyTooltip(currency: Mir4CurrencyView): string {
  return `<div class="tt-title">${esc(currencyName(currency.key))}</div><div>${esc(t('hudChrome.mir4.currencyCount', { count: fmt(currency.count) }))}</div>`;
}

export function paintMir4InventoryWindow(deps: InventoryPainterDeps): boolean {
  if (deps.world.cfg?.gameProfile !== MIR4_GAME_PROFILE) return false;
  const root = deps.root;
  const state = deps.world.mir4PlayerState();
  const signature = JSON.stringify([
    t('itemUi.bags.title'),
    state?.mir4Equipment,
    state?.mir4EquipmentInstances,
    state?.mir4ArcRewards?.items,
    state?.mir4Materials,
    state?.mir4Currencies,
    deps.world.inventory,
    deps.world.copper,
  ]);
  if (root.dataset.mir4InventorySignature === signature) return true;
  root.dataset.mir4InventorySignature = signature;
  const focusKey = captureFocusKey(root);
  const previousScroll = root.querySelector('.mir4-bag-scroll')?.scrollTop ?? 0;
  markDialogRoot(root, { label: t('itemUi.bags.title') });
  root.innerHTML = `<div class="panel-title"><span>${esc(t('itemUi.bags.title'))}</span><button type="button" class="x-btn" data-close data-focus-key="close" aria-label="${esc(t('itemUi.bags.close'))}">${svgIcon('close')}</button></div>`;
  root.querySelector('[data-close]')?.addEventListener('click', deps.close);
  if (!state) {
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`,
    );
    return true;
  }
  const scrollRoot = root.ownerDocument.createElement('div');
  scrollRoot.className = 'mir4-bag-scroll';
  root.appendChild(scrollRoot);
  const view = buildMir4InventoryView(state, deps.world.inventory);
  if (view.equipment.length > 0) {
    const equipmentHeader = root.ownerDocument.createElement('div');
    equipmentHeader.className = 'bag-section-header';
    equipmentHeader.textContent = t('hudChrome.mir4.inventoryEquipment');
    scrollRoot.appendChild(equipmentHeader);
    const grid = root.ownerDocument.createElement('div');
    grid.className = 'bag-grid';
    for (const item of view.equipment) {
      const visual = mir4EquipmentVisualItem(item);
      if (!visual) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'} mir4-equip-ready`;
      button.dataset.focusKey = `mir4-item:${item.itemId}`;
      button.style.setProperty(
        '--bag-slot-quality',
        QUALITY_COLOR[visual.quality ?? 'common'] ?? 'var(--color-quality-default)',
      );
      const name = mir4EquipmentDisplayName(item);
      button.setAttribute('aria-label', t('hudChrome.mir4.equipAria', { item: name }));
      button.innerHTML = `${deps.itemIcon(visual)}<span class="mir4-equip-ready-mark" aria-hidden="true">${svgIcon('promote')}</span><span class="bi-count">${item.enhancement > 0 ? esc(`+${fmt(item.enhancement)}`) : ''}</span>`;
      deps.attachTooltip(
        button,
        () =>
          `${mir4EquipmentTooltipHtml(item)}<div class="tt-sub">${esc(t('hudChrome.mir4.equipHint'))}</div>`,
      );
      button.addEventListener('click', () => {
        deps.world.mir4EquipItem(item.itemId);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      grid.appendChild(button);
    }
    scrollRoot.appendChild(grid);
  }
  if (view.nativeItems.length > 0) {
    const runtimeHeader = root.ownerDocument.createElement('div');
    runtimeHeader.className = 'bag-section-header';
    runtimeHeader.textContent = t('hudChrome.mir4.inventoryRuntimeItems');
    scrollRoot.appendChild(runtimeHeader);
    const runtimeItems = root.ownerDocument.createElement('div');
    runtimeItems.className = 'bag-grid';
    for (const { slotIndex, slot } of view.nativeItems) {
      const item = ITEMS[slot.itemId];
      if (!item) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${item.quality ?? 'common'}`;
      button.dataset.focusKey = `runtime-item:${slotIndex}`;
      button.style.setProperty(
        '--bag-slot-quality',
        QUALITY_COLOR[item.quality ?? 'common'] ?? 'var(--color-quality-default)',
      );
      button.setAttribute('aria-label', itemDisplayName(item));
      button.innerHTML = `${deps.itemIcon(item)}<span class="bi-count">${slot.count > 1 ? esc(fmt(slot.count)) : ''}</span>`;
      deps.attachTooltip(button, () => deps.itemTooltip(item, slot.instance));
      button.addEventListener('click', () => {
        deps.world.useItem(slot.itemId, { slotIndex });
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      runtimeItems.appendChild(button);
    }
    scrollRoot.appendChild(runtimeItems);
  }
  if (view.currencies.length > 0) {
    const currencyHeader = root.ownerDocument.createElement('div');
    currencyHeader.className = 'bag-section-header';
    currencyHeader.textContent = t('hudChrome.mir4.inventoryCurrencies');
    scrollRoot.appendChild(currencyHeader);
    const currencies = root.ownerDocument.createElement('div');
    currencies.className = 'bag-grid';
    for (const currency of view.currencies) {
      const visual = ITEMS[CURRENCY_VISUAL_ITEM_IDS[currency.key]];
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'bag-item q-common';
      button.dataset.mir4Currency = currency.key;
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute(
        'aria-label',
        labelValue(currencyName(currency.key), fmt(currency.count)),
      );
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${esc(fmt(currency.count))}</span>`;
      deps.attachTooltip(button, () => currencyTooltip(currency));
      currencies.appendChild(button);
    }
    scrollRoot.appendChild(currencies);
  }
  if (view.materials.length > 0) {
    const materialHeader = root.ownerDocument.createElement('div');
    materialHeader.className = 'bag-section-header';
    materialHeader.textContent = t('hudChrome.mir4.inventoryMaterials');
    scrollRoot.appendChild(materialHeader);
    const materials = root.ownerDocument.createElement('div');
    materials.className = 'bag-grid';
    for (const material of view.materials) {
      const visual = ITEMS[MATERIAL_VISUAL_ITEM_IDS[material.key]];
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${MATERIAL_QUALITY[material.key]}`;
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute(
        'aria-label',
        labelValue(mir4MaterialName(material.key), fmt(material.count)),
      );
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${esc(fmt(material.count))}</span>`;
      deps.attachTooltip(button, () => materialTooltip(material));
      materials.appendChild(button);
    }
    scrollRoot.appendChild(materials);
  }
  if (
    view.equipment.length === 0 &&
    view.nativeItems.length === 0 &&
    view.currencies.length === 0 &&
    view.materials.length === 0
  ) {
    scrollRoot.insertAdjacentHTML(
      'beforeend',
      `<div class="bag-empty">${esc(t('itemUi.bags.empty'))}</div>`,
    );
  }
  const money = root.ownerDocument.createElement('div');
  money.className = 'money';
  money.innerHTML = deps.moneyHtml(deps.world.copper);
  root.appendChild(money);
  scrollRoot.scrollTop = previousScroll;
  if (focusKey) {
    const controls = [...root.querySelectorAll<HTMLElement>('[data-focus-key]')];
    restoreFirstEnabled([
      controls.find((node) => node.dataset.focusKey === focusKey),
      root.querySelector<HTMLElement>('[data-close]'),
    ]);
  }
  return true;
}
