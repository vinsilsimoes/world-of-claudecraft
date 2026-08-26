// Dedicated MIR4 Mount collection, summon and fusion window. It uses the
// shared WoC 3D preview and existing MIR4-styled Spirit-system components.

import { audio } from '../game/audio';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
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
import { mir4MountDisplayName } from './mir4_collectible_i18n';
import {
  buildMir4MountCodexView,
  type Mir4MountCodexEntryView,
  type Mir4MountCodexView,
} from './mir4_mount_codex_view';
import { mir4MountPortraitUrl, mir4MountPresentation } from './mir4_mount_visuals';
import { svgIcon } from './ui_icons';

export type Mir4MountCodexTab = 'collection' | 'summon' | 'fusion' | 'confirmations';

const TABS: readonly Mir4MountCodexTab[] = ['collection', 'summon', 'fusion', 'confirmations'];
const TAB_KEYS: Readonly<Record<Mir4MountCodexTab, TranslationKey>> = {
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
} as const satisfies Readonly<Record<Mir4MountCodexEntryView['status'], TranslationKey>>;
const TICKET_KEYS = {
  'mount-ticket-dawn': 'hudChrome.mir4.mountTicketDawn',
  'mount-ticket-twilight': 'hudChrome.mir4.mountTicketTwilight',
} as const satisfies Readonly<Record<string, TranslationKey>>;
const TICKET_DESCRIPTION_KEYS = {
  'mount-ticket-dawn': 'hudChrome.mir4.mountTicketDawnDescription',
  'mount-ticket-twilight': 'hudChrome.mir4.mountTicketTwilightDescription',
} as const satisfies Readonly<Record<string, TranslationKey>>;
const SUMMON_COUNTS = [1, 10, 100] as const;

const integer = (value: number): string => formatNumber(value, { maximumFractionDigits: 0 });
const percent = (bps: number): string => formatNumber(bps / 100, { maximumFractionDigits: 2 });

export interface Mir4MountCodexWindowDeps {
  root(): HTMLElement;
  world(): IWorld;
  closeOthers(): void;
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
  mountPreview(container: HTMLElement, visualKey: string, mountId: string): void;
}

function mountDetailsHtml(entry: Mir4MountCodexEntryView): string {
  return `<div class="mir4-spirit-identity"><span>${esc(t('hudChrome.mir4.mountGrade', { grade: integer(entry.grade) }))}</span><span>${esc(t(STATUS_KEYS[entry.status]))}</span></div><div class="mir4-spirit-stats"><span><span>${esc(t('hudChrome.mir4.mountMoveSpeed', { amount: percent(entry.stats.moveSpeedBps) }))}</span></span><span><span>${esc(t('hudChrome.mir4.mountBasicAttackSpeed', { amount: percent(entry.stats.basicAttackSpeedBps) }))}</span></span><span><span>${esc(t('hudChrome.mir4.stats.physicalDefense'))}</span><b>+${esc(integer(entry.stats.physicalDefense))}</b></span><span><span>${esc(t('hudChrome.mir4.stats.magicDefense'))}</span><b>+${esc(integer(entry.stats.magicDefense))}</b></span></div>`;
}

function mountActionHtml(entry: Mir4MountCodexEntryView): string {
  if (entry.status === 'pending') {
    return `<button type="button" class="mir4-spirit-primary" data-mount-action="confirm">${esc(t('hudChrome.mir4.mountCodex.confirm'))}</button>`;
  }
  if (entry.status === 'equipped') {
    return `<button type="button" class="mir4-spirit-primary" data-mount-action="unequip">${esc(t('hudChrome.mir4.mountCodex.unequip'))}</button>`;
  }
  if (entry.status === 'owned') {
    return `<button type="button" class="mir4-spirit-primary" data-mount-action="equip">${esc(t('hudChrome.mir4.mountCodex.equip'))}</button>`;
  }
  return `<button type="button" class="mir4-spirit-primary" disabled>${esc(t('hudChrome.mir4.spiritCodex.notOwned'))}</button>`;
}

function albumSummaryHtml(view: Mir4MountCodexView): string {
  const stats = buildMir4AlbumStatViews(view.album.current, view.album.maximum)
    .map(
      (stat) =>
        `<span><span>${esc(stat.label)}</span><b>${esc(t('hudChrome.mir4.spiritCodex.albumStatProgress', { current: stat.current, maximum: stat.maximum }))}</b></span>`,
    )
    .join('');
  return `<section class="mir4-album-summary"><div><b>${esc(t('hudChrome.mir4.spiritCodex.albumTitle'))}</b><span>${esc(t('hudChrome.mir4.spiritCodex.albumProgress', { discovered: integer(view.album.discovered), total: integer(view.album.total) }))}</span></div><div class="mir4-album-stats">${stats}</div></section>`;
}

export class Mir4MountCodexWindow {
  private tab: Mir4MountCodexTab = 'collection';
  private selectedMountId: string | null = null;
  private openerFocus: HTMLElement | null = null;
  private lastDataSignature = '';

  constructor(private readonly deps: Mir4MountCodexWindowDeps) {}

  get isOpen(): boolean {
    return this.deps.root().style.display === 'flex';
  }

  open(tab: Mir4MountCodexTab = this.tab): void {
    this.tab = tab;
    const root = this.deps.root();
    if (!this.isOpen) {
      this.deps.closeOthers();
      this.openerFocus = this.deps.captureFocus();
    }
    root.style.display = 'flex';
    this.render(`tab:${tab}`);
    if (this.isOpen && !root.contains(root.ownerDocument.activeElement)) {
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

  refreshIfOpen(preferredMountId?: string): void {
    if (!this.isOpen) return;
    if (preferredMountId) this.selectedMountId = preferredMountId;
    this.render();
  }

  refreshIfChanged(): void {
    if (!this.isOpen) return;
    const state = this.deps.world().mir4PlayerState();
    const signature = this.dataSignature(state);
    if (signature !== this.lastDataSignature) this.render();
  }

  relocalize(): void {
    if (this.isOpen) this.render();
  }

  restorePreview(): void {
    if (!this.isOpen) return;
    const state = this.deps.world().mir4PlayerState();
    if (!state) return;
    const selected = buildMir4MountCodexView(state, this.selectedMountId).selected;
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
    markDialogRoot(root, { labelledBy: 'mir4-mount-title' });
    const state = world.mir4PlayerState();
    this.lastDataSignature = this.dataSignature(state);
    root.innerHTML = `<div class="panel-title"><span id="mir4-mount-title">${esc(t('hudChrome.mir4.mountCodex.title'))}</span><button type="button" class="x-btn" data-close data-focus-key="close" aria-label="${esc(t('itemUi.bags.close'))}">${svgIcon('close')}</button></div>`;
    root.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    if (!state) {
      root.insertAdjacentHTML(
        'beforeend',
        `<div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`,
      );
      this.restoreRenderFocus(restoreKey);
      return;
    }
    let view = buildMir4MountCodexView(state, this.selectedMountId);
    if (
      this.tab === 'confirmations' &&
      view.confirmations.length > 0 &&
      !view.confirmations.some((entry) => entry.mountId === view.selected?.mountId)
    ) {
      this.selectedMountId = view.confirmations[0]?.mountId ?? null;
      view = buildMir4MountCodexView(state, this.selectedMountId);
    }
    this.selectedMountId = view.selected?.mountId ?? null;
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="mir4-spirit-tabs" role="tablist">${TABS.map((tab) => `<button type="button" role="tab" id="mir4-mount-tab-${tab}" data-tab="${tab}" data-focus-key="tab:${tab}" aria-selected="${tab === this.tab}" aria-controls="mir4-mount-panel" tabindex="${tab === this.tab ? '0' : '-1'}" class="${tab === this.tab ? 'sel' : ''}">${esc(t(TAB_KEYS[tab], tab === 'confirmations' ? { count: integer(view.confirmations.length) } : undefined))}</button>`).join('')}</div><div class="mir4-spirit-layout"><section class="mir4-spirit-stage"></section><section class="mir4-spirit-content" id="mir4-mount-panel" role="tabpanel" aria-labelledby="mir4-mount-tab-${this.tab}"></section></div>`,
    );
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab as Mir4MountCodexTab;
        if (!TABS.includes(tab)) return;
        this.tab = tab;
        this.render(`tab:${tab}`);
        audio.click();
      });
      button.addEventListener('keydown', (event) => {
        const index = TABS.indexOf(button.dataset.tab as Mir4MountCodexTab);
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

  private paintStage(stage: HTMLElement, selected: Mir4MountCodexEntryView): void {
    stage.dataset.grade = selected.gradeKey;
    stage.innerHTML = `<div class="mir4-spirit-model" role="img" aria-label="${esc(mir4MountDisplayName(selected.mountId))}"></div><div class="mir4-spirit-details"><h3>${esc(mir4MountDisplayName(selected.mountId))}</h3>${mountDetailsHtml(selected)}${mountActionHtml(selected)}</div>`;
    const action = stage.querySelector<HTMLElement>('[data-mount-action]');
    if (action) action.dataset.focusKey = `action:${selected.mountId}`;
    action?.addEventListener('click', () => {
      if (selected.status === 'pending' && selected.pendingId) {
        this.deps.world().mir4ConfirmMount(selected.pendingId);
      } else if (selected.status === 'equipped') {
        this.deps.world().mir4EquipMount(null);
      } else if (selected.status === 'owned') {
        this.deps.world().mir4EquipMount(selected.mountId);
      } else return;
      audio.click();
      this.render(`action:${selected.mountId}`);
    });
  }

  private paintCollection(content: HTMLElement, view: Mir4MountCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.collection'))}</b><span>${esc(t('hudChrome.mir4.spiritCodex.collectionProgress', { discovered: integer(view.album.discovered), total: integer(view.album.total) }))}</span></div>${albumSummaryHtml(view)}<div class="mir4-spirit-grid"></div>`;
    const grid = content.querySelector<HTMLElement>('.mir4-spirit-grid');
    if (!grid) return;
    for (const entry of view.entries) {
      const button = content.ownerDocument.createElement('button');
      const portrait = mir4MountPortraitUrl(entry.mountId);
      button.type = 'button';
      button.className = `mir4-spirit-card grade-${entry.gradeKey} status-${entry.status}${entry.mountId === view.selected?.mountId ? ' sel' : ''}`;
      button.dataset.mountId = entry.mountId;
      button.dataset.focusKey = `mount:${entry.mountId}`;
      button.setAttribute('aria-pressed', String(entry.mountId === view.selected?.mountId));
      button.innerHTML = `${portrait ? `<img src="${esc(portrait)}" alt="">` : `<span>${svgIcon('crown')}</span>`}<span><b>${esc(mir4MountDisplayName(entry.mountId))}</b><small>${esc(t(STATUS_KEYS[entry.status]))}${entry.count > 1 ? ` · ${esc(integer(entry.count))}` : ''}</small></span>`;
      button.addEventListener('click', () => {
        this.selectedMountId = entry.mountId;
        this.render(`mount:${entry.mountId}`);
        audio.click();
      });
      grid.appendChild(button);
    }
  }

  private paintSummon(content: HTMLElement, view: Mir4MountCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.summon'))}</b><span>${esc(t('hudChrome.mir4.mountCodex.summonHint'))}</span></div><div class="mir4-spirit-ritual-list"></div>`;
    const list = content.querySelector<HTMLElement>('.mir4-spirit-ritual-list');
    if (!list) return;
    if (view.tickets.length === 0) {
      list.innerHTML = `<div class="empty-state">${esc(t('hudChrome.mir4.mountCodex.noTickets'))}</div>`;
      return;
    }
    for (const ticket of view.tickets) {
      const row = content.ownerDocument.createElement('article');
      row.className = 'mir4-spirit-ritual';
      row.innerHTML = `<span class="mir4-spirit-ritual-icon">${svgIcon('mount')}</span><span><b>${esc(t(TICKET_KEYS[ticket.ticketId]))} · ${esc(integer(ticket.count))}</b><small>${esc(t(TICKET_DESCRIPTION_KEYS[ticket.ticketId]))}</small>${ticket.pendingCapacity === null ? '' : `<small class="mir4-spirit-capacity">${esc(t('hudChrome.mir4.spiritCodex.pendingCapacity', { count: integer(ticket.pendingCapacity) }))}</small>`}</span><span class="mir4-spirit-summon-actions"></span>`;
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
        summon.textContent = t('hudChrome.mir4.spiritCodex.summonCount', { count: integer(count) });
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

  private paintFusion(content: HTMLElement, view: Mir4MountCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.fusion'))}</b><span>${esc(t('hudChrome.mir4.combineMountsHint'))}</span></div><div class="mir4-spirit-fusion-list"></div>`;
    const list = content.querySelector<HTMLElement>('.mir4-spirit-fusion-list');
    if (!list) return;
    for (const combination of view.combinations) {
      const row = content.ownerDocument.createElement('article');
      row.className = 'mir4-spirit-fusion-row';
      const capacityAllowsOne = combination.grade < 3 || view.pendingCapacity >= 1;
      const capacityId = `mir4-mount-fusion-capacity-${combination.grade}`;
      const capacityDescription =
        combination.grade >= 3
          ? `<small id="${capacityId}" class="mir4-spirit-capacity">${esc(t('hudChrome.mir4.spiritCodex.fusionPendingCapacity', { count: integer(view.pendingCapacity) }))}</small>`
          : '';
      const describedBy = combination.grade >= 3 ? ` aria-describedby="${capacityId}"` : '';
      row.innerHTML = `<span>${svgIcon('enchant-rune')}</span><span><b>${esc(t('hudChrome.mir4.mountGrade', { grade: integer(combination.grade) }))}</b><small>${esc(t('hudChrome.mir4.spiritCodex.fusionInventory', { owned: integer(combination.owned), attempts: integer(combination.attempts) }))}</small>${capacityDescription}</span><span class="mir4-spirit-fusion-actions"><button type="button" data-combine-grade="${combination.grade}" aria-label="${esc(t('hudChrome.mir4.combineMountsAria', { grade: integer(combination.grade) }))}"${describedBy}${combination.attempts > 0 && capacityAllowsOne ? '' : ' disabled'}>${esc(t('hudChrome.mir4.spiritCodex.combine'))}</button><button type="button" data-combine-all-grade="${combination.grade}" aria-label="${esc(t('hudChrome.mir4.combineAllMountsAria', { grade: integer(combination.grade), count: integer(combination.combineAllAttempts) }))}"${describedBy}${combination.combineAllAttempts > 0 ? '' : ' disabled'}>${esc(t('hudChrome.mir4.spiritCodex.combineAll', { count: integer(combination.combineAllAttempts) }))}</button></span>`;
      const combine = row.querySelector<HTMLButtonElement>('[data-combine-grade]');
      if (combine) combine.dataset.focusKey = `combine:${combination.grade}`;
      combine?.addEventListener('click', () => {
        this.deps.world().mir4CombineMounts(combination.grade);
        audio.click();
        this.render(`combine:${combination.grade}`);
      });
      const combineAll = row.querySelector<HTMLButtonElement>('[data-combine-all-grade]');
      if (combineAll) combineAll.dataset.focusKey = `combine-all:${combination.grade}`;
      combineAll?.addEventListener('click', () => {
        this.deps.world().mir4CombineMounts(combination.grade, true);
        audio.click();
        this.render(`combine-all:${combination.grade}`);
      });
      list.appendChild(row);
    }
  }

  private paintConfirmations(content: HTMLElement, view: Mir4MountCodexView): void {
    content.innerHTML = `<div class="mir4-spirit-section-heading"><b>${esc(t('hudChrome.mir4.spiritCodex.confirmations', { count: integer(view.confirmations.length) }))}</b><button type="button" class="mir4-spirit-primary" data-confirm-all-mounts data-focus-key="confirm-all"${view.confirmations.length > 0 ? '' : ' disabled'}>${esc(t('hudChrome.mir4.spiritCodex.confirmAll', { count: integer(view.confirmations.length) }))}</button></div><div class="mir4-spirit-ritual-list"></div>`;
    const list = content.querySelector<HTMLElement>('.mir4-spirit-ritual-list');
    if (!list) return;
    if (view.confirmations.length === 0) {
      list.innerHTML = `<div class="empty-state">${esc(t('hudChrome.mir4.spiritCodex.noConfirmations'))}</div>`;
    }
    for (const confirmation of view.confirmations) {
      const row = content.ownerDocument.createElement('article');
      row.className = 'mir4-spirit-ritual';
      row.dataset.grade = confirmation.gradeKey;
      const displayName = mir4MountDisplayName(confirmation.mountId);
      const albumLine = confirmation.albumAward
        ? t('hudChrome.mir4.spiritCodex.albumNewBonus', {
            amount: formatMir4AlbumAmount(
              confirmation.albumAward.stat,
              confirmation.albumAward.amount,
            ),
            stat: mir4AlbumStatLabel(confirmation.albumAward.stat),
          })
        : t('hudChrome.mir4.spiritCodex.albumDuplicate');
      row.innerHTML = `<span class="mir4-spirit-ritual-icon">${svgIcon('mount')}</span><span><b>${esc(displayName)}</b><small>${esc(t('hudChrome.mir4.mountGrade', { grade: integer(confirmation.grade) }))} · ${esc(albumLine)}</small></span><span class="mir4-spirit-summon-actions"><button type="button" data-confirm-mount-id="${esc(confirmation.pendingId)}" data-focus-key="confirm:${esc(confirmation.pendingId)}" aria-label="${esc(`${t('hudChrome.mir4.mountCodex.confirm')}: ${displayName}`)}">${esc(t('hudChrome.mir4.mountCodex.confirm'))}</button></span>`;
      row
        .querySelector<HTMLButtonElement>('[data-confirm-mount-id]')
        ?.addEventListener('click', () => {
          this.deps.world().mir4ConfirmMount(confirmation.pendingId);
          audio.click();
          this.render(`confirm:${confirmation.pendingId}`);
        });
      list.appendChild(row);
    }
    content
      .querySelector<HTMLButtonElement>('[data-confirm-all-mounts]')
      ?.addEventListener('click', () => {
        this.deps.world().mir4ConfirmAllMounts();
        audio.click();
        this.render('tab:confirmations');
      });
  }

  private mountSelectedPreview(selected: Mir4MountCodexEntryView): void {
    const presentation = mir4MountPresentation(selected.mountId);
    const host = this.deps.root().querySelector<HTMLElement>('.mir4-spirit-model');
    if (presentation && host)
      this.deps.mountPreview(host, presentation.visualKey, selected.mountId);
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
      t('hudChrome.mir4.mountCodex.title'),
      state?.mir4Mounts,
      state?.mir4ArcRewards?.tickets,
    ]);
  }
}
