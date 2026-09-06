import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeDistanceToYards } from './native_skill_units';

export interface Mir4NativeImpactType2CircleGeometry {
  readonly attackId: number;
  readonly radiusMinYards: number;
  readonly radiusMaxYards: number;
  readonly heightYards: number;
  readonly targetCap: number;
  readonly forwardOffsetYards: number;
}

export interface Mir4NativeImpactType2CircleOrigin {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Mir4NativeImpactType2SphereCandidate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radiusYards: number;
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
 * Compile the full-circle subset of the native ImpactType 2 branch.
 *
 * GameServer FUN_140188c30 anchors type 2 on the attacker, tests the candidate
 * body sphere against AttackDistanceMin and AttackDistanceMax, applies the
 * one-sided AttackHeight rejection, and stops at TargetValue. Angled type 2
 * rows remain closed because their native directional predicate is separate.
 */
export function compileMir4NativeImpactType2CircleGeometry(
  row: Mir4NativeSkillAttackRow,
): Mir4NativeImpactType2CircleGeometry {
  if (row.impactType !== 2) {
    throw new Error(`attack ${row.attackId} must use native ImpactType 2`);
  }
  if (row.geometry.angleDegrees !== 360) {
    throw new Error(`attack ${row.attackId} must use a 360-degree native circle`);
  }
  if (
    row.geometry.nativeOffset.y !== 0 ||
    row.geometry.nativeOffset.z !== 0 ||
    row.geometry.rotationDegrees !== 0
  ) {
    throw new Error(`attack ${row.attackId} must use an unrotated native circle`);
  }
  requireFiniteNonNegative(row.geometry.nativeOffset.x, 'AttackOffset.X');
  requireFiniteNonNegative(row.geometry.nativeDistanceMin, 'AttackDistanceMin');
  requireFiniteNonNegative(row.geometry.nativeDistanceMax, 'AttackDistanceMax');
  requireFiniteNonNegative(row.geometry.nativeHeight, 'AttackHeight');
  requireFiniteNonNegative(row.authorialTargetValue, 'TargetValue');
  if (row.geometry.nativeDistanceMin > row.geometry.nativeDistanceMax) {
    throw new Error('AttackDistanceMin must not exceed AttackDistanceMax');
  }
  if (!Number.isInteger(row.authorialTargetValue)) {
    throw new Error('TargetValue must be an integer');
  }

  return Object.freeze({
    attackId: row.attackId,
    radiusMinYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMin),
    radiusMaxYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
    heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
    targetCap: row.authorialTargetValue,
    forwardOffsetYards: mir4NativeDistanceToYards(row.geometry.nativeOffset.x),
  });
}

function squaredDistance(
  origin: Mir4NativeImpactType2CircleOrigin,
  candidate: Mir4NativeImpactType2SphereCandidate,
): number {
  const dx = candidate.x - origin.x;
  const dy = candidate.y - origin.y;
  const dz = candidate.z - origin.z;
  return dx * dx + dy * dy + dz * dz;
}

/** Test one body sphere against the native full-circle type 2 volume. */
export function mir4ImpactType2CircleIntersectsSphere(
  geometry: Mir4NativeImpactType2CircleGeometry,
  origin: Mir4NativeImpactType2CircleOrigin,
  candidate: Mir4NativeImpactType2SphereCandidate,
): boolean {
  requireFiniteNonNegative(geometry.radiusMinYards, 'radiusMinYards');
  requireFiniteNonNegative(geometry.radiusMaxYards, 'radiusMaxYards');
  requireFiniteNonNegative(geometry.heightYards, 'heightYards');
  requireFinite(origin.x, 'origin.x');
  requireFinite(origin.y, 'origin.y');
  requireFinite(origin.z, 'origin.z');
  requireFinite(candidate.x, 'candidate.x');
  requireFinite(candidate.y, 'candidate.y');
  requireFinite(candidate.z, 'candidate.z');
  requireFiniteNonNegative(candidate.radiusYards, 'candidate.radiusYards');

  const verticalDistance = candidate.y - origin.y;
  if (verticalDistance > geometry.heightYards) return false;
  const distance = Math.sqrt(squaredDistance(origin, candidate));
  return (
    distance <= geometry.radiusMaxYards + candidate.radiusYards &&
    distance >= geometry.radiusMinYards - candidate.radiusYards
  );
}

/**
 * Rebuild one native type 2 candidate list in caller iteration order.
 * Relationship and alive-state rules are supplied by the authoritative host.
 */
export function selectMir4NativeImpactType2CircleCandidates<
  Candidate extends Mir4NativeImpactType2SphereCandidate,
>(
  geometry: Mir4NativeImpactType2CircleGeometry,
  origin: Mir4NativeImpactType2CircleOrigin,
  candidates: Iterable<Candidate>,
  isEligible: (candidate: Candidate) => boolean,
): Candidate[] {
  requireFiniteNonNegative(geometry.targetCap, 'targetCap');
  if (!Number.isInteger(geometry.targetCap)) throw new Error('targetCap must be an integer');

  const selected: Candidate[] = [];
  for (const candidate of candidates) {
    if (!isEligible(candidate)) continue;
    if (!mir4ImpactType2CircleIntersectsSphere(geometry, origin, candidate)) continue;
    selected.push(candidate);
    if (geometry.targetCap !== 0 && selected.length >= geometry.targetCap) break;
  }
  return selected;
}
