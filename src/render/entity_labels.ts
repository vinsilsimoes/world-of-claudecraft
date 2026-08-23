// Localized display names for the entities the renderer labels (nameplates and
// the build-time nameplate text). These wrap the i18n catalog (tEntity / t), so
// they are painter-side, not part of any pure core. Lifted out of renderer.ts so
// both the renderer and the NameplatePainter can share objectDisplayName without
// a renderer <-> painter import cycle.

import { NPCS } from '../sim/data';
import type { Entity } from '../sim/types';
import { dungeonDisplayName, tEntity } from '../ui/entity_i18n';
import { t } from '../ui/i18n';

export function mobDisplayName(mobId: string): string {
  return tEntity({ kind: 'mob', id: mobId, field: 'name' });
}

function mir4StableMobTranslationId(templateId: string): string {
  const ambush = /^(mir4_escort_ambush_[^_]+_\d+_\d+)_\d+(?:_\d+)?$/.exec(templateId);
  if (ambush?.[1]) return ambush[1];
  const escort = /^(mir4_escort_[^_]+_\d+)_\d+(?:_\d+)?$/.exec(templateId);
  return escort?.[1] ?? templateId;
}

export function mobEntityDisplayName(entity: Entity): string {
  if (!entity.templateId.startsWith('mir4_') || !entity.name) {
    return mobDisplayName(entity.templateId);
  }
  return tEntity({
    kind: 'mob',
    id: mir4StableMobTranslationId(entity.templateId),
    field: 'name',
    source: entity.name,
  });
}

export function npcDisplayName(entity: Entity): string {
  return NPCS[entity.templateId]
    ? tEntity({ kind: 'npc', id: entity.templateId, field: 'name' })
    : tEntity({
        kind: 'npc',
        id: entity.templateId,
        field: 'name',
        source: entity.name,
      });
}

export function objectDisplayName(entity: Entity): string {
  if (entity.templateId === 'mailbox') {
    return t('worldContent.mailboxName');
  }
  if (entity.templateId === 'noticeboard_eastbrook') {
    return t('worldContent.noticeboardName');
  }
  if (entity.templateId === 'soulwell') {
    return tEntity({ kind: 'ability', id: 'soulwell', field: 'name' });
  }
  if (entity.templateId === 'delve_locked_chest') {
    return t('worldContent.delveLockedChestInteract');
  }
  if (entity.templateId === 'delve_reward_chest') {
    return t('worldContent.delveRewardChestInteract');
  }
  if (entity.templateId === 'delve_surface_exit') {
    return t('worldContent.delveSurfaceExitInteract');
  }
  // The Drowned Reliquary Rite finale: the risen reliquary and the four shrines
  // all carry an explicit "Press F" call to action while the rite is up.
  if (entity.templateId === 'delve_drowned_reliquary') {
    return t('worldContent.delveReliquaryInteract');
  }
  if (entity.templateId === 'delve_drowned_reliquary_open') {
    return t('worldContent.delveRewardChestInteract');
  }
  if (entity.templateId === 'delve_rite_shrine_bell') {
    return t('worldContent.delveRiteShrineBellInteract');
  }
  if (entity.templateId === 'delve_rite_shrine_candle') {
    return t('worldContent.delveRiteShrineCandleInteract');
  }
  if (entity.templateId === 'delve_rite_shrine_reed') {
    return t('worldContent.delveRiteShrineReedInteract');
  }
  if (entity.templateId === 'delve_rite_shrine_skull') {
    return t('worldContent.delveRiteShrineSkullInteract');
  }
  // Marsh room puzzle interactables: the sim names these in English
  // (createDelveObject); localize through the delveUi.object.* labels. Spent
  // variants keep the same label (same object, triggered).
  if (entity.templateId === 'delve_sluice_valve' || entity.templateId === 'delve_sluice_valve_open')
    return t('delveUi.object.sluice_valve');
  if (entity.templateId === 'delve_grave_tablet' || entity.templateId === 'delve_grave_tablet_lit')
    return t('delveUi.object.grave_tablet');
  if (
    entity.templateId === 'delve_corpse_candle' ||
    entity.templateId === 'delve_corpse_candle_lit'
  )
    return t('delveUi.object.corpse_candle');
  if (entity.templateId === 'delve_bell_rope' || entity.templateId === 'delve_bell_rope_pulled') {
    return t('delveUi.object.bell_rope');
  }
  if (
    (entity.templateId === 'dungeon_door' || entity.templateId === 'dungeon_exit') &&
    entity.dungeonId
  ) {
    const dungeonName = dungeonDisplayName(entity.dungeonId);
    return entity.templateId === 'dungeon_exit'
      ? t('worldContent.dungeonExitName', { name: dungeonName })
      : dungeonName;
  }
  // Collectible/quest ground objects carry the item id they grant; localize the
  // nameplate through the item dictionary instead of the raw English name.
  // MIR4 objective selectors are not inventory item ids. Nameplates describe
  // the action through the existing localized campaign vocabulary instead of
  // leaking source/runtime target identifiers.
  if (entity.templateId.startsWith('mir4_objective_')) {
    if (entity.objectItemId === 'mir4_object_gather_patch') {
      return t('hudChrome.mir4.campaign.objective.gather');
    }
    if (entity.objectItemId === 'mir4_object_waypoint_crystal') {
      return t('hudChrome.mir4.campaign.objective.travel');
    }
    if (
      entity.objectItemId === 'mir4_object_clue_magnifier' ||
      entity.objectItemId === 'mir4_object_evidence_ledger' ||
      entity.objectItemId === 'mir4_object_survey_compass' ||
      entity.objectItemId === 'mir4_object_tracking_map'
    ) {
      return t('hudChrome.mir4.campaign.objective.inspect');
    }
    return t('hudChrome.mir4.campaign.objective.interact');
  }
  if (entity.objectItemId) return tEntity({ kind: 'item', id: entity.objectItemId, field: 'name' });
  return entity.name;
}
