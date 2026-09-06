import * as THREE from 'three';
import type { SimEvent } from '../sim/types';
import { mir4SkillGuideFrame } from './mir4_skill_guide_core';
import { setRenderCategory } from './renderer_diagnostics';

type Mir4SkillGuideEvent = Extract<SimEvent, { type: 'mir4SkillGuide' }>;

export interface Mir4SkillGuideSourcePose {
  x: number;
  y: number;
  z: number;
  facing: number;
}

interface Mir4SkillGuideSlot {
  readonly group: THREE.Group;
  readonly layers: readonly THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  sourceId: number;
  elapsedMs: number;
  aliveMs: number;
  scalingMs: number;
  shape: 'direct' | 'circle' | 'sector';
  lengthYards: number;
  widthYards: number;
  radiusYards: number;
  angleDegrees: number;
  forwardOffsetYards: number;
  active: boolean;
}

const GUIDE_LAYER_WIDTHS = [1, 0.7, 0.14] as const;
const GUIDE_LAYER_OPACITIES = [0.18, 0.3, 0.58] as const;
const GUIDE_LAYER_HEIGHTS = [0.035, 0.055, 0.075] as const;
const DIRECT_GUIDE_MASK_SIZE = 128;
const CIRCLE_GUIDE_MASK_SIZE = 128;

function createDirectGuideMaskTexture(): THREE.DataTexture {
  const data = new Uint8Array(DIRECT_GUIDE_MASK_SIZE * DIRECT_GUIDE_MASK_SIZE * 4);
  for (let y = 0; y < DIRECT_GUIDE_MASK_SIZE; y += 1) {
    const v = y / (DIRECT_GUIDE_MASK_SIZE - 1);
    for (let x = 0; x < DIRECT_GUIDE_MASK_SIZE; x += 1) {
      const u = x / (DIRECT_GUIDE_MASK_SIZE - 1);
      const edgeDistance = Math.min(u, 1 - u, v, 1 - v);
      const edge = edgeDistance < 0.045 ? 255 : 0;
      const railDistance = Math.min(Math.abs(u - 0.24), Math.abs(u - 0.76));
      const railDash = railDistance < 0.012 && (v * 9) % 1 < 0.56 ? 150 : 0;
      const alpha = Math.max(18, edge, railDash);
      const offset = (y * DIRECT_GUIDE_MASK_SIZE + x) * 4;
      data[offset] = alpha;
      data[offset + 1] = alpha;
      data[offset + 2] = alpha;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(
    data,
    DIRECT_GUIDE_MASK_SIZE,
    DIRECT_GUIDE_MASK_SIZE,
    THREE.RGBAFormat,
  );
  texture.name = 'mir4-direct-guide-mask';
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createCircleGuideMaskTexture(): THREE.DataTexture {
  const data = new Uint8Array(CIRCLE_GUIDE_MASK_SIZE * CIRCLE_GUIDE_MASK_SIZE * 4);
  for (let y = 0; y < CIRCLE_GUIDE_MASK_SIZE; y += 1) {
    const ny = (y / (CIRCLE_GUIDE_MASK_SIZE - 1)) * 2 - 1;
    for (let x = 0; x < CIRCLE_GUIDE_MASK_SIZE; x += 1) {
      const nx = (x / (CIRCLE_GUIDE_MASK_SIZE - 1)) * 2 - 1;
      const radius = Math.hypot(nx, ny);
      const angle = Math.atan2(ny, nx);
      const perimeter = Math.abs(radius - 0.92) < 0.045 ? 255 : 0;
      const innerRing = Math.abs(radius - 0.62) < 0.018 ? 145 : 0;
      const radialTick =
        radius > 0.72 && radius < 0.84 && Math.abs(Math.sin(angle * 8)) > 0.94 ? 105 : 0;
      const alpha = radius <= 1 ? Math.max(18, perimeter, innerRing, radialTick) : 0;
      const offset = (y * CIRCLE_GUIDE_MASK_SIZE + x) * 4;
      data[offset] = alpha;
      data[offset + 1] = alpha;
      data[offset + 2] = alpha;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(
    data,
    CIRCLE_GUIDE_MASK_SIZE,
    CIRCLE_GUIDE_MASK_SIZE,
    THREE.RGBAFormat,
  );
  texture.name = 'mir4-circle-guide-mask';
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function setGuideDisplayColor(
  target: THREE.Color,
  source: readonly [number, number, number],
): void {
  const peak = Math.max(1, source[0], source[1], source[2]);
  target.setRGB(
    Math.max(0, source[0]) / peak,
    Math.max(0, source[1]) / peak,
    Math.max(0, source[2]) / peak,
  );
}

function validGuideEvent(event: Mir4SkillGuideEvent): boolean {
  return (
    (event.shape === 'direct' || event.shape === 'circle' || event.shape === 'sector') &&
    event.applyTo === 'self' &&
    event.materialScalarCurve === 'inside-linear-grow-then-hold' &&
    (event.shape === 'direct'
      ? Number.isFinite(event.lengthYards) &&
        event.lengthYards > 0 &&
        Number.isFinite(event.widthYards) &&
        event.widthYards > 0
      : event.shape === 'sector'
        ? Number.isFinite(event.radiusYards) &&
          event.radiusYards > 0 &&
          Number.isFinite(event.angleDegrees) &&
          event.angleDegrees > 0 &&
          event.angleDegrees < 360 &&
          Number.isFinite(event.forwardOffsetYards)
        : Number.isFinite(event.radiusYards) && event.radiusYards > 0) &&
    Number.isFinite(event.aliveMs) &&
    event.aliveMs > 0 &&
    Number.isFinite(event.scalingMs) &&
    event.scalingMs > 0
  );
}

/** Thin pooled Three adapter for the compiler-approved MIR4 direct guide event. */
export class Mir4SkillGuidePainter {
  private readonly root = new THREE.Group();
  private readonly directGeometry = new THREE.PlaneGeometry(1, 1);
  private readonly circleGeometry = new THREE.CircleGeometry(1, 64);
  private readonly directMaskTexture = createDirectGuideMaskTexture();
  private readonly circleMaskTexture = createCircleGuideMaskTexture();
  private readonly sectorGeometry = new THREE.CircleGeometry(
    1,
    64,
    Math.PI / 2 - (160 * Math.PI) / 360,
    (160 * Math.PI) / 180,
  );
  private readonly slots: Mir4SkillGuideSlot[];
  private readonly sourcePose: Mir4SkillGuideSourcePose = { x: 0, y: 0, z: 0, facing: 0 };
  private nextSlot = 0;

  constructor(
    private readonly scene: THREE.Scene,
    capacity = 8,
  ) {
    this.directGeometry.rotateX(Math.PI / 2);
    this.circleGeometry.rotateX(Math.PI / 2);
    this.sectorGeometry.rotateX(Math.PI / 2);
    this.root.name = 'mir4-skill-guides';
    setRenderCategory(this.root, 'vfx');
    this.slots = Array.from({ length: Math.max(1, Math.floor(capacity)) }, (_, slotIndex) => {
      const group = new THREE.Group();
      group.name = `mir4-skill-guide-${slotIndex}`;
      group.visible = false;
      const layers = GUIDE_LAYER_WIDTHS.map((_, layerIndex) => {
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: GUIDE_LAYER_OPACITIES[layerIndex],
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const mesh = new THREE.Mesh(this.directGeometry, material);
        mesh.position.y = GUIDE_LAYER_HEIGHTS[layerIndex];
        mesh.renderOrder = 5 + layerIndex;
        group.add(mesh);
        return mesh;
      });
      this.root.add(group);
      return {
        group,
        layers,
        sourceId: 0,
        elapsedMs: 0,
        aliveMs: 0,
        scalingMs: 0,
        shape: 'direct' as const,
        lengthYards: 0,
        widthYards: 0,
        radiusYards: 0,
        angleDegrees: 0,
        forwardOffsetYards: 0,
        active: false,
      };
    });
    this.scene.add(this.root);
  }

  start(event: Mir4SkillGuideEvent): boolean {
    if (!validGuideEvent(event)) return false;
    const slot = this.slots[this.nextSlot];
    this.nextSlot = (this.nextSlot + 1) % this.slots.length;
    slot.sourceId = event.sourceId;
    slot.elapsedMs = 0;
    slot.aliveMs = event.aliveMs;
    slot.scalingMs = event.scalingMs;
    slot.shape = event.shape;
    slot.lengthYards = event.shape === 'direct' ? event.lengthYards : 0;
    slot.widthYards = event.shape === 'direct' ? event.widthYards : 0;
    slot.radiusYards = event.shape === 'circle' ? event.radiusYards : 0;
    slot.radiusYards = event.shape === 'sector' ? event.radiusYards : slot.radiusYards;
    slot.angleDegrees = event.shape === 'sector' ? event.angleDegrees : 0;
    slot.forwardOffsetYards = event.shape === 'sector' ? event.forwardOffsetYards : 0;
    slot.active = true;
    slot.group.visible = true;
    const layerColors = [event.colors.secondary, event.colors.primary, event.colors.emissive];
    slot.layers.forEach((layer, index) => {
      const color = layerColors[index];
      // GUIDE_EFFECT colors come from an Unreal emissive material and can be
      // HDR values (the native cyan reaches 10). Feeding those values into an
      // additive Three material clips the whole footprint to opaque white.
      // Preserve the extracted hue while mapping only out-of-gamut vectors
      // into Three's display range.
      setGuideDisplayColor(layer.material.color, color);
      const alphaMap =
        slot.shape === 'direct'
          ? this.directMaskTexture
          : slot.shape === 'circle'
            ? this.circleMaskTexture
            : null;
      if (layer.material.alphaMap !== alphaMap) {
        layer.material.alphaMap = alphaMap;
        layer.material.needsUpdate = true;
      }
      if (slot.shape === 'circle') {
        layer.geometry = this.circleGeometry;
        layer.scale.setScalar(slot.radiusYards * GUIDE_LAYER_WIDTHS[index]);
        layer.position.z = 0;
      } else if (slot.shape === 'sector') {
        layer.geometry = this.sectorGeometry;
        layer.scale.setScalar(slot.radiusYards * GUIDE_LAYER_WIDTHS[index]);
        layer.position.z = slot.forwardOffsetYards;
      } else {
        layer.geometry = this.directGeometry;
        layer.scale.set(slot.widthYards * GUIDE_LAYER_WIDTHS[index], 1, slot.lengthYards);
        layer.position.z = slot.lengthYards / 2;
      }
    });
    return true;
  }

  update(
    dtSeconds: number,
    readSourcePose: (sourceId: number, out: Mir4SkillGuideSourcePose) => boolean,
  ): void {
    const deltaMs = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) * 1_000 : 0;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.elapsedMs += deltaMs;
      const frame = mir4SkillGuideFrame(slot.elapsedMs, slot.scalingMs, slot.aliveMs);
      if (!frame.visible) {
        slot.active = false;
        slot.group.visible = false;
        continue;
      }
      if (!readSourcePose(slot.sourceId, this.sourcePose)) {
        slot.group.visible = false;
        continue;
      }
      const pose = this.sourcePose;
      slot.group.visible = true;
      slot.group.position.set(pose.x, pose.y, pose.z);
      slot.group.rotation.y = pose.facing;
      slot.layers.forEach((layer, index) => {
        // The native client feeds this progress to the dynamic material's
        // InsideName scalar while retaining the full decal footprint. The
        // original cooked material is not available to Three, so the two inner
        // layers approximate that shader response without falsifying geometry.
        layer.material.opacity =
          index === 0
            ? GUIDE_LAYER_OPACITIES[index]
            : GUIDE_LAYER_OPACITIES[index] * frame.insideProgress;
      });
    }
  }

  activeCount(): number {
    return this.slots.reduce((count, slot) => count + (slot.active ? 1 : 0), 0);
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.directGeometry.dispose();
    this.circleGeometry.dispose();
    this.sectorGeometry.dispose();
    this.directMaskTexture.dispose();
    this.circleMaskTexture.dispose();
    for (const slot of this.slots) {
      for (const layer of slot.layers) layer.material.dispose();
    }
  }
}
