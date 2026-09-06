import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import {
  compileMir4NativeImpactType2CircleGeometry,
  type Mir4NativeImpactType2CircleGeometry,
  selectMir4NativeImpactType2CircleCandidates,
} from './native_impact_type2_geometry';
import {
  compileMir4NativeImpactType2SectorGeometry,
  selectMir4NativeImpactType2SectorCandidates,
} from './native_impact_type2_sector_geometry';
import {
  mir4NativeGeneratedMechanicalAction,
  mir4NativeGeneratedMechanicalRow,
  mir4NativeRowHasDamageContact,
} from './native_skill_generated_contract';

const RUNTIME_IMPACT_TYPE2_DAMAGE_ATTACK_IDS = new Map<number, ReadonlySet<number>>([
  [1103, new Set([110106, 110107])],
  [1201, new Set([120101, 120102, 120103])],
  [1301, new Set([130101, 130102])],
  [1302, new Set([130202, 130203])],
  [1401, new Set([140102])],
]);

export function mir4NativeImpactType2RuntimeAttack(skillId: number, attackId: number): boolean {
  if (RUNTIME_IMPACT_TYPE2_DAMAGE_ATTACK_IDS.get(skillId)?.has(attackId) === true) return true;
  const row = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  return row?.impactType === 2 && mir4NativeRowHasDamageContact(row);
}

interface EntityCandidate {
  readonly entity: Entity;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radiusYards: number;
}

/**
 * Resolve one proved full-circle ImpactType 2 target list at contact time.
 *
 * A null result leaves an unadmitted row on its previous target path. An empty
 * list is authoritative for an admitted row with no eligible target inside the
 * live actor-centered volume.
 */
export function mir4NativeImpactType2Targets(
  ctx: SimContext,
  source: Entity,
  skillId: number,
  attackId: number,
  preferredTarget?: Entity,
): Entity[] | null {
  if (!mir4NativeImpactType2RuntimeAttack(skillId, attackId)) return null;
  const generatedAction = mir4NativeGeneratedMechanicalAction(skillId);
  const action = generatedAction ?? mir4NativeDirectSkillActionEvidenceById(skillId);
  const row = action?.rows.find((candidate) => candidate.attackId === attackId);
  if (!row) return null;

  let geometry: Mir4NativeImpactType2CircleGeometry;
  try {
    geometry = compileMir4NativeImpactType2CircleGeometry(row);
  } catch {
    if (skillId !== 4113 && skillId !== 5101 && skillId !== 5102) return null;
    try {
      const sector = compileMir4NativeImpactType2SectorGeometry(row);
      const exactArbalistUltimateSector =
        sector.radiusMinYards === 0 &&
        sector.heightYards === 4 &&
        sector.targetCap === 10 &&
        sector.forwardOffsetYards === 0 &&
        sector.rotationRadians === 0 &&
        ((attackId === 411302 && sector.angleDegrees === 55 && sector.radiusMaxYards === 21) ||
          (attackId === 411303 && sector.angleDegrees === 65 && sector.radiusMaxYards === 22) ||
          (attackId === 411304 && sector.angleDegrees === 80 && sector.radiusMaxYards === 23) ||
          (attackId === 411305 && sector.angleDegrees === 100 && sector.radiusMaxYards === 24) ||
          (attackId === 411306 && sector.angleDegrees === 120 && sector.radiusMaxYards === 25));
      const exactCrescentBladeSector =
        skillId === 5101 &&
        (attackId === 510101 || attackId === 510102) &&
        sector.radiusMinYards === 0 &&
        sector.radiusMaxYards === 7 &&
        sector.heightYards === 5 &&
        sector.targetCap === 8 &&
        sector.forwardOffsetYards === -1 &&
        sector.rotationRadians === 0 &&
        sector.angleDegrees === 160;
      const exactDragonTailSector =
        skillId === 5102 &&
        attackId >= 510201 &&
        attackId <= 510204 &&
        sector.radiusMinYards === 0 &&
        sector.radiusMaxYards === (attackId === 510204 ? 12 : 7) &&
        sector.heightYards === 5 &&
        sector.targetCap === 8 &&
        sector.forwardOffsetYards === -1 &&
        sector.rotationRadians === 0 &&
        sector.angleDegrees === 160;
      if (!exactArbalistUltimateSector && !exactCrescentBladeSector && !exactDragonTailSector) {
        return null;
      }
      const candidates: EntityCandidate[] = [];
      for (const entity of ctx.entities.values()) {
        if (entity.id === source.id || (entity.kind !== 'mob' && entity.kind !== 'player'))
          continue;
        candidates.push({
          entity,
          x: entity.pos.x,
          y: entity.pos.y,
          z: entity.pos.z,
          radiusYards: PLAYER_BODY_RADIUS,
        });
      }
      if (preferredTarget) {
        const preferredIndex = candidates.findIndex(
          (candidate) => candidate.entity.id === preferredTarget.id,
        );
        if (preferredIndex > 0) {
          const [preferred] = candidates.splice(preferredIndex, 1);
          if (preferred) candidates.unshift(preferred);
        }
      }
      const activeAction = ctx.players.get(source.id)?.mir4SkillAction;
      return selectMir4NativeImpactType2SectorCandidates(
        sector,
        {
          x: source.pos.x,
          y: source.pos.y,
          z: source.pos.z,
          facing: activeAction?.skillId === skillId ? activeAction.capturedFacing : source.facing,
        },
        candidates,
        (candidate) => !candidate.entity.dead && ctx.isHostileTo(source, candidate.entity),
      ).map((candidate) => candidate.entity);
    } catch {
      return null;
    }
  }
  const exactGeometry =
    skillId === 1103
      ? geometry.radiusMinYards === 0 &&
        geometry.radiusMaxYards === 6 &&
        geometry.heightYards === 4 &&
        geometry.targetCap === 10 &&
        geometry.forwardOffsetYards === 0
      : skillId === 1201
        ? geometry.radiusMinYards === 0 &&
          geometry.radiusMaxYards === (attackId === 120103 ? 7 : 11) &&
          geometry.heightYards === 4 &&
          geometry.targetCap === 5 &&
          geometry.forwardOffsetYards === (attackId === 120103 ? 3 : 7)
        : skillId === 1301
          ? geometry.radiusMinYards === 0 &&
            geometry.radiusMaxYards === (attackId === 130101 ? 12 : 4.5) &&
            geometry.heightYards === 4 &&
            geometry.targetCap === (attackId === 130101 ? 8 : 10) &&
            geometry.forwardOffsetYards === (attackId === 130101 ? 1.5 : 2.5)
          : skillId === 1302
            ? geometry.radiusMinYards === 0 &&
              geometry.radiusMaxYards === (attackId === 130202 ? 6 : 12) &&
              geometry.heightYards === 4 &&
              geometry.targetCap === 8 &&
              geometry.forwardOffsetYards === 0
            : skillId === 1401
              ? geometry.radiusMinYards === 0 &&
                geometry.radiusMaxYards === 5 &&
                geometry.heightYards === 4 &&
                geometry.targetCap === 8 &&
                geometry.forwardOffsetYards === 1.5
              : skillId === 4102
                ? geometry.radiusMinYards === 0 &&
                  geometry.radiusMaxYards === 10 &&
                  geometry.heightYards === 4 &&
                  geometry.targetCap === 8 &&
                  geometry.forwardOffsetYards === 0
                : generatedAction !== null;
  if (!exactGeometry) {
    return null;
  }

  const candidates: EntityCandidate[] = [];
  for (const entity of ctx.entities.values()) {
    if (entity.id === source.id || (entity.kind !== 'mob' && entity.kind !== 'player')) continue;
    candidates.push({
      entity,
      x: entity.pos.x,
      y: entity.pos.y,
      z: entity.pos.z,
      radiusYards: PLAYER_BODY_RADIUS,
    });
  }
  // Immolate is a target-required, one-target laser. The native ImpactType 2
  // volume validates contact range around the actor; it must not redirect the
  // sequence to an unrelated entity that happened to enter the entity map first.
  if (skillId === 2103 && preferredTarget) {
    const preferredIndex = candidates.findIndex(
      (candidate) => candidate.entity.id === preferredTarget.id,
    );
    if (preferredIndex > 0) {
      const [preferred] = candidates.splice(preferredIndex, 1);
      if (preferred) candidates.unshift(preferred);
    }
  }
  const activeAction = ctx.players.get(source.id)?.mir4SkillAction;
  const impactFacing =
    skillId === 5303 && activeAction?.skillId === skillId
      ? activeAction.capturedFacing + Math.PI
      : source.facing;
  return selectMir4NativeImpactType2CircleCandidates(
    geometry,
    {
      // Crushing Blow's damage rows begin after TurnSpear03 has crossed the
      // target and turned back. The actor model keeps the captured action
      // facing while the authored motion runs, so its native positive X
      // offsets must be evaluated along the return-facing half turn.
      x: source.pos.x + Math.sin(impactFacing) * geometry.forwardOffsetYards,
      y: source.pos.y,
      z: source.pos.z + Math.cos(impactFacing) * geometry.forwardOffsetYards,
    },
    candidates,
    (candidate) => !candidate.entity.dead && ctx.isHostileTo(source, candidate.entity),
  ).map((candidate) => candidate.entity);
}
