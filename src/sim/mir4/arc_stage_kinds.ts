// Exhaustive routing table for every stage kind in the 230-contract campaign.
// Each bucket names the authoritative runtime evidence source; the coverage
// test prevents generated content from silently introducing an unwired verb.

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
