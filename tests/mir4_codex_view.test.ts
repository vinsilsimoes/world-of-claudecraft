import { describe, expect, it } from 'vitest';
import { mir4ItemProgressionRank } from '../src/sim/content/mir4/item_progression';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import { buildMir4CodexView, filterMir4CodexCollections } from '../src/ui/mir4_codex_view';

describe('MIR4 Codex view model', () => {
  it('shows the level 12 lesson gate and available manual registration', () => {
    const locked = buildMir4CodexView({ classId: 1, playerLevel: 11, ultimateGauge: 0 });
    expect(locked.unlocked).toBe(false);
    const open = buildMir4CodexView({
      classId: 1,
      playerLevel: 12,
      ultimateGauge: 0,
      mir4Materials: { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 },
    });
    expect(open.unlocked).toBe(true);
    const field = open.collections.find((collection) => collection.id === 'field-notes');
    expect(field?.canRegisterAll).toBe(true);
    expect(field?.requirements[0]).toMatchObject({ current: 0, required: 25, owned: 25 });
  });

  it('projects only the active class equipment into automatic sets', () => {
    const view = buildMir4CodexView({ classId: 2, playerLevel: 25, ultimateGauge: 0 });
    const armory = view.collections.find((collection) => collection.id === 'rank-two-armory');
    const expected = mir4ItemProgressionRank(2)?.itemsByClass[2].map((item) => item.itemId);
    expect(
      armory?.requirements.flatMap((requirement) =>
        requirement.kind === 'equipment' ? [requirement.itemId] : [],
      ),
    ).toEqual(expected);
    expect(
      armory?.requirements.every(
        (requirement) => requirement.kind !== 'equipment' || requirement.classId === 2,
      ),
    ).toBe(true);
  });

  it('filters all, manual, automatic, and completed collections deterministically', () => {
    const view = buildMir4CodexView({
      classId: 1,
      playerLevel: 25,
      ultimateGauge: 0,
      mir4Codex: {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 25 } },
      },
    });
    expect(filterMir4CodexCollections(view.collections, 'all')).toHaveLength(6);
    expect(filterMir4CodexCollections(view.collections, 'manual').map((entry) => entry.id)).toEqual(
      ['field-notes', 'artisan-records'],
    );
    expect(filterMir4CodexCollections(view.collections, 'automatic')).toHaveLength(4);
    expect(
      filterMir4CodexCollections(view.collections, 'completed').map((entry) => entry.id),
    ).toEqual(['field-notes']);
  });
});
