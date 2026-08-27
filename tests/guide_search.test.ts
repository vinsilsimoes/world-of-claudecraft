import { beforeAll, describe, expect, it } from 'vitest';
import { AELDRUNE_CLASSES, AELDRUNE_MAPS, AELDRUNE_QUESTS } from '../src/guide/aeldrune_data';
import { buildIndex, groupByType, rank, type SearchEntry } from '../src/guide/search';
import { setLanguage, t } from '../src/ui/i18n';

const entry = (label: string, type = 'T', href = '#'): SearchEntry => ({
  label,
  type,
  href,
  haystack: label.toLowerCase(),
});

describe('guide search ranking', () => {
  it('requires every token somewhere, in any order', () => {
    const index = [entry('Nythraxis Crypt'), entry('Sunken Bastion')];
    expect(rank(index, 'crypt nythraxis').map((hit) => hit.label)).toEqual(['Nythraxis Crypt']);
    expect(rank(index, 'nythraxis bastion')).toEqual([]);
  });

  it('scores label prefix over word prefix over plain substring', () => {
    const index = [entry('XXalphaXX'), entry('Beta Alpha'), entry('Alphabet Soup')];
    expect(rank(index, 'alpha').map((hit) => hit.label)).toEqual([
      'Alphabet Soup',
      'Beta Alpha',
      'XXalphaXX',
    ]);
  });

  it('caps the ranked list at ten results', () => {
    expect(
      rank(
        Array.from({ length: 30 }, (_, index) => entry(`Quest ${index}`)),
        'quest',
      ),
    ).toHaveLength(10);
  });

  it('groups results without changing their order', () => {
    const first = entry('First', 'Page');
    const second = entry('Second', 'Class');
    const third = entry('Third', 'Page');
    expect(groupByType([first, second, third])).toEqual([
      ['Page', [first, third]],
      ['Class', [second]],
    ]);
  });
});

describe('Aeldrune guide search index', () => {
  beforeAll(() => setLanguage('en'));

  it('indexes every current class and skill', () => {
    const index = buildIndex();
    for (const classDef of AELDRUNE_CLASSES) {
      expect(
        index.some(
          (entry) => entry.label === classDef.name && entry.type === t('guide.search.typeClass'),
        ),
      ).toBe(true);
      for (const skill of classDef.skills) {
        expect(
          index.some(
            (entry) =>
              entry.label === skill.displayName && entry.type === t('guide.search.typeAbility'),
          ),
        ).toBe(true);
      }
    }
  });

  it('indexes every campaign region and quest', () => {
    const index = buildIndex();
    for (const map of AELDRUNE_MAPS)
      expect(index.some((entry) => entry.label === map.name)).toBe(true);
    for (const quest of AELDRUNE_QUESTS)
      expect(index.some((entry) => entry.label === quest.title)).toBe(true);
  });

  it('does not expose retired classes or regions', () => {
    const labels = new Set(buildIndex().map((entry) => entry.label));
    for (const retired of ['Paladin', 'Hunter', 'Rogue', 'Mirefen Marsh', 'Thornpeak']) {
      expect(labels.has(retired)).toBe(false);
    }
  });
});
