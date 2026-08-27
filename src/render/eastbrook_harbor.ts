// Eastbrook's adapted Mirror Lake harbor. The plank-and-stilt geometry is
// generated from the same rectangles used by sim ground collision.

import * as THREE from 'three';
import { getActiveWorldContent } from '../sim/data';
import { AELDRUNE_EASTBROOK_HARBOR_DECKS } from '../sim/eastbrook_harbor';
import { terrainHeight, WATER_LEVEL } from '../sim/world';
import { usesBuiltinWorldPresentation } from '../sim/world_presentation';
import { buildDeckWood } from './deck_render';
import { surfaceMat } from './gfx';

function mergeBoxes(parts: readonly THREE.BufferGeometry[], material: THREE.Material): THREE.Mesh {
  let total = 0;
  for (const geometry of parts) total += geometry.getAttribute('position').count;
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  let offset = 0;
  for (const geometry of parts) {
    positions.set(geometry.getAttribute('position').array as Float32Array, offset);
    normals.set(geometry.getAttribute('normal').array as Float32Array, offset);
    offset += geometry.getAttribute('position').count * 3;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildEastbrookHarbor(seed: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'aeldruneEastbrookHarbor';
  if (!usesBuiltinWorldPresentation(getActiveWorldContent())) return group;

  const wood = surfaceMat({ color: 0x8a6a4a, roughness: 0.9 });
  const postWood = surfaceMat({ color: 0x6b523d, roughness: 0.92 });
  const { planks, posts } = buildDeckWood(
    AELDRUNE_EASTBROOK_HARBOR_DECKS,
    (x, z) => terrainHeight(x, z, seed),
    WATER_LEVEL,
    { bollards: true },
  );
  group.add(mergeBoxes(planks, wood));
  group.add(mergeBoxes(posts, postWood));
  return group;
}
