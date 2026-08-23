// Native WoC ground-object identities used by every MIR4 interaction verb.
// These ids are presentation selectors, not inventory items: the authoritative
// campaign reducer grants logical quest-wallet items only after interaction.

import type { Entity } from '../types';

export const MIR4_ARC_OBJECTIVE_TEMPLATE_PREFIX = 'mir4_objective_';
export const MIR4_ARC_QUEST_DROP_TEMPLATE_PREFIX = 'mir4_quest_drop_';

export function mir4IsArcQuestDropEntity(entity: Pick<Entity, 'kind' | 'templateId'>): boolean {
  return (
    entity.kind === 'object' && entity.templateId.startsWith(MIR4_ARC_QUEST_DROP_TEMPLATE_PREFIX)
  );
}

export function mir4IsArcObjectiveEntity(entity: Pick<Entity, 'kind' | 'templateId'>): boolean {
  return (
    (entity.kind === 'object' &&
      entity.templateId.startsWith(MIR4_ARC_OBJECTIVE_TEMPLATE_PREFIX)) ||
    mir4IsArcQuestDropEntity(entity)
  );
}

export function mir4ArcObjectiveVisibleTo(
  entity: Pick<Entity, 'kind' | 'templateId' | 'ownerId'>,
  viewerId: number,
): boolean {
  return !mir4IsArcObjectiveEntity(entity) || entity.ownerId === viewerId;
}

export const MIR4_ARC_OBJECTIVE_OBJECT_ITEM_IDS: Readonly<Record<string, string>> = {
  'accept-board-order': 'mir4_object_noticeboard_order',
  'activate-sequence': 'mir4_object_device_cog',
  'certify-network': 'mir4_object_network_map',
  'discover-shortcut': 'mir4_object_shortcut_key',
  'discover-waypoint': 'mir4_object_waypoint_crystal',
  'explore-landmarks': 'mir4_object_survey_compass',
  'gather-resource-patches': 'mir4_object_gather_patch',
  'inspect-clues': 'mir4_object_clue_magnifier',
  'inspect-service-stations': 'mir4_object_service_blueprint',
  'lore-resolution': 'mir4_object_lore_journal',
  'prepare-civilians': 'mir4_object_supply_crate',
  'reconstruct-evidence': 'mir4_object_evidence_ledger',
  'repair-public-anchor': 'mir4_object_repair_wrench',
  'track-signs': 'mir4_object_tracking_map',
};

export const MIR4_ARC_OBJECTIVE_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  'accept-board-order': 'Campaign Order',
  'activate-sequence': 'Activation Device',
  'certify-network': 'Network Survey',
  'discover-shortcut': 'Shortcut Key',
  'discover-waypoint': 'Waypoint Crystal',
  'explore-landmarks': 'Survey Point',
  'gather-resource-patches': 'Resource Patch',
  'inspect-clues': 'Quest Clue',
  'inspect-service-stations': 'Service Blueprint',
  'lore-resolution': 'Lore Journal',
  'prepare-civilians': 'Civilian Supplies',
  'reconstruct-evidence': 'Evidence Ledger',
  'repair-public-anchor': 'Repair Point',
  'track-signs': 'Tracking Map',
};

export function mir4ArcObjectiveObjectItemId(stageKind: string): string {
  return MIR4_ARC_OBJECTIVE_OBJECT_ITEM_IDS[stageKind] ?? 'mir4_object_clue_magnifier';
}

export function mir4ArcObjectiveDisplayName(stageKind: string): string {
  return MIR4_ARC_OBJECTIVE_DISPLAY_NAMES[stageKind] ?? 'Quest Objective';
}
