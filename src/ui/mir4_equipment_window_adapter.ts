// Profile adapter for the existing #char-window and #bags roots. It paints
// authoritative MIR4 stats/effects over World of ClaudeCraft equipment visuals;
// no source-project image, model, texture, or parallel window is introduced.

import { audio } from '../game/audio';
import { ITEMS } from '../sim/data';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { EquipSlot, PlayerClass } from '../sim/types';
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
import {
  mir4MountDisplayName,
  mir4SpiritDisplayName,
  mir4SpiritSkillDisplayName,
} from './mir4_collectible_i18n';
import {
  buildMir4InventoryView,
  type Mir4MaterialView,
  type Mir4MountTicketView,
  type Mir4MountView,
  type Mir4PendingMountView,
  type Mir4PendingSpiritView,
  type Mir4SpiritTicketView,
  type Mir4SpiritView,
} from './mir4_inventory_view';
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
  41: 'hudChrome.mir4.stats.bossDamage',
  44: 'hudChrome.mir4.stats.skillDamage',
};

const MATERIAL_KEYS: Readonly<Record<Mir4MaterialView['key'], TranslationKey>> = {
  sunStone: 'hudChrome.mir4.materials.sunStone',
  moonStone: 'hudChrome.mir4.materials.moonStone',
  solarScroll: 'hudChrome.mir4.materials.solarScroll',
  lunarSeal: 'hudChrome.mir4.materials.lunarSeal',
  dawnTear: 'hudChrome.mir4.materials.dawnTear',
  solarWard: 'hudChrome.mir4.materials.solarWard',
};

// MIR4 material balances keep their native semantic keys, while the UI uses
// existing World of ClaudeCraft reagent art as the visual shell.
const MATERIAL_VISUAL_ITEM_IDS: Readonly<Record<Mir4MaterialView['key'], keyof typeof ITEMS>> = {
  sunStone: 'thorium_ore',
  moonStone: 'copper_ore',
  solarScroll: 'arcanite_bar',
  lunarSeal: 'ironbark_log',
  dawnTear: 'silverleaf_herb',
  solarWard: 'goldleaf_herb',
};

const LEFT_SLOTS = new Set<Mir4EquipmentSlotId>([6, 2, 5, 7]);
const fmt = (value: number) => formatNumber(value, { maximumFractionDigits: 0 });
const fmtBps = (value: number) => `${formatNumber(value / 100, { maximumFractionDigits: 2 })}%`;
const labelValue = (label: string, value: string): string =>
  t('itemUi.market.filterValueAria', { label, value });

export function mir4StatusLabel(statusId: number): string {
  return t(STATUS_KEYS[statusId] ?? 'hudChrome.mir4.stats.unknown');
}

function mir4StatusValue(statusId: number, value: number): string {
  return statusId === 41 || statusId === 44 ? fmtBps(value) : fmt(value);
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
  return `<div class="tt-title">${esc(name)}${enhancement}</div><div class="tt-sub">${esc(
    t('hudChrome.mir4.equipmentVisualShell'),
  )}</div><div>${esc(
    t('hudChrome.mir4.equipmentTierGrade', { tier: fmt(item.tier), grade: fmt(item.grade) }),
  )}</div><div>${esc(
    t('hudChrome.mir4.equipmentRequiredLevel', { level: fmt(item.requiredLevel) }),
  )}</div>${attributes}`;
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
  ].join('');
  const defense = [
    statCell('hudChrome.mir4.stats.physicalDefense', s.physicalDefense),
    statCell('hudChrome.mir4.stats.magicDefense', s.magicDefense),
    statCell('hudChrome.mir4.stats.dodge', s.dodge),
    statCell('hudChrome.mir4.stats.avoidCritical', s.avoidCritical),
  ].join('');
  return `<div class="stat-panels"><div class="stat-panel attrs-tiles">${tiles}</div><div class="stat-panel"><div class="sp-title">${esc(t('hudChrome.charSheet.offense'))}</div>${offense}</div><div class="stat-panel"><div class="sp-title">${esc(t('hudChrome.charSheet.defense'))}</div>${defense}</div></div>`;
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
  const name = t(MATERIAL_KEYS[material.key]);
  return `<div class="tt-title">${esc(name)}</div><div>${esc(t('hudChrome.mir4.materialCount', { count: fmt(material.count) }))}</div>`;
}

const MOUNT_TICKET_NAME_KEYS: Readonly<Record<Mir4MountTicketView['ticketId'], TranslationKey>> = {
  'mount-ticket-dawn': 'hudChrome.mir4.mountTicketDawn',
  'mount-ticket-twilight': 'hudChrome.mir4.mountTicketTwilight',
};

const MOUNT_TICKET_DESCRIPTION_KEYS: Readonly<
  Record<Mir4MountTicketView['ticketId'], TranslationKey>
> = {
  'mount-ticket-dawn': 'hudChrome.mir4.mountTicketDawnDescription',
  'mount-ticket-twilight': 'hudChrome.mir4.mountTicketTwilightDescription',
};

function mountTicketTooltip(ticket: Mir4MountTicketView): string {
  return `<div class="tt-title">${esc(t(MOUNT_TICKET_NAME_KEYS[ticket.ticketId]))}</div><div>${esc(
    t(MOUNT_TICKET_DESCRIPTION_KEYS[ticket.ticketId]),
  )}</div><div class="tt-sub">${esc(t('hudChrome.mir4.materialCount', { count: fmt(ticket.count) }))}</div>`;
}

function mountTooltip(mount: Mir4MountView | Mir4PendingMountView): string {
  const count =
    'count' in mount
      ? `<div class="tt-sub">${esc(t('hudChrome.mir4.mountOwned', { count: fmt(mount.count) }))}</div>`
      : '';
  return `<div class="tt-title">${esc(mir4MountDisplayName(mount.mountId))}</div><div>${esc(
    t('hudChrome.mir4.mountGrade', { grade: fmt(mount.grade) }),
  )}</div><div class="tt-sub">${esc(t('hudChrome.mir4.mountEffectShell'))}</div><div>${esc(
    t('hudChrome.mir4.mountMoveSpeed', {
      amount: formatNumber(mount.stats.moveSpeedBps / 100, { maximumFractionDigits: 2 }),
    }),
  )}</div><div>${esc(
    t('hudChrome.mir4.mountDefenses', {
      physical: fmt(mount.stats.physicalDefense),
      magic: fmt(mount.stats.magicDefense),
    }),
  )}</div>${count}`;
}

const SPIRIT_TICKET_NAME_KEYS: Readonly<Record<Mir4SpiritTicketView['ticketId'], TranslationKey>> =
  {
    'spirit-ticket-dawn': 'hudChrome.mir4.spiritTicketDawn',
    'spirit-ticket-sunset': 'hudChrome.mir4.spiritTicketSunset',
  };

const SPIRIT_TICKET_DESCRIPTION_KEYS: Readonly<
  Record<Mir4SpiritTicketView['ticketId'], TranslationKey>
> = {
  'spirit-ticket-dawn': 'hudChrome.mir4.spiritTicketDawnDescription',
  'spirit-ticket-sunset': 'hudChrome.mir4.spiritTicketSunsetDescription',
};

function spiritTicketTooltip(ticket: Mir4SpiritTicketView): string {
  return `<div class="tt-title">${esc(t(SPIRIT_TICKET_NAME_KEYS[ticket.ticketId]))}</div><div>${esc(
    t(SPIRIT_TICKET_DESCRIPTION_KEYS[ticket.ticketId]),
  )}</div><div class="tt-sub">${esc(t('hudChrome.mir4.materialCount', { count: fmt(ticket.count) }))}</div>`;
}

const SPIRIT_STAT_KEYS: Readonly<Record<string, TranslationKey>> = {
  physicalAttack: 'hudChrome.mir4.stats.physicalAttack',
  magicAttack: 'hudChrome.mir4.stats.magicAttack',
  physicalDefense: 'hudChrome.mir4.stats.physicalDefense',
  magicDefense: 'hudChrome.mir4.stats.magicDefense',
  accuracy: 'hudChrome.mir4.stats.accuracy',
  critical: 'hudChrome.mir4.stats.critical',
  penetrationBps: 'hudChrome.mir4.stats.penetration',
};

function spiritTooltip(spirit: Mir4SpiritView | Mir4PendingSpiritView): string {
  const attributes = Object.entries(spirit.stats)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const label = t(SPIRIT_STAT_KEYS[key] ?? 'hudChrome.mir4.stats.unknown');
      const rendered =
        key === 'penetrationBps'
          ? `${formatNumber(value / 100, { maximumFractionDigits: 2 })}%`
          : `+${fmt(value)}`;
      return `<div>${esc(label)}: <b>${esc(rendered)}</b></div>`;
    })
    .join('');
  const count =
    'count' in spirit
      ? `<div class="tt-sub">${esc(t('hudChrome.mir4.spiritOwned', { count: fmt(spirit.count) }))}</div>`
      : '';
  const skill = spirit.skill;
  const percent = (bps: number) => formatNumber(bps / 100, { maximumFractionDigits: 2 });
  const effect =
    skill.kind === 'bonus-damage'
      ? t('hudChrome.mir4.spiritSkillBonusDamage', { amount: percent(skill.bonusDamageBps ?? 0) })
      : skill.kind === 'execute'
        ? t('hudChrome.mir4.spiritSkillExecute', {
            threshold: percent(skill.targetHpThresholdBps ?? 0),
            amount: percent(skill.bonusDamageBps ?? 0),
          })
        : skill.kind === 'life-siphon'
          ? t('hudChrome.mir4.spiritSkillLifeSiphon', { amount: percent(skill.healMaxHpBps ?? 0) })
          : skill.kind === 'mana-surge'
            ? t('hudChrome.mir4.spiritSkillManaSurge', {
                amount: percent(skill.restoreMaxMpBps ?? 0),
              })
            : skill.kind === 'armor-rend'
              ? t('hudChrome.mir4.spiritSkillArmorRend', {
                  amount: percent(skill.penetrationBps ?? 0),
                })
              : t('hudChrome.mir4.spiritSkillCriticalFocus');
  const skillHtml = `<div class="tt-title">${esc(mir4SpiritSkillDisplayName(skill.id))}</div><div>${esc(
    t('hudChrome.mir4.spiritSkillChanceCooldown', {
      chance: percent(skill.chanceBps),
      cooldown: formatNumber(skill.cooldownMs / 1_000, { maximumFractionDigits: 2 }),
    }),
  )}</div><div>${esc(effect)}</div>`;
  return `<div class="tt-title">${esc(mir4SpiritDisplayName(spirit.spiritId))}</div><div>${esc(
    t('hudChrome.mir4.spiritGrade', { grade: fmt(spirit.grade) }),
  )}</div><div class="tt-sub">${esc(t('hudChrome.mir4.spiritEffectShell'))}</div>${attributes}${skillHtml}${count}`;
}

export function paintMir4InventoryWindow(deps: InventoryPainterDeps): boolean {
  if (deps.world.cfg?.gameProfile !== MIR4_GAME_PROFILE) return false;
  const root = deps.root;
  const state = deps.world.mir4PlayerState();
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
    button.className = `bag-item q-${visual.quality ?? 'common'}`;
    button.dataset.focusKey = `mir4-item:${item.itemId}`;
    button.style.setProperty(
      '--bag-slot-quality',
      QUALITY_COLOR[visual.quality ?? 'common'] ?? 'var(--color-quality-default)',
    );
    const name = mir4EquipmentDisplayName(item);
    button.setAttribute('aria-label', t('hudChrome.mir4.equipAria', { item: name }));
    button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${item.enhancement > 0 ? esc(`+${fmt(item.enhancement)}`) : ''}</span>`;
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
  if (view.equipment.length === 0) {
    grid.insertAdjacentHTML(
      'beforeend',
      `<div class="empty-state">${esc(t('hudChrome.mir4.noUnequippedEquipment'))}</div>`,
    );
  }
  scrollRoot.appendChild(grid);
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
  if (view.mountTickets.length > 0) {
    const ticketsHeader = root.ownerDocument.createElement('div');
    ticketsHeader.className = 'bag-section-header';
    ticketsHeader.textContent = t('hudChrome.mir4.inventoryCollectionTickets');
    scrollRoot.appendChild(ticketsHeader);
    const tickets = root.ownerDocument.createElement('div');
    tickets.className = 'bag-grid';
    for (const ticket of view.mountTickets) {
      const visual = ITEMS[ticket.visualItemId];
      if (!visual) continue;
      const name = t(MOUNT_TICKET_NAME_KEYS[ticket.ticketId]);
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-ticket:${ticket.ticketId}`;
      button.style.setProperty(
        '--bag-slot-quality',
        QUALITY_COLOR[visual.quality ?? 'common'] ?? 'var(--color-quality-default)',
      );
      button.setAttribute('aria-label', t('hudChrome.mir4.redeemMountTicket', { ticket: name }));
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${esc(fmt(ticket.count))}</span>`;
      deps.attachTooltip(button, () => mountTicketTooltip(ticket));
      button.addEventListener('click', () => {
        deps.world.mir4RedeemTicket(ticket.ticketId);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      tickets.appendChild(button);
    }
    scrollRoot.appendChild(tickets);
  }
  if (view.mounts.length > 0) {
    const header = root.ownerDocument.createElement('div');
    header.className = 'bag-section-header';
    header.textContent = t('hudChrome.mir4.inventoryMounts');
    scrollRoot.appendChild(header);
    const mounts = root.ownerDocument.createElement('div');
    mounts.className = 'bag-grid';
    for (const mount of view.mounts) {
      const visual = ITEMS[mount.visualItemId];
      if (!visual) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-mount:${mount.mountId}`;
      button.setAttribute('aria-pressed', String(mount.equipped));
      button.setAttribute('aria-label', mir4MountDisplayName(mount.mountId));
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${mount.equipped ? esc(t('hudChrome.mir4.mountEquipped')) : esc(fmt(mount.count))}</span>`;
      deps.attachTooltip(
        button,
        () =>
          `${mountTooltip(mount)}<div class="tt-sub">${esc(
            t(mount.equipped ? 'hudChrome.mir4.mountUnequipHint' : 'hudChrome.mir4.mountEquipHint'),
          )}</div>`,
      );
      button.addEventListener('click', () => {
        deps.world.mir4EquipMount(mount.equipped ? null : mount.mountId);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      mounts.appendChild(button);
    }
    scrollRoot.appendChild(mounts);
  }
  if (view.pendingMounts.length > 0) {
    const header = root.ownerDocument.createElement('div');
    header.className = 'bag-section-header';
    header.textContent = t('hudChrome.mir4.inventoryPendingMounts');
    scrollRoot.appendChild(header);
    const pending = root.ownerDocument.createElement('div');
    pending.className = 'bag-grid';
    for (const mount of view.pendingMounts) {
      const visual = ITEMS[mount.visualItemId];
      if (!visual) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-mount-pending:${mount.pendingId}`;
      button.setAttribute(
        'aria-label',
        t('hudChrome.mir4.mountConfirmAria', {
          mount: mir4MountDisplayName(mount.mountId),
        }),
      );
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">!</span>`;
      deps.attachTooltip(
        button,
        () =>
          `${mountTooltip(mount)}<div class="tt-sub">${esc(t('hudChrome.mir4.mountConfirmHint'))}</div>`,
      );
      button.addEventListener('click', () => {
        deps.world.mir4ConfirmMount(mount.pendingId);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      pending.appendChild(button);
    }
    scrollRoot.appendChild(pending);
  }
  if (view.mountCombinations.length > 0) {
    const header = root.ownerDocument.createElement('div');
    header.className = 'bag-section-header';
    header.textContent = t('hudChrome.mir4.inventoryMountCombination');
    scrollRoot.appendChild(header);
    const combinations = root.ownerDocument.createElement('div');
    combinations.className = 'bag-grid';
    for (const combination of view.mountCombinations) {
      const visual = ITEMS[combination.visualItemId];
      if (!visual) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-mount-combine:${combination.grade}`;
      button.setAttribute(
        'aria-label',
        t('hudChrome.mir4.combineMountsAria', { grade: fmt(combination.grade) }),
      );
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">4→1</span>`;
      deps.attachTooltip(
        button,
        () =>
          `<div class="tt-title">${esc(t('hudChrome.mir4.inventoryMountCombination'))}</div><div>${esc(t('hudChrome.mir4.mountGrade', { grade: fmt(combination.grade) }))}</div><div>${esc(t('hudChrome.mir4.combineMountsHint'))}</div><div class="tt-sub">${esc(t('hudChrome.mir4.mountOwned', { count: fmt(combination.owned) }))}</div>`,
      );
      button.addEventListener('click', () => {
        deps.world.mir4CombineMounts(combination.grade);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      combinations.appendChild(button);
    }
    scrollRoot.appendChild(combinations);
  }
  if (view.spiritTickets.length > 0) {
    const ticketsHeader = root.ownerDocument.createElement('div');
    ticketsHeader.className = 'bag-section-header';
    ticketsHeader.textContent = t('hudChrome.mir4.inventoryCollectionTickets');
    scrollRoot.appendChild(ticketsHeader);
    const tickets = root.ownerDocument.createElement('div');
    tickets.className = 'bag-grid';
    for (const ticket of view.spiritTickets) {
      const visual = ITEMS[ticket.visualItemId];
      if (!visual) continue;
      const name = t(SPIRIT_TICKET_NAME_KEYS[ticket.ticketId]);
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-ticket:${ticket.ticketId}`;
      button.setAttribute('aria-label', t('hudChrome.mir4.redeemSpiritTicket', { ticket: name }));
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${esc(fmt(ticket.count))}</span>`;
      deps.attachTooltip(button, () => spiritTicketTooltip(ticket));
      button.addEventListener('click', () => {
        deps.world.mir4RedeemTicket(ticket.ticketId);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      tickets.appendChild(button);
    }
    scrollRoot.appendChild(tickets);
  }
  if (view.spirits.length > 0) {
    const spiritsHeader = root.ownerDocument.createElement('div');
    spiritsHeader.className = 'bag-section-header';
    spiritsHeader.textContent = t('hudChrome.mir4.inventorySpirits');
    scrollRoot.appendChild(spiritsHeader);
    const spirits = root.ownerDocument.createElement('div');
    spirits.className = 'bag-grid';
    for (const spirit of view.spirits) {
      const visual = ITEMS[spirit.visualItemId];
      if (!visual) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-spirit:${spirit.spiritId}`;
      button.setAttribute('aria-pressed', String(spirit.equipped));
      button.setAttribute('aria-label', mir4SpiritDisplayName(spirit.spiritId));
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${spirit.equipped ? esc(t('hudChrome.mir4.spiritEquipped')) : esc(fmt(spirit.count))}</span>`;
      deps.attachTooltip(
        button,
        () =>
          `${spiritTooltip(spirit)}<div class="tt-sub">${esc(
            t(
              spirit.equipped
                ? 'hudChrome.mir4.spiritUnequipHint'
                : 'hudChrome.mir4.spiritEquipHint',
            ),
          )}</div>`,
      );
      button.addEventListener('click', () => {
        deps.world.mir4EquipSpirit(spirit.equipped ? null : spirit.spiritId);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      spirits.appendChild(button);
    }
    scrollRoot.appendChild(spirits);
  }
  if (view.pendingSpirits.length > 0) {
    const pendingHeader = root.ownerDocument.createElement('div');
    pendingHeader.className = 'bag-section-header';
    pendingHeader.textContent = t('hudChrome.mir4.inventoryPendingSpirits');
    scrollRoot.appendChild(pendingHeader);
    const pending = root.ownerDocument.createElement('div');
    pending.className = 'bag-grid';
    for (const spirit of view.pendingSpirits) {
      const visual = ITEMS[spirit.visualItemId];
      if (!visual) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-spirit-pending:${spirit.pendingId}`;
      button.setAttribute(
        'aria-label',
        t('hudChrome.mir4.spiritConfirmAria', {
          spirit: mir4SpiritDisplayName(spirit.spiritId),
        }),
      );
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">!</span>`;
      deps.attachTooltip(
        button,
        () =>
          `${spiritTooltip(spirit)}<div class="tt-sub">${esc(t('hudChrome.mir4.spiritConfirmHint'))}</div>`,
      );
      button.addEventListener('click', () => {
        deps.world.mir4ConfirmSpirit(spirit.pendingId);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      pending.appendChild(button);
    }
    scrollRoot.appendChild(pending);
  }
  if (view.spiritCombinations.length > 0) {
    const combineHeader = root.ownerDocument.createElement('div');
    combineHeader.className = 'bag-section-header';
    combineHeader.textContent = t('hudChrome.mir4.inventorySpiritCombination');
    scrollRoot.appendChild(combineHeader);
    const combinations = root.ownerDocument.createElement('div');
    combinations.className = 'bag-grid';
    for (const combination of view.spiritCombinations) {
      const visual = ITEMS[combination.visualItemId];
      if (!visual) continue;
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = `bag-item q-${visual.quality ?? 'common'}`;
      button.dataset.focusKey = `mir4-spirit-combine:${combination.grade}`;
      button.setAttribute(
        'aria-label',
        t('hudChrome.mir4.combineSpiritsAria', { grade: fmt(combination.grade) }),
      );
      button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">4→1</span>`;
      deps.attachTooltip(
        button,
        () =>
          `<div class="tt-title">${esc(t('hudChrome.mir4.inventorySpiritCombination'))}</div><div>${esc(t('hudChrome.mir4.spiritGrade', { grade: fmt(combination.grade) }))}</div><div>${esc(t('hudChrome.mir4.combineSpiritsHint'))}</div><div class="tt-sub">${esc(t('hudChrome.mir4.spiritOwned', { count: fmt(combination.owned) }))}</div>`,
      );
      button.addEventListener('click', () => {
        deps.world.mir4CombineSpirits(combination.grade);
        audio.click();
        deps.hideTooltip();
        deps.afterEquipmentChange();
      });
      combinations.appendChild(button);
    }
    scrollRoot.appendChild(combinations);
  }
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
    button.className = 'bag-item q-common';
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute(
      'aria-label',
      labelValue(t(MATERIAL_KEYS[material.key]), fmt(material.count)),
    );
    button.innerHTML = `${deps.itemIcon(visual)}<span class="bi-count">${esc(fmt(material.count))}</span>`;
    deps.attachTooltip(button, () => materialTooltip(material));
    materials.appendChild(button);
  }
  scrollRoot.appendChild(materials);
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
