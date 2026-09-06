import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { mir4NativeGeneratedMechanicalRow } from './native_skill_generated_contract';
import { mir4NativeDistanceToYards } from './native_skill_units';

function reviewedImpactType1Row(skillId: number, attackId: number) {
  const isSoulDevour = skillId === 2502 && attackId === 250202;
  const isBlastingCharm = skillId === 3505 && attackId === 350502;
  const isQuickShot = skillId === 4101 && attackId >= 410101 && attackId <= 410106;
  const isFlashArrow = skillId === 4107 && attackId === 410702;
  if (!isSoulDevour && !isBlastingCharm && !isQuickShot && !isFlashArrow) return null;
  const row =
    isBlastingCharm || isFlashArrow
      ? mir4NativeGeneratedMechanicalRow(skillId, attackId)
      : mir4NativeDirectSkillActionEvidenceById(skillId)?.rows.find(
          (candidate) => candidate.attackId === attackId,
        );
  if (
    !row ||
    row.impactType !== 1 ||
    row.targetType !== 1 ||
    row.targetSubtype !== 'alive-only' ||
    row.authorialTargetValue !== (isBlastingCharm || isQuickShot || isFlashArrow ? 5 : 6) ||
    row.geometry.angleDegrees !== 360 ||
    row.geometry.nativeDistanceMin !== 0 ||
    row.geometry.nativeDistanceMax !== (isBlastingCharm ? 600 : isQuickShot ? 400 : 450) ||
    row.geometry.nativeHeight !== (isBlastingCharm ? 400 : isQuickShot ? 800 : 250) ||
    row.geometry.nativeOffset.x !== 0 ||
    row.geometry.nativeOffset.y !== 0 ||
    row.geometry.nativeOffset.z !== 0 ||
    row.geometry.rotationDegrees !== 0
  ) {
    return null;
  }
  return row;
}

/**
 * Rebuild an admitted native ImpactType 1 list around the current stored
 * cast-target position. GameServer FUN_140188c30 proves that this branch
 * re-resolves the typed target at impact time before applying geometry and cap.
 */
export function mir4NativeImpactType1Targets(
  ctx: SimContext,
  source: Entity,
  anchor: Entity,
  skillId: number,
  attackId: number,
): Entity[] | null {
  const row = reviewedImpactType1Row(skillId, attackId);
  if (!row) return null;
  if (anchor.dead || (anchor.kind !== 'mob' && anchor.kind !== 'player')) return [];

  const radiusMin = mir4NativeDistanceToYards(row.geometry.nativeDistanceMin);
  const radiusMax = mir4NativeDistanceToYards(row.geometry.nativeDistanceMax);
  const height = mir4NativeDistanceToYards(row.geometry.nativeHeight);
  const selected: Entity[] = [];
  for (const entity of ctx.entities.values()) {
    if (entity.id === source.id || (entity.kind !== 'mob' && entity.kind !== 'player')) continue;
    if (entity.dead || !ctx.isHostileTo(source, entity)) continue;
    const dx = entity.pos.x - anchor.pos.x;
    const dy = entity.pos.y - anchor.pos.y;
    const dz = entity.pos.z - anchor.pos.z;
    if (dy > height) continue;
    const distance = Math.hypot(dx, dy, dz);
    if (distance > radiusMax + PLAYER_BODY_RADIUS) continue;
    if (distance < radiusMin - PLAYER_BODY_RADIUS) continue;
    selected.push(entity);
    if (selected.length >= row.authorialTargetValue) break;
  }
  return selected;
}
