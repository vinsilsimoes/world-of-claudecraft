import { isNecromancyUndead } from '../sim/combat/necromancy';
import { MOBS, NPCS } from '../sim/data';
import type { Entity, MobFamily } from '../sim/types';
import { tEntity } from './entity_i18n';
import { localizeSimAuraName } from './sim_i18n';
import { type TargetRank, targetRankView } from './target_rank_view';

export function entityMobFamily(
  entity: Entity,
  fallbackTemplateId?: string,
): MobFamily | undefined {
  return (
    (MOBS[entity.templateId] ?? (fallbackTemplateId ? MOBS[fallbackTemplateId] : undefined))
      ?.family ?? entity.mobFamily
  );
}

export function entityTargetRank(entity: Entity): TargetRank {
  const template = MOBS[entity.templateId];
  return targetRankView({
    elite: entity.mobElite ?? template?.elite,
    boss: entity.mobBoss ?? template?.boss,
  });
}

export function entityDisplayName(entity: Entity): string {
  if (entity.kind === 'mob') {
    if (entity.ownerId !== null && !isNecromancyUndead(entity)) {
      return localizeSimAuraName(entity.name) ?? entity.name;
    }
    return MOBS[entity.templateId]
      ? tEntity({ kind: 'mob', id: entity.templateId, field: 'name' })
      : entity.name;
  }
  if (entity.kind === 'npc') {
    return NPCS[entity.templateId]
      ? tEntity({ kind: 'npc', id: entity.templateId, field: 'name' })
      : entity.name;
  }
  return entity.name;
}
