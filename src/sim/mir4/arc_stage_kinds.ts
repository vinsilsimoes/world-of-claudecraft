// Exhaustive routing table for every stage kind in the 230-contract campaign.
// Each bucket names the authoritative runtime evidence source; the coverage
// test prevents generated content from silently introducing an unwired verb.

import type { Mir4ArcQuestStage } from '../content/mir4/arc_campaign';

export type Mir4ArcEncounterGrade = 'normal' | 'veteran' | 'guardian';

/** Authored encounter grade. Never infer difficulty from a translated name. */
export function mir4ArcEncounterGrade(
  stage: Readonly<Mir4ArcQuestStage> | undefined,
  explicitBoss = false,
): Mir4ArcEncounterGrade {
  if (
    explicitBoss ||
    stage?.kind === 'guardian-resolution' ||
    (stage?.guardian && stage.kind !== 'defend-anchor')
  ) {
    return 'guardian';
  }
  if (stage?.kind === 'optional-elite-resolution' || stage?.kind === 'inspect-and-resolve-elite') {
    return 'veteran';
  }
  return 'normal';
}

export function mir4ArcEncounterXpMultiplier(grade: Mir4ArcEncounterGrade): 1 | 5 | 20 {
  return grade === 'guardian' ? 20 : grade === 'veteran' ? 5 : 1;
}

export const MIR4_ARC_TALK_STAGE_KINDS = new Set(['talk', 'deliver']);

export const MIR4_ARC_POSITION_STAGE_KINDS = new Set(['travel', 'survive-zone']);

export const MIR4_ARC_ESCORT_STAGE_KINDS = new Set(['escort-entity', 'escort-supply-run']);

export const MIR4_ARC_COMBAT_STAGE_KINDS = new Set([
  'collect-quest-wallet',
  'defend-anchor',
  'defend-random-landmark',
  'guardian-resolution',
  'inspect-and-resolve-elite',
  'interrupt-ritual',
  'optional-elite-resolution',
  'selective-hunt',
  'short-dungeon-clear',
  'short-dungeon-or-public-event-contribution',
]);

export const MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS = new Set([
  'short-dungeon-clear',
  'short-dungeon-or-public-event-contribution',
]);

export const MIR4_ARC_INTERACT_STAGE_KINDS = new Set([
  'accept-board-order',
  'activate-sequence',
  'certify-network',
  'discover-shortcut',
  'discover-waypoint',
  'explore-landmarks',
  'gather-resource-patches',
  'inspect-clues',
  'inspect-service-stations',
  'lore-resolution',
  'prepare-civilians',
  'reconstruct-evidence',
  'repair-public-anchor',
  'track-signs',
]);

export const MIR4_ARC_RECEIPT_STAGE_KINDS = new Set([
  'craft-receipt',
  'deliver-local-materials',
  'refine-receipt',
  'salvage-receipt',
  'system-tutorial',
]);

export const MIR4_ARC_ROUTED_STAGE_KINDS = new Set([
  ...MIR4_ARC_TALK_STAGE_KINDS,
  ...MIR4_ARC_POSITION_STAGE_KINDS,
  ...MIR4_ARC_ESCORT_STAGE_KINDS,
  ...MIR4_ARC_COMBAT_STAGE_KINDS,
  ...MIR4_ARC_INTERACT_STAGE_KINDS,
  ...MIR4_ARC_RECEIPT_STAGE_KINDS,
]);
