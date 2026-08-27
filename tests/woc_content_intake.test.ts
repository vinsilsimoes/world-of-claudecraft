import { describe, expect, it } from 'vitest';
import {
  classifyWocContentChange,
  summarizeWocContentChanges,
} from '../scripts/lib/woc_content_intake.mjs';

describe('WoC upstream content intake classifier', () => {
  it.each([
    ['public/models/props/new_gate.glb', 'asset-candidate'],
    ['public/map_bg/new_zone.webp', 'asset-candidate'],
    ['public/ui/items/mother_of_pearl.webp', 'asset-candidate'],
    ['public/ui/skills/rogue/melting_acid.webp', 'asset-candidate'],
    ['src/sim/content/proving_shore.ts', 'world-adaptation'],
    ['src/render/eastbrook_harbor.ts', 'world-adaptation'],
    ['src/sim/content/dungeons.ts', 'dungeon-adaptation'],
    ['src/sim/dungeon_layout.ts', 'dungeon-adaptation'],
    ['src/render/dungeon.ts', 'dungeon-adaptation'],
    ['src/render/assets/loader.ts', 'engine-review'],
    ['src/sim/combat/damage.ts', 'gameplay-blocked'],
    ['src/sim/content/items.ts', 'gameplay-blocked'],
    ['README.md', 'unrelated'],
  ] as const)('classifies %s as %s', (path, category) => {
    expect(classifyWocContentChange({ status: 'M', path }).category).toBe(category);
  });

  it('escalates deletions and renames for manual review even when the path is an asset', () => {
    expect(
      classifyWocContentChange({ status: 'D', path: 'public/models/props/old_gate.glb' }),
    ).toMatchObject({ category: 'manual-review', previousCategory: 'asset-candidate' });
    expect(
      classifyWocContentChange({
        status: 'R100',
        path: 'public/models/props/new_gate.glb',
        oldPath: 'public/models/props/old_gate.glb',
      }),
    ).toMatchObject({ category: 'manual-review', previousCategory: 'asset-candidate' });
  });

  it('produces a stable review queue with blocked gameplay first', () => {
    const summary = summarizeWocContentChanges([
      { status: 'M', path: 'README.md' },
      { status: 'A', path: 'public/models/props/new_gate.glb' },
      { status: 'M', path: 'src/sim/content/dungeons.ts' },
      { status: 'M', path: 'src/sim/combat/damage.ts' },
    ]);

    expect(summary.total).toBe(4);
    expect(summary.counts).toEqual({
      'gameplay-blocked': 1,
      'manual-review': 0,
      'dungeon-adaptation': 1,
      'world-adaptation': 0,
      'engine-review': 0,
      'asset-candidate': 1,
      unrelated: 1,
    });
    expect(summary.reviewQueue.map((entry) => entry.category)).toEqual([
      'gameplay-blocked',
      'dungeon-adaptation',
      'asset-candidate',
    ]);
  });
});
