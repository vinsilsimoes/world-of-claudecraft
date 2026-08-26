// One Training system window with Constitution and Inner Force tabs. The two
// progression tracks keep independent commands/state while sharing the menu
// destination the player approved.

import { audio } from '../game/audio';
import { mir4StatusDefinition } from '../sim/content/mir4/statuses';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { zoneDisplayName } from './entity_i18n';
import { esc } from './esc';
import { captureFocusKey, restoreFirstEnabled } from './focus_restore';
import { formatList, formatNumber, type TranslationKey, t } from './i18n';
import {
  buildMir4ConstitutionView,
  buildMir4InnerForceView,
  buildMir4SolitudeView,
  type Mir4GrowthBranchView,
  type Mir4GrowthSystem,
  type Mir4GrowthSystemView,
} from './mir4_growth_view';
import { mir4MaterialName } from './mir4_material_i18n';
import { svgIcon } from './ui_icons';

export interface Mir4GrowthWindowDeps {
  root(): HTMLElement;
  world(): IWorld;
  closeOthers(): void;
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
}

const integer = (value: number): string => formatNumber(value, { maximumFractionDigits: 0 });
const percent = (basisPoints: number): string =>
  formatNumber(basisPoints / 10_000, { style: 'percent', maximumFractionDigits: 2 });
const GROWTH_SYSTEMS = ['constitution', 'innerForce', 'solitude'] as const;

export class Mir4GrowthWindow {
  private openerFocus: HTMLElement | null = null;
  private lastDataSignature = '';
  private system: Mir4GrowthSystem = 'constitution';

  constructor(private readonly deps: Mir4GrowthWindowDeps) {}

  get isOpen(): boolean {
    return this.deps.root().style.display === 'flex';
  }

  open(system: Mir4GrowthSystem = this.system): void {
    if (!this.isOpen) {
      this.deps.closeOthers();
      this.openerFocus = this.deps.captureFocus();
    }
    this.system = system;
    this.deps.root().style.display = 'flex';
    this.render();
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

  private trackTitleKey(): TranslationKey {
    if (this.system === 'constitution') return 'hudChrome.mir4.constitution.title';
    if (this.system === 'innerForce') return 'hudChrome.mir4.innerForce.title';
    return 'hudChrome.mir4.solitude.title';
  }

  private trackDescriptionKey(): TranslationKey {
    if (this.system === 'constitution') return 'hudChrome.mir4.constitution.description';
    if (this.system === 'innerForce') return 'hudChrome.mir4.innerForce.description';
    return 'hudChrome.mir4.solitude.description';
  }

  private buildView(): Mir4GrowthSystemView | null {
    const state = this.deps.world().mir4PlayerState();
    if (!state) return null;
    if (this.system === 'constitution') return buildMir4ConstitutionView(state);
    if (this.system === 'innerForce') return buildMir4InnerForceView(state);
    return buildMir4SolitudeView(state);
  }

  private render(preferredFocusKey?: string): void {
    const root = this.deps.root();
    const restoreKey = preferredFocusKey ?? captureFocusKey(root) ?? undefined;
    const world = this.deps.world();
    if (world.cfg?.gameProfile !== MIR4_GAME_PROFILE) {
      root.style.display = 'none';
      return;
    }
    const titleId = `${root.id}-title`;
    // This window renders one live panel whose content changes with the active
    // system. Keep a stable controlled element so every tab's aria-controls
    // reference remains valid, including the two inactive tabs.
    const panelId = `${root.id}-panel`;
    markDialogRoot(root, { labelledBy: titleId });
    const view = this.buildView();
    this.lastDataSignature = this.dataSignature();
    const tabs = GROWTH_SYSTEMS.map((system) => {
      const labelKey: TranslationKey = `hudChrome.mir4.${system}.title`;
      return `<button type="button" id="${esc(`${root.id}-tab-${system}`)}" role="tab" data-growth-tab="${system}" data-focus-key="tab:${system}" aria-controls="${esc(panelId)}" aria-selected="${this.system === system}" tabindex="${this.system === system ? '0' : '-1'}">${esc(t(labelKey))}</button>`;
    }).join('');
    root.innerHTML = `<div class="panel-title"><span id="${esc(titleId)}">${esc(t('hudChrome.mir4.training.title'))}</span><button type="button" class="x-btn" data-close data-focus-key="close" aria-label="${esc(t('hud.options.returnToGame'))}">${svgIcon('close')}</button></div><div class="mir4-growth-tabs" role="tablist" aria-label="${esc(t('hudChrome.mir4.training.tabsAria'))}">${tabs}</div>`;
    root.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    root.querySelectorAll<HTMLButtonElement>('[data-growth-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const track = tab.dataset.growthTab;
        if (track !== 'constitution' && track !== 'innerForce' && track !== 'solitude') return;
        this.system = track;
        audio.click();
        this.render(`tab:${track}`);
      });
      tab.addEventListener('keydown', (event) => {
        const current = tab.dataset.growthTab as Mir4GrowthSystem | undefined;
        const currentIndex = current ? GROWTH_SYSTEMS.indexOf(current) : -1;
        if (currentIndex < 0) return;
        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % GROWTH_SYSTEMS.length;
        else if (event.key === 'ArrowLeft') {
          nextIndex = (currentIndex + GROWTH_SYSTEMS.length - 1) % GROWTH_SYSTEMS.length;
        } else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = GROWTH_SYSTEMS.length - 1;
        else return;
        event.preventDefault();
        const track = GROWTH_SYSTEMS[nextIndex];
        this.system = track;
        audio.click();
        this.render(`tab:${track}`);
      });
    });
    if (!view) {
      root.insertAdjacentHTML(
        'beforeend',
        `<div id="${esc(panelId)}" role="tabpanel" aria-labelledby="${esc(`${root.id}-tab-${this.system}`)}" class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`,
      );
      this.restoreFocus(restoreKey);
      return;
    }
    root.insertAdjacentHTML(
      'beforeend',
      `<div id="${esc(panelId)}" role="tabpanel" aria-labelledby="${esc(`${root.id}-tab-${this.system}`)}"><section class="mir4-growth-summary"><span class="mir4-growth-emblem">${svgIcon(this.system === 'constitution' ? 'character' : 'book')}</span><div><h3>${esc(view.manualName ?? t(this.trackTitleKey()))}</h3><p>${esc(t(this.trackDescriptionKey()))}</p></div><div class="mir4-growth-balance"><small>${esc(t(this.system === 'solitude' ? 'hudChrome.mir4.growth.darksteel' : 'hudChrome.mir4.growth.energy'))}</small><b>${esc(integer(this.system === 'solitude' ? view.darksteel : view.energy))}</b><span>${esc(t('hudChrome.mir4.growth.tier', { tier: integer(view.tier) }))}</span></div></section><div class="mir4-growth-grid"></div></div>`,
    );
    const grid = root.querySelector<HTMLElement>('.mir4-growth-grid');
    for (const branch of view.branches) grid?.appendChild(this.branchCard(branch));
    this.restoreFocus(restoreKey);
  }

  private branchCard(branch: Mir4GrowthBranchView): HTMLElement {
    const card = this.deps.root().ownerDocument.createElement('article');
    card.className = `mir4-growth-card${branch.nextLevel === null ? ' maxed' : ''}`;
    const bonuses = branch.bonuses
      .map((bonus) => {
        const name = mir4StatusDefinition(bonus.statusId)?.name ?? `Status ${bonus.statusId}`;
        const value =
          branch.nextLevel === null
            ? `+${integer(bonus.current)}`
            : `+${integer(bonus.current)} to +${integer(bonus.next)}`;
        return `<span><small>${esc(name)}</small><b>${esc(value)}</b></span>`;
      })
      .join('');
    const branchName =
      this.system === 'solitude'
        ? (mir4StatusDefinition(branch.bonuses[0]?.statusId ?? 0)?.name ?? branch.name)
        : branch.name;
    const sourceKey = (source: string): TranslationKey =>
      source === 'herbalism'
        ? 'hudChrome.mir4.growth.sourceHerbalism'
        : source === 'hunting'
          ? 'hudChrome.mir4.growth.sourceHunting'
          : 'hudChrome.mir4.growth.sourceCrafting';
    const materials = branch.materials
      .map((material) => {
        const locations = material.zoneIds.map(zoneDisplayName);
        const source =
          locations.length > 0
            ? `${t(sourceKey(material.source))}: ${formatList(locations)}`
            : t(sourceKey(material.source));
        return `<span class="mir4-growth-material rarity-${esc(material.rarity)}${material.enough ? '' : ' missing'}"><span><b>${esc(mir4MaterialName(material.key))}</b><small>${esc(source)}</small></span><strong>${esc(t('hudChrome.mir4.growth.materialProgress', { owned: integer(material.owned), required: integer(material.required) }))}</strong></span>`;
      })
      .join('');
    const actionLabel = branch.locked
      ? t('hudChrome.mir4.growth.unlockLevel', { level: integer(branch.unlockLevel ?? 0) })
      : branch.nextLevel === null
        ? t('hudChrome.mir4.growth.promotionRequired')
        : t('hudChrome.mir4.growth.enhance');
    const odds =
      this.system === 'solitude' && branch.nextLevel !== null
        ? `<div class="mir4-growth-odds"><span>${esc(t('hudChrome.mir4.growth.successChance', { chance: percent(branch.successBps ?? 0) }))}</span><span>${esc(t('hudChrome.mir4.growth.criticalFailChance', { chance: percent(branch.criticalFailBps ?? 0) }))}</span></div>`
        : '';
    const costKey: TranslationKey =
      this.system === 'solitude'
        ? 'hudChrome.mir4.growth.darksteelCost'
        : 'hudChrome.mir4.growth.energyCost';
    card.innerHTML = `<header><span>${esc(integer(branch.id))}</span><div><h3>${esc(branchName)}</h3><small>${esc(t('hudChrome.mir4.growth.level', { level: integer(branch.level), maximum: integer(this.system === 'solitude' ? 10 : 5) }))}</small></div></header><div class="mir4-growth-bonuses">${bonuses}</div>${odds}${branch.nextLevel === null ? '' : `<div class="mir4-growth-requirements"><h4>${esc(t('hudChrome.mir4.growth.requirements'))}</h4>${materials}</div>`}<button type="button" class="mir4-spirit-primary" data-growth-branch="${esc(String(branch.id))}" data-focus-key="branch:${esc(String(branch.id))}" ${branch.canUpgrade ? '' : 'disabled'}>${esc(actionLabel)}${branch.nextLevel === null || branch.locked ? '' : ` · ${esc(t(costKey, { cost: integer(branch.cost) }))}`}</button>`;
    card.querySelector<HTMLButtonElement>('[data-growth-branch]')?.addEventListener('click', () => {
      if (!branch.canUpgrade) return;
      if (this.system === 'constitution') {
        this.deps.world().mir4TrainConstitution(branch.id, branch.level);
      } else if (this.system === 'innerForce') {
        this.deps.world().mir4TrainInnerForce(branch.id, branch.level);
      } else {
        this.deps.world().mir4TrainSolitude(branch.id, branch.level);
      }
      audio.click();
      this.render(`branch:${branch.id}`);
    });
    return card;
  }

  private dataSignature(): string {
    const state = this.deps.world().mir4PlayerState();
    return JSON.stringify([
      this.system,
      state?.classId,
      state?.playerLevel,
      state?.mir4Currencies?.energy,
      state?.mir4Currencies?.darksteel,
      state?.mir4Materials,
      state?.mir4Training,
    ]);
  }

  private restoreFocus(key?: string): void {
    if (!this.isOpen) return;
    const root = this.deps.root();
    restoreFirstEnabled([
      key ? root.querySelector<HTMLElement>(`[data-focus-key="${key}"]`) : null,
      root.querySelector<HTMLElement>('[data-growth-branch]:not(:disabled)'),
      root.querySelector<HTMLElement>('[data-growth-tab][aria-selected="true"]'),
      root.querySelector<HTMLElement>('[data-close]'),
    ]);
  }
}
