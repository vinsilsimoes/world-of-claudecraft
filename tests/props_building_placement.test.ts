// The shared building-placement transforms in props.ts: the chapel bell
// tower's world center is derived through ONE helper by the real composed
// chapel (its hideable footprint) and the far impostor collector, so the
// sprite can never stand offset from the model it hands off to (the #2793
// review's lateral-jump defect: an impostor centered at the raw building
// origin while the real tower stands at the rotated CHAPEL_TOWER.dz).

import { describe, expect, it } from 'vitest';
import { chapelTowerWorldCenter, propDecorScaleForSize } from '../src/render/props';
import { CHAPEL_TOWER } from '../src/sim/prop_layout';

describe('chapelTowerWorldCenter', () => {
  it('applies the rotated rear offset the real composed chapel applies', () => {
    // rot 0: the group-local +z offset stays on world +z
    const flat = chapelTowerWorldCenter({ x: 100, z: 50, rot: 0 });
    expect(flat.x).toBeCloseTo(100, 10);
    expect(flat.z).toBeCloseTo(50 + CHAPEL_TOWER.dz, 10);
  });

  it('rotates with the building yaw exactly like the group transform', () => {
    // a quarter turn maps local +z onto world +x under the rotLocal
    // convention the colliders and hideable footprints share
    const quarter = chapelTowerWorldCenter({ x: 0, z: 0, rot: Math.PI / 2 });
    expect(quarter.x).toBeCloseTo(CHAPEL_TOWER.dz, 10);
    expect(quarter.z).toBeCloseTo(0, 10);
    // and an arbitrary yaw keeps the offset length: the tower stays on the
    // dz circle around the building origin
    const any = chapelTowerWorldCenter({ x: 7, z: -3, rot: 2.31 });
    expect(Math.hypot(any.x - 7, any.z + 3)).toBeCloseTo(Math.abs(CHAPEL_TOWER.dz), 10);
  });

  it('is a REAL offset: ignoring it would misplace the sprite by the full dz', () => {
    // guards the regression class itself: a zero dz would make the helper
    // (and this suite) vacuous; the shipped 0.75u rear offset is what the
    // old raw-origin centering dropped at the handoff
    expect(Math.abs(CHAPEL_TOWER.dz)).toBeGreaterThan(0.5);
  });
});

describe('authored decor asset normalization', () => {
  it('restores Fenbridge native dimensions before applying authored scale', () => {
    expect(propDecorScaleForSize('fenbridgeMoonwortApothecary', { x: 1, y: 2, z: 3 }, 1.5)).toEqual(
      [10.5, 5.4, 3],
    );
  });

  it('restores marsh and tent targets without assuming GLB unit scale', () => {
    expect(propDecorScaleForSize('marshPlankBridge', { x: 0.5, y: 0.2, z: 0.8 }, 2)).toEqual([
      14, 14, 14,
    ]);
    expect(propDecorScaleForSize('tentSmall', { x: 1.5, y: 1, z: 2 }, 1)).toEqual([1.5, 1.5, 1.5]);
  });

  it('reuses the native village transforms for M03 authored settlement decor', () => {
    expect(propDecorScaleForSize('kmedTavern', { x: 1, y: 2, z: 4 })).toEqual([10, 4.25, 2.5]);
    expect(propDecorScaleForSize('kmedHomeA', { x: 1, y: 2, z: 3 })).toEqual([9, 4, 3]);
    expect(propDecorScaleForSize('kmedHomeB', { x: 1, y: 2, z: 4 })).toEqual([9, 4.4, 2]);
    expect(propDecorScaleForSize('kmedMarket', { x: 1, y: 2, z: 4 })).toEqual([9, 2.6, 2]);
    expect(propDecorScaleForSize('well', { x: 1, y: 2, z: 1 })).toEqual([2.6, 1.8, 2.9]);
    expect(propDecorScaleForSize('stand1', { x: 1, y: 2, z: 1 })).toEqual([3.1, 1.3, 2.5]);
    for (const scale of propDecorScaleForSize('bonfire', {
      x: 0.4,
      y: 0.1,
      z: 0.2,
    })) {
      expect(scale).toBeCloseTo(4.4, 10);
    }
  });

  it('matches authored ruin landmarks to their physical M03 footprints', () => {
    expect(propDecorScaleForSize('column', { x: 0.3, y: 1, z: 0.3 })).toEqual([3.8, 3.75, 3.8]);
    const brokenColumn = propDecorScaleForSize('columnBroken', {
      x: 0.3,
      y: 0.7,
      z: 0.3,
    });
    expect(brokenColumn[0]).toBeCloseTo(3.8, 10);
    expect(brokenColumn[1]).toBeCloseTo(3, 10);
    expect(brokenColumn[2]).toBeCloseTo(3.8, 10);
    const head = propDecorScaleForSize('statueHead', { x: 0.9, y: 1, z: 0.5 });
    expect(head[0]).toBeCloseTo(1.67 / 0.9, 10);
    expect(head[1]).toBeCloseTo(2.3, 10);
    expect(head[2]).toBeCloseTo(1.28 / 0.5, 10);
    for (const scale of propDecorScaleForSize('statueBlock', { x: 0.4, y: 0.4, z: 0.4 })) {
      expect(scale).toBeCloseTo(2.1, 10);
    }
  });
});
