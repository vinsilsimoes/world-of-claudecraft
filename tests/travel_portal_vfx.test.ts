import * as THREE from "three";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTravelPortalVfx,
  TRAVEL_PORTAL_VFX_GROUND_LIFT,
} from "../src/render/travel_portal_vfx";
import { setActiveWorldContent } from "../src/sim/data";
import {
  MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS,
  MIR4_WOC_TUTORIAL_PORTALS,
} from "../src/sim/mir4/woc_campaign_portals";
import { buildMir4WocComparisonWorld } from "../src/sim/mir4/woc_comparison_world";
import { terrainHeight, withWorldTerrainContent } from "../src/sim/world";
import { WORLD_SEED } from "../src/sim/world_seed";

afterEach(() => setActiveWorldContent(null));

describe("travel portal VFX", () => {
  it("fills both sides of every garden-arch travel portal with one instanced membrane", () => {
    const world = buildMir4WocComparisonWorld();
    const view = withWorldTerrainContent(world, () =>
      buildTravelPortalVfx(WORLD_SEED),
    );
    const expected =
      (MIR4_WOC_TUTORIAL_PORTALS.length +
        MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS.length) *
      2;

    expect(view.membrane).not.toBeNull();
    expect(view.membrane?.count).toBe(expected);
    expect(view.group.children).toEqual([view.membrane]);

    const first = MIR4_WOC_TUTORIAL_PORTALS[0].a;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    view.membrane?.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.x).toBeCloseTo(first.x);
    expect(position.z).toBeCloseTo(first.z);
    expect(position.y).toBeCloseTo(
      withWorldTerrainContent(world, () =>
        terrainHeight(first.x, first.z, WORLD_SEED),
      ) + TRAVEL_PORTAL_VFX_GROUND_LIFT,
    );
    expect(TRAVEL_PORTAL_VFX_GROUND_LIFT).toBeCloseTo(0.035);
    expect(scale.x).toBeCloseTo(2.8);
    expect(scale.y).toBeCloseTo(2.8);
    const firstArch = world.props.decorProps?.find(
      (prop) =>
        prop.key === "gardenArch" && prop.x === first.x && prop.z === first.z,
    );
    expect(firstArch).toBeDefined();
    const expectedRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      firstArch?.rot ?? 0,
    );
    expect(rotation.angleTo(expectedRotation)).toBeLessThan(1e-6);
  });

  it("uses a transparent additive shader and pauses its swirl for reduced motion", () => {
    const world = buildMir4WocComparisonWorld();
    const view = withWorldTerrainContent(world, () =>
      buildTravelPortalVfx(WORLD_SEED),
    );
    const material = view.membrane?.material as THREE.ShaderMaterial;

    expect(material.transparent).toBe(true);
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(THREE.DoubleSide);
    const geometryDispose = vi.spyOn(view.membrane!.geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");

    view.update(2, false);
    expect(material.uniforms.uTime.value).toBe(2);
    view.update(9, true);
    expect(material.uniforms.uTime.value).toBe(2);

    const scene = new THREE.Scene();
    scene.add(view.group);
    view.dispose();
    expect(view.group.parent).toBeNull();
    expect(view.group.children).toHaveLength(0);
    expect(() => view.dispose()).not.toThrow();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });

  it("does not invent a portal membrane where no matching garden arch exists", () => {
    const world = buildMir4WocComparisonWorld();
    const withoutArches = {
      ...world,
      props: {
        ...world.props,
        decorProps: world.props.decorProps?.filter(
          (prop) => prop.key !== "gardenArch",
        ),
      },
    };
    const view = withWorldTerrainContent(withoutArches, () =>
      buildTravelPortalVfx(WORLD_SEED),
    );
    const scene = new THREE.Scene();
    scene.add(view.group);

    expect(view.membrane).toBeNull();
    expect(view.group.children).toHaveLength(0);
    view.dispose();
    expect(view.group.parent).toBeNull();
  });

  it("is constructed, updated in both frame paths, and disposed by the renderer", () => {
    const rendererSource = readFileSync(
      new URL("../src/render/renderer.ts", import.meta.url),
      "utf8",
    );

    expect(rendererSource).toContain(
      "this.travelPortalVfx = attachTravelPortalVfx(this.scene, this.sim.cfg.seed)",
    );
    expect(
      rendererSource.match(/this\.travelPortalVfx\.update\(/g),
    ).toHaveLength(2);
    expect(rendererSource).toContain("this.travelPortalVfx.dispose()");
  });
});
