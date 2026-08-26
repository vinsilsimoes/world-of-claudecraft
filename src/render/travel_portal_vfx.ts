import * as THREE from 'three';
import { getActiveWorldContent } from '../sim/data';
import type { PortalSide, WorldContent } from '../sim/types';
import { terrainHeight } from '../sim/world';

// The garden-arch GLB is authored at 4.41 yd tall. Its MIR4 placements use a
// 2.8x scale, so this native-space silhouette fills the actual opening while
// remaining tucked behind the stone frame. Keeping it in the arch's local
// units also makes authored scale/rotation apply identically to both pieces.
const PORTAL_HALF_WIDTH = 1.24;
const PORTAL_SPRING_Y = 2.5;
const PORTAL_TOP_Y = 3.76;
const PORTAL_BOTTOM_Y = 0.12;
const ARCH_MATCH_RADIUS_SQ = 0.25;

export const TRAVEL_PORTAL_VFX_GROUND_LIFT = 0.035;

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vPortalPoint;

  void main() {
    vPortalPoint = position.xy;
    vec4 localPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      localPosition = instanceMatrix * localPosition;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * localPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uBrightColor;
  varying vec2 vPortalPoint;

  void main() {
    vec2 p = vec2(
      vPortalPoint.x / ${PORTAL_HALF_WIDTH.toFixed(2)},
      (vPortalPoint.y - 1.92) / 1.84
    );
    float radius = length(p);
    float angle = atan(p.y, p.x);

    // Several opposing bands make a readable dimensional vortex instead of a
    // flat glowing doorway. Everything is procedural, so there is no texture
    // upload and no imported 2D asset.
    float armA = 0.5 + 0.5 * sin(angle * 5.0 - radius * 17.0 + uTime * 2.1);
    float armB = 0.5 + 0.5 * sin(angle * -3.0 - radius * 12.0 + uTime * 1.25);
    float current = pow(max(armA * 0.72 + armB * 0.28, 0.0), 2.1);
    float core = 1.0 - smoothstep(0.0, 0.82, radius);
    float depthBands = 0.5 + 0.5 * sin(radius * 30.0 - uTime * 2.7);

    float sideDistance = ${PORTAL_HALF_WIDTH.toFixed(2)} - abs(vPortalPoint.x);
    float bottomDistance = vPortalPoint.y - ${PORTAL_BOTTOM_Y.toFixed(2)};
    float archDistance = ${PORTAL_HALF_WIDTH.toFixed(2)} - length(vec2(
      vPortalPoint.x,
      max(vPortalPoint.y - ${PORTAL_SPRING_Y.toFixed(2)}, 0.0)
    ));
    float boundaryDistance = min(min(sideDistance, bottomDistance), archDistance);
    float rim = 1.0 - smoothstep(0.03, 0.18, boundaryDistance);

    float pulse = 0.92 + 0.08 * sin(uTime * 1.8);
    float energy = 0.24 + current * 0.72 + core * 0.34 + depthBands * core * 0.12;
    vec3 color = mix(uDeepColor, uBrightColor, clamp(current * 0.72 + core * 0.46, 0.0, 1.0));
    color += uBrightColor * rim * 0.78;
    float alpha = clamp((0.30 + energy * 0.42 + rim * 0.38) * pulse, 0.0, 0.92);

    gl_FragColor = vec4(color * (0.74 + energy * 0.42), alpha);
  }
`;

interface PortalArchPlacement {
  x: number;
  z: number;
  rot: number;
  scale: number;
}

export interface TravelPortalVfxView {
  group: THREE.Group;
  membrane: THREE.InstancedMesh<THREE.ShapeGeometry, THREE.ShaderMaterial> | null;
  update(time: number, reducedMotion?: boolean): void;
  dispose(): void;
}

function portalShapeGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-PORTAL_HALF_WIDTH, PORTAL_BOTTOM_Y);
  shape.lineTo(-PORTAL_HALF_WIDTH, PORTAL_SPRING_Y);
  shape.quadraticCurveTo(-PORTAL_HALF_WIDTH, PORTAL_TOP_Y, 0, PORTAL_TOP_Y);
  shape.quadraticCurveTo(PORTAL_HALF_WIDTH, PORTAL_TOP_Y, PORTAL_HALF_WIDTH, PORTAL_SPRING_Y);
  shape.lineTo(PORTAL_HALF_WIDTH, PORTAL_BOTTOM_Y);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 24);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function portalMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x2636b8) },
      uBrightColor: { value: new THREE.Color(0x70e6ff) },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function matchingArch(
  side: Readonly<PortalSide>,
  world: Readonly<WorldContent>,
): PortalArchPlacement | null {
  const decor = world.props.decorProps;
  if (!decor) return null;
  for (const prop of decor) {
    if (prop.key !== 'gardenArch') continue;
    const dx = prop.x - side.x;
    const dz = prop.z - side.z;
    if (dx * dx + dz * dz > ARCH_MATCH_RADIUS_SQ) continue;
    return {
      x: prop.x,
      z: prop.z,
      rot: prop.rot ?? 0,
      scale: prop.scale ?? 1,
    };
  }
  return null;
}

/**
 * Builds the animated energy surfaces for overworld travel portals which are
 * physically framed by a garden arch. The whole world shares one instanced
 * draw and one procedural shader; portals without that frame are deliberately
 * left to their own bespoke renderer (for example the Veiled Hollow gates).
 */
export function buildTravelPortalVfx(
  seed: number,
  world: Readonly<WorldContent> = getActiveWorldContent(),
): TravelPortalVfxView {
  const group = new THREE.Group();
  group.name = 'travel-portal-vfx';
  const placements: PortalArchPlacement[] = [];
  for (const portal of world.travelPortals ?? []) {
    const a = matchingArch(portal.a, world);
    const b = matchingArch(portal.b, world);
    if (a) placements.push(a);
    if (b) placements.push(b);
  }

  if (placements.length === 0) {
    return {
      group,
      membrane: null,
      update: () => {},
      dispose: () => group.removeFromParent(),
    };
  }

  const geometry = portalShapeGeometry();
  const material = portalMaterial();
  const membrane = new THREE.InstancedMesh(geometry, material, placements.length);
  membrane.name = 'travel-portal-energy-membranes';
  membrane.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  membrane.castShadow = false;
  membrane.receiveShadow = false;
  membrane.renderOrder = 4;
  membrane.userData.renderCategory = 'vfx';

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    position.set(
      placement.x,
      terrainHeight(placement.x, placement.z, seed) + TRAVEL_PORTAL_VFX_GROUND_LIFT,
      placement.z,
    );
    rotation.setFromAxisAngle(up, placement.rot);
    scale.setScalar(placement.scale);
    matrix.compose(position, rotation, scale);
    membrane.setMatrixAt(i, matrix);
  }
  membrane.instanceMatrix.needsUpdate = true;
  membrane.computeBoundingBox();
  membrane.computeBoundingSphere();
  membrane.updateMatrix();
  membrane.matrixAutoUpdate = false;
  group.add(membrane);
  group.updateMatrix();
  group.matrixAutoUpdate = false;

  let animatedTime = 0;
  let disposed = false;
  return {
    group,
    membrane,
    update(time: number, reducedMotion = false): void {
      if (!reducedMotion) animatedTime = time;
      material.uniforms.uTime.value = animatedTime;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      group.remove(membrane);
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Builds and attaches the shared portal group without growing the renderer coordinator. */
export function attachTravelPortalVfx(scene: THREE.Scene, seed: number): TravelPortalVfxView {
  const view = buildTravelPortalVfx(seed);
  view.group.userData.renderCategory = 'vfx';
  scene.add(view.group);
  return view;
}
