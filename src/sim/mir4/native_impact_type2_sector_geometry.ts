import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeDistanceToYards } from './native_skill_units';

export interface Mir4NativeImpactType2SectorGeometry {
  readonly attackId: number;
  readonly angleDegrees: number;
  readonly radiusMinYards: number;
  readonly radiusMaxYards: number;
  readonly heightYards: number;
  readonly targetCap: number;
  readonly forwardOffsetYards: number;
  readonly rotationRadians: number;
}

export interface Mir4NativeImpactType2SectorOrigin {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly facing: number;
}

export interface Mir4NativeImpactType2SectorCandidate {
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
 * Compile the angled, actor-anchored subset of native ImpactType 2.
 *
 * The extracted server proves the radial sphere, height and TargetValue gates,
 * but its final directional predicate is not symbolically recovered. The
 * browser reconstruction therefore treats AttackAngle as the full sector
 * width around actor facing and admits a body sphere when its angular radius
 * touches that sector. This policy is explicit and isolated for replacement
 * if the remaining native predicate is recovered later.
 */
export function compileMir4NativeImpactType2SectorGeometry(
  row: Mir4NativeSkillAttackRow,
): Mir4NativeImpactType2SectorGeometry {
  if (row.impactType !== 2) {
    throw new Error(`attack ${row.attackId} must use native ImpactType 2`);
  }
  const angleDegrees = row.geometry.angleDegrees;
  if (!(angleDegrees > 0 && angleDegrees < 360)) {
    throw new Error(`attack ${row.attackId} must use an angled native sector`);
  }
  if (row.geometry.nativeOffset.y !== 0 || row.geometry.nativeOffset.z !== 0) {
    throw new Error(`attack ${row.attackId} must use an actor-plane native sector`);
  }
  requireFinite(row.geometry.nativeOffset.x, 'AttackOffset.X');
  requireFiniteNonNegative(row.geometry.nativeDistanceMin, 'AttackDistanceMin');
  requireFiniteNonNegative(row.geometry.nativeDistanceMax, 'AttackDistanceMax');
  requireFiniteNonNegative(row.geometry.nativeHeight, 'AttackHeight');
  requireFiniteNonNegative(row.authorialTargetValue, 'TargetValue');
  requireFinite(row.geometry.rotationDegrees, 'AttackRotation');
  if (row.geometry.nativeDistanceMin > row.geometry.nativeDistanceMax) {
    throw new Error('AttackDistanceMin must not exceed AttackDistanceMax');
  }
  if (!Number.isInteger(row.authorialTargetValue)) {
    throw new Error('TargetValue must be an integer');
  }

  return Object.freeze({
    attackId: row.attackId,
    angleDegrees,
    radiusMinYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMin),
    radiusMaxYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
    heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
    targetCap: row.authorialTargetValue,
    forwardOffsetYards: mir4NativeDistanceToYards(row.geometry.nativeOffset.x),
    rotationRadians: (row.geometry.rotationDegrees * Math.PI) / 180,
  });
}

function wrapRadians(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

export function mir4ImpactType2SectorIntersectsSphere(
  geometry: Mir4NativeImpactType2SectorGeometry,
  origin: Mir4NativeImpactType2SectorOrigin,
  candidate: Mir4NativeImpactType2SectorCandidate,
): boolean {
  requireFinite(origin.x, 'origin.x');
  requireFinite(origin.y, 'origin.y');
  requireFinite(origin.z, 'origin.z');
  requireFinite(origin.facing, 'origin.facing');
  requireFinite(candidate.x, 'candidate.x');
  requireFinite(candidate.y, 'candidate.y');
  requireFinite(candidate.z, 'candidate.z');
  requireFiniteNonNegative(candidate.radiusYards, 'candidate.radiusYards');

  const centerX = origin.x + Math.sin(origin.facing) * geometry.forwardOffsetYards;
  const centerZ = origin.z + Math.cos(origin.facing) * geometry.forwardOffsetYards;
  const dx = candidate.x - centerX;
  const dy = candidate.y - origin.y;
  const dz = candidate.z - centerZ;
  if (dy > geometry.heightYards) return false;
  const distance3d = Math.hypot(dx, dy, dz);
  if (
    distance3d > geometry.radiusMaxYards + candidate.radiusYards ||
    distance3d < geometry.radiusMinYards - candidate.radiusYards
  ) {
    return false;
  }

  const horizontalDistance = Math.hypot(dx, dz);
  if (horizontalDistance <= candidate.radiusYards) return true;
  const candidateAngle = Math.atan2(dx, dz);
  const centerAngle = origin.facing + geometry.rotationRadians;
  const angularRadius = Math.asin(Math.min(1, candidate.radiusYards / horizontalDistance));
  const halfAngle = (geometry.angleDegrees * Math.PI) / 360;
  return Math.abs(wrapRadians(candidateAngle - centerAngle)) <= halfAngle + angularRadius;
}

export function selectMir4NativeImpactType2SectorCandidates<
  Candidate extends Mir4NativeImpactType2SectorCandidate,
>(
  geometry: Mir4NativeImpactType2SectorGeometry,
  origin: Mir4NativeImpactType2SectorOrigin,
  candidates: Iterable<Candidate>,
  isEligible: (candidate: Candidate) => boolean,
): Candidate[] {
  const selected: Candidate[] = [];
  for (const candidate of candidates) {
    if (!isEligible(candidate)) continue;
    if (!mir4ImpactType2SectorIntersectsSphere(geometry, origin, candidate)) continue;
    selected.push(candidate);
    if (geometry.targetCap !== 0 && selected.length >= geometry.targetCap) break;
  }
  return selected;
}
