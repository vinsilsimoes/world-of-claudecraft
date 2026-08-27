import { getLanguage, languageTag, supportedLanguages, type TranslationKey, t } from '../ui/i18n';
import { type GuideRoute, hrefFor } from './routes';

interface RouteHeadInput {
  route: GuideRoute | null;
  sub: string;
  title: string;
  detailId: string | null;
}

function currentOrigin(): string {
  return window.location.origin;
}

function guideUrl(sub: string): string {
  return `${currentOrigin()}${hrefFor(sub)}`;
}

function setMeta(selector: string, attribute: string, value: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
    if (match) meta.setAttribute(match[1], match[2]);
    document.head.appendChild(meta);
  }
  meta.setAttribute(attribute, value);
}

function setCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

function applyAlternates(sub: string): void {
  for (const stale of document.head.querySelectorAll('link[rel="alternate"][hreflang]'))
    stale.remove();
  const base = guideUrl(sub);
  for (const language of supportedLanguages) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = languageTag(language);
    link.href = language === 'en' ? base : `${base}?lang=${language}`;
    document.head.appendChild(link);
  }
  const fallback = document.createElement('link');
  fallback.rel = 'alternate';
  fallback.hreflang = 'x-default';
  fallback.href = base;
  document.head.appendChild(fallback);
}

function setStructuredData(
  route: GuideRoute | null,
  url: string,
  title: string,
  description: string,
): void {
  let script = document.getElementById('guide-structured-data') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'guide-structured-data';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      name: t('guide.brand'),
      url: guideUrl(''),
      inLanguage: languageTag(getLanguage()),
    },
  ];
  graph.push({
    '@type': 'WebPage',
    '@id': url,
    name: title,
    url,
    description,
    inLanguage: languageTag(getLanguage()),
    isPartOf: { '@type': 'WebSite', name: t('guide.brand'), url: guideUrl('') },
  });
  if (route && route.id !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: t('guide.brand'),
          item: guideUrl(''),
        },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ],
    });
  }
  if (route?.id === 'faq') {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: Array.from({ length: 6 }, (_, index) => {
        const number = index + 1;
        return {
          '@type': 'Question',
          name: t(`guide.aeldrune.faq.q${number}` as TranslationKey),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t(`guide.aeldrune.faq.a${number}` as TranslationKey),
          },
        };
      }),
    });
  }
  if (route?.id === 'home') {
    graph.push({
      '@type': 'VideoGame',
      name: t('guide.brand'),
      url: `${currentOrigin()}/play`,
      image: `${currentOrigin()}/aeldrune-logo.png`,
      description,
      inLanguage: languageTag(getLanguage()),
    });
  }
  script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

export function applyRouteHead(input: RouteHeadInput): void {
  const canonicalSub = input.route?.sub ?? input.sub;
  const url = guideUrl(canonicalSub);
  const description = input.route?.descKey ? t(input.route.descKey) : t('guide.tagline');
  document.title = input.title;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:title"]', 'content', input.title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[name="twitter:title"]', 'content', input.title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setCanonical(url);
  applyAlternates(canonicalSub);
  setStructuredData(input.route, url, input.title, description);
}
