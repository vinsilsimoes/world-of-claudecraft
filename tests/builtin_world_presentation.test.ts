import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUILTIN_WORLD } from "../src/sim/data";
import { buildMir4WocComparisonWorld } from "../src/sim/mir4/woc_comparison_world";
import { usesBuiltinWorldPresentation } from "../src/sim/world_presentation";

describe("built-in WoC presentation capability", () => {
  it("keeps the dedicated WoC scenery for the MIR4 campaign transplanted onto that terrain", () => {
    const campaignWorld = buildMir4WocComparisonWorld();

    expect(campaignWorld).not.toBe(BUILTIN_WORLD);
    expect(campaignWorld.terrainModel).toBe("builtin");
    expect(campaignWorld.presentationModel).toBe("builtin");
    expect(usesBuiltinWorldPresentation(campaignWorld)).toBe(true);
  });

  it("does not leak fixed WoC towns into a content-authored map", () => {
    const customWorld = {
      ...BUILTIN_WORLD,
      zones: [...BUILTIN_WORLD.zones],
      terrainModel: "content" as const,
      presentationModel: "content" as const,
    };

    expect(usesBuiltinWorldPresentation(customWorld)).toBe(false);
  });

  it("does not treat a borrowed built-in heightfield as permission to draw fixed towns", () => {
    const terrainOnlyWorld = {
      ...BUILTIN_WORLD,
      props: {
        ...BUILTIN_WORLD.props,
        buildings: [],
        fences: [],
        walls: [],
      },
      terrainModel: "builtin" as const,
    };

    expect(usesBuiltinWorldPresentation(terrainOnlyWorld)).toBe(false);
  });

  it("routes every fixed-scene consumer through the explicit presentation capability", () => {
    const consumers = new Map([
      ["../src/render/eastbrook_town.ts", 1],
      ["../src/render/fenbridge_town.ts", 1],
      ["../src/render/props.ts", 2],
      ["../src/render/foliage.ts", 1],
    ]);
    for (const [sourcePath, expectedCalls] of consumers) {
      const source = readFileSync(new URL(sourcePath, import.meta.url), "utf8");
      expect(source.match(/usesBuiltinWorldPresentation\(/g)).toHaveLength(
        expectedCalls,
      );
      expect(source).not.toContain("=== BUILTIN_WORLD");
      expect(source).not.toContain("!== BUILTIN_WORLD");
    }
  });
});
