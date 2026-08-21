// Existing Crafting-window action for campaign profession receipts. It uses
// the campaign's logical regional-material ledger and the same authoritative
// quest evidence reducer; visuals remain native WoC crafting presentation.

import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { mir4ArcStageAnchor } from './arc_quest_runtime';
import {
  mir4ApplyPlayerQuestEvidence,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from './arc_quests';
import { grantMir4ArcLogicalItem, spendMir4ArcLogicalItems } from './arc_rewards';
import { markMir4WireDirty } from './wire_revision';

const CRAFTER_RADIUS = 8;
const PROFESSION_KINDS = new Set(['craft-receipt', 'refine-receipt', 'salvage-receipt']);

export function mir4CampaignProfessionAction(
  ctx: SimContext,
  pid: number,
): 'crafted' | 'refined' | 'salvaged' | 'unavailable' | 'too-far' | 'materials-required' {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return 'unavailable';
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead) return 'unavailable';
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const stage = mir4QuestCurrentStage(progress);
    if (!stage || !PROFESSION_KINDS.has(stage.kind)) continue;
    const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
    if (typeof target !== 'string') return 'unavailable';
    const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress);
    if (!anchor || Math.hypot(player.pos.x - anchor.x, player.pos.z - anchor.z) > CRAFTER_RADIUS) {
      return 'too-far';
    }
    let spent = null;
    if (stage.kind === 'salvage-receipt') {
      spent = spendMir4ArcLogicalItems(meta, 1, (itemId) => itemId === target);
    } else if (stage.kind === 'craft-receipt' && target.startsWith('city-infrastructure-')) {
      const rank = target.match(/r(\d+)$/)?.[1] ?? '';
      spent = spendMir4ArcLogicalItems(meta, 2, (itemId) => itemId === `refined-regional-r${rank}`);
    } else {
      spent = spendMir4ArcLogicalItems(meta, stage.kind === 'refine-receipt' ? 2 : 4, (itemId) =>
        itemId.startsWith('material-'),
      );
    }
    if (!spent) return 'materials-required';
    if (stage.kind === 'salvage-receipt')
      grantMir4ArcLogicalItem(meta, 'profession-salvaged-parts', 2);
    else grantMir4ArcLogicalItem(meta, target, 1);
    const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
      kind: 'stage',
      stageKind: stage.kind,
      target,
    });
    if (result === 'blocked') return 'unavailable';
    markMir4WireDirty(meta);
    return stage.kind === 'craft-receipt'
      ? 'crafted'
      : stage.kind === 'refine-receipt'
        ? 'refined'
        : 'salvaged';
  }
  return 'unavailable';
}
