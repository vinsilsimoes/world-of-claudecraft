import { describe, expect, it } from 'vitest';
import { BIOME_PAINT_COLOR } from '../src/editor/canvas';
import { BIOME_OPTIONS } from '../src/editor/inspector';
import { BIOME_BY_ID } from '../src/sim/world';

describe('editor biome palette', () => {
  it('can display and select every biome id accepted by runtime paint', () => {
    expect(BIOME_PAINT_COLOR).toHaveLength(BIOME_BY_ID.length);
    expect(BIOME_OPTIONS.map((option) => option.id)).toEqual([
      ...BIOME_BY_ID.map((_biome, id) => id),
      255,
    ]);
    expect(BIOME_OPTIONS.every((option) => option.swatch.length > 0)).toBe(true);
  });
});
