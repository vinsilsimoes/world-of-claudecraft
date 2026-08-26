// Dedicated MIR4 Spirit collection, summon and fusion window. It borrows the
// shared WoC character turntable through mountPreview, so only one WebGL
// preview context exists and no extracted MIR4 presentation asset is needed.

import { audio } from '../game/audio';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { Mir4SpiritSpecialSkill } from '../sim/mir4/spirits';
import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { esc } from './esc';
import { captureFocusKey, restoreFirstEnabled } from './focus_restore';
import { formatNumber, type TranslationKey, t } from './i18n';
import {
  buildMir4AlbumStatViews,
  formatMir4AlbumAmount,
  mir4AlbumStatLabel,
} from './mir4_album_view';
import { mir4SpiritDisplayName, mir4SpiritSkillDisplayName } from './mir4_collectible_i18n';
import {
  buildMir4SpiritCodexView,
  type Mir4SpiritCodexEntryView,
  type Mir4SpiritCodexView,
} from './mir4_spirit_codex_view';
import { mir4SpiritPortraitUrl, mir4SpiritPresentation } from './mir4_spirit_visuals';
import { svgIcon } from './ui_icons';

export type Mir4SpiritCodexTab = 'collection' | 'summon' | 'fusion' | 'confirmations';

const TABS: readonly Mir4SpiritCodexTab[] = ['collection', 'summon', 'fusion', 'confirmations'];
const TAB_KEYS: Readonly<Record<Mir4SpiritCodexTab, TranslationKey>> = {
  collection: 'hudChrome.mir4.spiritCodex.collection',
  summon: 'hudChrome.mir4.spiritCodex.summon',
  fusion: 'hudChrome.mir4.spiritCodex.fusion',
  confirmations: 'hudChrome.mir4.spiritCodex.confirmations',
};
const STATUS_KEYS = {
  undiscovered: 'hudChrome.mir4.spiritCodex.undiscovered',
  discovered: 'hudChrome.mir4.spiritCodex.discovered',
  owned: 'hudChrome.mir4.spiritCodex.owned',
  equipped: 'hudChrome.mir4.spiritCodex.equipped',
  pending: 'hudChrome.mir4.spiritCodex.pending',
} as const satisfies Readonly<Record<Mir4SpiritCodexEntryView['status'], TranslationKey>>;
const STAT_KEYS: Readonly<Record<string, TranslationKey>> = {
  physicalAttack: 'hudChrome.mir4.stats.physicalAttack',
  magicAttack: 'hudChrome.mir4.stats.magicAttack',
  physicalDefense: 'hudChrome.mir4.stats.physicalDefense',
  magicDefense: 'hudChrome.mir4.stats.magicDefense',
  accuracy: 'hudChrome.mir4.stats.accuracy',
  critical: 'hudChrome.mir4.stats.critical',
  penetrationBps: 'hudChrome.mir4.stats.penetration',
};
const TICKET_KEYS = {
  'spirit-ticket-dawn': 'hudChrome.mir4.spiritTicketDawn',
  'spirit-ticket-sunset': 'hudChrome.mir4.spiritTicketSunset',
} as const satisfies Readonly<Record<string, TranslationKey>>;
const TICKET_DESCRIPTION_KEYS = {
  'spirit-ticket-dawn': 'hudChrome.mir4.spiritTicketDawnDescription',
  'spirit-ticket-sunset': 'hudChrome.mir4.spiritTicketSunsetDescription',
} as const satisfies Readonly<Record<string, TranslationKey>>;
const SUMMON_COUNTS = [1, 10, 100] as const;

const integer = (value: number): string => formatNumber(value, { maximumFractionDigits: 0 });
const percent = (bps: number): string => formatNumber(bps / 100, { maximumFractionDigits: 2 });

export interface Mir4SpiritCodexWindowDeps {
  root(): HTMLElement;
  world(): IWorld;
  closeOthers(): void;
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
  mountPreview(container: HTMLElement, visualKey: string, spiritId: string): void;
}

function skillEffectText(skill: Mir4SpiritSpecialSkill): string {
  if (skill.kind === 'bonus-damage') {
    return t('hudChrome.mir4.spiritSkillBonusDamage', {
      amount: percent(skill.bonusDamageBps ?? 0),
    });
  }
  if (skill.kind === 'execute') {
    return t('hudChrome.mir4.spiritSkillExecute', {
      threshold: percent(skill.targetHpThresholdBps ?? 0),
      amount: percent(skill.bonusDamageBps ?? 0),
    });
  }
  if (skill.kind === 'life-siphon') {
    return t('hudChrome.mir4.spiritSkillLifeSiphon', {
      amount: percent(skill.healMaxHpBps ?? 0),
    });
  }
  if (skill.kind === 'mana-surge') {
    return t('hudChrome.mir4.spiritSkillManaSurge', {
      amount: percent(skill.restoreMaxMpBps ?? 0),
    });
  }
  if (skill.kind === 'armor-rend') {
    return t('hudChrome.mir4.spiritSkillArmorRend', {
      amount: percent(skill.penetrationBps ?? 0),
    });
  }
  return t('hudChrome.mir4.spiritSkillCriticalFocus');
}

function spiritDetailsHtml(entry: Mir4SpiritCodexEntryView): string {
  const stats = Object.entries(entry.stats)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const label = t(STAT_KEYS[key] ?? 'hudChrome.mir4.stats.unknown');
      const amount = key === 'penetrationBps' ? `${percent(value)}%` : integer(value);
      return `<span><span>${esc(label)}</span><b>+${esc(amount)}</b></span>`;
    })
    .join('');
  return `<div class="mir4-spirit-identity"><span>${esc(t('hudChrome.mir4.spiritGrade', { grade: integer(entry.grade) }))}</span><span>${esc(t(STATUS_KEYS[entry.status]))}</span></div><div class="mir4-spirit-stats">${stats}</div><div class="mir4-spirit-skill"><b>${esc(mir4SpiritSkillDisplayName(entry.skill.id))}</b><span>${esc(t('hudChrome.mir4.spiritSkillChanceCooldown', { chance: percent(entry.skill.chanceBps), cooldown: formatNumber(entry.skill.cooldownMs / 1_000, { maximumFractionDigits: 2 }) }))}</span><p>${esc(skillEffectText(entry.skill))}</p></div>`;
}

function spiritActionHtml(entry: Mir4SpiritCodexEntryView): string {
  if (entry.status === 'pending') {
    return `<button type="button" class="mir4-spirit-primary" data-spirit-action="confirm">${esc(t('hudChrome.mir4.spiritCodex.confirm'))}</button>`;
  }
  if (entry.status === 'equipped') {
    return `<button type="button" class="mir4-spirit-primary" data-spirit-action="unequip">${esc(t('hudChrome.mir4.spiritCodex.unequip'))}</button>`;
  }
  if (entry.status === 'owned') {
    return `<button type="button" class="mir4-spirit-primary" data-spirit-action="equip">${esc(t('hudChrome.mir4.spiritCodex.equip'))}</button>`;
  }
  return `<button type="button" class="mir4-spirit-primary" disabled>${esc(t('hudChrome.mir4.spiritCodex.notOwned'))}</button>`;
}

function albumSummaryHtml(view: Mir4SpiritCodexView): string {
  const stats = buildMir4AlbumStatViews(view.album.current, view.album.maximum)
    .map(
      (stat) =>
        `<span><span>${esc(stat.label)}</span><b>${esc(t('hudChrome.mir4.spiritCodex.albumStatProgress', { current: stat.current, maximum: stat.maximum }))}</b></span>`,
    )
    .join('');
  return `<section class="mir4-album-summary"><div><b>${esc(t('hudChrome.mir4.spiritCodex.albumTitle'))}</b><span>${esc(t('hudChrome.mir4.spiritCodex.albumProgress', { discovered: integer(view.album.discovered), total: integer(view.album.total) }))}</span></div><div class="mir4-album-stats">${stats}</div></section>`;
}

export class Mir4SpiritCodexWindow {
  private tab: Mir4SpiritCodexTab = 'collection';
  private selectedSpiritId: string | null = null;
  private openerFocus: HTMLElement | null = null;
  private lastDataSignature = '';

  constructor(private readonly deps: Mir4SpiritCodexWindowDeps) {}

  get isOpen(): boolean {
    return this.deps.root().style.display === 'flex';
  }

  open(tab: Mir4SpiritCodexTab = this.tab): void {
    this.tab = tab;
    const root = this.deps.root();
    if (!this.isOpen) {
      this.deps.closeOthers();
      this.openerFocus = this.deps.captureFocus();
    }
    root.style.display = 'flex';
    this.render(`tab:${tab}`);
    if (!this.isOpen) return;
    if (!root.contains(root.ownerDocument.activeElement)) {
      root.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.focus();
    }
    audio.click();
  }

  close(): void {
    const root = this.deps.root();
    if (!this.isOpen) return;
    root.style.display = 'none';
    this.deps.restoreFocus(this.openerFocus);
    this.openerFocus = null;
  }

  refreshIfOpen(preferredSpiritId?: string): void {
    if (!this.isOpen) return;
    if (preferredSpiritId) this.selectedSpiritId = preferredSpiritId;
    this.render();
  }

  refreshIfChanged(): void {
    if (!this.isOpen) return;
    const state = this.deps.world().mir4PlayerState();
    const signature = this.dataSignature(state);
    if (signature === this.lastDataSignature) return;
    this.render();
  }

  relocalize(): void {
    if (this.isOpen) this.render();
  }

  restorePreview(): void {
    if (!this.isOpen) return;
    const state = this.deps.world().mir4PlayerState();
    if (!state) return;
    const selected = buildMir4SpiritCodexView(state, this.selectedSpiritId).selected;
    if (selected) this.mountSelectedPreview(selected);
  }

  private render(preferredFocusKey?: string): void {
    const root = this.deps.root();
    const restoreKey = preferredFocusKey ?? captureFocusKey(root) ?? undefined;
    const world = this.deps.world();
    if (world.cfg?.gameProfile !== MIR4_GAME_PROFILE) {
      root.style.display = 'none';
      return;
    }
    markDialogRoot(root, { labelledBy: 'mir4-spirit-title' });
    const state = world.mir4PlayerState();
    this.lastDataSignature = this.dataSignature(state);
    root.innerHTML = `<div class="panel-title"><span id="mir4-spirit-title">${esc(t('hudChrome.mir4.spiritCodex.title'))}</span><button type="button" class="x-btn" data-close data-focus-key="close" aria-label="${esc(t('itemUi.bags.close'))}">${svgIcon('close')}</button></div>`;
    root.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    if (!state) {
      root.insertAdjacentHTML(
        'beforeend',
        `<div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`,
      );
      this.restoreRenderFocus(restoreKey);
      return;
    }
    let view = buildMir4SpiritCodexView(state, this.selectedSpiritId);
    if (
      this.tab === 'confirmations' &&
      view.confirmations.length > 0 &&
      !view.confirmations.some((entry) => entry.spiritId === view.selected?.spiritId)
    ) {
      this.selectedSpiritId = view.confirmations[0]?.spiritId ?? null;
      view = buildMir4SpiritCodexView(state, this.selectedSpiritId);
    }
    this.selectedSpiritId = view.selected?.spiritId ?? null;
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="mir4-spirit-tabs" role="tablist">${TABS.map((tab) => `<button type="button" role="tab" id="mir4-spirit-tab-${tab}" data-tab="${tab}" data-focus-key="tab:${tab}" aria-selected="${tab === this.tab}" aria-controls="mir4-spirit-panel" tabindex="${tab === this.tab ? '0' : '-1'}" class="${tab === this.tab ? 'sel' : ''}">${esc(t(TAB_KEYS[tab], tab === 'confirmations' ? { count: integer(view.confirmations.length) } : undefined))}</button>`).join('')}</div><div class="mir4-spirit-layout"><section class="mir4-spirit-stage"></section><section class="mir4-spirit-content" id="mir4-spirit-panel" role="tabpanel" aria-labelledby="mir4-spirit-tab-${this.tab}"></section></div>`,
    );
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab as Mir4SpiritCodexTab;
        if (!TABS.includes(tab)) return;
        this.tab = tab;
        this.render(`tab:${tab}`);
        audio.click();
      });
      button.addEventListener('keydown', (event) => {
        const index = TABS.indexOf(button.dataset.tab as Mir4SpiritCodexTab);
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = TABS.length - 1;
        else return;
        event.preventDefault();
        this.tab = TABS[next];
        this.render(`tab:${this.tab}`);
        audio.click();
      });
    }
    const stage = root.querySelector<HTMLElement>('.mir4-spirit-stage');
    const content = root.querySelector<HTMLElement>('.mir4-spirit-content');
    if (!stage || !content || !view.selected) return;
    this.paintStage(stage, view.selected);
    if (this.tab === 'collection') this.paintCollection(content, view);
    else if (this.tab === 'summon') this.paintSummon(content, view);
    else if (this.tab === 'fusion') this.paintFusion(content, view);
    else this.paintConfirmations(content, view);
    this.mountSelectedPreview(view.selected);
    this.restoreRenderFocus(restoreKey);
  }

  private paintStage(stage: HTMLElement, selected: Mir4SpiritCodexEntryView): void {
    stage.dataset.grade = selected.gradeKey;
    stage.innerHTML = `<div class="mir4-spirit-model" role="img" aria-label="${esc(mir4SpiritDisplayName(selected.spiritId))}"></div><div class="mir4-spirit-details"><h3>${esc(mir4SpiritDisplayName(selected.spiritId))}</h3>${spiritDetailsHtml(selected)}${spiritActionHtml(selected)}</div>`;
    const action = stage.querySelector<HTMLElement>('[data-spirit-action]');
    if (action) action.dataset.focusKey = `action:${selected.spiritId}`;
    stage
      .querySelector<HTMLButtonElement>('[data-spirit-action]')
      ?.addEventListener('click', () => {
        if (selected.status === 'pending' && selected.pendingId) {
          this.deps.world().mir4ConfirmSpirit(selected.pendingId);
        } else if (selected.status === 'equipped') {
          this.deps.world().mir4EquipSpirit(null);
        } else if (selected.status === 'owned') {
          this.deps.world().mir4EquipSpirit(selected.spiritId);
        } else {
          return;
        }
        audio.click();
        this.render(`action:${selected.spiritId}`);
      });
  }

  private paintCollection(content: HTMLElement, view: Mir4SpiritCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.collection'))}</b><span>${esc(t('hudChrome.mir4.spiritCodex.collectionProgress', { discovered: integer(view.album.discovered), total: integer(view.album.total) }))}</span></div>${albumSummaryHtml(view)}<div class="mir4-spirit-grid"></div>`;
    const grid = content.querySelector<HTMLElement>('.mir4-spirit-grid');
    if (!grid) return;
    for (const entry of view.entries) {
      const button = content.ownerDocument.createElement('button');
      const portrait = mir4SpiritPortraitUrl(entry.spiritId);
      button.type = 'button';
      button.className = `mir4-spirit-card grade-${entry.gradeKey} status-${entry.status}${entry.spiritId === view.selected?.spiritId ? ' sel' : ''}`;
      button.dataset.spiritId = entry.spiritId;
      button.dataset.focusKey = `spirit:${entry.spiritId}`;
      button.setAttribute('aria-pressed', String(entry.spiritId === view.selected?.spiritId));
      button.innerHTML = `${portrait ? `<img src="${esc(portrait)}" alt="">` : `<span>${svgIcon('crown')}</span>`}<span><b>${esc(mir4SpiritDisplayName(entry.spiritId))}</b><small>${esc(t(STATUS_KEYS[entry.status]))}${entry.count > 1 ? ` · ${esc(integer(entry.count))}` : ''}</small></span>`;
      button.addEventListener('click', () => {
        this.selectedSpiritId = entry.spiritId;
        this.render(`spirit:${entry.spiritId}`);
        audio.click();
      });
      grid.appendChild(button);
    }
  }

  private paintSummon(content: HTMLElement, view: Mir4SpiritCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.summon'))}</b><span>${esc(t('hudChrome.mir4.spiritCodex.summonHint'))}</span></div><div class="mir4-spirit-ritual-list"></div>`;
    const list = content.querySelector<HTMLElement>('.mir4-spirit-ritual-list');
    if (!list) return;
    if (view.tickets.length === 0) {
      list.innerHTML = `<div class="empty-state">${esc(t('hudChrome.mir4.spiritCodex.noTickets'))}</div>`;
      return;
    }
    for (const ticket of view.tickets) {
      const row = content.ownerDocument.createElement('article');
      row.className = 'mir4-spirit-ritual';
      row.innerHTML = `<span class="mir4-spirit-ritual-icon">${svgIcon('crown')}</span><span><b>${esc(t(TICKET_KEYS[ticket.ticketId]))} · ${esc(integer(ticket.count))}</b><small>${esc(t(TICKET_DESCRIPTION_KEYS[ticket.ticketId]))}</small>${ticket.pendingCapacity === null ? '' : `<small class="mir4-spirit-capacity">${esc(t('hudChrome.mir4.spiritCodex.pendingCapacity', { count: integer(ticket.pendingCapacity) }))}</small>`}</span><span class="mir4-spirit-summon-actions"></span>`;
      const actions = row.querySelector<HTMLElement>('.mir4-spirit-summon-actions');
      for (const count of SUMMON_COUNTS) {
        const summon = content.ownerDocument.createElement('button');
        summon.type = 'button';
        summon.dataset.ticket = ticket.ticketId;
        summon.dataset.ticketCount = String(count);
        summon.dataset.focusKey = `ticket:${ticket.ticketId}:${count}`;
        summon.disabled =
          ticket.count < count ||
          (ticket.pendingCapacity !== null && ticket.pendingCapacity < count);
        summon.textContent = t('hudChrome.mir4.spiritCodex.summonCount', {
          count: integer(count),
        });
        summon.setAttribute(
          'aria-label',
          `${t(TICKET_KEYS[ticket.ticketId])}: ${summon.textContent}`,
        );
        summon.addEventListener('click', () => {
          this.deps.world().mir4RedeemTicket(ticket.ticketId, count);
          audio.click();
          this.render(`ticket:${ticket.ticketId}:${count}`);
        });
        actions?.appendChild(summon);
      }
      list.appendChild(row);
    }
  }

  private paintFusion(content: HTMLElement, view: Mir4SpiritCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.fusion'))}</b><span>${esc(t('hudChrome.mir4.combineSpiritsHint'))}</span></div><div class="mir4-spirit-fusion-list"></div>`;
    const list = content.querySelector<HTMLElement>('.mir4-spirit-fusion-list');
    if (!list) return;
    for (const combination of view.combinations) {
      const row = content.ownerDocument.createElement('article');
      row.className = 'mir4-spirit-fusion-row';
      const capacityAllowsOne = combination.grade < 3 || view.pendingCapacity >= 1;
      const capacityId = `mir4-spirit-fusion-capacity-${combination.grade}`;
      const capacityDescription =
        combination.grade >= 3
          ? `<small id="${capacityId}" class="mir4-spirit-capacity">${esc(t('hudChrome.mir4.spiritCodex.fusionPendingCapacity', { count: integer(view.pendingCapacity) }))}</small>`
          : '';
      const describedBy = combination.grade >= 3 ? ` aria-describedby="${capacityId}"` : '';
      row.innerHTML = `<span>${svgIcon('enchant-rune')}</span><span><b>${esc(t('hudChrome.mir4.spiritGrade', { grade: integer(combination.grade) }))}</b><small>${esc(t('hudChrome.mir4.spiritCodex.fusionInventory', { owned: integer(combination.owned), attempts: integer(combination.attempts) }))}</small>${capacityDescription}</span><span class="mir4-spirit-fusion-actions"><button type="button" data-combine-grade="${combination.grade}" aria-label="${esc(t('hudChrome.mir4.combineSpiritsAria', { grade: integer(combination.grade) }))}"${describedBy}${combination.attempts > 0 && capacityAllowsOne ? '' : ' disabled'}>${esc(t('hudChrome.mir4.spiritCodex.combine'))}</button><button type="button" data-combine-all-grade="${combination.grade}" aria-label="${esc(t('hudChrome.mir4.combineAllSpiritsAria', { grade: integer(combination.grade), count: integer(combination.combineAllAttempts) }))}"${describedBy}${combination.combineAllAttempts > 0 ? '' : ' disabled'}>${esc(t('hudChrome.mir4.spiritCodex.combineAll', { count: integer(combination.combineAllAttempts) }))}</button></span>`;
      const combine = row.querySelector<HTMLButtonElement>('[data-combine-grade]');
      if (combine) combine.dataset.focusKey = `combine:${combination.grade}`;
      combine?.addEventListener('click', () => {
        this.deps.world().mir4CombineSpirits(combination.grade);
        audio.click();
        this.render(`combine:${combination.grade}`);
      });
      const combineAll = row.querySelector<HTMLButtonElement>('[data-combine-all-grade]');
      if (combineAll) combineAll.dataset.focusKey = `combine-all:${combination.grade}`;
      combineAll?.addEventListener('click', () => {
        this.deps.world().mir4CombineSpirits(combination.grade, true);
        audio.click();
        this.render(`combine-all:${combination.grade}`);
      });
      list.appendChild(row);
    }
  }

  private paintConfirmations(content: HTMLElement, view: Mir4SpiritCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.confirmations', { count: integer(view.confirmations.length) }))}</b><button type="button" class="mir4-spirit-primary" data-confirm-all-spirits data-focus-key="confirm-all"${view.confirmations.length > 0 ? '' : ' disabled'}>${esc(t('hudChrome.mir4.spiritCodex.confirmAll', { count: integer(view.confirmations.length) }))}</button></div><div class="mir4-spirit-ritual-list"></div>`;
    const list = content.querySelector<HTMLElement>('.mir4-spirit-ritual-list');
    if (!list) return;
    if (view.confirmations.length === 0) {
      list.innerHTML = `<div class="empty-state">${esc(t('hudChrome.mir4.spiritCodex.noConfirmations'))}</div>`;
    }
    for (const confirmation of view.confirmations) {
      const row = content.ownerDocument.createElement('article');
      row.className = 'mir4-spirit-ritual';
      row.dataset.grade = confirmation.gradeKey;
      const displayName = mir4SpiritDisplayName(confirmation.spiritId);
      const albumLine = confirmation.albumAward
        ? t('hudChrome.mir4.spiritCodex.albumNewBonus', {
            amount: formatMir4AlbumAmount(
              confirmation.albumAward.stat,
              confirmation.albumAward.amount,
            ),
            stat: mir4AlbumStatLabel(confirmation.albumAward.stat),
          })
        : t('hudChrome.mir4.spiritCodex.albumDuplicate');
      row.innerHTML = `<span class="mir4-spirit-ritual-icon">${svgIcon('crown')}</span><span><b>${esc(displayName)}</b><small>${esc(t('hudChrome.mir4.spiritGrade', { grade: integer(confirmation.grade) }))} · ${esc(albumLine)}</small></span><span class="mir4-spirit-summon-actions"><button type="button" data-confirm-spirit-id="${esc(confirmation.pendingId)}" data-focus-key="confirm:${esc(confirmation.pendingId)}" aria-label="${esc(`${t('hudChrome.mir4.spiritCodex.confirm')}: ${displayName}`)}">${esc(t('hudChrome.mir4.spiritCodex.confirm'))}</button></span>`;
      row
        .querySelector<HTMLButtonElement>('[data-confirm-spirit-id]')
        ?.addEventListener('click', () => {
          this.deps.world().mir4ConfirmSpirit(confirmation.pendingId);
          audio.click();
          this.render(`confirm:${confirmation.pendingId}`);
        });
      list.appendChild(row);
    }
    content
      .querySelector<HTMLButtonElement>('[data-confirm-all-spirits]')
      ?.addEventListener('click', () => {
        this.deps.world().mir4ConfirmAllSpirits();
        audio.click();
        this.render('tab:confirmations');
      });
  }

  private mountSelectedPreview(selected: Mir4SpiritCodexEntryView): void {
    const presentation = mir4SpiritPresentation(selected.spiritId);
    const host = this.deps.root().querySelector<HTMLElement>('.mir4-spirit-model');
    if (presentation && host) {
      this.deps.mountPreview(host, presentation.visualKey, selected.spiritId);
    }
  }

  private restoreRenderFocus(preferredKey?: string): void {
    const root = this.deps.root();
    const preferred = preferredKey
      ? [...root.querySelectorAll<HTMLElement>('[data-focus-key]')].find(
          (element) => element.dataset.focusKey === preferredKey,
        )
      : null;
    restoreFirstEnabled([
      preferred,
      root.querySelector<HTMLElement>(`[data-tab="${this.tab}"]`),
      root.querySelector<HTMLElement>('[data-close]'),
    ]);
  }

  private dataSignature(state: ReturnType<IWorld['mir4PlayerState']>): string {
    return JSON.stringify([
      t('hudChrome.mir4.spiritCodex.title'),
      state?.mir4Spirits,
      state?.mir4ArcRewards?.tickets,
    ]);
  }
}
