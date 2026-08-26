import { audio } from '../game/audio';
import { mir4ClassById } from '../sim/content/mir4/classes';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { esc } from './esc';
import { captureFocusKey, restoreFirstEnabled } from './focus_restore';
import { formatNumber, type TranslationKey, t } from './i18n';
import { formatMir4AlbumAmount, mir4AlbumStatLabel } from './mir4_album_view';
import {
  buildMir4CodexView,
  filterMir4CodexCollections,
  type Mir4CodexCollectionView,
  type Mir4CodexFilter,
  type Mir4CodexRequirementView,
} from './mir4_codex_view';
import { mir4MountDisplayName, mir4SpiritDisplayName } from './mir4_collectible_i18n';
import { mir4MaterialName } from './mir4_material_i18n';
import { svgIcon } from './ui_icons';

const FILTERS: readonly Mir4CodexFilter[] = ['all', 'manual', 'automatic', 'completed'];
const FILTER_KEYS: Readonly<Record<Mir4CodexFilter, TranslationKey>> = {
  all: 'hudChrome.mir4.codex.filterAll',
  manual: 'hudChrome.mir4.codex.filterManual',
  automatic: 'hudChrome.mir4.codex.filterAutomatic',
  completed: 'hudChrome.mir4.codex.filterCompleted',
};
const SLOT_KEYS: Readonly<Record<number, TranslationKey>> = {
  1: 'hudChrome.mir4.equipmentSlots.weapon',
  2: 'hudChrome.mir4.equipmentSlots.necklace',
  3: 'hudChrome.mir4.equipmentSlots.ring',
  4: 'hudChrome.mir4.equipmentSlots.talisman',
  5: 'hudChrome.mir4.equipmentSlots.chest',
  6: 'hudChrome.mir4.equipmentSlots.helmet',
  7: 'hudChrome.mir4.equipmentSlots.gloves',
  8: 'hudChrome.mir4.equipmentSlots.boots',
};

const integer = (value: number): string => formatNumber(value, { maximumFractionDigits: 0 });

export interface Mir4CodexWindowDeps {
  root(): HTMLElement;
  world(): IWorld;
  closeOthers(): void;
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
  confirm(title: string, body: string, onAccept: () => void): void;
}

function requirementName(requirement: Mir4CodexRequirementView): string {
  if (requirement.kind === 'material') return mir4MaterialName(requirement.materialKey);
  if (requirement.kind === 'equipment') {
    const classKey = mir4ClassById(requirement.classId)?.key;
    return t('hudChrome.mir4.codex.classEquipmentRequirement', {
      className: classKey
        ? t(`classes.${classKey}` as TranslationKey)
        : String(requirement.classId),
      slot: t(SLOT_KEYS[requirement.equipSlot] ?? 'hudChrome.mir4.stats.unknown'),
    });
  }
  if (requirement.kind === 'mount') return mir4MountDisplayName(requirement.id);
  return mir4SpiritDisplayName(requirement.id);
}

function bonusHtml(collection: Mir4CodexCollectionView): string {
  return collection.bonuses
    .map(
      (bonus) =>
        `<span>${esc(mir4AlbumStatLabel(bonus.stat))} <b>+${esc(formatMir4AlbumAmount(bonus.stat, bonus.amount))}</b></span>`,
    )
    .join('');
}

export class Mir4CodexWindow {
  private filter: Mir4CodexFilter = 'all';
  private openerFocus: HTMLElement | null = null;
  private lastDataSignature = '';

  constructor(private readonly deps: Mir4CodexWindowDeps) {}

  get isOpen(): boolean {
    return this.deps.root().style.display === 'flex';
  }

  open(): void {
    const root = this.deps.root();
    if (!this.isOpen) {
      this.deps.closeOthers();
      this.openerFocus = this.deps.captureFocus();
    }
    root.style.display = 'flex';
    this.render(`filter:${this.filter}`);
    audio.click();
  }

  close(): void {
    if (!this.isOpen) return;
    this.deps.root().style.display = 'none';
    this.deps.restoreFocus(this.openerFocus);
    this.openerFocus = null;
  }

  refreshIfChanged(): void {
    if (!this.isOpen) return;
    const signature = this.dataSignature();
    if (signature !== this.lastDataSignature) this.render();
  }

  relocalize(): void {
    if (this.isOpen) this.render();
  }

  private render(preferredFocusKey?: string): void {
    const root = this.deps.root();
    const restoreKey = preferredFocusKey ?? captureFocusKey(root) ?? undefined;
    const world = this.deps.world();
    if (world.cfg?.gameProfile !== MIR4_GAME_PROFILE) {
      root.style.display = 'none';
      return;
    }
    markDialogRoot(root, { labelledBy: 'mir4-codex-title' });
    const state = world.mir4PlayerState();
    this.lastDataSignature = this.dataSignature();
    root.innerHTML = `<div class="panel-title"><span id="mir4-codex-title">${esc(t('hudChrome.mir4.codex.title'))}</span><button type="button" class="x-btn" data-close data-focus-key="close" aria-label="${esc(t('hud.options.returnToGame'))}">${svgIcon('close')}</button></div>`;
    root.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    if (!state) {
      root.insertAdjacentHTML(
        'beforeend',
        `<div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`,
      );
      this.restoreFocus(restoreKey);
      return;
    }
    const view = buildMir4CodexView(state);
    if (!view.unlocked) {
      root.insertAdjacentHTML(
        'beforeend',
        `<section class="mir4-codex-locked"><span>${svgIcon('book')}</span><h3>${esc(t('hudChrome.mir4.codex.lockedTitle'))}</h3><p>${esc(t('hudChrome.mir4.codex.lockedBody', { level: integer(view.unlockLevel) }))}</p></section>`,
      );
      this.restoreFocus(restoreKey);
      return;
    }
    const collections = filterMir4CodexCollections(view.collections, this.filter);
    root.insertAdjacentHTML(
      'beforeend',
      `<section class="mir4-codex-intro"><div><b>${esc(t('hudChrome.mir4.codex.lessonTitle'))}</b><span>${esc(t('hudChrome.mir4.codex.lessonBody'))}</span></div><strong>${esc(t('hudChrome.mir4.codex.summary', { completed: integer(view.completed), total: integer(view.total) }))}</strong></section><div class="mir4-codex-filters" role="group" aria-label="${esc(t('hudChrome.mir4.codex.title'))}">${FILTERS.map((filter) => `<button type="button" data-filter="${filter}" data-focus-key="filter:${filter}" aria-pressed="${filter === this.filter}" class="${filter === this.filter ? 'sel' : ''}">${esc(t(FILTER_KEYS[filter]))}</button>`).join('')}</div><div class="mir4-codex-list"></div>`,
    );
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter as Mir4CodexFilter;
        if (!FILTERS.includes(filter)) return;
        this.filter = filter;
        this.render(`filter:${filter}`);
        audio.click();
      });
    }
    const list = root.querySelector<HTMLElement>('.mir4-codex-list');
    if (!list) return;
    if (collections.length === 0) {
      list.innerHTML = `<div class="empty-state">${esc(t('hudChrome.mir4.codex.noResults'))}</div>`;
    } else {
      for (const collection of collections) list.appendChild(this.collectionCard(collection));
    }
    this.restoreFocus(restoreKey);
  }

  private collectionCard(collection: Mir4CodexCollectionView): HTMLElement {
    const card = this.deps.root().ownerDocument.createElement('article');
    card.className = `mir4-codex-card${collection.completed ? ' complete' : ''}${collection.unlocked ? '' : ' locked'}`;
    const statusKey: TranslationKey = collection.completed
      ? 'hudChrome.mir4.codex.completed'
      : collection.unlocked
        ? 'hudChrome.mir4.codex.inProgress'
        : 'hudChrome.mir4.codex.requiresLevel';
    const statusValues = collection.unlocked
      ? undefined
      : { level: integer(collection.requiredLevel) };
    card.innerHTML = `<header><div><span class="mir4-codex-mode">${esc(t(collection.registration === 'manual' ? 'hudChrome.mir4.codex.manual' : 'hudChrome.mir4.codex.automatic'))}</span><h3>${esc(t(collection.titleKey as TranslationKey))}</h3><p>${esc(t(collection.descriptionKey as TranslationKey))}</p></div><div class="mir4-codex-progress"><b>${esc(integer(collection.current))}/${esc(integer(collection.required))}</b><span>${esc(t(statusKey, statusValues))}</span></div></header><div class="mir4-codex-bonuses">${bonusHtml(collection)}</div><div class="mir4-codex-requirements"></div>${collection.registration === 'manual' && !collection.completed ? `<footer><button type="button" class="mir4-spirit-primary" data-register-all data-focus-key="all:${collection.id}" ${collection.canRegisterAll ? '' : 'disabled'}>${esc(t('hudChrome.mir4.codex.registerAll'))}</button></footer>` : ''}`;
    const requirements = card.querySelector<HTMLElement>('.mir4-codex-requirements');
    for (const requirement of collection.requirements) {
      const row = card.ownerDocument.createElement('div');
      row.className = `mir4-codex-requirement${requirement.complete ? ' complete' : ''}`;
      row.innerHTML = `<span>${requirement.complete ? svgIcon('check') : svgIcon('book')}</span><span><b>${esc(requirementName(requirement))}</b><small>${esc(t('hudChrome.mir4.codex.requirementProgress', { current: integer(requirement.current), required: integer(requirement.required), owned: integer(requirement.owned) }))}</small></span>${requirement.kind === 'material' && !requirement.complete ? `<button type="button" data-register-one data-requirement="${esc(requirement.id)}" data-focus-key="one:${collection.id}:${requirement.id}" ${requirement.canRegister ? '' : 'disabled'}>${esc(t('hudChrome.mir4.codex.registerOne'))}</button>` : ''}`;
      requirements?.appendChild(row);
    }
    card.querySelector<HTMLButtonElement>('[data-register-all]')?.addEventListener('click', () => {
      this.confirmRegistration(collection, null);
    });
    for (const button of card.querySelectorAll<HTMLButtonElement>('[data-register-one]')) {
      button.addEventListener('click', () => {
        const requirement = collection.requirements.find(
          (entry) => entry.kind === 'material' && entry.id === button.dataset.requirement,
        );
        if (requirement?.kind === 'material') this.confirmRegistration(collection, requirement);
      });
    }
    return card;
  }

  private confirmRegistration(
    collection: Mir4CodexCollectionView,
    requirement: Extract<Mir4CodexRequirementView, { kind: 'material' }> | null,
  ): void {
    const amount = requirement ? 1 : collection.required - collection.current;
    this.deps.confirm(
      t('hudChrome.mir4.codex.confirmTitle'),
      t('hudChrome.mir4.codex.confirmBody', { count: integer(amount) }),
      () => {
        if (requirement) {
          this.deps
            .world()
            .mir4RegisterCodex(collection.id, requirement.id, 1, requirement.current);
        } else {
          this.deps.world().mir4RegisterAllCodex(collection.id);
        }
        audio.click();
        this.render(
          requirement ? `one:${collection.id}:${requirement.id}` : `all:${collection.id}`,
        );
      },
    );
  }

  private dataSignature(): string {
    const state = this.deps.world().mir4PlayerState();
    return JSON.stringify({
      classId: state?.classId,
      playerLevel: state?.playerLevel,
      codex: state?.mir4Codex,
      materials: state?.mir4Materials,
      equipment: state?.mir4Equipment,
      equipmentInstances: state?.mir4EquipmentInstances,
      rewardItems: state?.mir4ArcRewards?.items,
      mounts: state?.mir4Mounts?.discovered,
      spirits: state?.mir4Spirits?.discovered,
    });
  }

  private restoreFocus(key?: string): void {
    const root = this.deps.root();
    if (key) {
      const exact = [...root.querySelectorAll<HTMLElement>('[data-focus-key]')].find(
        (candidate) => candidate.dataset.focusKey === key,
      );
      if (exact && !exact.matches(':disabled')) {
        exact.focus();
        return;
      }
    }
    restoreFirstEnabled([
      root.querySelector<HTMLElement>('[data-focus-key]:not(:disabled)'),
      root.querySelector<HTMLElement>('[data-close]'),
    ]);
  }
}
