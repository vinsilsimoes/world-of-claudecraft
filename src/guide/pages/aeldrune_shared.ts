import { esc } from '../../ui/esc';
import { type TranslationKey, t } from '../../ui/i18n';

export const aeldruneKey = (suffix: string) => `guide.aeldrune.${suffix}` as TranslationKey;

export const aeldruneText = (suffix: string, values?: Parameters<typeof t>[1]) =>
  t(aeldruneKey(suffix), values);

export function pageHeader(section: string): string {
  return `<h1>${esc(aeldruneText(`${section}.title`))}</h1><p class="guide-lead">${esc(aeldruneText(`${section}.lead`))}</p>`;
}

export function contentBlock(title: string, body: string): string {
  return `<section class="guide-block"><h2>${esc(title)}</h2>${body}</section>`;
}

export function translatedBlock(section: string, stem: string): string {
  return contentBlock(
    aeldruneText(`${section}.${stem}`),
    `<p>${esc(aeldruneText(`${section}.${stem}Body`))}</p>`,
  );
}

export function contentCard(title: string, body: string, extra = '', id?: string): string {
  return `<article class="guide-card"${id ? ` id="${esc(id)}"` : ''}><h3>${esc(title)}</h3><p>${esc(body)}</p>${extra}</article>`;
}

export function cardGrid(items: string[]): string {
  return `<div class="guide-card-grid">${items.join('')}</div>`;
}

export function guideArticle(inner: string): string {
  return `<article class="guide-article">${inner}</article>`;
}

export function humanizeCatalogToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
