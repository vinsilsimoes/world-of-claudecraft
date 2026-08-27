// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { pageFor } from '../src/guide/pages';
import { GUIDE_ROUTES } from '../src/guide/routes';
import { setLanguage } from '../src/ui/i18n';

// Every guide route, rendered the way the router renders it. tests/guide.test.ts proves a
// page MODULE is registered for each route; this proves the module actually produces a
// readable page. Its own file because two pages (bestiary, models) paint procedural icons
// through a canvas, so the whole sweep needs a DOM, which the node-environment guide suite
// does not have.
//
// Three failure shapes, all of which reach a reader as visible damage:
//  - an unresolved t() key, which renders as the literal id ("guide.riftsPage.intro")
//  - an uninterpolated {placeholder}, left when a caller renders a parameterized key
//    without passing its values
//  - a heading structure that is not exactly one h1 (the page's own title)
// A key typo, a missing values argument, or a new zone whose key stem has no catalog
// entry all land here. Walking the routes by hand is what the previous wiki refresh did,
// and hand-walking is what let a duplicate zone anchor ship.
describe('Guide route rendering', () => {
  it('renders every route with one h1, every key resolved, and no stray placeholder', () => {
    setLanguage('en');
    for (const r of GUIDE_ROUTES) {
      const page = pageFor(r.id);
      expect(page, `route "${r.id}" has no registered page module`).toBeTruthy();
      const html = page?.render({ params: [], sub: r.sub, titleKey: r.navKey }) ?? '';
      expect(html.length, `route "${r.id}" rendered nothing`).toBeGreaterThan(0);

      const h1s = html.match(/<h1[\s>]/g) ?? [];
      expect(h1s.length, `route "${r.id}" must render exactly one h1`).toBe(1);

      // Catalog ids are dotted ('guide.faqPage.intro'); the CSS hooks are hyphenated
      // ('guide-article'), so a dotted match is an unresolved key and nothing else.
      const rawKeys = html.match(/\bguide\.[a-zA-Z0-9_.]+/g) ?? [];
      expect(rawKeys, `route "${r.id}" leaked unresolved t() keys`).toEqual([]);

      // interpolate() leaves an unmatched {token} in place, so this catches a page that
      // renders a parameterized key without passing its values.
      const tokens = html.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) ?? [];
      expect(tokens, `route "${r.id}" left an uninterpolated placeholder`).toEqual([]);
    }
  });

  it('renders the five Aeldrune classes and no retired class roster', () => {
    setLanguage('en');
    const html =
      pageFor('classes')?.render({ params: [], sub: 'classes', titleKey: 'guide.nav.classes' }) ??
      '';
    for (const name of ['Guerreiro', 'Elementalista', 'Taoista', 'Besteiro', 'Lanceiro']) {
      expect(html).toContain(name);
    }
    for (const retired of ['Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Warlock', 'Druid']) {
      expect(html).not.toContain(retired);
    }
  });
});
