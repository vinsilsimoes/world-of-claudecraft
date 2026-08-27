// The mir4 profile's per-tick system aggregator: one gate in sim.ts's tick
// tail calls this instead of four separate profile branches. Journey runs
// before battle so it can release legacy battle ownership and remains the
// sole locomotion owner. This combined order is behavior-pinned: moving battle
// first can let one stale automatic attack land before Journey disables it.

import { updateMir4AutoBattle } from '../auto_battle/core';
import { updateMir4AutoQuest } from '../auto_quest/core';
import type { SimContext } from '../sim_context';
import { updateMir4ArcDungeonEncounters } from './arc_dungeons';
import { updateMir4ArcEncounters } from './arc_encounters';
import { updateMir4ArcEscorts } from './arc_escorts';
import { updateMir4ArcObjectiveEntities, updateMir4ArcQuestTravel } from './arc_quest_runtime';
import { updateMir4AutoPotions } from './auto_potions';
import { updateMir4PendingImpacts, updateMir4Regeneration } from './combat';
import { updateMir4Effects } from './effects';
import { updateMir4NarrativeDialogue } from './narrative_dialogue';
import { updateMir4TargetCombat } from './target_combat';

export function updateMir4Systems(ctx: SimContext): void {
  updateMir4ArcObjectiveEntities(ctx);
  updateMir4NarrativeDialogue(ctx);
  updateMir4AutoQuest(ctx);
  updateMir4TargetCombat(ctx);
  updateMir4AutoPotions(ctx);
  updateMir4AutoBattle(ctx);
  updateMir4ArcQuestTravel(ctx);
  updateMir4ArcEscorts(ctx);
  updateMir4ArcDungeonEncounters(ctx);
  updateMir4ArcEncounters(ctx);
  updateMir4Effects(ctx);
  updateMir4PendingImpacts(ctx);
  updateMir4Regeneration(ctx);
}
