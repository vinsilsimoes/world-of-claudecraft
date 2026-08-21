// The mir4 profile's per-tick system aggregator: one gate in sim.ts's tick
// tail calls this instead of four separate profile branches. Order is fixed
// (regen -> automation -> quest journey -> effect decay -> authored impacts):
// the automation may cast (drawing rng through the shared stream), so the
// phase order is rng-draw-order load-bearing exactly like every other phase.

import { updateMir4AutoBattle } from '../auto_battle/core';
import { updateMir4AutoQuest } from '../auto_quest/core';
import type { SimContext } from '../sim_context';
import { updateMir4ArcDungeonEncounters } from './arc_dungeons';
import { updateMir4ArcEncounters } from './arc_encounters';
import { updateMir4ArcEscorts } from './arc_escorts';
import { updateMir4ArcQuestTravel } from './arc_quest_runtime';
import { updateMir4PendingImpacts } from './combat';
import { updateMir4Effects } from './effects';

export function updateMir4Systems(ctx: SimContext): void {
  updateMir4AutoBattle(ctx);
  updateMir4AutoQuest(ctx);
  updateMir4ArcQuestTravel(ctx);
  updateMir4ArcEscorts(ctx);
  updateMir4ArcDungeonEncounters(ctx);
  updateMir4ArcEncounters(ctx);
  updateMir4Effects(ctx);
  updateMir4PendingImpacts(ctx);
}
