import { esc } from '../ui/esc';
import { getLanguage, languageTag, t } from '../ui/i18n';
import { AELDRUNE_CLASSES, AELDRUNE_MAPS, AELDRUNE_QUESTS } from './aeldrune_data';
import { GUIDE_ROUTES, hrefFor } from './routes';

export interface SearchEntry {
  label: string;
  type: string;
  href: string;
  haystack: string;
}

const MAX_RESULTS = 10;
const fold = (value: string): string => value.toLocaleLowerCase(languageTag(getLanguage()));

export function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const add = (label: string, type: string, href: string, extra = '') => {
    if (label) entries.push({ label, type, href, haystack: fold(`${label} ${extra}`) });
  };
  for (const route of GUIDE_ROUTES) {
    if (route.id !== 'home') add(t(route.navKey), t('guide.search.typePage'), hrefFor(route.sub));
  }
  for (const entry of AELDRUNE_CLASSES) {
    add(entry.name, t('guide.search.typeClass'), hrefFor('classes'), entry.key);
    for (const skill of entry.skills) {
      add(skill.displayName, t('guide.search.typeAbility'), hrefFor('classes'), entry.name);
    }
  }
  for (const map of AELDRUNE_MAPS) {
    add(
      map.name,
      t('guide.search.typeZone'),
      `${hrefFor('world')}#map-${map.mapId}`,
      map.environment,
    );
  }
  for (const quest of AELDRUNE_QUESTS) {
    add(
      quest.title,
      t('guide.search.typePage'),
      `${hrefFor('quests')}#quest-${quest.questId}`,
      `${quest.questId} ${quest.purpose ?? ''}`,
    );
  }
  return entries;
}

function scoreEntry(entry: SearchEntry, tokens: string[]): number {
  const label = fold(entry.label);
  let score = 0;
  for (const token of tokens) {
    if (!entry.haystack.includes(token)) return -1;
    if (label.startsWith(token)) score += 3;
    else if (label.includes(` ${token}`)) score += 2;
    else if (label.includes(token)) score += 1;
  }
  return score;
}

export function rank(index: SearchEntry[], query: string): SearchEntry[] {
  const normalized = fold(query.trim());
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const hits = index
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((hit) => hit.score >= 0);
  const tag = languageTag(getLanguage());
  hits.sort(
    (left, right) =>
      right.score - left.score || left.entry.label.localeCompare(right.entry.label, tag),
  );
  return hits.slice(0, MAX_RESULTS).map((hit) => hit.entry);
}

function highlightLabel(label: string, query: string): string {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!tokens.length) return esc(label);
  const expression = new RegExp(`(${tokens.join('|')})`, 'gi');
  return label
    .split(expression)
    .map((part, index) => (index % 2 === 1 ? `<mark>${esc(part)}</mark>` : esc(part)))
    .join('');
}

export function groupByType(results: SearchEntry[]): [string, SearchEntry[]][] {
  const groups = new Map<string, SearchEntry[]>();
  for (const result of results) {
    const group = groups.get(result.type);
    if (group) group.push(result);
    else groups.set(result.type, [result]);
  }
  return [...groups.entries()];
}

export function mountSearch(root: HTMLElement, signal: AbortSignal): void {
  const input = root.querySelector<HTMLInputElement>('#guide-search-input');
  const panel = root.querySelector<HTMLElement>('#guide-search-results');
  if (!input || !panel) return;
  const index = buildIndex();
  let options: HTMLAnchorElement[] = [];
  let active = -1;
  const close = () => {
    panel.hidden = true;
    panel.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    options = [];
    active = -1;
  };
  const setActive = (next: number) => {
    if (!options.length) return;
    active = (next + options.length) % options.length;
    options.forEach((option, indexValue) => {
      option.setAttribute('aria-selected', String(indexValue === active));
      option.classList.toggle('is-active', indexValue === active);
    });
    input.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({ block: 'nearest' });
  };
  const render = () => {
    input.removeAttribute('aria-activedescendant');
    options = [];
    active = -1;
    const results = rank(index, input.value);
    if (!results.length) {
      if (input.value.trim()) {
        panel.hidden = false;
        panel.innerHTML = `<p class="guide-search-empty">${esc(t('guide.search.noResults'))}</p>`;
        input.setAttribute('aria-expanded', 'true');
      } else close();
      return;
    }
    let optionId = 0;
    panel.innerHTML = groupByType(results)
      .map(
        ([type, group]) =>
          `<div class="guide-search-group" role="group" aria-label="${esc(type)}"><div class="guide-search-group-h" aria-hidden="true">${esc(type)}</div>${group
            .map(
              (result) =>
                `<a class="guide-search-opt" role="option" id="gso-${optionId++}" href="${esc(result.href)}" aria-selected="false" tabindex="-1"><span class="guide-search-opt-label">${highlightLabel(result.label, input.value)}</span><span class="guide-sr-only">, ${esc(result.type)}</span></a>`,
            )
            .join('')}</div>`,
      )
      .join('');
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    options = [...panel.querySelectorAll<HTMLAnchorElement>('.guide-search-opt')];
  };
  input.addEventListener('input', render, { signal });
  input.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive(active + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(active - 1);
      } else if (event.key === 'Enter' && active >= 0) {
        event.preventDefault();
        options[active]?.click();
      } else if (event.key === 'Escape') {
        input.value = '';
        close();
      }
    },
    { signal },
  );
  panel.addEventListener(
    'click',
    () => {
      input.value = '';
      close();
    },
    { signal },
  );
  document.addEventListener(
    'click',
    (event) => {
      if (!root.querySelector('.guide-search')?.contains(event.target as Node)) close();
    },
    { signal },
  );
}
