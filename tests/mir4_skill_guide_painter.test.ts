import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Mir4SkillGuidePainter } from '../src/render/mir4_skill_guide_painter';
import type { SimEvent } from '../src/sim/types';

const GUIDE_EVENT: Extract<SimEvent, { type: 'mir4SkillGuide' }> = {
  type: 'mir4SkillGuide',
  sourceId: 7,
  skillId: 1102,
  attackId: 110201,
  shape: 'direct',
  applyTo: 'self',
  lengthYards: 8.5,
  widthYards: 5,
  aliveMs: 450,
  scalingMs: 250,
  materialScalarCurve: 'inside-linear-grow-then-hold',
  materialAssetPath: '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
  colors: {
    primary: [0.091146, 0.217937, 0.729167],
    secondary: [0.358803, 0.40595, 0.828125],
    emissive: [0, 5.375199, 10],
  },
};

const CIRCLE_GUIDE_EVENT = {
  type: 'mir4SkillGuide',
  sourceId: 7,
  skillId: 1501,
  attackId: 150101,
  shape: 'circle',
  applyTo: 'self',
  radiusYards: 7,
  aliveMs: 720,
  scalingMs: 150,
  materialScalarCurve: 'inside-linear-grow-then-hold',
  materialAssetPath: '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
  colors: {
    primary: [0.091146, 0.217937, 0.729167],
    secondary: [0.358803, 0.40595, 0.828125],
    emissive: [0, 5.375199, 10],
  },
} as const;

describe('MIR4 skill-guide Three painter', () => {
  it('anchors the full native decal footprint while advancing its Inside scalar', () => {
    const scene = new THREE.Scene();
    const painter = new Mir4SkillGuidePainter(scene, 1);

    expect(painter.start(GUIDE_EVENT)).toBe(true);
    painter.update(0.125, (_sourceId, out) => {
      Object.assign(out, { x: 3, y: 4, z: 5, facing: Math.PI / 2 });
      return true;
    });

    expect(painter.activeCount()).toBe(1);
    const root = scene.getObjectByName('mir4-skill-guides') as THREE.Group;
    const slot = root.children[0] as THREE.Group;
    const outer = slot.children[0] as THREE.Mesh;
    expect(slot.visible).toBe(true);
    expect(slot.position.toArray()).toEqual([3, 4, 5]);
    expect(slot.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(outer.scale.x).toBeCloseTo(5);
    expect(outer.scale.z).toBeCloseTo(8.5);
    expect(outer.position.z).toBeCloseTo(4.25);
    expect(
      (slot.children[1] as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>).material
        .opacity,
    ).toBeCloseTo(0.15);
    expect(
      (slot.children[2] as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>).material
        .opacity,
    ).toBeCloseTo(0.29);

    const emissiveLayer = slot.children[2] as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshBasicMaterial
    >;
    expect(emissiveLayer.material.color.toArray()).toEqual([0, 0.5375199, 1]);
    expect(Math.max(...emissiveLayer.material.color.toArray())).toBeLessThanOrEqual(1);
    const mask = emissiveLayer.material.alphaMap as THREE.DataTexture;
    expect(mask).toBeInstanceOf(THREE.DataTexture);
    const maskData = mask.image.data as Uint8Array;
    const pixelChannel = (x: number, y: number): number =>
      maskData[(y * mask.image.width + x) * 4 + 1] ?? 0;
    expect(pixelChannel(1, 64)).toBeGreaterThanOrEqual(220);
    expect(pixelChannel(64, 64)).toBeLessThanOrEqual(40);

    painter.dispose();
    expect(scene.getObjectByName('mir4-skill-guides')).toBeUndefined();
  });

  it('expires after the native inclusive alive-time boundary', () => {
    const scene = new THREE.Scene();
    const painter = new Mir4SkillGuidePainter(scene, 1);
    painter.start(GUIDE_EVENT);
    const pose = (_sourceId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 0, y: 0, z: 0, facing: 0 });
      return true;
    };

    painter.update(0.45, pose);
    expect(painter.activeCount()).toBe(1);
    painter.update(0.001, pose);
    expect(painter.activeCount()).toBe(0);

    painter.dispose();
  });

  it('renders a native circle guide centered on the source with the authored radius', () => {
    const scene = new THREE.Scene();
    const painter = new Mir4SkillGuidePainter(scene, 1);

    expect(painter.start(CIRCLE_GUIDE_EVENT as never)).toBe(true);
    painter.update(0.075, (_sourceId, out) => {
      Object.assign(out, { x: 3, y: 4, z: 5, facing: Math.PI / 2 });
      return true;
    });

    const root = scene.getObjectByName('mir4-skill-guides') as THREE.Group;
    const slot = root.children[0] as THREE.Group;
    const outer = slot.children[0] as THREE.Mesh;
    expect(slot.position.toArray()).toEqual([3, 4, 5]);
    expect(outer.geometry.type).toBe('CircleGeometry');
    expect(outer.scale.x).toBeCloseTo(7);
    expect(outer.scale.z).toBeCloseTo(7);
    expect(outer.position.z).toBe(0);
    const emissiveLayer = slot.children[2] as THREE.Mesh<
      THREE.CircleGeometry,
      THREE.MeshBasicMaterial
    >;
    const mask = emissiveLayer.material.alphaMap as THREE.DataTexture;
    expect(mask).toBeInstanceOf(THREE.DataTexture);
    expect(mask.name).toBe('mir4-circle-guide-mask');
    const maskData = mask.image.data as Uint8Array;
    const pixelChannel = (x: number, y: number): number =>
      maskData[(y * mask.image.width + x) * 4 + 1] ?? 0;
    expect(pixelChannel(64, 4)).toBeGreaterThanOrEqual(220);
    expect(pixelChannel(64, 64)).toBeLessThanOrEqual(40);

    painter.dispose();
  });
});
