import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FOLIAGE_BUCKET_DEPTH,
  foliageSpatialBucket,
  LEAN_FOLIAGE_CELL_SIZE,
} from '../src/render/foliage_spatial_bucket_core';

describe('foliage spatial buckets', () => {
  it('preserves the full-detail two-column layout and 240-yard depth bands', () => {
    expect(FOLIAGE_BUCKET_DEPTH).toBe(240);
    expect(foliageSpatialBucket(-200, -300, -960, false)).toEqual({
      band: 2,
      col: 0,
      key: '2:0',
    });
    expect(foliageSpatialBucket(200, -300, -960, false)).toEqual({
      band: 2,
      col: 1,
      key: '2:1',
    });
  });

  it('splits lean foliage into stable 192-yard square cells', () => {
    expect(LEAN_FOLIAGE_CELL_SIZE).toBe(192);
    expect(foliageSpatialBucket(-200, -300, -960, true)).toEqual({
      band: 3,
      col: -2,
      key: '3:-2',
    });
    expect(foliageSpatialBucket(200, -300, -960, true)).toEqual({
      band: 3,
      col: 1,
      key: '3:1',
    });
  });

  it('keeps adjacent lean cells stable on both sides of zero', () => {
    expect(foliageSpatialBucket(-192.01, 0, -960, true).col).toBe(-2);
    expect(foliageSpatialBucket(-192, 0, -960, true).col).toBe(-1);
    expect(foliageSpatialBucket(-0.01, 0, -960, true).col).toBe(-1);
    expect(foliageSpatialBucket(0, 0, -960, true).col).toBe(0);
    expect(foliageSpatialBucket(191.99, 0, -960, true).col).toBe(0);
    expect(foliageSpatialBucket(192, 0, -960, true).col).toBe(1);
  });

  it('drives both tree and ground-dressing instance buckets in the renderer', () => {
    const source = readFileSync(new URL('../src/render/foliage.ts', import.meta.url), 'utf8');
    expect(source).toContain("from './foliage_spatial_bucket_core'");
    expect(source.match(/foliageSpatialBucket\(/g)).toHaveLength(2);
    expect(source).not.toContain('spot.x < 0 ? 0 : 1');
  });
});
