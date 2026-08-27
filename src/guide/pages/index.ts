// Page registry. Maps a route id to its GuidePage. Routes without a registered page
// render the placeholder (with the route's nav label as the heading) until their phase
// fills them in; unmatched paths render notFound.

import { esc } from '../../ui/esc';
import { t } from '../../ui/i18n';
import { classes } from './aeldrune_classes';
import { combat } from './aeldrune_combat';
import { companions } from './aeldrune_companions';
import { controls } from './aeldrune_controls';
import { dungeons } from './aeldrune_dungeons';
import { faq } from './aeldrune_faq';
import { gear } from './aeldrune_gear';
import { home } from './aeldrune_home';
import { howToPlay } from './aeldrune_how_to_play';
import { quests } from './aeldrune_quests';
import { systems } from './aeldrune_systems';
import { world } from './aeldrune_world';
import type { GuidePage, PageContext } from './types';

export type { GuidePage, PageContext } from './types';

const PAGES: Record<string, GuidePage> = {
  home,
  'how-to-play': howToPlay,
  classes,
  world,
  gear,
  quests,
  systems,
  companions,
  dungeons,
  combat,
  controls,
  faq,
};

export function pageFor(id: string): GuidePage | null {
  return PAGES[id] ?? null;
}

export function placeholderHtml(ctx: PageContext): string {
  return `<article class="guide-article guide-placeholder">
    <h1>${esc(t(ctx.titleKey))}</h1>
    <p class="guide-lead">${esc(t('guide.placeholder.note'))}</p>
  </article>`;
}

export function notFoundHtml(): string {
  return `<article class="guide-article guide-notfound">
    <h1>${esc(t('guide.notFound.title'))}</h1>
    <p class="guide-lead">${esc(t('guide.notFound.body'))}</p>
    <p><a class="guide-cta" href="/wiki">${esc(t('guide.notFound.home'))}</a></p>
  </article>`;
}
