// The Phase 2 slice quest: the REAL M01-Q01 "Primeiros Rastros" from the
// source project's compiled world runtime (server/data/
// mir4-mmo-world-runtime-v1.json), with its exact giver, objective kind
// (inspect-clues x3), and rewards (1432 XP, 200 copper). The source's
// multi-stage pipeline (travel/system-tutorial/lore-resolution) is Phase 5
// scope; the slice models the inspect stage as interacting near a clue site,
// which is recorded here as a documented simplification, not a rebalance.
// Kill-objective quests (M01-Q02+) arrive with the Phase 5 quest port.

export interface Mir4QuestDef {
  id: string;
  name: string;
  giverNpcId: string;
  xpReward: number;
  copperReward: number;
  /** Inspect-clue sites (world yards); inspecting all of them readies the quest. */
  sites: readonly { x: number; z: number }[];
}

export const MIR4_QUESTS: Record<string, Mir4QuestDef> = {
  mir4_m01_q01: {
    id: 'mir4_m01_q01',
    name: 'Primeiros Rastros',
    giverNpcId: 'mir4_tarek_duas_pontes',
    xpReward: 1432,
    copperReward: 200,
    sites: [
      { x: 0, z: -6 }, // the ford: wolf prints skirting the dark water
      { x: 14, z: 6 }, // east clearing (Clareira dos Filhotes)
      { x: -18, z: 2 }, // west clearing
    ],
  },
};
