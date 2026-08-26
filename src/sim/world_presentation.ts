import { BUILTIN_WORLD } from "./data";
import type { WorldContent } from "./types";

/**
 * Whether a world owns the fixed WoC scene inventory as well as its terrain.
 * Terrain topology alone is intentionally insufficient: tools may reuse the
 * built-in heightfield while supplying different props and colliders.
 */
export function usesBuiltinWorldPresentation(
  content: Readonly<WorldContent>,
): boolean {
  if (content.presentationModel) {
    return content.presentationModel === "builtin";
  }
  return content === BUILTIN_WORLD;
}
