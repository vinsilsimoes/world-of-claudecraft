import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeDistanceToYards } from './native_skill_units';

export interface Mir4NativeImpactType3Geometry {
  readonly attackId: number;
  /** Present only for native forward bands whose near edge is non-zero. */
  readonly minDistanceYards?: number;
  readonly lengthYards: number;
  readonly widthYards: number;
  readonly heightYards: number;
  readonly targetCap: number;
}

export interface Mir4NativeImpactType3ActorPose {
  readonly x: number;
  readonly z: number;
  /** Aeldrune convention: zero points toward positive Z. */
  readonly facingRadians: number;
}

export interface Mir4NativeImpactType3CandidateCircle {
  readonly x: number;
  readonly z: number;
  readonly radiusYards: number;
}

export interface Mir4NativeImpactType3ActorVolumePose extends Mir4NativeImpactType3ActorPose {
  readonly y: number;
}

export interface Mir4NativeImpactType3VolumeCandidate extends Mir4NativeImpactType3CandidateCircle {
  readonly id: number;
  readonly y: number;
}

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new Error(`${field} must be finite`);
}

function requireFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be finite non-negative`);
  }
}

/**
 * Compile the spatial inputs consumed by the native ImpactType 3 branch.
 *
 * GameServer FUN_140188c30 routes ImpactType 3 through FUN_140186d40. That
 * helper builds an attacker-anchored oriented box from AttackDistanceMax and
 * AttackWidth. The target-list builder applies TargetValue as the list cap.
 * Relationship, alive-state, vertical and traversal-order gates remain outside
 * this horizontal geometry leaf.
 */
export function compileMir4NativeImpactType3Geometry(
  row: Mir4NativeSkillAttackRow,
): Mir4NativeImpactType3Geometry {
  if (row.impactType !== 3) {
    throw new Error(`attack ${row.attackId} must use native ImpactType 3`);
  }
  requireFiniteNonNegative(row.geometry.nativeDistanceMax, 'AttackDistanceMax');
  requireFiniteNonNegative(row.geometry.nativeDistanceMin, 'AttackDistanceMin');
  requireFiniteNonNegative(row.geometry.nativeWidth, 'AttackWidth');
  requireFiniteNonNegative(row.geometry.nativeHeight, 'AttackHeight');
  requireFiniteNonNegative(row.authorialTargetValue, 'TargetValue');
  if (!Number.isInteger(row.authorialTargetValue)) {
    throw new Error('TargetValue must be an integer');
  }

  return Object.freeze({
    attackId: row.attackId,
    ...(row.geometry.nativeDistanceMin > 0
      ? { minDistanceYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMin) }
      : {}),
    lengthYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
    widthYards: mir4NativeDistanceToYards(row.geometry.nativeWidth),
    heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
    targetCap: row.authorialTargetValue,
  });
}

/**
 * Test a horizontal candidate circle against the native forward rectangle.
 * FUN_140186d40 expands the rectangle by the candidate's body radius, including
 * the near and far end caps and the four corners.
 */
export function mir4ImpactType3IntersectsCircle(
  geometry: Mir4NativeImpactType3Geometry,
  actor: Mir4NativeImpactType3ActorPose,
  candidate: Mir4NativeImpactType3CandidateCircle,
): boolean {
  requireFiniteNonNegative(geometry.lengthYards, 'lengthYards');
  requireFiniteNonNegative(geometry.widthYards, 'widthYards');
  requireFinite(actor.x, 'actor.x');
  requireFinite(actor.z, 'actor.z');
  requireFinite(actor.facingRadians, 'actor.facingRadians');
  requireFinite(candidate.x, 'candidate.x');
  requireFinite(candidate.z, 'candidate.z');
  requireFiniteNonNegative(candidate.radiusYards, 'candidate.radiusYards');

  return (
    mir4ImpactType3HorizontalDistanceSquared(geometry, actor, candidate) <=
    candidate.radiusYards * candidate.radiusYards
  );
}

function mir4ImpactType3HorizontalDistanceSquared(
  geometry: Mir4NativeImpactType3Geometry,
  actor: Mir4NativeImpactType3ActorPose,
  candidate: Pick<Mir4NativeImpactType3CandidateCircle, 'x' | 'z'>,
): number {
  const dx = candidate.x - actor.x;
  const dz = candidate.z - actor.z;
  const forwardX = Math.sin(actor.facingRadians);
  const forwardZ = Math.cos(actor.facingRadians);
  const rightX = forwardZ;
  const rightZ = -forwardX;
  const forwardDistance = dx * forwardX + dz * forwardZ;
  const lateralDistance = dx * rightX + dz * rightZ;
  const halfWidth = geometry.widthYards / 2;
  const closestForward = Math.max(
    geometry.minDistanceYards ?? 0,
    Math.min(geometry.lengthYards, forwardDistance),
  );
  const closestLateral = Math.max(-halfWidth, Math.min(halfWidth, lateralDistance));
  const outsideForward = forwardDistance - closestForward;
  const outsideLateral = lateralDistance - closestLateral;

  return outsideForward * outsideForward + outsideLateral * outsideLateral;
}

/**
 * Rebuild one native candidate list in caller iteration order.
 *
 * FUN_140188c30 performs the relationship predicate before geometry and stops
 * as soon as non-zero TargetValue is reached. It rebuilds this list for every
 * contact, so this function deliberately owns no cache or previous-target state.
 * The native vertical arm first rejects targets above AttackHeight, then the
 * target body sphere must intersect the horizontal rectangle plane.
 */
export function selectMir4NativeImpactType3Candidates<
  Candidate extends Mir4NativeImpactType3VolumeCandidate,
>(
  geometry: Mir4NativeImpactType3Geometry,
  actor: Mir4NativeImpactType3ActorVolumePose,
  candidates: Iterable<Candidate>,
  isEligible: (candidate: Candidate) => boolean,
): Candidate[] {
  requireFiniteNonNegative(geometry.heightYards, 'heightYards');
  requireFiniteNonNegative(geometry.targetCap, 'targetCap');
  if (!Number.isInteger(geometry.targetCap)) throw new Error('targetCap must be an integer');
  requireFinite(actor.y, 'actor.y');

  const selected: Candidate[] = [];
  for (const candidate of candidates) {
    requireFinite(candidate.y, 'candidate.y');
    if (!isEligible(candidate)) continue;
    const verticalDistance = candidate.y - actor.y;
    if (verticalDistance > geometry.heightYards) continue;
    requireFinite(candidate.x, 'candidate.x');
    requireFinite(candidate.z, 'candidate.z');
    requireFiniteNonNegative(candidate.radiusYards, 'candidate.radiusYards');
    const distanceSquared =
      mir4ImpactType3HorizontalDistanceSquared(geometry, actor, candidate) +
      verticalDistance * verticalDistance;
    if (distanceSquared > candidate.radiusYards * candidate.radiusYards) {
      continue;
    }
    selected.push(candidate);
    if (geometry.targetCap !== 0 && selected.length >= geometry.targetCap) break;
  }
  return selected;
}
