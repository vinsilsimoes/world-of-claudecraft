import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AELDRUNE_PUBLIC_FACTS } from '../src/guide/aeldrune_data';
import { pageFor } from '../src/guide/pages';
import { GUIDE_ROUTES, matchRoute } from '../src/guide/routes';
import { buildIndex } from '../src/guide/search';
import { setLanguage } from '../src/ui/i18n';

const ACTIVE_ROUTE_IDS = [
  'home',
  'how-to-play',
  'classes',
  'world',
  'quests',
  'gear',
  'systems',
  'companions',
  'dungeons',
  'combat',
  'controls',
  'faq',
];

const FORBIDDEN_PUBLIC_TERMS = [
  'World of ClaudeCraft',
  'Claudemoon',
  'Discord',
  'Thornhollow',
  'Vale Cup',
  'Book of Deeds',
  'Reliquary',
];

describe('Aeldrune public site and wiki', () => {
  it('publishes only the Aeldrune route catalog', () => {
    expect(GUIDE_ROUTES.map((route) => route.id)).toEqual(ACTIVE_ROUTE_IDS);
    expect(matchRoute('/wiki/classes/not-a-real-class')).toBeNull();
  });

  it('derives public facts from the live Aeldrune catalogs', () => {
    expect(AELDRUNE_PUBLIC_FACTS.classCount).toBe(5);
    expect(AELDRUNE_PUBLIC_FACTS.mapCount).toBe(20);
    expect(AELDRUNE_PUBLIC_FACTS.questCount).toBe(230);
    expect(AELDRUNE_PUBLIC_FACTS.levelCap).toBe(200);
    expect(AELDRUNE_PUBLIC_FACTS.classNames).toEqual([
      'Guerreiro',
      'Elementalista',
      'Taoista',
      'Besteiro',
      'Lanceiro',
    ]);
  });

  it('renders no retired product or community copy on an active wiki page', () => {
    setLanguage('en');
    for (const route of GUIDE_ROUTES) {
      const html =
        pageFor(route.id)?.render({
          params: [],
          sub: route.sub,
          titleKey: route.navKey,
        }) ?? '';
      for (const term of FORBIDDEN_PUBLIC_TERMS) {
        expect(html, `${route.id} exposes ${term}`).not.toContain(term);
      }
    }
  });

  it('documents the exact equipment crafting chain and mining bands', () => {
    setLanguage('en');
    const html =
      pageFor('gear')?.render({ params: [], sub: 'gear', titleKey: 'guide.nav.gear' }) ?? '';
    expect(html).toContain('Character level does not grant equipment rarity.');
    expect(html).toContain('50 Common Metal + 100 Darksteel');
    expect(html).toContain('50 Mythic Metal + 10,000,000 Darksteel');
    expect(html).toContain(
      'Consumes the previous rarity item for the same class and equipment slot.',
    );
    expect(html).toContain('next rarity from ten metals of the previous rarity');
    expect(html).toContain('Maps 1-4');
    expect(html).toContain('Common Metal, Uncommon Metal');
    expect(html).toContain('Maps 17-20');
    expect(html).toContain('Epic Metal, Legendary Metal, Mythic Metal');
  });

  it('indexes Aeldrune classes, maps and quests without retired wiki entries', () => {
    setLanguage('en');
    const index = buildIndex();
    const labels = index.map((entry) => entry.label);
    expect(labels).toContain('Guerreiro');
    expect(labels).toContain('Vila do Vau');
    expect(labels).toContain('Primeiros Rastros');
    expect(labels).not.toContain('Paladin');
    expect(labels).not.toContain('Mirefen Marsh');
    const questPage =
      pageFor('quests')?.render({
        params: [],
        sub: 'quests',
        titleKey: 'guide.nav.quests',
      }) ?? '';
    for (const quest of index.filter((entry) => entry.href.includes('#quest-'))) {
      const anchor = quest.href.split('#')[1];
      expect(questPage, `${quest.label} points to missing ${anchor}`).toContain(`id="${anchor}"`);
    }
  });

  it('contains no live link to the retired repository or Discord invite', () => {
    const files = [
      'index.html',
      'play.html',
      'guide.html',
      'public/support.html',
      'public/data-deletion.html',
      'public/links.html',
      'public/press.html',
      'public/merch.html',
      'src/guide/chrome.ts',
      'src/guide/head.ts',
    ];
    const corpus = files
      .map((file) => readFileSync(join(__dirname, '..', file), 'utf8'))
      .join('\n');
    expect(corpus).not.toContain('github.com/levy-street/world-of-claudecraft');
    expect(corpus).not.toContain('discord.com/invite/worldofclaudecraft');
  });

  it('does not advertise unpublished marketing or support pages in the sitemap', () => {
    const sitemap = readFileSync(join(__dirname, '..', 'public/sitemap.xml'), 'utf8');
    for (const path of ['/links', '/merch', '/press', '/support']) {
      expect(sitemap, `sitemap still advertises ${path}`).not.toContain(
        `<loc>https://aeldrune.invalid${path}</loc>`,
      );
    }
  });

  it('keeps unavailable landing-page actions hidden while preserving their runtime anchors', () => {
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).toMatch(/id="nav-btn-news"[^>]*\bhidden\b/);
    expect(html).toMatch(/id="nav-btn-download"[^>]*\bhidden\b/);
    expect(html).toMatch(/class="donate-cta"[^>]*\bhidden\b/);
    expect(html).toMatch(/id="mobile-donate"[^>]*\bhidden\b/);
    expect(html).toMatch(/class="social-link donate"[^>]*\bhidden\b/);
  });

  it('keeps unpublished auxiliary pages honest and non-indexable', () => {
    const press = readFileSync(join(__dirname, '..', 'public/press.html'), 'utf8');
    const links = readFileSync(join(__dirname, '..', 'public/links.html'), 'utf8');
    const merch = readFileSync(join(__dirname, '..', 'public/merch.html'), 'utf8');
    expect(press).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(press).not.toContain('href="mailto:');
    expect(press).not.toContain('class="btn btn--hero" href="#"');
    expect(links).not.toContain(
      'content="The only official channels for Aeldrune. Play the game and follow us',
    );
    expect(links).toContain("Aeldrune's community channels have not launched yet.");
    expect(merch).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it('makes disabled placeholder links inert to keyboard and pointer input', () => {
    const index = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
    const guideChrome = readFileSync(join(__dirname, '..', 'src/guide/chrome.ts'), 'utf8');
    const baseCss = readFileSync(join(__dirname, '..', 'src/styles/base.css'), 'utf8');
    const guideCss = readFileSync(join(__dirname, '..', 'src/guide/styles.css'), 'utf8');
    expect(index).toMatch(/href="#" aria-disabled="true" tabindex="-1"/);
    expect(guideChrome).toMatch(/href="#" aria-disabled="true" tabindex="-1"/);
    const disabledPlaceholderSelector = /a\[href=["']#["']\]\[aria-disabled=["']true["']\]/;
    expect(baseCss).toMatch(disabledPlaceholderSelector);
    expect(guideCss).toMatch(disabledPlaceholderSelector);
  });
});
