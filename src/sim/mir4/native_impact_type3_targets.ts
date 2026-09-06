import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import {
  compileMir4NativeImpactType3Geometry,
  selectMir4NativeImpactType3Candidates,
} from './native_impact_type3_geometry';

const RUNTIME_IMPACT_TYPE3_DAMAGE_ATTACK_IDS = new Map<number, ReadonlySet<number>>([
  [1102, new Set([110202, 110203, 110204])],
  [1104, new Set([110402])],
  [1304, new Set([130402])],
  [3101, new Set([310101, 310102, 310103, 310104])],
  [3103, new Set([310302, 310303])],
  [3203, new Set([320301, 320302, 320303])],
  [3303, new Set([330303, 330305, 330306, 330309, 330310])],
  [4106, new Set([410602])],
  [4109, new Set([410902, 410903])],
  [5104, new Set([510402])],
  [5201, new Set([520101, 520102, 520103])],
  [5202, new Set([520202])],
  [5203, new Set([520302])],
  [5205, new Set([520502, 520503])],
  [5301, new Set([530101, 530102, 530103])],
  [5403, new Set([540301, 540303, 540304, 540305])],
]);

export function mir4NativeImpactType3RuntimeAttack(skillId: number, attackId: number): boolean {
  return RUNTIME_IMPACT_TYPE3_DAMAGE_ATTACK_IDS.get(skillId)?.has(attackId) === true;
}

interface EntityCandidate {
  readonly entity: Entity;
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radiusYards: number;
}

/**
 * Resolve a proved ImpactType 3 target list at contact time.
 *
 * A null result means this attack row has not been admitted to this runtime
 * seam and the caller must preserve its previous targeting behavior. An empty
 * list is authoritative for an admitted row whose current footprint contains
 * no eligible target.
 */
export function mir4NativeImpactType3Targets(
  ctx: SimContext,
  source: Entity,
  skillId: number,
  attackId: number,
): Entity[] | null {
  if (!mir4NativeImpactType3RuntimeAttack(skillId, attackId)) return null;
  const action = mir4NativeDirectSkillActionEvidenceById(skillId);
  const row = action?.rows.find((candidate) => candidate.attackId === attackId);
  if (!row) return null;
  const geometry = compileMir4NativeImpactType3Geometry(row);
  const candidates: EntityCandidate[] = [];
  for (const entity of ctx.entities.values()) {
    if (entity.id === source.id || (entity.kind !== 'mob' && entity.kind !== 'player')) continue;
    candidates.push({
      entity,
      id: entity.id,
      x: entity.pos.x,
      y: entity.pos.y,
      z: entity.pos.z,
      radiusYards: PLAYER_BODY_RADIUS,
    });
  }
  return selectMir4NativeImpactType3Candidates(
    geometry,
    {
      x: source.pos.x,
      y: source.pos.y,
      z: source.pos.z,
      facingRadians: source.facing,
    },
    candidates,
    (candidate) => !candidate.entity.dead && ctx.isHostileTo(source, candidate.entity),
  ).map((candidate) => candidate.entity);
}
