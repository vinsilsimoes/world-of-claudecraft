// Monster-sourced material rewards for the skill-progression crafting chain.
// Every XP-bearing MIR4 kill grants one fragment; the intentionally long
// 5 x 10 x 10 x 10 ladder makes legendary tomes a grind goal without RNG.

import type { Mir4Materials } from './equipment';
import { MIR4_EMPTY_MATERIALS } from './equipment';
import { markMir4WireDirty } from './wire_revision';

const MATERIAL_COUNT_CAP = 1_000_000_000;

export interface Mir4KnowledgeDropTarget {
  mir4Materials?: Mir4Materials;
}

export function grantMir4KnowledgeFragment(target: Mir4KnowledgeDropTarget): void {
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...target.mir4Materials };
  wallet.knowledgeFragment = Math.min(MATERIAL_COUNT_CAP, wallet.knowledgeFragment + 1);
  target.mir4Materials = wallet;
  markMir4WireDirty(target);
}
