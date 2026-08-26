// DOM adapter for the shared MIR4 result ceremony. It mounts one transient,
// bounded overlay above the playfield and replaces only the card between
// results, so CSS motion restarts without layout reads or camera movement.

import { audio } from '../game/audio';
import type { SimEvent } from '../sim/types';
import { esc } from './esc';
import { formatNumber, t } from './i18n';
import { mir4MountDisplayName, mir4SpiritDisplayName } from './mir4_collectible_i18n';
import { mir4QuestTitle } from './mir4_quest_i18n';
import { buildMir4ResultOverlayView, type Mir4ResultOverlayView } from './mir4_result_overlay_view';
import { svgIcon } from './ui_icons';

const RESULT_QUEUE_LIMIT = 5;
const RESULT_DURATION_MS = 3_200;
const GREAT_RESULT_DURATION_MS = 4_200;

export interface Mir4ResultOverlayControllerDeps {
  mountCollectionPreview?(
    container: HTMLElement,
    collection: 'spirit' | 'mount',
    collectionId: string,
  ): void;
  restoreCollectionPreview?(): void;
}

export class Mir4ResultOverlayController {
  private readonly root: HTMLElement;
  private readonly queue: Mir4ResultOverlayView[] = [];
  private live: Mir4ResultOverlayView | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private previewBorrowed = false;

  constructor(
    private readonly doc: Document = document,
    private readonly deps: Mir4ResultOverlayControllerDeps = {},
  ) {
    this.root = doc.createElement('section');
    this.root.id = 'mir4-result-overlay';
    this.root.className = 'mir4-result-overlay';
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-atomic', 'true');
    doc.body.appendChild(this.root);
  }

  handle(event: SimEvent): boolean {
    const view = buildMir4ResultOverlayView(event);
    if (!view) return false;
    if (this.live) {
      if (this.queue.length < RESULT_QUEUE_LIMIT) this.queue.push(view);
      return true;
    }
    this.show(view);
    return true;
  }

  skip(): void {
    if (!this.live) return;
    this.advance();
  }

  dispose(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = null;
    if (this.previewBorrowed) this.deps.restoreCollectionPreview?.();
    this.previewBorrowed = false;
    this.queue.length = 0;
    this.live = null;
    this.root.remove();
  }

  private show(view: Mir4ResultOverlayView): void {
    this.live = view;
    const card = this.doc.createElement('div');
    card.className = `mir4-result-card tone-${view.tone} kind-${view.kind}`;
    card.setAttribute(
      'role',
      view.tone === 'danger' || view.tone === 'failure' ? 'alert' : 'status',
    );
    const showModel =
      view.kind === 'collection' && view.collection === 'spirit' && Boolean(view.collectionId);
    card.innerHTML =
      `<div class="mir4-result-rays" aria-hidden="true"></div>` +
      (showModel ? `<div class="mir4-result-model" aria-hidden="true"></div>` : '') +
      `<div class="mir4-result-ring" aria-hidden="true"><span>${svgIcon(view.icon)}</span></div>` +
      `<div class="mir4-result-copy"><strong>${esc(t(view.titleKey))}</strong>` +
      `<span>${esc(this.detail(view))}</span></div>` +
      `<button type="button" class="mir4-result-skip">${esc(t('hudChrome.mir4.results.skip'))}</button>`;
    card.querySelector<HTMLButtonElement>('.mir4-result-skip')?.addEventListener('click', () => {
      audio.click();
      this.skip();
    });
    this.root.replaceChildren(card);
    const modelHost = card.querySelector<HTMLElement>('.mir4-result-model');
    if (modelHost && view.collection && view.collectionId && this.deps.mountCollectionPreview) {
      this.deps.mountCollectionPreview(modelHost, view.collection, view.collectionId);
      this.previewBorrowed = true;
    }
    this.root.classList.add('is-visible');
    this.playCue(view);
    const duration = view.tone === 'great' ? GREAT_RESULT_DURATION_MS : RESULT_DURATION_MS;
    this.hideTimer = setTimeout(() => this.advance(), duration);
  }

  private advance(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = null;
    if (this.previewBorrowed) {
      this.previewBorrowed = false;
      this.deps.restoreCollectionPreview?.();
    }
    this.live = null;
    const next = this.queue.shift();
    if (next) {
      this.show(next);
      return;
    }
    this.root.classList.remove('is-visible');
    this.root.replaceChildren();
  }

  private detail(view: Mir4ResultOverlayView): string {
    if (view.kind === 'enhancement') {
      return t(view.detailKey, {
        target: formatNumber(view.targetLevel ?? 0),
        level: formatNumber(view.level ?? 0),
        chance: formatNumber((view.chanceBps ?? 0) / 1_000, {
          maximumFractionDigits: 1,
        }),
      });
    }
    if (view.kind === 'collection' || view.kind === 'combination') {
      const name = view.collectionId
        ? view.collection === 'spirit'
          ? mir4SpiritDisplayName(view.collectionId)
          : mir4MountDisplayName(view.collectionId)
        : t(view.titleKey);
      const distribution = (view.gradeCounts ?? [])
        .map((count, index) =>
          count > 0
            ? t('hudChrome.mir4.results.gradeDistributionEntry', {
                grade: formatNumber(index + 1),
                count: formatNumber(count),
              })
            : '',
        )
        .filter(Boolean)
        .join(' · ');
      return t(view.detailKey, {
        count: formatNumber(view.batchCount ?? 1),
        grade: formatNumber(view.grade ?? 0),
        name,
        distribution,
        successes: formatNumber(view.successCount ?? 0),
        failures: formatNumber(view.failureCount ?? 0),
      });
    }
    if (view.kind === 'training') {
      return t(view.detailKey, {
        branch: formatNumber(view.branchId ?? 0),
        previous: formatNumber(view.previousLevel ?? 0),
        level: formatNumber(view.level ?? 0),
        chance: formatNumber((view.chanceBps ?? 0) / 10_000, {
          style: 'percent',
          maximumFractionDigits: 2,
        }),
      });
    }
    if (view.questId) return t(view.detailKey, { quest: mir4QuestTitle(view.questId) });
    return t(view.detailKey);
  }

  private playCue(view: Mir4ResultOverlayView): void {
    if (view.kind === 'mission') return;
    if (view.tone === 'danger' || view.tone === 'failure') {
      audio.error();
      return;
    }
    if (view.kind === 'enhancement') audio.enchant();
    else audio.achievement();
  }
}
