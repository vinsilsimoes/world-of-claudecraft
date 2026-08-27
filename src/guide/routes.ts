// Single source of truth for the Guide's routes and navigation. Pure data + pure
// helpers (no DOM), so the router, the nav chrome, and tests all derive from one list.
// The Guide is the site wiki: a client-rendered SPA mounted at GUIDE_BASE (/wiki);
// deep paths (/wiki/classes) fall back to guide.html in both vite.config.ts and
// server/main.ts. The shell file is still named guide.html and the module tree
// still lives under src/guide/; only the public URL is /wiki.

import type { TranslationKey } from '../ui/i18n';

export const GUIDE_BASE = '/wiki';

// Sidebar groupings, in display order. The single 'compendium' bucket held every
// subject page and reached seventeen entries once Rifts and Mounts landed, which is
// past the point a sidebar stays scannable. It is split by what a reader came for:
// where they are (world), who they are (character), what they run at the top
// (endgame), and how they fight other players (compete).
export type GuideGroup = 'start' | 'world' | 'character' | 'systems' | 'reference';
export const GUIDE_GROUP_ORDER: GuideGroup[] = [
  'start',
  'world',
  'character',
  'systems',
  'reference',
];

export interface GuideRoute {
  /** Stable id, also the page-registry key. */
  id: string;
  /** Path after GUIDE_BASE. '' is the home/overview landing. */
  sub: string;
  /** i18n key for the nav label and the page title. */
  navKey: TranslationKey;
  /** Sidebar group, or null for pages reached another way (home). */
  group: GuideGroup | null;
  /** Appears in the top navigation bar. */
  topbar?: boolean;
  /**
   * i18n key for the per-route <meta name="description"> (and og/twitter descriptions),
   * reusing the page's own lead/intro copy so each crawlable route is unique and
   * localized. Home falls back to guide.tagline; class detail pages build a description
   * from the class name + lore (see head.ts). Consumed only by head.ts; the pages
   * themselves render the same key as their visible lead.
   */
  descKey?: TranslationKey;
}

// Static top-level routes. Dynamic entries (per class, per creature family) are
// layered on later phases via resolveDynamic(); unknown paths render notFound.
export const GUIDE_ROUTES: GuideRoute[] = [
  {
    id: 'home',
    sub: '',
    navKey: 'guide.nav.overview',
    group: null,
    topbar: true,
    descKey: 'guide.tagline',
  },
  {
    id: 'how-to-play',
    sub: 'how-to-play',
    navKey: 'guide.nav.howToPlay',
    group: 'start',
    topbar: true,
    descKey: 'guide.howToPlay.intro',
  },
  {
    id: 'classes',
    sub: 'classes',
    navKey: 'guide.nav.classes',
    group: 'character',
    topbar: true,
    descKey: 'guide.aeldrune.classes.lead',
  },
  {
    id: 'world',
    sub: 'world',
    navKey: 'guide.nav.world',
    group: 'world',
    topbar: true,
    descKey: 'guide.aeldrune.world.lead',
  },
  {
    id: 'quests',
    sub: 'quests',
    navKey: 'guide.nav.quests',
    group: 'world',
    descKey: 'guide.aeldrune.quests.lead',
  },
  {
    id: 'gear',
    sub: 'gear',
    navKey: 'guide.nav.gear',
    group: 'character',
    descKey: 'guide.aeldrune.gear.lead',
  },
  {
    id: 'systems',
    sub: 'systems',
    navKey: 'guide.aeldrune.nav.systems',
    group: 'systems',
    descKey: 'guide.aeldrune.systems.lead',
  },
  {
    id: 'companions',
    sub: 'companions',
    navKey: 'guide.aeldrune.nav.companions',
    group: 'systems',
    descKey: 'guide.aeldrune.companions.lead',
  },
  {
    id: 'dungeons',
    sub: 'dungeons',
    navKey: 'guide.nav.dungeons',
    group: 'systems',
    descKey: 'guide.aeldrune.dungeons.lead',
  },
  {
    id: 'combat',
    sub: 'reference/combat',
    navKey: 'guide.nav.combat',
    group: 'reference',
    descKey: 'guide.aeldrune.combat.lead',
  },
  {
    id: 'controls',
    sub: 'reference/controls',
    navKey: 'guide.nav.controls',
    group: 'reference',
    descKey: 'guide.aeldrune.controls.lead',
  },
  {
    id: 'faq',
    sub: 'faq',
    navKey: 'guide.nav.faq',
    group: 'start',
    descKey: 'guide.aeldrune.faq.lead',
  },
];

export interface RouteMatch {
  route: GuideRoute;
  /** Reserved for future authored detail routes; current public routes are exact. */
  params: string[];
}

/** Normalize a browser pathname to the Guide sub-path ('' for the landing). */
export function toSub(pathname: string): string {
  // Drop any #hash or ?query so an in-page anchor (e.g. /guide/classes#kit) still
  // resolves to its route; the hash is handled separately for scroll/focus.
  let p = pathname.split('#')[0].split('?')[0];
  if (p.startsWith(GUIDE_BASE)) p = p.slice(GUIDE_BASE.length);
  // Strip leading and trailing slashes; collapse to a clean 'a/b' form.
  return p.replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Match a pathname to an authored public route. The current Aeldrune wiki has no
 * dynamic detail routes, so an unknown suffix must render notFound instead of being
 * silently canonicalized to its parent section.
 */
export function matchRoute(pathname: string): RouteMatch | null {
  const sub = toSub(pathname);
  if (sub === '') return { route: GUIDE_ROUTES[0], params: [] };

  // Exact match first.
  const exact = GUIDE_ROUTES.find((r) => r.sub === sub);
  if (exact) return { route: exact, params: [] };

  return null;
}

/** Top navigation bar entries, in order. */
export function topbarRoutes(): GuideRoute[] {
  return GUIDE_ROUTES.filter((r) => r.topbar && r.id !== 'home');
}

/** Sidebar entries grouped by section, preserving declaration order. */
export function groupedRoutes(): { group: GuideGroup; routes: GuideRoute[] }[] {
  return GUIDE_GROUP_ORDER.map((group) => ({
    group,
    routes: GUIDE_ROUTES.filter((r) => r.group === group),
  })).filter((g) => g.routes.length > 0);
}

/** Absolute href for a route sub-path. */
export function hrefFor(sub: string): string {
  return sub ? `${GUIDE_BASE}/${sub}` : GUIDE_BASE;
}
